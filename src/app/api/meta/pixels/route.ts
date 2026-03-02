import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getMetaClientForUser } from '@/lib/meta/client';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`meta-pixels:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const adAccountId = request.nextUrl.searchParams.get('ad_account_id');
    if (!adAccountId) {
      return NextResponse.json({ error: 'ad_account_id requerido' }, { status: 400 });
    }

    const client = await getMetaClientForUser(user.id);
    const pixels = await client.getPixels(adAccountId);
    return NextResponse.json(pixels);
  } catch (error) {
    return handleApiError(error, { route: 'meta/pixels' });
  }
}
