import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getGeminiFlash, generateStructuredJSON } from '@/lib/gemini/client';
import { INTEREST_ADVISOR, buildInterestSuggestionsPrompt } from '@/lib/gemini/prompts';
import { interestKeywordsSchema } from '@/lib/gemini/validators';
import { getMetaClientForUser } from '@/lib/meta/client';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';
import { sanitizeString } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`suggest-interests:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
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
    const { objective, existing_interests } = body as {
      objective: string;
      existing_interests?: string[];
    };

    if (!objective) {
      return NextResponse.json({ error: 'objective es requerido' }, { status: 400 });
    }

    // Sanitize text input
    const sanitizedObjective = sanitizeString(objective, 1000);

    // Get business profile for context
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('business_name, industry, description')
      .eq('user_id', user.id)
      .single();

    // Step 1: AI generates interest keywords
    const model = getGeminiFlash();
    const prompt = buildInterestSuggestionsPrompt({
      business_name: profile?.business_name || 'Mi negocio',
      industry: profile?.industry || null,
      description: profile?.description || null,
      objective: sanitizedObjective,
      existing_interests: existing_interests || [],
    });

    const aiResult = await generateStructuredJSON(
      model,
      INTEREST_ADVISOR,
      prompt,
      interestKeywordsSchema
    );

    await incrementUsage(user.id, 'ai_generations');

    // Step 2: Validate each keyword against Meta's interest search
    let metaClient;
    try {
      metaClient = await getMetaClientForUser(user.id);
    } catch {
      // No Meta connection — return AI keywords as-is (without real IDs)
      return NextResponse.json({
        interests: aiResult.interests.map(name => ({ id: name, name })),
        validated: false,
      });
    }

    // Search Meta for each keyword in parallel (batched to avoid rate limits)
    const batchSize = 5;
    const allInterests: Array<{ id: string; name: string; audience_size?: number }> = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < aiResult.interests.length; i += batchSize) {
      const batch = aiResult.interests.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(keyword => metaClient.searchInterests(keyword))
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.data) {
          for (const interest of result.value.data.slice(0, 3)) {
            if (!seenIds.has(interest.id)) {
              seenIds.add(interest.id);
              allInterests.push({
                id: interest.id,
                name: interest.name,
                audience_size: interest.audience_size_upper_bound,
              });
            }
          }
        }
      }
    }

    // Filter out already-existing interests
    const existingSet = new Set((existing_interests || []).map(n => n.toLowerCase()));
    const filtered = allInterests.filter(i => !existingSet.has(i.name.toLowerCase()));

    return NextResponse.json({
      interests: filtered,
      validated: true,
    });
  } catch (error) {
    return handleApiError(error, { route: 'ai/suggest-interests' });
  }
}
