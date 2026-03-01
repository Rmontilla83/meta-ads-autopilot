import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkPlanLimit } from '@/lib/plan-limits';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
    console.error('Rules GET error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
    console.error('Rules POST error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
