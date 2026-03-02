import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`scaling-history:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const admin = createAdminClient();

    const { data: events, error } = await admin
      .from('scaling_events')
      .select('*, campaigns(name, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Error fetching scaling events', { route: 'scaling-history' }, error);
      return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
    }

    return NextResponse.json({ events: events || [] });
  } catch (error) {
    return handleApiError(error, { route: 'scaling-history' });
  }
}
