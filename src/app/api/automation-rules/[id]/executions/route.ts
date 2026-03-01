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
    console.error('Executions error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
