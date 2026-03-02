import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`funnels-get:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const admin = createAdminClient();

    const { data: funnels, error } = await admin
      .from('funnel_campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching funnels', { route: 'funnels-GET' }, error);
      return NextResponse.json({ error: 'Error al obtener funnels' }, { status: 500 });
    }

    // For active funnels, get campaign status info
    const funnelsWithStatus = await Promise.all(
      (funnels || []).map(async (funnel) => {
        if (funnel.status !== 'active') return funnel;

        const campaignIds = [
          funnel.tofu_campaign_id,
          funnel.mofu_campaign_id,
          funnel.bofu_campaign_id,
        ].filter(Boolean);

        if (campaignIds.length === 0) return funnel;

        const { data: campaigns } = await admin
          .from('campaigns')
          .select('id, name, status, meta_campaign_id')
          .in('id', campaignIds);

        return {
          ...funnel,
          campaigns: campaigns || [],
        };
      })
    );

    return NextResponse.json({ funnels: funnelsWithStatus }, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (error) {
    return handleApiError(error, { route: 'funnels-GET' });
  }
}
