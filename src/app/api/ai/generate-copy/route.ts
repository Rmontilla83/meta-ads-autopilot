import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getGeminiFlash, generateStructuredJSON } from '@/lib/gemini/client';
import { COPY_WRITER, buildCopyPrompt } from '@/lib/gemini/prompts';
import { copyVariationsSchema } from '@/lib/gemini/validators';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';
import { sanitizeString } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`gen-copy:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
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
    const { business_name, campaign_objective, tone, product_or_service, targeting_context, num_variations } = body as {
      business_name: string;
      campaign_objective: string;
      tone?: string;
      product_or_service?: string;
      targeting_context?: {
        countries?: string[];
        cities?: Array<{ name: string }>;
        age_min?: number;
        age_max?: number;
        interests?: Array<{ name: string }>;
      };
      num_variations?: number;
    };

    if (!business_name || !campaign_objective) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Sanitize text inputs
    const sanitizedBusinessName = sanitizeString(business_name, 500);
    const sanitizedObjective = sanitizeString(campaign_objective, 1000);
    const sanitizedTone = tone ? sanitizeString(tone, 200) : null;
    const sanitizedProduct = product_or_service ? sanitizeString(product_or_service, 2000) : undefined;

    // Fetch brand analysis for tone/personality context
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('brand_analysis')
      .eq('user_id', user.id)
      .single();

    const brandAnalysis = profile?.brand_analysis;

    const model = getGeminiFlash();
    const prompt = buildCopyPrompt({
      business_name: sanitizedBusinessName,
      campaign_objective: sanitizedObjective,
      tone: sanitizedTone,
      product_or_service: sanitizedProduct,
      targeting_context,
      num_variations,
      brand_analysis_tone: brandAnalysis?.tone_description,
      brand_personality: brandAnalysis?.personality,
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
    return handleApiError(error, { route: 'ai/generate-copy' });
  }
}
