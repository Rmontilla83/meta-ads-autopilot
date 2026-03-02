import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { SCALING_ADVISOR, buildScalingPrompt } from '@/lib/gemini/prompts';
import { scalingRecommendationSchema } from '@/lib/gemini/validators';
import { checkPlanLimit } from '@/lib/plan-limits';
import { canScale } from '@/lib/scaling/guards';
import { incrementUsage } from '@/lib/usage';

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`scaling:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const limitCheck = await checkPlanLimit(user.id, 'auto_optimizer');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'El escalado de campañas está disponible en el plan Growth o superior',
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const { campaign_id } = await request.json();

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id es requerido' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get campaign
    const { data: campaign, error: campaignError } = await admin
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    // Get business profile for industry context
    const { data: businessProfile } = await admin
      .from('business_profiles')
      .select('industry')
      .eq('user_id', user.id)
      .single();

    // Get last 7 days of metrics
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: metrics } = await admin
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: true });

    if (!metrics || metrics.length < 2) {
      return NextResponse.json({
        error: 'No hay suficientes datos de métricas (se necesitan al menos 2 días)',
      }, { status: 400 });
    }

    // Calculate aggregate metrics
    const totals = metrics.reduce(
      (acc, m) => ({
        impressions: acc.impressions + (m.impressions || 0),
        clicks: acc.clicks + (m.clicks || 0),
        spend: acc.spend + (m.spend || 0),
        conversions: acc.conversions + (m.conversions || 0),
        frequency: acc.frequency + (m.frequency || 0),
      }),
      { impressions: 0, clicks: 0, spend: 0, conversions: 0, frequency: 0 }
    );

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
    const avgFrequency = totals.frequency / metrics.length;

    // Calculate trends
    const halfIdx = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, halfIdx);
    const secondHalf = metrics.slice(halfIdx);

    const avgCpaFirst = firstHalf.reduce((s, m) => s + (m.cpa || 0), 0) / (firstHalf.length || 1);
    const avgCpaSecond = secondHalf.reduce((s, m) => s + (m.cpa || 0), 0) / (secondHalf.length || 1);
    const avgCtrFirst = firstHalf.reduce((s, m) => s + (m.ctr || 0), 0) / (firstHalf.length || 1);
    const avgCtrSecond = secondHalf.reduce((s, m) => s + (m.ctr || 0), 0) / (secondHalf.length || 1);
    const avgSpendFirst = firstHalf.reduce((s, m) => s + (m.spend || 0), 0) / (firstHalf.length || 1);
    const avgSpendSecond = secondHalf.reduce((s, m) => s + (m.spend || 0), 0) / (secondHalf.length || 1);

    const getTrend = (first: number, second: number) => {
      if (first === 0) return 'estable';
      const change = ((second - first) / first) * 100;
      if (change > 10) return `subiendo (+${change.toFixed(0)}%)`;
      if (change < -10) return `bajando (${change.toFixed(0)}%)`;
      return 'estable';
    };

    const campaignData = campaign.campaign_data as {
      campaign?: { daily_budget?: number };
    };

    // Check guards
    const guardResult = await canScale(campaign_id, user.id);

    // Generate scaling recommendation with Gemini
    const model = getGeminiPro();
    const prompt = buildScalingPrompt({
      campaign_name: campaign.name,
      objective: campaign.objective || 'OUTCOME_TRAFFIC',
      days_analyzed: metrics.length,
      metrics: {
        impressions: totals.impressions,
        clicks: totals.clicks,
        spend: totals.spend,
        conversions: totals.conversions,
        ctr,
        cpc,
        cpa,
        frequency: avgFrequency,
      },
      trend: {
        cpa_trend: getTrend(avgCpaFirst, avgCpaSecond),
        ctr_trend: getTrend(avgCtrFirst, avgCtrSecond),
        spend_trend: getTrend(avgSpendFirst, avgSpendSecond),
      },
      current_daily_budget: campaignData.campaign?.daily_budget || 10,
      industry: businessProfile?.industry || null,
    });

    const result = await generateStructuredJSON(
      model,
      SCALING_ADVISOR,
      prompt,
      scalingRecommendationSchema
    );

    await incrementUsage(user.id, 'ai_generations');

    return NextResponse.json({
      recommendation: result.recommendation,
      guard_status: guardResult,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        meta_campaign_id: campaign.meta_campaign_id,
      },
    });
  } catch (error) {
    return handleApiError(error, { route: 'scaling-evaluate' });
  }
}
