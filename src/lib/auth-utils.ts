import { createClient } from '@/lib/supabase/server';
import { ApiError, ERRORS } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

interface AuthResult {
  user: { id: string; email?: string };
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Require authenticated user for API routes.
 * Replaces the repetitive auth boilerplate across 60+ routes.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw ERRORS.UNAUTHORIZED;
  }

  return { user, supabase };
}

/**
 * Validate cron job authorization via CRON_SECRET header.
 */
export function requireCronAuth(request: Request): void {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error('CRON_SECRET environment variable is not set', { route: 'cron' });
    throw new ApiError(500, 'CONFIG_ERROR', 'Server configuration error');
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    throw ERRORS.UNAUTHORIZED;
  }
}
