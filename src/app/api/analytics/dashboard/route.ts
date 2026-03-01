import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('dateRange') || '7d';

  const days = range === '30d' ? 30 : range === '14d' ? 14 : 7;
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - days);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - days);

  const currentStartStr = currentStart.toISOString().split('T')[0];
  const previousStartStr = previousStart.toISOString().split('T')[0];
  const currentEndStr = now.toISOString().split('T')[0];

  // Get current period metrics
  const { data: currentMetrics } = await supabase
    .from('campaign_metrics')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', currentStartStr)
    .lte('date', currentEndStr)
    .order('date', { ascending: true });

  // Get previous period metrics for comparison
  const { data: previousMetrics } = await supabase
    .from('campaign_metrics')
    .select('spend, reach, clicks, conversions, impressions')
    .eq('user_id', user.id)
    .gte('date', previousStartStr)
    .lt('date', currentStartStr);

  // Aggregate current period
  const current = {
    spend: 0, reach: 0, clicks: 0, conversions: 0, impressions: 0,
  };
  for (const m of currentMetrics || []) {
    current.spend += Number(m.spend);
    current.reach += Number(m.reach);
    current.clicks += Number(m.clicks);
    current.conversions += Number(m.conversions);
    current.impressions += Number(m.impressions);
  }

  // Aggregate previous period
  const previous = {
    spend: 0, reach: 0, clicks: 0, conversions: 0,
  };
  for (const m of previousMetrics || []) {
    previous.spend += Number(m.spend);
    previous.reach += Number(m.reach);
    previous.clicks += Number(m.clicks);
    previous.conversions += Number(m.conversions);
  }

  const pctChange = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 10000) / 100 : curr > 0 ? 100 : 0;

  const kpis = {
    spend: Math.round(current.spend * 100) / 100,
    spendChange: pctChange(current.spend, previous.spend),
    reach: current.reach,
    reachChange: pctChange(current.reach, previous.reach),
    clicks: current.clicks,
    clicksChange: pctChange(current.clicks, previous.clicks),
    conversions: current.conversions,
    conversionsChange: pctChange(current.conversions, previous.conversions),
    impressions: current.impressions,
    ctr: current.impressions > 0 ? Math.round((current.clicks / current.impressions) * 10000) / 100 : 0,
    cpc: current.clicks > 0 ? Math.round((current.spend / current.clicks) * 100) / 100 : 0,
    cpm: current.impressions > 0 ? Math.round((current.spend / current.impressions) * 100000) / 100 : 0,
  };

  // Build daily time series
  const dateMap = new Map<string, {
    date: string; impressions: number; reach: number; clicks: number;
    spend: number; conversions: number; leads: number; ctr: number; cpc: number; cpm: number;
  }>();

  for (const m of currentMetrics || []) {
    const existing = dateMap.get(m.date) || {
      date: m.date, impressions: 0, reach: 0, clicks: 0,
      spend: 0, conversions: 0, leads: 0, ctr: 0, cpc: 0, cpm: 0,
    };
    existing.impressions += Number(m.impressions);
    existing.reach += Number(m.reach);
    existing.clicks += Number(m.clicks);
    existing.spend += Number(m.spend);
    existing.conversions += Number(m.conversions);
    existing.leads += Number(m.leads);
    dateMap.set(m.date, existing);
  }

  // Recalculate rates for aggregated daily
  const timeSeries = Array.from(dateMap.values()).map(d => ({
    ...d,
    spend: Math.round(d.spend * 100) / 100,
    ctr: d.impressions > 0 ? Math.round((d.clicks / d.impressions) * 10000) / 100 : 0,
    cpc: d.clicks > 0 ? Math.round((d.spend / d.clicks) * 100) / 100 : 0,
    cpm: d.impressions > 0 ? Math.round((d.spend / d.impressions) * 100000) / 100 : 0,
  }));

  return NextResponse.json({ kpis, timeSeries });
}
