import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt, encrypt } from '@/lib/encryption';
import { refreshLongLivedToken } from '@/lib/meta/oauth';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-errors';
import { requireCronAuth } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    requireCronAuth(request);

    const supabase = createAdminClient();

    // Find tokens expiring within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: connections, error } = await supabase
      .from('meta_connections')
      .select('id, user_id, access_token_encrypted, token_expires_at')
      .eq('is_active', true)
      .lt('token_expires_at', sevenDaysFromNow.toISOString());

    if (error || !connections?.length) {
      return NextResponse.json({ message: 'No tokens to refresh', refreshed: 0 });
    }

    let refreshed = 0;
    let failed = 0;

    for (const conn of connections) {
      try {
        const currentToken = decrypt(conn.access_token_encrypted);
        const result = await refreshLongLivedToken(currentToken);

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + result.expires_in);

        await supabase
          .from('meta_connections')
          .update({
            access_token_encrypted: encrypt(result.access_token),
            token_expires_at: expiresAt.toISOString(),
            last_refreshed_at: new Date().toISOString(),
          })
          .eq('id', conn.id);

        refreshed++;
      } catch (err) {
        failed++;
        logger.error(`Failed to refresh token for user ${conn.user_id}`, { route: '/api/cron/refresh-tokens' }, err);

        await createNotification({
          user_id: conn.user_id,
          type: 'system',
          title: 'Error al refrescar token',
          message: 'No pudimos renovar tu conexión con Meta. Por favor, reconecta tu cuenta.',
          metadata: { connection_id: conn.id },
        });
      }
    }

    logger.info('Token refresh complete', { route: '/api/cron/refresh-tokens', refreshed, failed });
    return NextResponse.json({ message: 'Token refresh complete', refreshed, failed });
  } catch (error) {
    return handleApiError(error, { route: '/api/cron/refresh-tokens' });
  }
}
