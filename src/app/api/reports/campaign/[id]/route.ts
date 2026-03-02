import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getCampaignAnalytics } from '@/lib/analytics/campaign-data';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { REPORT_ANALYST, buildReportAnalysisPrompt } from '@/lib/gemini/prompts';
import { reportAnalysisSchema } from '@/lib/gemini/validators';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`report:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    // Check plan feature
    const limitCheck = await checkPlanLimit(user.id, 'pdf_reports');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'Los reportes requieren un plan Growth o superior',
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const includeAI = searchParams.get('ai') === 'true';

    const analytics = await getCampaignAnalytics(id, user.id, days);

    if (!analytics) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    let aiAnalysis = null;

    if (includeAI) {
      try {
        const model = getGeminiPro();
        const prompt = buildReportAnalysisPrompt({
          campaign_name: (analytics.campaign as { name?: string }).name || 'Campaña',
          objective: (analytics.campaign as { objective?: string }).objective || 'No especificado',
          days,
          kpis: analytics.kpis,
          breakdowns: analytics.breakdowns,
        });

        aiAnalysis = await generateStructuredJSON(
          model,
          REPORT_ANALYST,
          prompt,
          reportAnalysisSchema
        );
      } catch (error) {
        logger.error('AI analysis error', { route: 'reports/campaign/[id]' }, error);
      }
    }

    await incrementUsage(user.id, 'reports_generated');

    return NextResponse.json({
      ...analytics,
      aiAnalysis,
      reportMeta: {
        generatedAt: new Date().toISOString(),
        days,
        includeAI,
      },
    });
  } catch (error) {
    return handleApiError(error, { route: 'reports/campaign/[id]' });
  }
}
