import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { ELITE_TRAFFICKER, buildTraffickerAnalysisPrompt } from '@/lib/gemini/prompts';
import { traffickerAnalysisSchema } from '@/lib/gemini/validators';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`trafficker:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const limitCheck = await checkPlanLimit(user.id, 'ai_generations');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: `Has alcanzado el límite de ${limitCheck.limit} generaciones IA`,
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const { dateRange = 'last_14_days' } = await request.json();

    const admin = createAdminClient();

    // Get business profile
    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('business_name, industry')
      .eq('user_id', user.id)
      .single();

    // Get active/paused campaigns
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, name, status, objective, meta_campaign_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'paused']);

    if (!campaigns?.length) {
      return NextResponse.json({
        error: 'No tienes campañas activas para analizar. Publica al menos una campaña primero.',
      }, { status: 400 });
    }

    // Calculate date range
    const days = dateRange === 'last_7_days' ? 7 : dateRange === 'last_30_days' ? 30 : 14;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    // Get metrics for all campaigns
    const campaignData = [];
    let totalSpend = 0;

    for (const campaign of campaigns) {
      const { data: metrics } = await admin
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaign.id)
        .gte('date', sinceStr)
        .order('date', { ascending: true });

      // Aggregate KPIs
      const kpis = {
        impressions: 0, reach: 0, clicks: 0, spend: 0,
        conversions: 0, leads: 0, ctr: 0, cpc: 0, cpm: 0, cpa: 0, frequency: 0,
      };

      const ageMap = new Map<string, number>();
      const genderMap = new Map<string, number>();
      const placementMap = new Map<string, number>();

      for (const m of metrics || []) {
        kpis.impressions += Number(m.impressions);
        kpis.reach += Number(m.reach);
        kpis.clicks += Number(m.clicks);
        kpis.spend += Number(m.spend);
        kpis.conversions += Number(m.conversions);
        kpis.leads += Number(m.leads);

        // Aggregate breakdowns
        const ages = m.breakdown_age as Array<{ label: string; value: number }> | null;
        if (ages) for (const a of ages) ageMap.set(a.label, (ageMap.get(a.label) || 0) + a.value);
        const genders = m.breakdown_gender as Array<{ label: string; value: number }> | null;
        if (genders) for (const g of genders) genderMap.set(g.label, (genderMap.get(g.label) || 0) + g.value);
        const placements = m.breakdown_placement as Array<{ label: string; value: number }> | null;
        if (placements) for (const p of placements) placementMap.set(p.label, (placementMap.get(p.label) || 0) + p.value);
      }

      // Calculate derived metrics
      kpis.ctr = kpis.impressions > 0 ? (kpis.clicks / kpis.impressions) * 100 : 0;
      kpis.cpc = kpis.clicks > 0 ? kpis.spend / kpis.clicks : 0;
      kpis.cpm = kpis.impressions > 0 ? (kpis.spend / kpis.impressions) * 1000 : 0;
      kpis.cpa = kpis.conversions > 0 ? kpis.spend / kpis.conversions : 0;
      kpis.frequency = kpis.reach > 0 ? kpis.impressions / kpis.reach : 0;
      totalSpend += kpis.spend;

      // Build breakdowns with percentages
      const buildBreakdown = (map: Map<string, number>) => {
        const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
        return Array.from(map.entries())
          .map(([label, value]) => ({
            label,
            percentage: total > 0 ? Math.round((value / total) * 100) : 0,
          }))
          .sort((a, b) => b.percentage - a.percentage);
      };

      // Get ad sets
      const { data: adSets } = await admin
        .from('campaign_ad_sets')
        .select('id, name, meta_adset_id, budget')
        .eq('campaign_id', campaign.id);

      // Get ads
      const { data: ads } = await admin
        .from('campaign_ads')
        .select('id, name, meta_ad_id')
        .eq('campaign_id', campaign.id);

      campaignData.push({
        id: campaign.id,
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        meta_campaign_id: campaign.meta_campaign_id,
        kpis,
        breakdowns: {
          age: buildBreakdown(ageMap),
          gender: buildBreakdown(genderMap),
          placement: buildBreakdown(placementMap),
        },
        ads: (ads || []).map(ad => ({
          id: ad.id,
          name: ad.name,
          meta_ad_id: ad.meta_ad_id,
          impressions: 0,
          clicks: 0,
          spend: 0,
          ctr: 0,
        })),
        adSets: (adSets || []).map(as => ({
          id: as.id,
          name: as.name,
          meta_adset_id: as.meta_adset_id,
          daily_budget: Number(as.budget) || 0,
          impressions: 0,
          clicks: 0,
          spend: 0,
          ctr: 0,
        })),
      });
    }

    // Call Gemini
    const model = getGeminiPro();
    const prompt = buildTraffickerAnalysisPrompt({
      business_name: businessProfile?.business_name || 'Mi Negocio',
      industry: businessProfile?.industry || null,
      campaigns: campaignData,
      total_spend: totalSpend,
      date_range: `Últimos ${days} días`,
    });

    const analysis = await generateStructuredJSON(
      model,
      ELITE_TRAFFICKER,
      prompt,
      traffickerAnalysisSchema
    );

    await incrementUsage(user.id, 'ai_generations');

    // Save analysis to DB for persistence
    const { data: saved, error: saveError } = await admin
      .from('trafiquer_analyses')
      .insert({
        user_id: user.id,
        health_score: analysis.health_score,
        overall_assessment: analysis.overall_assessment,
        campaign_diagnostics: analysis.campaign_diagnostics,
        recommendations: analysis.recommendations,
        audience_insights: analysis.audience_insights,
        prediction_30d: analysis.prediction_30d,
        industry_comparison: analysis.industry_comparison,
        feature_status: null,
      })
      .select('id, created_at')
      .single();

    if (saveError) {
      logger.error('Failed to save analysis', { route: 'analytics/trafficker-analysis' }, saveError);
    }

    logger.info('Trafficker analysis complete', {
      route: 'analytics/trafficker-analysis',
      userId: user.id,
      campaigns: campaigns.length,
      healthScore: analysis.health_score,
    });

    return NextResponse.json({
      analysis,
      id: saved?.id || null,
      created_at: saved?.created_at || new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: 'analytics/trafficker-analysis' });
  }
}

// GET: Load the most recent analysis for the current user
export async function GET() {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`trafficker-get:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const { data, error } = await supabase
      .from('trafiquer_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ analysis: null });
    }

    // Reconstruct the analysis object from DB columns
    const analysis = {
      health_score: data.health_score,
      overall_assessment: data.overall_assessment,
      campaign_diagnostics: data.campaign_diagnostics || [],
      recommendations: data.recommendations || [],
      audience_insights: data.audience_insights || {},
      prediction_30d: data.prediction_30d || {},
      industry_comparison: data.industry_comparison || {},
    };

    return NextResponse.json({
      analysis,
      id: data.id,
      created_at: data.created_at,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    return handleApiError(error, { route: 'analytics/trafficker-analysis' });
  }
}
