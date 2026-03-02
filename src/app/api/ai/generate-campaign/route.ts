import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { CAMPAIGN_STRATEGIST, buildCampaignStrategyPrompt } from '@/lib/gemini/prompts';
import { campaignStrategySchema } from '@/lib/gemini/validators';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';
import { sanitizeString } from '@/lib/validators';
import type { ChatMessage } from '@/lib/gemini/types';
import type { BusinessProfile } from '@/types';

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`gen-campaign:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    // Check AI generation limit
    const limitCheck = await checkPlanLimit(user.id, 'ai_generations');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: `Has alcanzado el límite de ${limitCheck.limit} generaciones IA de tu plan`,
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const body = await request.json();
    const { messages, business_profile } = body as {
      messages: ChatMessage[];
      business_profile: BusinessProfile;
    };

    if (!messages?.length || !business_profile) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No se encontró mensaje del usuario' }, { status: 400 });
    }

    // Sanitize user input
    const sanitizedUserGoal = sanitizeString(lastUserMessage.content, 10000);

    // Load buyer personas, sales angles, and brand analysis from DB
    const { data: dbProfile } = await supabase
      .from('business_profiles')
      .select('buyer_personas, sales_angles, brand_analysis, brand_tone')
      .eq('user_id', user.id)
      .single();

    // Build brand context string for injection
    const brandAnalysis = dbProfile?.brand_analysis;
    let brandContext = '';
    if (brandAnalysis) {
      brandContext = `\nIDENTIDAD DE MARCA:
- Estilo visual: ${brandAnalysis.visual_style || 'No definido'}
- Personalidad: ${brandAnalysis.personality?.join(', ') || 'No definida'}
- Tono: ${brandAnalysis.tone_description || dbProfile?.brand_tone || 'No definido'}
- Estilos recomendados: ${brandAnalysis.recommended_ad_styles?.join(', ') || 'No definidos'}`;
    }

    const model = getGeminiPro();
    const prompt = buildCampaignStrategyPrompt({
      business_profile: {
        business_name: business_profile.business_name,
        industry: business_profile.industry,
        description: business_profile.description,
        location: business_profile.location,
        objectives: business_profile.objectives,
        monthly_budget: business_profile.monthly_budget,
        brand_tone: business_profile.brand_tone,
      },
      user_goal: sanitizedUserGoal + brandContext,
      buyer_personas: dbProfile?.buyer_personas?.length ? dbProfile.buyer_personas : undefined,
      sales_angles: dbProfile?.sales_angles?.length ? dbProfile.sales_angles : undefined,
    });

    const campaign = await generateStructuredJSON(
      model,
      CAMPAIGN_STRATEGIST,
      prompt,
      campaignStrategySchema
    );

    // Save conversation
    const allMessages: ChatMessage[] = [
      ...messages,
      {
        role: 'assistant' as const,
        content: JSON.stringify(campaign),
        timestamp: new Date().toISOString(),
      },
    ];

    await supabase.from('ai_conversations').insert({
      user_id: user.id,
      messages: allMessages,
    });

    await incrementUsage(user.id, 'ai_generations');

    return NextResponse.json({ campaign });
  } catch (error) {
    return handleApiError(error, { route: 'ai/generate-campaign' });
  }
}
