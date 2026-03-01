import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { CAMPAIGN_STRATEGIST, buildCampaignStrategyPrompt } from '@/lib/gemini/prompts';
import { campaignStrategySchema } from '@/lib/gemini/validators';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { prompt, count = 3 } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt es requerido' }, { status: 400 });
    }

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
        user_goal: `${prompt} (Variación ${i + 1} de ${campaignCount} — genera una estrategia diferente a las anteriores)`,
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
    console.error('Generate bulk error:', error);
    const message = error instanceof Error ? error.message : 'Error al generar campañas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
