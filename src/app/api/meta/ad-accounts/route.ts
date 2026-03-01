import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMetaClientForUser } from '@/lib/meta/client';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const client = await getMetaClientForUser(user.id);
    const accounts = await client.getAdAccounts();
    return NextResponse.json(accounts);
  } catch (err) {
    console.error('Error fetching ad accounts:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al obtener cuentas' },
      { status: 500 }
    );
  }
}
