import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const MAX_IMAGE_SIZE = 30 * 1024 * 1024; // 30MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`upload-image:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Usa JPEG, PNG, WebP o GIF.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'La imagen excede el límite de 30MB' },
        { status: 400 }
      );
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user.id}/images/${crypto.randomUUID()}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const admin = createAdminClient();

    const { error: uploadError } = await admin.storage
      .from('ad-creatives')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
      });

    if (uploadError) {
      logger.error('Image upload error', { route: 'upload-image' }, uploadError);
      return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage
      .from('ad-creatives')
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      fileName: file.name,
      size: file.size,
    });
  } catch (error) {
    return handleApiError(error, { route: 'upload-image' });
  }
}
