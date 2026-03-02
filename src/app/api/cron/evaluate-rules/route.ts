import { NextResponse } from 'next/server';
import { evaluateAllRules } from '@/lib/automation/engine';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-errors';
import { requireCronAuth } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    requireCronAuth(request);

    await evaluateAllRules();
    logger.info('Automation rules evaluation complete', { route: '/api/cron/evaluate-rules' });
    return NextResponse.json({ message: 'Rules evaluated successfully' });
  } catch (error) {
    return handleApiError(error, { route: '/api/cron/evaluate-rules' });
  }
}
