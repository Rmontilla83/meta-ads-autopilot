import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { decrypt, encrypt } from '@/lib/encryption';
import { refreshLongLivedToken } from '@/lib/meta/oauth';

export async function POST() {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`meta-refresh:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const { data: connection } = await supabase
      .from('meta_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'No hay conexión activa' }, { status: 404 });
    }

    const currentToken = decrypt(connection.access_token_encrypted);
    const refreshed = await refreshLongLivedToken(currentToken);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + refreshed.expires_in);

    await supabase
      .from('meta_connections')
      .update({
        access_token_encrypted: encrypt(refreshed.access_token),
        token_expires_at: expiresAt.toISOString(),
        last_refreshed_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    return NextResponse.json({ success: true, expires_at: expiresAt.toISOString() });
  } catch (error) {
    return handleApiError(error, { route: 'auth-meta-refresh' });
  }
}
