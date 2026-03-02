import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const ALLOWED_TYPES: Record<string, { mimes: string[]; maxSize: number }> = {
  logo: {
    mimes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  'brand-file': {
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/png',
      'image/jpeg',
    ],
    maxSize: 20 * 1024 * 1024, // 20MB
  },
  gallery: {
    mimes: ['image/png', 'image/jpeg', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
};

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`upload-brand:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    if (!type || !ALLOWED_TYPES[type]) {
      return NextResponse.json({ error: 'Tipo inválido. Usa: logo, brand-file, gallery' }, { status: 400 });
    }

    const config = ALLOWED_TYPES[type];

    if (!config.mimes.includes(file.type)) {
      return NextResponse.json(
        { error: `Formato no soportado para ${type}` },
        { status: 400 }
      );
    }

    if (file.size > config.maxSize) {
      return NextResponse.json(
        { error: `El archivo excede el límite de ${Math.round(config.maxSize / (1024 * 1024))}MB` },
        { status: 400 }
      );
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const fileName = `${user.id}/${type}s/${crypto.randomUUID()}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const admin = createAdminClient();

    const { error: uploadError } = await admin.storage
      .from('business-branding')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
      });

    if (uploadError) {
      logger.error('Brand upload error', { route: 'upload-brand' }, uploadError);
      return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage
      .from('business-branding')
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      fileName: file.name,
      size: file.size,
      type,
    });
  } catch (error) {
    return handleApiError(error, { route: 'upload-brand' });
  }
}
