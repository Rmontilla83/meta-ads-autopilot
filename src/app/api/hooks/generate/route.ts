import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { HOOK_GENERATOR, buildHookGeneratorPrompt } from '@/lib/gemini/prompts';
import { hookGeneratorSchema } from '@/lib/gemini/validators';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`hooks:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const limitCheck = await checkPlanLimit(user.id, 'ab_testing');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'La generación de hooks está disponible en el plan Growth o superior',
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

    // Get business profile
    const { data: businessProfile } = await admin
      .from('business_profiles')
      .select('business_name, industry, description, brand_tone')
      .eq('user_id', user.id)
      .single();

    if (!businessProfile) {
      return NextResponse.json({ error: 'Perfil de negocio no encontrado' }, { status: 400 });
    }

    const campaignData = campaign.campaign_data as {
      campaign?: { name?: string; objective?: string };
      ads?: Array<{ primary_text?: string }>;
      ad_sets?: Array<{ targeting?: { interests?: Array<{ name: string }> } }>;
    };

    // Build audience description from targeting
    const targeting = campaignData.ad_sets?.[0]?.targeting;
    const targetAudience = targeting?.interests
      ? `Intereses: ${targeting.interests.map((i) => i.name).join(', ')}`
      : 'Audiencia general';

    // Get existing copy
    const existingCopy = campaignData.ads?.[0]?.primary_text || '';

    // Generate hooks
    const model = getGeminiPro();
    const prompt = buildHookGeneratorPrompt({
      business_name: businessProfile.business_name,
      industry: businessProfile.industry,
      description: businessProfile.description,
      campaign_name: campaignData.campaign?.name || campaign.name,
      objective: campaignData.campaign?.objective || campaign.objective || 'OUTCOME_TRAFFIC',
      target_audience: targetAudience,
      brand_tone: businessProfile.brand_tone,
      existing_copy: existingCopy,
    });

    const result = await generateStructuredJSON(
      model,
      HOOK_GENERATOR,
      prompt,
      hookGeneratorSchema
    );

    await incrementUsage(user.id, 'ai_generations');

    return NextResponse.json({
      hooks: result.hooks,
      campaign: {
        id: campaign.id,
        name: campaign.name,
      },
    });
  } catch (error) {
    return handleApiError(error, { route: 'hooks-generate' });
  }
}
