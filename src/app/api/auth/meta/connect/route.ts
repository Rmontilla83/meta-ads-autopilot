import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMetaAuthUrl } from '@/lib/meta/oauth';
import crypto from 'crypto';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const state = crypto.randomBytes(32).toString('hex');

  // Store state in a cookie for CSRF protection
  const authUrl = getMetaAuthUrl(state);
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('meta_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
