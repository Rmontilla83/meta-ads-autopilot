import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`rule-exec:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const { data: executions, error } = await supabase
      .from('rule_executions')
      .select('*')
      .eq('rule_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
    }

    return NextResponse.json({ executions: executions || [] });
  } catch (error) {
    return handleApiError(error, { route: 'automation-rules-[id]-executions' });
  }
}
