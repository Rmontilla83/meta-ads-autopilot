import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
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
    console.error('Toggle error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
