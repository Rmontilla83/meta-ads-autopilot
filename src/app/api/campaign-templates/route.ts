import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const url = new URL(request.url);
    const includePublic = url.searchParams.get('include_public') === 'true';

    let query = supabase.from('campaign_templates').select('*');

    if (includePublic) {
      query = query.or(`user_id.eq.${user.id},is_public.eq.true`);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: templates, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Error al obtener plantillas' }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error('Templates GET error:', error);
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

    const body = await request.json();

    const { data: template, error } = await supabase
      .from('campaign_templates')
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description || null,
        template_data: body.template_data || {},
        industry: body.industry || null,
        objective: body.objective || null,
        is_public: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Error al crear plantilla' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Templates POST error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
