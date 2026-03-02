import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { RETARGETING_STRATEGIST, buildRetargetingPrompt } from '@/lib/gemini/prompts';
import { retargetingStrategySchema } from '@/lib/gemini/validators';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`retargeting:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const limitCheck = await checkPlanLimit(user.id, 'retargeting');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'El retargeting está disponible en el plan Growth o superior',
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const { campaign_id } = await request.json();

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id es requerido' }, { status: 400 });
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

    // Get business profile
    const { data: businessProfile } = await admin
      .from('business_profiles')
      .select('business_name, industry, description, website, brand_tone')
      .eq('user_id', user.id)
      .single();

    if (!businessProfile) {
      return NextResponse.json({ error: 'Perfil de negocio no encontrado' }, { status: 400 });
    }

    // Get meta connection for pixel info
    const { data: metaConnection } = await admin
      .from('meta_connections')
      .select('pixel_id, pixel_name, ad_account_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const campaignData = campaign.campaign_data as {
      campaign?: { name?: string; objective?: string; daily_budget?: number };
    };

    // Generate retargeting opportunities with Gemini
    const model = getGeminiPro();
    const prompt = buildRetargetingPrompt({
      business_name: businessProfile.business_name,
      industry: businessProfile.industry,
      campaign_name: campaignData.campaign?.name || campaign.name,
      objective: campaignData.campaign?.objective || campaign.objective || 'OUTCOME_TRAFFIC',
      pixel_id: metaConnection?.pixel_id || null,
      has_pixel: !!metaConnection?.pixel_id,
      website: businessProfile.website,
      daily_budget: campaignData.campaign?.daily_budget || 10,
    });

    const result = await generateStructuredJSON(
      model,
      RETARGETING_STRATEGIST,
      prompt,
      retargetingStrategySchema
    );

    await incrementUsage(user.id, 'ai_generations');

    return NextResponse.json({
      opportunities: result.opportunities,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        objective: campaign.objective,
      },
      meta: {
        pixel_id: metaConnection?.pixel_id || null,
        ad_account_id: metaConnection?.ad_account_id || null,
      },
    });
  } catch (error) {
    return handleApiError(error, { route: 'retargeting-opportunities' });
  }
}
