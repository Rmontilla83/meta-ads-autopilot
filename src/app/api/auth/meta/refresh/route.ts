import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt, encrypt } from '@/lib/encryption';
import { refreshLongLivedToken } from '@/lib/meta/oauth';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data: connection } = await supabase
    .from('meta_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!connection) {
    return NextResponse.json({ error: 'No hay conexión activa' }, { status: 404 });
  }

  try {
    const currentToken = decrypt(connection.access_token_encrypted);
    const refreshed = await refreshLongLivedToken(currentToken);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + refreshed.expires_in);

    await supabase
      .from('meta_connections')
      .update({
        access_token_encrypted: encrypt(refreshed.access_token),
        token_expires_at: expiresAt.toISOString(),
        last_refreshed_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    return NextResponse.json({ success: true, expires_at: expiresAt.toISOString() });
  } catch (err) {
    console.error('Token refresh error:', err);
    return NextResponse.json({ error: 'Error al refrescar token' }, { status: 500 });
  }
}
