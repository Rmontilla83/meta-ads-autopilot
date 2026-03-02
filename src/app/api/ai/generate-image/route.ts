import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-utils';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateAdImage } from '@/lib/gemini/client';
import { buildImagePrompt } from '@/lib/gemini/prompts';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';

const generateImageSchema = z.object({
  prompt: z.string().min(1).max(2000),
  businessName: z.string().max(500).optional(),
  style: z.string().max(200).optional(),
  aspectRatio: z.string().max(20).optional(),
});

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`gen-image:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const limitCheck = await checkPlanLimit(user.id, 'image_generations');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: `Has alcanzado el límite de ${limitCheck.limit} generaciones de imagen de tu plan`,
        upgrade: true,
        planRequired: limitCheck.planRequired,
        current: limitCheck.current,
        limit: limitCheck.limit,
      }, { status: 403 });
    }

    const body = await request.json();
    const parsed = generateImageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
    }

    const { prompt, businessName, style, aspectRatio } = parsed.data;

    // Fetch brand analysis for enhanced prompts
    let brandAnalysis;
    if (businessName) {
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('brand_analysis')
        .eq('user_id', user.id)
        .single();
      brandAnalysis = profile?.brand_analysis;
    }

    // Build enhanced prompt if business context provided
    const finalPrompt = businessName
      ? buildImagePrompt({ businessName, product: prompt, style, brandAnalysis })
      : prompt;

    const { imageData, mimeType } = await generateAdImage(finalPrompt, aspectRatio);

    // Upload to Supabase Storage
    const admin = createAdminClient();
    const extension = mimeType.includes('png') ? 'png' : 'jpg';
    const fileName = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const buffer = Buffer.from(imageData, 'base64');
    const { error: uploadError } = await admin.storage
      .from('ad-creatives')
      .upload(fileName, buffer, {
        contentType: mimeType,
        cacheControl: '31536000',
      });

    if (uploadError) {
      return NextResponse.json({ error: 'Error al guardar la imagen' }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage
      .from('ad-creatives')
      .getPublicUrl(fileName);

    await incrementUsage(user.id, 'image_generations');

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      prompt: parsed.data.prompt,
    });
  } catch (error) {
    return handleApiError(error, { route: 'ai/generate-image' });
  }
}
