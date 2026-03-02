import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mpeg'];

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`upload-video:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Usa MP4, MOV, WebM o MPEG.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: 'El video excede el límite de 100MB' },
        { status: 400 }
      );
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const fileName = `${user.id}/videos/${crypto.randomUUID()}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const admin = createAdminClient();

    const { error: uploadError } = await admin.storage
      .from('ad-creatives')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
      });

    if (uploadError) {
      logger.error('Video upload error', { route: 'upload-video' }, uploadError);
      return NextResponse.json({ error: 'Error al subir el video' }, { status: 500 });
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
    return handleApiError(error, { route: 'upload-video' });
  }
}
