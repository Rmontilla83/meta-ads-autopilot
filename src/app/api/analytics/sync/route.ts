import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { createAdminClient } from '@/lib/supabase/admin';
import { MetaAdsClient } from '@/lib/meta/client';
import { decrypt } from '@/lib/encryption';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

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

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();

    // Rate limit: max 2 syncs per minute per user
    const { success, resetAt } = await rateLimit(`sync-metrics:${user.id}`, { maxRequests: 2, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const admin = createAdminClient();

    // Get user's meta connection
    const { data: connection } = await admin
      .from('meta_connections')
      .select('access_token_encrypted, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'No hay conexión activa de Meta' }, { status: 400 });
    }

    const accessToken = decrypt(connection.access_token_encrypted);
    const client = new MetaAdsClient(accessToken);

    // Get campaigns with meta_campaign_id
    const { data: campaigns } = await admin
      .from('campaigns')
      .select('id, meta_campaign_id')
      .eq('user_id', user.id)
      .not('meta_campaign_id', 'is', null)
      .in('status', ['active', 'paused']);

    if (!campaigns?.length) {
      return NextResponse.json({ message: 'No hay campañas publicadas para sincronizar', synced: 0 });
    }

    // Date range: last 7 days for manual sync (broader than cron)
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateRange = {
      since: sevenDaysAgo.toISOString().split('T')[0],
      until: today.toISOString().split('T')[0],
    };

    let totalSynced = 0;
    const errors: string[] = [];

    for (const campaign of campaigns) {
      try {
        // Sync status from Meta
        try {
          const metaStatus = await client.getCampaignStatus(campaign.meta_campaign_id!);
          const effective = metaStatus.effective_status?.toUpperCase();
          let appStatus: string | null = null;

          if (effective === 'ACTIVE') appStatus = 'active';
          else if (effective === 'PAUSED' || effective === 'CAMPAIGN_PAUSED' || effective === 'ADSET_PAUSED') appStatus = 'paused';

          if (appStatus) {
            await admin
              .from('campaigns')
              .update({ status: appStatus })
              .eq('id', campaign.id)
              .neq('status', appStatus);
          }
        } catch {
          // Status sync is not critical
        }

        // Get metrics
        const baseInsights = await client.getCampaignInsights(campaign.meta_campaign_id!, dateRange);

        // Breakdowns
        const ageInsights = await client.getCampaignInsights(campaign.meta_campaign_id!, dateRange, 'age');
        const genderInsights = await client.getCampaignInsights(campaign.meta_campaign_id!, dateRange, 'gender');
        const placementInsights = await client.getCampaignInsights(campaign.meta_campaign_id!, dateRange, 'publisher_platform,platform_position');
        const deviceInsights = await client.getCampaignInsights(campaign.meta_campaign_id!, dateRange, 'device_platform');

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

          await admin
            .from('campaign_metrics')
            .upsert({
              campaign_id: campaign.id,
              user_id: user.id,
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
            }, { onConflict: 'campaign_id,date' });

          totalSynced++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        errors.push(`Campaña ${campaign.id}: ${msg}`);
        logger.error(`Manual sync error for campaign ${campaign.id}`, { route: 'analytics/sync' }, err);
      }
    }

    return NextResponse.json({
      message: 'Sincronización completa',
      synced: totalSynced,
      campaigns: campaigns.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleApiError(error, { route: 'analytics/sync' });
  }
}
