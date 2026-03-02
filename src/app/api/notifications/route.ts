import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';

export async function GET() {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`notifications:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const [notificationsRes, unreadRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false),
    ]);

    return NextResponse.json({
      notifications: notificationsRes.data || [],
      unread_count: unreadRes.count || 0,
    });
  } catch (error) {
    return handleApiError(error, { route: 'notifications-GET' });
  }
}
