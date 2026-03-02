import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`templates-get:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

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
    return handleApiError(error, { route: 'campaign-templates-GET' });
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`templates-post:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

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
    return handleApiError(error, { route: 'campaign-templates-POST' });
  }
}
