import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';

// GET: List analysis history with pagination
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`trafiquer-history:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const { data, error, count } = await supabase
      .from('trafiquer_analyses')
      .select('id, health_score, overall_assessment, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
    }

    return NextResponse.json({
      analyses: data || [],
      total: count || 0,
    }, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (error) {
    return handleApiError(error, { route: 'analytics/trafiquer-history' });
  }
}
