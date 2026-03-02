import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getGeminiPro, generateMultimodalJSON } from '@/lib/gemini/client';
import { BRAND_ANALYZER, buildBrandAnalysisPrompt } from '@/lib/gemini/prompts';
import { brandAnalysisSchema } from '@/lib/gemini/validators';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';

export async function POST() {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`analyze-brand:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
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

    // Load business profile with brand data
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('business_name, industry, description, brand_tone, logo_url, brand_gallery')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil de negocio no encontrado' }, { status: 404 });
    }

    // Collect image URLs to analyze
    const imageUrls: string[] = [];
    if (profile.logo_url) imageUrls.push(profile.logo_url);
    if (profile.brand_gallery?.length) {
      imageUrls.push(...profile.brand_gallery.slice(0, 5));
    }

    if (imageUrls.length === 0) {
      return NextResponse.json({
        error: 'Sube al menos un logo o una foto para analizar tu marca',
      }, { status: 400 });
    }

    // Download images and convert to base64
    const imageParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
    for (const url of imageUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        imageParts.push({
          inlineData: { data: base64, mimeType: contentType },
        });
      } catch {
        // Skip images that fail to download
      }
    }

    if (imageParts.length === 0) {
      return NextResponse.json({
        error: 'No se pudieron descargar las imágenes para análisis',
      }, { status: 500 });
    }

    const model = getGeminiPro();
    const prompt = buildBrandAnalysisPrompt({
      business_name: profile.business_name,
      industry: profile.industry,
      description: profile.description,
      brand_tone: profile.brand_tone,
      has_logo: !!profile.logo_url,
      gallery_count: profile.brand_gallery?.length || 0,
    });

    const analysis = await generateMultimodalJSON(
      model,
      BRAND_ANALYZER,
      prompt,
      imageParts,
      brandAnalysisSchema
    );

    // Save analysis to DB
    await supabase
      .from('business_profiles')
      .update({ brand_analysis: analysis })
      .eq('user_id', user.id);

    await incrementUsage(user.id, 'ai_generations');

    return NextResponse.json(analysis);
  } catch (error) {
    return handleApiError(error, { route: 'ai/analyze-brand' });
  }
}
