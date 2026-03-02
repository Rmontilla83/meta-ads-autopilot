import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`funnel-detail:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const { id } = await params;
    const admin = createAdminClient();

    // Get funnel
    const { data: funnel, error: funnelError } = await admin
      .from('funnel_campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (funnelError || !funnel) {
      return NextResponse.json({ error: 'Funnel no encontrado' }, { status: 404 });
    }

    // Get metrics for each stage campaign
    const stageMetrics: Record<string, {
      impressions: number;
      reach: number;
      clicks: number;
      conversions: number;
      spend: number;
      ctr: number;
      cpc: number;
      cpm: number;
    }> = {
      tofu: { impressions: 0, reach: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0 },
      mofu: { impressions: 0, reach: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0 },
      bofu: { impressions: 0, reach: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0 },
    };

    // Map stage -> local campaign UUID
    const campaignMap: Record<string, string> = {};
    if (funnel.tofu_campaign_id) campaignMap['tofu'] = funnel.tofu_campaign_id;
    if (funnel.mofu_campaign_id) campaignMap['mofu'] = funnel.mofu_campaign_id;
    if (funnel.bofu_campaign_id) campaignMap['bofu'] = funnel.bofu_campaign_id;

    // Get campaigns from DB by local UUIDs
    const localCampaignIds = Object.values(campaignMap).filter(Boolean);
    let campaignsData: Array<Record<string, unknown>> = [];

    if (localCampaignIds.length > 0) {
      const { data } = await admin
        .from('campaigns')
        .select('id, name, status, meta_campaign_id, objective')
        .in('id', localCampaignIds);
      campaignsData = data || [];
    }

    // Get metrics for each stage
    for (const [stage, localCampaignId] of Object.entries(campaignMap)) {
      const campaign = campaignsData.find((c) => c.id === localCampaignId);
      if (!campaign) continue;

      const { data: metrics } = await admin
        .from('campaign_metrics')
        .select('impressions, reach, clicks, conversions, spend, ctr, cpc, cpm')
        .eq('campaign_id', campaign.id as string)
        .order('date', { ascending: false })
        .limit(30);

      if (metrics && metrics.length > 0) {
        const totals = metrics.reduce(
          (acc, m) => ({
            impressions: acc.impressions + (m.impressions || 0),
            reach: acc.reach + (m.reach || 0),
            clicks: acc.clicks + (m.clicks || 0),
            conversions: acc.conversions + (m.conversions || 0),
            spend: acc.spend + (m.spend || 0),
            ctr: 0,
            cpc: 0,
            cpm: 0,
          }),
          { impressions: 0, reach: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0 }
        );

        // Calculate derived metrics
        totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
        totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
        totals.cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;

        stageMetrics[stage] = totals;
      }
    }

    // Calculate conversion rates between stages
    const conversionRates = {
      tofu_to_mofu: stageMetrics.tofu.clicks > 0
        ? ((stageMetrics.mofu.impressions / stageMetrics.tofu.clicks) * 100)
        : 0,
      mofu_to_bofu: stageMetrics.mofu.clicks > 0
        ? ((stageMetrics.bofu.impressions / stageMetrics.mofu.clicks) * 100)
        : 0,
      overall: stageMetrics.tofu.impressions > 0
        ? ((stageMetrics.bofu.conversions / stageMetrics.tofu.impressions) * 100)
        : 0,
    };

    return NextResponse.json({
      funnel,
      stageMetrics,
      conversionRates,
      campaigns: campaignsData,
    }, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (error) {
    return handleApiError(error, { route: 'funnels-[id]-GET' });
  }
}
