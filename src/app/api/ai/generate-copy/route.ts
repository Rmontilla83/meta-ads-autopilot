import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGeminiFlash, generateStructuredJSON } from '@/lib/gemini/client';
import { COPY_WRITER, buildCopyPrompt } from '@/lib/gemini/prompts';
import { copyVariationsSchema } from '@/lib/gemini/validators';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const limitCheck = await checkPlanLimit(user.id, 'ai_generations');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: `Has alcanzado el límite de ${limitCheck.limit} generaciones IA de tu plan`,
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const body = await request.json();
    const { business_name, campaign_objective, tone, product_or_service } = body as {
      business_name: string;
      campaign_objective: string;
      tone?: string;
      product_or_service?: string;
    };

    if (!business_name || !campaign_objective) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const model = getGeminiFlash();
    const prompt = buildCopyPrompt({
      business_name,
      campaign_objective,
      tone: tone || null,
      product_or_service,
    });

    const result = await generateStructuredJSON(
      model,
      COPY_WRITER,
      prompt,
      copyVariationsSchema
    );

    await incrementUsage(user.id, 'ai_generations');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Generate copy error:', error);
    const message = error instanceof Error ? error.message : 'Error al generar el copy';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
