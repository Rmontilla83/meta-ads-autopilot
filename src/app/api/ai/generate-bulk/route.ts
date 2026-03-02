import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { CAMPAIGN_STRATEGIST, buildCampaignStrategyPrompt } from '@/lib/gemini/prompts';
import { campaignStrategySchema } from '@/lib/gemini/validators';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';
import { sanitizeString } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`gen-bulk:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const { prompt, count = 3 } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt es requerido' }, { status: 400 });
    }

    // Sanitize text input
    const sanitizedPrompt = sanitizeString(prompt, 5000);
    const campaignCount = Math.min(Math.max(1, count), 10);

    // Get business profile
    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!businessProfile) {
      return NextResponse.json({ error: 'Perfil de negocio no encontrado' }, { status: 400 });
    }

    const model = getGeminiPro();
    const campaigns = [];

    for (let i = 0; i < campaignCount; i++) {
      const userMessage = buildCampaignStrategyPrompt({
        business_profile: {
          business_name: businessProfile.business_name,
          industry: businessProfile.industry,
          description: businessProfile.description,
          location: businessProfile.location,
          objectives: businessProfile.objectives || [],
          monthly_budget: businessProfile.monthly_budget,
          brand_tone: businessProfile.brand_tone,
        },
        user_goal: `${sanitizedPrompt} (Variación ${i + 1} de ${campaignCount} — genera una estrategia diferente a las anteriores)`,
        budget: undefined,
      });

      const result = await generateStructuredJSON(
        model,
        CAMPAIGN_STRATEGIST,
        userMessage,
        campaignStrategySchema
      );

      // Append variation number to name
      result.campaign.name = `${result.campaign.name} (${i + 1})`;
      campaigns.push(result);
    }

    return NextResponse.json({ campaigns });
  } catch (error) {
    return handleApiError(error, { route: 'ai/generate-bulk' });
  }
}
