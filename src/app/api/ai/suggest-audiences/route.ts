import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGeminiFlash, generateStructuredJSON } from '@/lib/gemini/client';
import { AUDIENCE_EXPERT, buildAudiencePrompt } from '@/lib/gemini/prompts';
import { audienceSuggestionsSchema } from '@/lib/gemini/validators';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { business_name, industry, objective, location } = body as {
      business_name: string;
      industry?: string;
      objective: string;
      location?: string;
    };

    if (!business_name || !objective) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const model = getGeminiFlash();
    const prompt = buildAudiencePrompt({
      business_name,
      industry: industry || null,
      objective,
      location: location || null,
    });

    const result = await generateStructuredJSON(
      model,
      AUDIENCE_EXPERT,
      prompt,
      audienceSuggestionsSchema
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Suggest audiences error:', error);
    const message = error instanceof Error ? error.message : 'Error al sugerir audiencias';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
