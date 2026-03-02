import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getGeminiFlash, generateStructuredJSON } from '@/lib/gemini/client';
import { PERSONA_ADVISOR, buildPersonaSuggestionsPrompt } from '@/lib/gemini/prompts';
import { personaSuggestionsSchema } from '@/lib/gemini/validators';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';
import { randomUUID } from 'crypto';

export async function POST() {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`suggest-personas:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
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

    const { data: profile } = await supabase
      .from('business_profiles')
      .select('business_name, industry, description, location, website, objectives, monthly_budget, experience_level, brand_tone, buyer_personas, sales_angles')
      .eq('user_id', user.id)
      .single();

    if (!profile?.business_name) {
      return NextResponse.json({ error: 'Completa tu perfil de negocio primero' }, { status: 400 });
    }

    // Collect existing names so AI doesn't repeat them
    const existingPersonaNames = (profile.buyer_personas || []).map((p: { name: string }) => p.name);
    const existingAngleNames = (profile.sales_angles || []).map((a: { name: string }) => a.name);

    const model = getGeminiFlash();
    const prompt = buildPersonaSuggestionsPrompt({
      business_name: profile.business_name,
      industry: profile.industry || null,
      description: profile.description || null,
      location: profile.location || null,
      website: profile.website || null,
      objectives: profile.objectives || [],
      monthly_budget: profile.monthly_budget || null,
      experience_level: profile.experience_level || null,
      brand_tone: profile.brand_tone || null,
      existing_personas: existingPersonaNames.length ? existingPersonaNames : undefined,
      existing_angles: existingAngleNames.length ? existingAngleNames : undefined,
    });

    const aiResult = await generateStructuredJSON(
      model,
      PERSONA_ADVISOR,
      prompt,
      personaSuggestionsSchema
    );

    await incrementUsage(user.id, 'ai_generations');

    // Add UUIDs to each persona and angle
    const buyer_personas = aiResult.buyer_personas.map(p => ({
      ...p,
      id: randomUUID(),
    }));

    const sales_angles = aiResult.sales_angles.map(a => {
      // Try to link angle to persona by matching target_persona name
      const linkedPersona = buyer_personas.find(
        p => p.name.toLowerCase() === a.target_persona.toLowerCase()
      );
      return {
        id: randomUUID(),
        name: a.name,
        hook: a.hook,
        value_proposition: a.value_proposition,
        target_persona_id: linkedPersona?.id || undefined,
        emotional_trigger: a.emotional_trigger,
      };
    });

    return NextResponse.json({ buyer_personas, sales_angles });
  } catch (error) {
    return handleApiError(error, { route: 'ai/suggest-personas' });
  }
}
