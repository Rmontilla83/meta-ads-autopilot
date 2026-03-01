import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { error } = await supabase
    .from('meta_connections')
    .update({ is_active: false })
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Error al desconectar' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
