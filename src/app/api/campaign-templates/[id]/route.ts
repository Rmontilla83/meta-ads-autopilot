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

    const { success, resetAt } = await rateLimit(`template-get:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

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
    return handleApiError(error, { route: 'campaign-templates-[id]-GET' });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`template-put:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

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
    return handleApiError(error, { route: 'campaign-templates-[id]-PUT' });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`template-del:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

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
    return handleApiError(error, { route: 'campaign-templates-[id]-DELETE' });
  }
}
