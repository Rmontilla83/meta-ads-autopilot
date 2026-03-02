import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { FUNNEL_ARCHITECT, buildFunnelPrompt } from '@/lib/gemini/prompts';
import { funnelDesignSchema } from '@/lib/gemini/validators';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`funnel-gen:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    // Check plan limit for funnels
    const limitCheck = await checkPlanLimit(user.id, 'funnels');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'Los funnels de ventas están disponibles desde el plan Growth',
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    // Check AI generation limit
    const aiLimitCheck = await checkPlanLimit(user.id, 'ai_generations');
    if (!aiLimitCheck.allowed) {
      return NextResponse.json({
        error: `Has alcanzado el límite de ${aiLimitCheck.limit} generaciones IA de tu plan`,
        upgrade: true,
        planRequired: aiLimitCheck.planRequired,
      }, { status: 403 });
    }

    const body = await request.json();
    const { goal, daily_budget } = body as { goal: string; daily_budget: number };

    if (!goal?.trim()) {
      return NextResponse.json({ error: 'El objetivo del funnel es requerido' }, { status: 400 });
    }

    if (!daily_budget || daily_budget < 3) {
      return NextResponse.json({ error: 'El presupuesto mínimo para un funnel es $3 USD/día' }, { status: 400 });
    }

    // Get business profile
    const admin = createAdminClient();
    const { data: businessProfile, error: bpError } = await admin
      .from('business_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (bpError || !businessProfile) {
      return NextResponse.json({ error: 'Completa tu perfil de negocio primero' }, { status: 400 });
    }

    // Generate funnel with Gemini
    const model = getGeminiPro();
    const prompt = buildFunnelPrompt({
      businessProfile: {
        business_name: businessProfile.business_name,
        industry: businessProfile.industry,
        description: businessProfile.description,
        location: businessProfile.location,
        objectives: businessProfile.objectives || [],
        monthly_budget: businessProfile.monthly_budget,
        brand_tone: businessProfile.brand_tone,
      },
      goal,
      dailyBudget: daily_budget,
    });

    const funnelConfig = await generateStructuredJSON(
      model,
      FUNNEL_ARCHITECT,
      prompt,
      funnelDesignSchema,
    );

    // Save draft to funnel_campaigns table
    const { data: funnel, error: insertError } = await admin
      .from('funnel_campaigns')
      .insert({
        user_id: user.id,
        name: funnelConfig.funnel_name,
        goal,
        status: 'draft',
        funnel_config: funnelConfig.stages,
        daily_budget: daily_budget,
        custom_audience_ids: [],
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Error saving funnel', { route: 'funnels-generate' }, insertError);
      return NextResponse.json({ error: 'Error al guardar el funnel' }, { status: 500 });
    }

    await incrementUsage(user.id, 'ai_generations');

    return NextResponse.json({
      funnel,
      config: funnelConfig,
    });
  } catch (error) {
    return handleApiError(error, { route: 'funnels-generate' });
  }
}
