import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { MetaAdsClient } from '@/lib/meta/client';
import { decrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-errors';
import { requireCronAuth } from '@/lib/auth-utils';
import { detectFatigue } from '@/lib/creative-fatigue/detector';
import { createNotification } from '@/lib/notifications';

function extractConversions(actions: Array<{ action_type: string; value: string }> | undefined): number {
  if (!actions) return 0;
  const conversionTypes = ['offsite_conversion', 'onsite_conversion', 'purchase', 'complete_registration'];
  return actions
    .filter(a => conversionTypes.some(t => a.action_type.includes(t)))
    .reduce((sum, a) => sum + parseInt(a.value, 10), 0);
}

function extractLeads(actions: Array<{ action_type: string; value: string }> | undefined): number {
  if (!actions) return 0;
  const leadTypes = ['lead', 'onsite_conversion.lead_grouped', 'leadgen_grouped'];
  return actions
    .filter(a => leadTypes.some(t => a.action_type.includes(t)))
    .reduce((sum, a) => sum + parseInt(a.value, 10), 0);
}

export async function GET(request: Request) {
  try {
    requireCronAuth(request);

    const supabase = createAdminClient();
    // Get all active meta connections
    const { data: connections, error: connError } = await supabase
      .from('meta_connections')
      .select('user_id, access_token_encrypted')
      .eq('is_active', true);

    if (connError || !connections?.length) {
      return NextResponse.json({ message: 'No active connections', synced: 0 });
    }

    // Date range: last 2 days
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const dateRange = {
      since: twoDaysAgo.toISOString().split('T')[0],
      until: today.toISOString().split('T')[0],
    };

    let totalSynced = 0;

    for (const conn of connections) {
      // Store campaigns data at connection scope so fatigue detection can reuse it
      let userCampaigns: Array<{ id: string; meta_campaign_id: string; name: string; status: string }> = [];

      try {
        const accessToken = decrypt(conn.access_token_encrypted);
        const client = new MetaAdsClient(accessToken);

        // Get campaigns with meta_campaign_id — include name and status for later use
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id, meta_campaign_id, name, status')
          .eq('user_id', conn.user_id)
          .not('meta_campaign_id', 'is', null)
          .in('status', ['active', 'paused']);

        if (!campaigns?.length) continue;
        userCampaigns = campaigns as typeof userCampaigns;

        // Sync campaign statuses from Meta → Supabase (parallelized)
        await Promise.all(campaigns.map(async (campaign) => {
          try {
            const metaStatus = await client.getCampaignStatus(campaign.meta_campaign_id!);
            const effective = metaStatus.effective_status?.toUpperCase();
            let appStatus: string | null = null;

            if (effective === 'ACTIVE') appStatus = 'active';
            else if (effective === 'PAUSED' || effective === 'CAMPAIGN_PAUSED' || effective === 'ADSET_PAUSED') appStatus = 'paused';
            else if (effective === 'DELETED' || effective === 'ARCHIVED') appStatus = 'archived';

            if (appStatus) {
              await supabase
                .from('campaigns')
                .update({ status: appStatus })
                .eq('id', campaign.id)
                .neq('status', appStatus);
            }
          } catch (statusError) {
            logger.error(`Error syncing status for campaign ${campaign.id}`, { route: '/api/cron/sync-metrics' }, statusError);
          }
        }));

        for (const campaign of campaigns) {
          try {
            // Fetch base metrics + all 4 breakdowns in parallel
            const [baseInsights, ageInsights, genderInsights, placementInsights, deviceInsights] = await Promise.all([
              client.getCampaignInsights(campaign.meta_campaign_id!, dateRange),
              client.getCampaignInsights(campaign.meta_campaign_id!, dateRange, 'age'),
              client.getCampaignInsights(campaign.meta_campaign_id!, dateRange, 'gender'),
              client.getCampaignInsights(campaign.meta_campaign_id!, dateRange, 'publisher_platform,platform_position'),
              client.getCampaignInsights(campaign.meta_campaign_id!, dateRange, 'device_platform'),
            ]);

            // Group breakdowns by date
            const breakdownsByDate: Record<string, {
              age: Array<{ label: string; value: number; percentage: number }>;
              gender: Array<{ label: string; value: number; percentage: number }>;
              placement: Array<{ label: string; value: number; percentage: number }>;
              device: Array<{ label: string; value: number; percentage: number }>;
            }> = {};

            const buildBreakdown = (
              data: Array<Record<string, unknown>>,
              labelField: string | string[],
              targetKey: 'age' | 'gender' | 'placement' | 'device'
            ) => {
              for (const row of data) {
                const date = row.date_start as string;
                if (!breakdownsByDate[date]) {
                  breakdownsByDate[date] = { age: [], gender: [], placement: [], device: [] };
                }
                const labels = Array.isArray(labelField)
                  ? labelField.map(f => row[f]).filter(Boolean).join(' - ')
                  : (row[labelField] as string);
                breakdownsByDate[date][targetKey].push({
                  label: labels,
                  value: parseInt(row.impressions as string, 10) || 0,
                  percentage: 0,
                });
              }
              // Calculate percentages per date
              for (const date of Object.keys(breakdownsByDate)) {
                const entries = breakdownsByDate[date][targetKey];
                const total = entries.reduce((s, e) => s + e.value, 0);
                for (const entry of entries) {
                  entry.percentage = total > 0 ? Math.round((entry.value / total) * 10000) / 100 : 0;
                }
              }
            };

            if (ageInsights.data) buildBreakdown(ageInsights.data, 'age', 'age');
            if (genderInsights.data) buildBreakdown(genderInsights.data, 'gender', 'gender');
            if (placementInsights.data) buildBreakdown(placementInsights.data, ['publisher_platform', 'platform_position'], 'placement');
            if (deviceInsights.data) buildBreakdown(deviceInsights.data, 'device_platform', 'device');

            // Build all metric rows for batch upsert
            const metricsToUpsert: Array<Record<string, unknown>> = [];

            for (const row of (baseInsights.data || [])) {
              const date = row.date_start as string;
              const impressions = parseInt(row.impressions as string, 10) || 0;
              const reach = parseInt(row.reach as string, 10) || 0;
              const clicks = parseInt(row.clicks as string, 10) || 0;
              const spend = parseFloat(row.spend as string) || 0;
              const actions = row.actions as Array<{ action_type: string; value: string }> | undefined;
              const conversions = extractConversions(actions);
              const leads = extractLeads(actions);

              const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
              const cpc = clicks > 0 ? spend / clicks : 0;
              const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
              const cpa = conversions > 0 ? spend / conversions : 0;
              const frequency = reach > 0 ? impressions / reach : 0;

              const dateBreakdowns = breakdownsByDate[date] || { age: [], gender: [], placement: [], device: [] };

              metricsToUpsert.push({
                campaign_id: campaign.id,
                user_id: conn.user_id,
                date,
                impressions,
                reach,
                clicks,
                spend,
                conversions,
                leads,
                ctr: Math.round(ctr * 10000) / 10000,
                cpc: Math.round(cpc * 10000) / 10000,
                cpm: Math.round(cpm * 10000) / 10000,
                cpa: Math.round(cpa * 10000) / 10000,
                frequency: Math.round(frequency * 10000) / 10000,
                breakdown_age: dateBreakdowns.age,
                breakdown_gender: dateBreakdowns.gender,
                breakdown_placement: dateBreakdowns.placement,
                breakdown_device: dateBreakdowns.device,
              });
            }

            // Batch upsert all daily metrics for this campaign at once
            if (metricsToUpsert.length > 0) {
              await supabase
                .from('campaign_metrics')
                .upsert(metricsToUpsert, { onConflict: 'campaign_id,date' });

              totalSynced += metricsToUpsert.length;
            }
          } catch (campaignError) {
            logger.error(`Error syncing campaign ${campaign.id}`, { route: '/api/cron/sync-metrics' }, campaignError);
          }
        }
      } catch (userError) {
        // Token expired or invalid — mark connection inactive
        const message = userError instanceof Error ? userError.message : '';
        if (message.includes('OAuthException') || message.includes('token') || message.includes('expired')) {
          await supabase
            .from('meta_connections')
            .update({ is_active: false })
            .eq('user_id', conn.user_id);
        }
        logger.error(`Error syncing user ${conn.user_id}`, { route: '/api/cron/sync-metrics' }, userError);
      }

      // --- Creative Fatigue Detection (reuses userCampaigns from above) ---
      try {
        // Filter to only active campaigns (already fetched, no re-query needed)
        const activeCampaigns = userCampaigns.filter(c => c.status === 'active');
        if (!activeCampaigns.length) continue;

        // Batch-fetch all campaign_ads for all active campaigns in one query
        const activeCampaignIds = activeCampaigns.map(c => c.id);
        const { data: allAds } = await supabase
          .from('campaign_ads')
          .select('id, name, meta_ad_id, campaign_id')
          .in('campaign_id', activeCampaignIds)
          .not('meta_ad_id', 'is', null);

        if (!allAds?.length) continue;

        // Batch-fetch all recent metrics for all active campaigns in one query
        const { data: allMetrics } = await supabase
          .from('campaign_metrics')
          .select('campaign_id, date, impressions, clicks, frequency')
          .in('campaign_id', activeCampaignIds)
          .order('date', { ascending: true })
          .limit(14 * activeCampaignIds.length);

        if (!allMetrics?.length) continue;

        // Group ads and metrics by campaign_id
        const adsByCampaign = new Map<string, typeof allAds>();
        for (const ad of allAds) {
          const list = adsByCampaign.get(ad.campaign_id) || [];
          list.push(ad);
          adsByCampaign.set(ad.campaign_id, list);
        }

        const metricsByCampaign = new Map<string, typeof allMetrics>();
        for (const metric of allMetrics) {
          const list = metricsByCampaign.get(metric.campaign_id) || [];
          list.push(metric);
          metricsByCampaign.set(metric.campaign_id, list);
        }

        // Build a campaign name lookup from the already-fetched data
        const campaignNameMap = new Map(userCampaigns.map(c => [c.id, c.name]));

        for (const campaign of activeCampaigns) {
          const ads = adsByCampaign.get(campaign.id);
          const metrics = metricsByCampaign.get(campaign.id);
          if (!ads?.length || !metrics?.length) continue;

          const adMetrics = ads.map(ad => ({
            adId: ad.id,
            metaAdId: ad.meta_ad_id!,
            adName: ad.name || 'Anuncio',
            campaignId: campaign.id,
            campaignName: campaignNameMap.get(campaign.id) || 'Campaña',
            dailyData: metrics.map(m => ({
              date: m.date,
              impressions: Math.round((m.impressions || 0) / ads.length),
              clicks: Math.round((m.clicks || 0) / ads.length),
              frequency: m.frequency || 0,
            })),
          }));

          const fatigueResults = detectFatigue(adMetrics);
          const newFatigued = fatigueResults.filter(r => r.status === 'fatigued');
          const nonHealthy = fatigueResults.filter(r => r.status !== 'healthy');

          if (nonHealthy.length > 0) {
            // Batch-fetch existing creative_rotations for all non-healthy ads
            const nonHealthyAdIds = nonHealthy.map(r => r.adId);
            const { data: existingRotations } = await supabase
              .from('creative_rotations')
              .select('id, ad_id, status')
              .eq('user_id', conn.user_id)
              .in('ad_id', nonHealthyAdIds)
              .in('status', ['warning', 'fatigued']);

            const existingByAdId = new Map(
              (existingRotations || []).map(r => [r.ad_id, r])
            );

            // Collect inserts and updates
            const rotationsToInsert: Array<Record<string, unknown>> = [];
            const rotationsToUpdate: Array<{ id: string; status: string; frequency: number; ctr: number }> = [];

            for (const result of nonHealthy) {
              const existing = existingByAdId.get(result.adId);

              if (!existing) {
                rotationsToInsert.push({
                  user_id: conn.user_id,
                  campaign_id: campaign.id,
                  ad_id: result.adId,
                  meta_ad_id: result.metaAdId,
                  status: result.status,
                  frequency_at_detection: result.frequency,
                  ctr_at_detection: result.ctrCurrent,
                  ctr_baseline: result.ctrBaseline,
                  ctr_drop_percentage: result.ctrDropPercentage,
                  impressions_at_detection: result.impressions,
                });
              } else if (existing.status !== result.status) {
                rotationsToUpdate.push({
                  id: existing.id,
                  status: result.status,
                  frequency: result.frequency,
                  ctr: result.ctrCurrent,
                });
              }
            }

            // Batch insert new rotations
            if (rotationsToInsert.length > 0) {
              await supabase.from('creative_rotations').insert(rotationsToInsert);
            }

            // Update rotations that changed status (must be individual since each has different id)
            await Promise.all(rotationsToUpdate.map(r =>
              supabase.from('creative_rotations')
                .update({ status: r.status, frequency_at_detection: r.frequency, ctr_at_detection: r.ctr })
                .eq('id', r.id)
            ));
          }

          if (newFatigued.length > 0) {
            await createNotification({
              user_id: conn.user_id,
              type: 'performance_alert',
              title: `${newFatigued.length} anuncio(s) con fatiga creativa`,
              message: `Se detectaron anuncios con CTR en declive y frecuencia alta. Considera rotar los creativos.`,
              metadata: { campaign_id: campaign.id, fatigued_count: newFatigued.length },
            });
          }
        }
      } catch (fatigueError) {
        logger.error('Fatigue detection error', { route: '/api/cron/sync-metrics' }, fatigueError);
      }
    }

    logger.info('Metrics sync complete', { route: '/api/cron/sync-metrics', synced: totalSynced });
    return NextResponse.json({ message: 'Sync complete', synced: totalSynced });
  } catch (error) {
    return handleApiError(error, { route: '/api/cron/sync-metrics' });
  }
}
