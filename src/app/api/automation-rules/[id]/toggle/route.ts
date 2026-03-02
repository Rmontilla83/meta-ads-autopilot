import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`rule-toggle:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    // Get current state
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('is_enabled')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!rule) {
      return NextResponse.json({ error: 'Regla no encontrada' }, { status: 404 });
    }

    const { data: updated, error } = await supabase
      .from('automation_rules')
      .update({ is_enabled: !rule.is_enabled })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Error al cambiar estado' }, { status: 500 });
    }

    return NextResponse.json({ rule: updated });
  } catch (error) {
    return handleApiError(error, { route: 'automation-rules-[id]-toggle' });
  }
}
