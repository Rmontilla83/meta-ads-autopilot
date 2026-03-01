import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Verify campaign ownership
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('dateRange') || '30d';
  const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  // Get metrics
  const { data: metrics } = await supabase
    .from('campaign_metrics')
    .select('*')
    .eq('campaign_id', id)
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

    // Merge breakdowns
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

  // Convert breakdown maps to sorted arrays with percentages
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
    .eq('campaign_id', id);

  const { data: ads } = await supabase
    .from('campaign_ads')
    .select('*')
    .eq('campaign_id', id);

  return NextResponse.json({
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
  });
}
