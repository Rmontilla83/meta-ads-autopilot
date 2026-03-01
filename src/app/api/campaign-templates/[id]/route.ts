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

    const { data: template, error } = await supabase
      .from('campaign_templates')
      .select('*')
      .eq('id', id)
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    // Increment usage count
    await supabase
      .from('campaign_templates')
      .update({ usage_count: template.usage_count + 1 })
      .eq('id', id);

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Template GET error:', error);
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

    const { data: template, error } = await supabase
      .from('campaign_templates')
      .update({
        name: body.name,
        description: body.description,
        template_data: body.template_data,
        industry: body.industry,
        objective: body.objective,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar plantilla' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Template PUT error:', error);
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
      .from('campaign_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Error al eliminar plantilla' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Template DELETE error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
