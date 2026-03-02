import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-errors';
import crypto from 'crypto';

/**
 * Meta Data Deletion Callback
 * Required for Meta App Review — handles user data deletion requests from Meta.
 * Meta sends a signed request when a user removes the app from their Facebook settings.
 *
 * See: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
export async function POST(request: Request) {
  try {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      logger.error('META_APP_SECRET environment variable is not set', { route: '/api/auth/meta/data-deletion' });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await request.formData();
    const signedRequest = body.get('signed_request') as string;

    if (!signedRequest) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 });
    }

    // Parse and verify the signed request
    const [encodedSig, payload] = signedRequest.split('.');
    const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const data = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest();

    if (!crypto.timingSafeEqual(sig, expectedSig)) {
      logger.warn('Invalid signed_request signature', { route: '/api/auth/meta/data-deletion' });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const metaUserId = data.user_id;
    if (!metaUserId) {
      return NextResponse.json({ error: 'Missing user_id in payload' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find and deactivate the Meta connection
    const { data: connections } = await supabase
      .from('meta_connections')
      .select('id, user_id')
      .eq('meta_user_id', metaUserId);

    if (connections?.length) {
      for (const conn of connections) {
        // Delete the meta connection
        await supabase
          .from('meta_connections')
          .delete()
          .eq('id', conn.id);

        // Delete campaign metrics for this user
        await supabase
          .from('campaign_metrics')
          .delete()
          .eq('user_id', conn.user_id);
      }
    }

    // Generate a confirmation code for Meta
    const confirmationCode = crypto.randomUUID();
    const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/data-deletion?code=${confirmationCode}`;

    logger.info('Data deletion request processed', {
      route: '/api/auth/meta/data-deletion',
      metaUserId,
      confirmationCode,
    });

    // Return the required response format
    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/auth/meta/data-deletion' });
  }
}

// GET endpoint for checking deletion status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Missing confirmation code' }, { status: 400 });
    }

    // In production, you'd look up the deletion status by code
    return NextResponse.json({
      status: 'completed',
      confirmation_code: code,
      message: 'Los datos del usuario han sido eliminados.',
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/auth/meta/data-deletion' });
  }
}
