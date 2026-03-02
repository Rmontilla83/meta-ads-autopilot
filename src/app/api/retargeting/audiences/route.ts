import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`retargeting-audiences:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const admin = createAdminClient();

    const { data: audiences, error } = await admin
      .from('custom_audiences')
      .select('*, campaigns(name, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching audiences', { route: 'retargeting-audiences' }, error);
      return NextResponse.json({ error: 'Error al obtener audiencias' }, { status: 500 });
    }

    return NextResponse.json({ audiences: audiences || [] });
  } catch (error) {
    return handleApiError(error, { route: 'retargeting-audiences' });
  }
}
