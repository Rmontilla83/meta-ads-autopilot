import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaClientForUser } from '@/lib/meta/client';
import { checkPlanLimit } from '@/lib/plan-limits';
import { getGeminiFlash, generateStructuredJSON } from '@/lib/gemini/client';
import { SCHEDULE_OPTIMIZER, buildScheduleOptimizationPrompt } from '@/lib/gemini/prompts';
import { scheduleOptimizationSchema } from '@/lib/gemini/validators';
import { buildHeatmap } from '@/lib/scheduling/mapper';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`scheduling-analyze:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    // Check plan limit
    const limitCheck = await checkPlanLimit(user.id, 'smart_scheduling');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'Smart Scheduling requiere un plan Growth o superior',
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
      .select('id, name, meta_campaign_id, status, user_id')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    if (!campaign.meta_campaign_id) {
      return NextResponse.json({
        error: 'La campaña debe estar publicada en Meta para analizar horarios',
      }, { status: 400 });
    }

    // Fetch hourly insights for last 14 days
    const metaClient = await getMetaClientForUser(user.id);
    const now = new Date();
    const since = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const dateRange = {
      since: since.toISOString().split('T')[0],
      until: now.toISOString().split('T')[0],
    };

    let hourlyInsights: Array<Record<string, unknown>> = [];
    try {
      const response = await metaClient.getCampaignInsightsHourly(
        campaign.meta_campaign_id,
        dateRange
      );
      hourlyInsights = response.data || [];
    } catch (metaError) {
      logger.error('[Scheduling] Error fetching hourly insights', { route: 'scheduling-analyze' }, metaError);
      return NextResponse.json({
        error: 'No se pudieron obtener datos horarios de Meta. Verifica que la campaña tenga datos suficientes.',
      }, { status: 400 });
    }

    if (hourlyInsights.length === 0) {
      return NextResponse.json({
        error: 'No hay datos horarios disponibles para esta campaña. Necesita al menos unos días de datos activos.',
      }, { status: 400 });
    }

    // Build heatmap
    const heatmap = buildHeatmap(hourlyInsights as Array<{
      hourly_stats_aggregated_by_advertiser_time_zone: string;
      impressions: string;
      clicks: string;
      spend: string;
      actions?: Array<{ action_type: string; value: string }>;
      date_start?: string;
    }>);

    // Calculate current spend from the data
    const currentSpend = hourlyInsights.reduce((sum, row) => {
      return sum + (parseFloat(row.spend as string) || 0);
    }, 0);

    // Call Gemini for schedule recommendation
    const model = getGeminiFlash();
    const prompt = buildScheduleOptimizationPrompt({
      campaignName: campaign.name,
      heatmap,
      currentSpend,
    });

    const recommendation = await generateStructuredJSON(
      model,
      SCHEDULE_OPTIMIZER,
      prompt,
      scheduleOptimizationSchema
    );

    // Save to schedule_configs table
    const { data: savedConfig, error: saveError } = await admin
      .from('schedule_configs')
      .upsert({
        user_id: user.id,
        campaign_id: campaign_id,
        schedule_matrix: recommendation.schedule_matrix,
        performance_heatmap: heatmap,
        is_applied: false,
        last_evaluated_at: new Date().toISOString(),
      }, {
        onConflict: 'campaign_id',
      })
      .select()
      .single();

    if (saveError) {
      logger.error('[Scheduling] Error saving config', { route: 'scheduling-analyze' }, saveError);
      // Continue even if save fails - we still have the data to return
    }

    return NextResponse.json({
      heatmap,
      recommendation: {
        schedule_matrix: recommendation.schedule_matrix,
        expected_savings_pct: recommendation.expected_savings_pct,
        reasoning: recommendation.reasoning,
        best_hours: recommendation.best_hours,
        worst_hours: recommendation.worst_hours,
      },
      config_id: savedConfig?.id || null,
      current_spend_14d: currentSpend,
    });
  } catch (error) {
    return handleApiError(error, { route: 'scheduling-analyze' });
  }
}
