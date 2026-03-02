import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-errors';
import { requireCronAuth } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    requireCronAuth(request);

    const supabase = createAdminClient();

    // 1. Mark expired meta connections as inactive
    const { data: expired } = await supabase
      .from('meta_connections')
      .select('id, user_id')
      .eq('is_active', true)
      .lt('token_expires_at', new Date().toISOString());

    let deactivated = 0;
    if (expired?.length) {
      const { error } = await supabase
        .from('meta_connections')
        .update({ is_active: false })
        .in('id', expired.map(c => c.id));

      if (!error) {
        deactivated = expired.length;

        // Notify affected users
        for (const conn of expired) {
          await createNotification({
            user_id: conn.user_id,
            type: 'system',
            title: 'Conexión de Meta expirada',
            message: 'Tu conexión de Meta ha expirado. Reconecta tu cuenta para seguir gestionando campañas.',
          });
        }
      }
    }

    // 2. Clean up old notifications (>90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { count: deletedNotifications } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .lt('created_at', ninetyDaysAgo.toISOString());

    // 3. Clean up old rule executions (>90 days)
    const { count: deletedExecutions } = await supabase
      .from('rule_executions')
      .delete({ count: 'exact' })
      .lt('executed_at', ninetyDaysAgo.toISOString());

    logger.info('Cleanup complete', {
      route: '/api/cron/cleanup-expired',
      deactivated,
      deletedNotifications: deletedNotifications ?? 0,
      deletedExecutions: deletedExecutions ?? 0,
    });

    return NextResponse.json({
      message: 'Cleanup complete',
      deactivated,
      deletedNotifications: deletedNotifications ?? 0,
      deletedExecutions: deletedExecutions ?? 0,
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/cron/cleanup-expired' });
  }
}
