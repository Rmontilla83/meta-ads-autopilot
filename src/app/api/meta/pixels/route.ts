import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMetaClientForUser } from '@/lib/meta/client';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const adAccountId = request.nextUrl.searchParams.get('ad_account_id');
  if (!adAccountId) {
    return NextResponse.json({ error: 'ad_account_id requerido' }, { status: 400 });
  }

  try {
    const client = await getMetaClientForUser(user.id);
    const pixels = await client.getPixels(adAccountId);
    return NextResponse.json(pixels);
  } catch (err) {
    console.error('Error fetching pixels:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al obtener píxeles' },
      { status: 500 }
    );
  }
}
