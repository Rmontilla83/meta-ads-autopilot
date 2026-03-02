import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getGeminiFlash, generateStructuredJSON } from '@/lib/gemini/client';
import { AUDIENCE_EXPERT, buildAudiencePrompt } from '@/lib/gemini/prompts';
import { audienceSuggestionsSchema } from '@/lib/gemini/validators';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';
import { sanitizeString } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`suggest-audiences:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
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
    const { business_name, industry, objective, location } = body as {
      business_name: string;
      industry?: string;
      objective: string;
      location?: string;
    };

    if (!business_name || !objective) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Sanitize text inputs
    const sanitizedBusinessName = sanitizeString(business_name, 500);
    const sanitizedObjective = sanitizeString(objective, 1000);
    const sanitizedIndustry = industry ? sanitizeString(industry, 500) : null;
    const sanitizedLocation = location ? sanitizeString(location, 500) : null;

    const model = getGeminiFlash();
    const prompt = buildAudiencePrompt({
      business_name: sanitizedBusinessName,
      industry: sanitizedIndustry,
      objective: sanitizedObjective,
      location: sanitizedLocation,
    });

    const result = await generateStructuredJSON(
      model,
      AUDIENCE_EXPERT,
      prompt,
      audienceSuggestionsSchema
    );

    await incrementUsage(user.id, 'ai_generations');

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: 'ai/suggest-audiences' });
  }
}
