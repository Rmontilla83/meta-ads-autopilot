import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: rule, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !rule) {
      return NextResponse.json({ error: 'Regla no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Rule GET error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    const { data: rule, error } = await supabase
      .from('automation_rules')
      .update({
        name: body.name,
        condition_metric: body.condition_metric,
        condition_operator: body.condition_operator,
        condition_value: body.condition_value,
        condition_period: body.condition_period,
        campaign_ids: body.campaign_ids,
        action_type: body.action_type,
        action_value: body.action_value,
        frequency: body.frequency,
        max_executions: body.max_executions,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar regla' }, { status: 500 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Rule PUT error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { error } = await supabase
      .from('automation_rules')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Error al eliminar regla' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rule DELETE error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
