import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken, getLongLivedToken, getMetaUserInfo } from '@/lib/meta/oauth';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${baseUrl}/onboarding?meta_error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/onboarding?meta_error=missing_params`);
  }

  // Verify CSRF state
  const storedState = request.cookies.get('meta_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${baseUrl}/onboarding?meta_error=invalid_state`);
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    // Exchange code for short-lived token
    const tokenData = await exchangeCodeForToken(code);

    // Exchange for long-lived token
    const longLivedData = await getLongLivedToken(tokenData.access_token);

    // Get Meta user info
    const metaUser = await getMetaUserInfo(longLivedData.access_token);

    // Encrypt the token
    const encryptedToken = encrypt(longLivedData.access_token);

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + longLivedData.expires_in);

    // Upsert meta connection
    const { error: dbError } = await supabase
      .from('meta_connections')
      .upsert(
        {
          user_id: user.id,
          meta_user_id: metaUser.id,
          access_token_encrypted: encryptedToken,
          token_expires_at: expiresAt.toISOString(),
          scopes: ['ads_management', 'ads_read', 'business_management', 'pages_show_list', 'pages_read_engagement', 'read_insights'],
          is_active: true,
          last_refreshed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,meta_user_id' }
      );

    if (dbError) {
      console.error('Error saving Meta connection:', dbError);
      return NextResponse.redirect(`${baseUrl}/onboarding?meta_error=db_error`);
    }

    const response = NextResponse.redirect(`${baseUrl}/onboarding?meta_connected=true`);
    response.cookies.delete('meta_oauth_state');
    return response;
  } catch (err) {
    console.error('Meta OAuth callback error:', err);
    return NextResponse.redirect(`${baseUrl}/onboarding?meta_error=exchange_failed`);
  }
}
