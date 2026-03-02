import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getGeminiFlash, generateMultimodalJSON } from '@/lib/gemini/client';
import { COLOR_EXTRACTOR } from '@/lib/gemini/prompts';
import { colorExtractionSchema } from '@/lib/gemini/validators';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';
import { sanitizeString } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`extract-colors:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const body = await request.json();
    const { logoUrl } = body as { logoUrl: string };

    if (!logoUrl) {
      return NextResponse.json({ error: 'Se requiere logoUrl' }, { status: 400 });
    }

    // Sanitize URL input
    const sanitizedLogoUrl = sanitizeString(logoUrl, 2000);

    // Download logo
    const response = await fetch(sanitizedLogoUrl);
    if (!response.ok) {
      return NextResponse.json({ error: 'No se pudo descargar el logo' }, { status: 400 });
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';

    const imageParts = [{
      inlineData: { data: base64, mimeType: contentType },
    }];

    const model = getGeminiFlash();
    const result = await generateMultimodalJSON(
      model,
      COLOR_EXTRACTOR,
      'Extrae los colores dominantes de este logo.',
      imageParts,
      colorExtractionSchema
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: 'ai/extract-colors' });
  }
}
