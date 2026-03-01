import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCampaignAnalytics } from '@/lib/analytics/campaign-data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('dateRange') || '30d';
  const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;

  const analytics = await getCampaignAnalytics(id, user.id, days);

  if (!analytics) {
    return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
  }

  return NextResponse.json(analytics);
}
