import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-errors';
import { requireCronAuth } from '@/lib/auth-utils';

/**
 * Combined daily cron dispatcher for Vercel Hobby plan (1 cron limit).
 * Calls all cron tasks sequentially:
 * - sync-metrics: Sync campaign metrics from Meta
 * - evaluate-rules: Run automation rules
 * - ab-test-evaluator: Evaluate running A/B tests for significance
 * - refresh-tokens: Refresh expiring Meta tokens
 * - cleanup-expired: Clean up expired connections and old data
 *
 * For Vercel Pro, configure individual crons in vercel.json instead.
 */
export async function GET(request: Request) {
  try {
    requireCronAuth(request);

    // Use VERCEL_URL (set automatically by Vercel) or NEXT_PUBLIC_APP_URL as fallback
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
    const baseUrl = vercelUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const cronSecret = process.env.CRON_SECRET;

    const tasks = [
      '/api/cron/sync-metrics',
      '/api/cron/evaluate-rules',
      '/api/cron/ab-test-evaluator',
      '/api/cron/refresh-tokens',
      '/api/cron/cleanup-expired',
    ];

    const results: Record<string, { status: number; data?: unknown; error?: string }> = {};

    for (const task of tasks) {
      try {
        const res = await fetch(`${baseUrl}${task}`, {
          headers: { Authorization: `Bearer ${cronSecret}` },
        });
        const data = await res.json();
        results[task] = { status: res.status, data };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results[task] = { status: 500, error: message };
        logger.error(`Daily cron: ${task} failed`, { route: '/api/cron/daily' }, error);
      }
    }

    logger.info('Daily cron complete', { route: '/api/cron/daily', results });
    return NextResponse.json({ message: 'Daily cron complete', results });
  } catch (error) {
    return handleApiError(error, { route: '/api/cron/daily' });
  }
}
