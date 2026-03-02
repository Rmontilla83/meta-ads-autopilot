import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getMetaClientForUser } from '@/lib/meta/client';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';

export async function GET() {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`meta-ad-accounts:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const client = await getMetaClientForUser(user.id);
    const accounts = await client.getAdAccounts();
    return NextResponse.json(accounts);
  } catch (error) {
    return handleApiError(error, { route: 'meta/ad-accounts' });
  }
}
