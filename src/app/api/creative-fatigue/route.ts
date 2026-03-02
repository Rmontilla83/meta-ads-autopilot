import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaClientForUser } from '@/lib/meta/client';
import { detectFatigue, type AdMetricInput } from '@/lib/creative-fatigue/detector';

export async function GET() {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`creative-fatigue:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const admin = createAdminClient();

    // Get all active campaigns for this user that have been published to Meta
    const { data: campaigns, error: campaignsError } = await admin
      .from('campaigns')
      .select('id, name, meta_campaign_id')
      .eq('user_id', user.id)
      .not('meta_campaign_id', 'is', null)
      .in('status', ['active', 'paused']);

    if (campaignsError || !campaigns?.length) {
      return NextResponse.json({ results: [], message: 'No hay campañas activas con datos de Meta' });
    }

    // Get ads for these campaigns
    const campaignIds = campaigns.map(c => c.id);
    const { data: ads } = await admin
      .from('campaign_ads')
      .select('id, campaign_id, name, meta_ad_id, status')
      .in('campaign_id', campaignIds)
      .not('meta_ad_id', 'is', null);

    if (!ads?.length) {
      return NextResponse.json({ results: [], message: 'No hay anuncios publicados en Meta' });
    }

    // Build a campaign name lookup
    const campaignMap = new Map(campaigns.map(c => [c.id, c]));

    // Get metrics for the last 14 days to have enough data for baseline + current
    const now = new Date();
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const dateRange = {
      since: fourteenDaysAgo.toISOString().split('T')[0],
      until: now.toISOString().split('T')[0],
    };

    // Try to get ad-level insights from Meta for more granular data
    let adMetricInputs: AdMetricInput[] = [];

    try {
      const metaClient = await getMetaClientForUser(user.id);

      for (const ad of ads) {
        if (!ad.meta_ad_id) continue;

        const campaign = campaignMap.get(ad.campaign_id);
        if (!campaign) continue;

        try {
          const insights = await metaClient.getCampaignInsights(
            ad.meta_ad_id,
            dateRange
          );

          if (insights.data?.length) {
            const dailyData = insights.data.map((day: Record<string, unknown>) => ({
              date: String(day.date_start || ''),
              impressions: Number(day.impressions || 0),
              clicks: Number(day.clicks || 0),
              frequency: Number(day.frequency || 0),
            }));

            adMetricInputs.push({
              adId: ad.id,
              metaAdId: ad.meta_ad_id,
              adName: ad.name || 'Sin nombre',
              campaignId: ad.campaign_id,
              campaignName: campaign.name || 'Sin nombre',
              dailyData,
            });
          }
        } catch {
          // Individual ad insight fetch failed; skip this ad
        }
      }
    } catch {
      // Meta client unavailable; fall back to local campaign_metrics data
    }

    // Fallback: if no Meta insights, use campaign_metrics table with ad-level approximation
    if (adMetricInputs.length === 0) {
      const { data: metrics } = await admin
        .from('campaign_metrics')
        .select('campaign_id, date, impressions, clicks, frequency')
        .in('campaign_id', campaignIds)
        .gte('date', dateRange.since)
        .lte('date', dateRange.until)
        .order('date', { ascending: true });

      if (metrics?.length) {
        // Group metrics by campaign and create one "ad" per campaign for analysis
        const metricsByCampaign = new Map<string, Array<{ date: string; impressions: number; clicks: number; frequency: number }>>();

        for (const m of metrics) {
          const existing = metricsByCampaign.get(m.campaign_id) || [];
          existing.push({
            date: m.date,
            impressions: Number(m.impressions || 0),
            clicks: Number(m.clicks || 0),
            frequency: Number(m.frequency || 0),
          });
          metricsByCampaign.set(m.campaign_id, existing);
        }

        // Map campaign-level data to ads
        for (const ad of ads) {
          const campaign = campaignMap.get(ad.campaign_id);
          if (!campaign) continue;

          const campaignMetrics = metricsByCampaign.get(ad.campaign_id);
          if (!campaignMetrics?.length) continue;

          // Distribute campaign metrics across ads in that campaign proportionally
          const adsInCampaign = ads.filter(a => a.campaign_id === ad.campaign_id);
          const adCount = adsInCampaign.length || 1;

          adMetricInputs.push({
            adId: ad.id,
            metaAdId: ad.meta_ad_id || '',
            adName: ad.name || 'Sin nombre',
            campaignId: ad.campaign_id,
            campaignName: campaign.name || 'Sin nombre',
            dailyData: campaignMetrics.map(d => ({
              ...d,
              impressions: Math.round(d.impressions / adCount),
              clicks: Math.round(d.clicks / adCount),
            })),
          });
        }
      }
    }

    if (adMetricInputs.length === 0) {
      return NextResponse.json({ results: [], message: 'No hay datos de métricas suficientes' });
    }

    const results = detectFatigue(adMetricInputs);

    // Also update/create creative_rotations records for detected issues
    for (const result of results) {
      if (result.status === 'warning' || result.status === 'fatigued') {
        // Check if there's already a record for this ad
        const { data: existing } = await admin
          .from('creative_rotations')
          .select('id, status')
          .eq('ad_id', result.adId)
          .in('status', ['warning', 'fatigued'])
          .maybeSingle();

        if (!existing) {
          await admin.from('creative_rotations').insert({
            user_id: user.id,
            campaign_id: result.campaignId,
            ad_id: result.adId,
            meta_ad_id: result.metaAdId,
            status: result.status,
            frequency_at_detection: result.frequency,
            ctr_at_detection: result.ctrCurrent,
            ctr_baseline: result.ctrBaseline,
            ctr_drop_percentage: result.ctrDropPercentage,
            impressions_at_detection: result.impressions,
            detected_at: new Date().toISOString(),
          });
        } else if (existing.status !== result.status) {
          // Update status if it changed (e.g., warning -> fatigued)
          await admin.from('creative_rotations')
            .update({
              status: result.status,
              frequency_at_detection: result.frequency,
              ctr_at_detection: result.ctrCurrent,
              ctr_drop_percentage: result.ctrDropPercentage,
              impressions_at_detection: result.impressions,
            })
            .eq('id', existing.id);
        }
      }
    }

    const fatiguedCount = results.filter(r => r.status === 'fatigued').length;
    const warningCount = results.filter(r => r.status === 'warning').length;

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        fatigued: fatiguedCount,
        warning: warningCount,
        healthy: results.length - fatiguedCount - warningCount,
      },
    }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (error) {
    return handleApiError(error, { route: 'creative-fatigue-GET' });
  }
}
