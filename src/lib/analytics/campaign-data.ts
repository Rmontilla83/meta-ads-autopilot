import { createAdminClient } from '@/lib/supabase/admin';
import type { BreakdownEntry } from '@/types';

export interface CampaignAnalytics {
  campaign: Record<string, unknown>;
  kpis: {
    impressions: number;
    reach: number;
    clicks: number;
    spend: number;
    conversions: number;
    leads: number;
    ctr: number;
    cpc: number;
    cpm: number;
    cpa: number;
    frequency: number;
  };
  timeSeries: Array<{
    date: string;
    impressions: number;
    reach: number;
    clicks: number;
    spend: number;
    conversions: number;
    leads: number;
    ctr: number;
    cpc: number;
    cpm: number;
  }>;
  breakdowns: {
    age: BreakdownEntry[];
    gender: BreakdownEntry[];
    placement: BreakdownEntry[];
    device: BreakdownEntry[];
  };
  adSets: Record<string, unknown>[];
  ads: Record<string, unknown>[];
}

export async function getCampaignAnalytics(
  campaignId: string,
  userId: string,
  days: number = 30
): Promise<CampaignAnalytics | null> {
  const supabase = createAdminClient();

  // Verify campaign ownership
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();

  if (campError || !campaign) return null;

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  // Get metrics
  const { data: metrics } = await supabase
    .from('campaign_metrics')
    .select('*')
    .eq('campaign_id', campaignId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', now.toISOString().split('T')[0])
    .order('date', { ascending: true });

  // Aggregate KPIs
  const kpis = {
    impressions: 0, reach: 0, clicks: 0, spend: 0,
    conversions: 0, leads: 0, ctr: 0, cpc: 0, cpm: 0, cpa: 0, frequency: 0,
  };

  const breakdowns = {
    age: new Map<string, { value: number }>(),
    gender: new Map<string, { value: number }>(),
    placement: new Map<string, { value: number }>(),
    device: new Map<string, { value: number }>(),
  };

  for (const m of metrics || []) {
    kpis.impressions += Number(m.impressions);
    kpis.reach += Number(m.reach);
    kpis.clicks += Number(m.clicks);
    kpis.spend += Number(m.spend);
    kpis.conversions += Number(m.conversions);
    kpis.leads += Number(m.leads);

    const mergeBreakdown = (source: Array<{ label: string; value: number }>, target: Map<string, { value: number }>) => {
      for (const entry of source || []) {
        const existing = target.get(entry.label) || { value: 0 };
        existing.value += entry.value;
        target.set(entry.label, existing);
      }
    };
    mergeBreakdown(m.breakdown_age, breakdowns.age);
    mergeBreakdown(m.breakdown_gender, breakdowns.gender);
    mergeBreakdown(m.breakdown_placement, breakdowns.placement);
    mergeBreakdown(m.breakdown_device, breakdowns.device);
  }

  // Calculate rates
  kpis.ctr = kpis.impressions > 0 ? Math.round((kpis.clicks / kpis.impressions) * 10000) / 100 : 0;
  kpis.cpc = kpis.clicks > 0 ? Math.round((kpis.spend / kpis.clicks) * 100) / 100 : 0;
  kpis.cpm = kpis.impressions > 0 ? Math.round((kpis.spend / kpis.impressions) * 100000) / 100 : 0;
  kpis.cpa = kpis.conversions > 0 ? Math.round((kpis.spend / kpis.conversions) * 100) / 100 : 0;
  kpis.frequency = kpis.reach > 0 ? Math.round((kpis.impressions / kpis.reach) * 100) / 100 : 0;
  kpis.spend = Math.round(kpis.spend * 100) / 100;

  // Build time series
  const timeSeries = (metrics || []).map(m => ({
    date: m.date,
    impressions: Number(m.impressions),
    reach: Number(m.reach),
    clicks: Number(m.clicks),
    spend: Math.round(Number(m.spend) * 100) / 100,
    conversions: Number(m.conversions),
    leads: Number(m.leads),
    ctr: Number(m.ctr),
    cpc: Number(m.cpc),
    cpm: Number(m.cpm),
  }));

  // Convert breakdown maps to sorted arrays
  const mapToArray = (map: Map<string, { value: number }>) => {
    const entries = Array.from(map.entries()).map(([label, { value }]) => ({
      label, value, percentage: 0,
    }));
    const total = entries.reduce((s, e) => s + e.value, 0);
    for (const e of entries) {
      e.percentage = total > 0 ? Math.round((e.value / total) * 10000) / 100 : 0;
    }
    return entries.sort((a, b) => b.value - a.value);
  };

  // Get ad sets and ads
  const { data: adSets } = await supabase
    .from('campaign_ad_sets')
    .select('*')
    .eq('campaign_id', campaignId);

  const { data: ads } = await supabase
    .from('campaign_ads')
    .select('*')
    .eq('campaign_id', campaignId);

  return {
    campaign,
    kpis,
    timeSeries,
    breakdowns: {
      age: mapToArray(breakdowns.age),
      gender: mapToArray(breakdowns.gender),
      placement: mapToArray(breakdowns.placement),
      device: mapToArray(breakdowns.device),
    },
    adSets: adSets || [],
    ads: ads || [],
  };
}
