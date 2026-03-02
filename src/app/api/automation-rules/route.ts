import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { checkPlanLimit } from '@/lib/plan-limits';

export async function GET() {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`rules-get:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const { data: rules, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Error al obtener reglas' }, { status: 500 });
    }

    return NextResponse.json({ rules: rules || [] });
  } catch (error) {
    return handleApiError(error, { route: 'automation-rules-GET' });
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`rules-post:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    // Check auto_optimizer feature access
    const limitCheck = await checkPlanLimit(user.id, 'auto_optimizer');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'La automatización requiere un plan Growth o superior',
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const body = await request.json();

    const { data: rule, error } = await supabase
      .from('automation_rules')
      .insert({
        user_id: user.id,
        name: body.name,
        is_enabled: body.is_enabled ?? true,
        condition_metric: body.condition_metric,
        condition_operator: body.condition_operator,
        condition_value: body.condition_value,
        condition_period: body.condition_period || 'last_7_days',
        campaign_ids: body.campaign_ids || [],
        action_type: body.action_type,
        action_value: body.action_value || 0,
        frequency: body.frequency || 'daily',
        max_executions: body.max_executions || 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Error al crear regla' }, { status: 500 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    return handleApiError(error, { route: 'automation-rules-POST' });
  }
}
