import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';

export async function POST() {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`meta-disconnect:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const { error } = await supabase
      .from('meta_connections')
      .update({ is_active: false })
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Error al desconectar' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: 'auth-meta-disconnect' });
  }
}
