import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { AB_TEST_DESIGNER, buildABTestPrompt } from '@/lib/gemini/prompts';
import { abTestDesignSchema } from '@/lib/gemini/validators';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`ab-tests:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    // Check plan limit for ab_testing
    const limitCheck = await checkPlanLimit(user.id, 'ab_testing');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'Los A/B Tests están disponibles en el plan Growth o superior',
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      campaign_id,
      name,
      test_type,
      success_metric = 'ctr',
      test_duration_days = 14,
      min_conversions_per_variant = 30,
      auto_winner_enabled = true,
    } = body;

    if (!campaign_id || !name || !test_type) {
      return NextResponse.json(
        { error: 'campaign_id, name y test_type son requeridos' },
        { status: 400 }
      );
    }

    if (!['copy', 'creative', 'audience', 'hook'].includes(test_type)) {
      return NextResponse.json(
        { error: 'test_type debe ser: copy, creative, audience o hook' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get campaign data
    const { data: campaign, error: campaignError } = await admin
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    // Get business profile for context
    const { data: businessProfile } = await admin
      .from('business_profiles')
      .select('business_name, industry, description, location, brand_tone')
      .eq('user_id', user.id)
      .single();

    if (!businessProfile) {
      return NextResponse.json({ error: 'Perfil de negocio no encontrado' }, { status: 400 });
    }

    // Generate variants with Gemini AI
    const model = getGeminiPro();
    const prompt = buildABTestPrompt({
      campaign_data: campaign.campaign_data || {},
      test_type,
      business_profile: businessProfile,
    });

    const aiResult = await generateStructuredJSON(
      model,
      AB_TEST_DESIGNER,
      prompt,
      abTestDesignSchema
    );

    // Add IDs to variants
    const variants = aiResult.variants.map((v, i) => ({
      id: `variant_${Date.now()}_${i}`,
      ...v,
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        ctr: 0,
        cpa: 0,
      },
    }));

    // Save to database
    const { data: abTest, error: insertError } = await admin
      .from('ab_tests')
      .insert({
        user_id: user.id,
        campaign_id,
        name,
        test_type,
        status: 'draft',
        meta_campaign_id: campaign.meta_campaign_id || null,
        variants,
        winner_variant_id: null,
        success_metric,
        test_duration_days: aiResult.recommended_duration || test_duration_days,
        min_conversions_per_variant,
        auto_winner_enabled,
        hypothesis: aiResult.hypothesis,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Error creating ab test', { route: 'ab-tests-POST' }, insertError);
      return NextResponse.json({ error: 'Error al crear el A/B test' }, { status: 500 });
    }

    // Track usage
    await incrementUsage(user.id, 'ai_generations');

    return NextResponse.json({ test: abTest }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: 'ab-tests-POST' });
  }
}

export async function GET() {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`ab-tests-get:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const admin = createAdminClient();

    const { data: tests, error } = await admin
      .from('ab_tests')
      .select('*, campaigns(name, objective, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching ab tests', { route: 'ab-tests-GET' }, error);
      return NextResponse.json({ error: 'Error al obtener los tests' }, { status: 500 });
    }

    return NextResponse.json({ tests: tests || [] });
  } catch (error) {
    return handleApiError(error, { route: 'ab-tests-GET' });
  }
}
