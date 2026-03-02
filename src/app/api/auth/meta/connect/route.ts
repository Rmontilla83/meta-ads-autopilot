import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { getMetaAuthUrl } from '@/lib/meta/oauth';
import crypto from 'crypto';

export async function GET() {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`meta-connect:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const state = crypto.randomBytes(32).toString('hex');

    // Store state in a cookie for CSRF protection
    const authUrl = getMetaAuthUrl(state);
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('meta_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    return handleApiError(error, { route: 'auth-meta-connect' });
  }
}
