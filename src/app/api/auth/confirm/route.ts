import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const next = searchParams.get('next') ?? '/dashboard';

    if (token_hash && type) {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'signup' | 'recovery' | 'email',
      });

      if (!error) {
        return NextResponse.redirect(new URL(next, request.url));
      }

      logger.error('OTP verification failed', { route: '/api/auth/confirm' }, error);
    }

    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
  } catch (error) {
    logger.error('Auth confirm error', { route: '/api/auth/confirm' }, error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
