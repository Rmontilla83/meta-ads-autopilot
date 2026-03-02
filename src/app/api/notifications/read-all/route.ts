import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';

export async function PATCH() {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`notif-readall:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: 'notifications-read-all' });
  }
}
