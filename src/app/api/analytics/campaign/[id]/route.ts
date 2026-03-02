import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getCampaignAnalytics } from '@/lib/analytics/campaign-data';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`analytics-campaign:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('dateRange') || '30d';
    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;

    const analytics = await getCampaignAnalytics(id, user.id, days);

    if (!analytics) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    return NextResponse.json(analytics, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    return handleApiError(error, { route: 'analytics/campaign/[id]' });
  }
}
