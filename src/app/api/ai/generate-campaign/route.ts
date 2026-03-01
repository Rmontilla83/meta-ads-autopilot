import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { CAMPAIGN_STRATEGIST, buildCampaignStrategyPrompt } from '@/lib/gemini/prompts';
import { campaignStrategySchema } from '@/lib/gemini/validators';
import type { ChatMessage } from '@/lib/gemini/types';
import type { BusinessProfile } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
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
      user_goal: lastUserMessage.content,
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

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Generate campaign error:', error);
    const message = error instanceof Error ? error.message : 'Error al generar la campaña';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
