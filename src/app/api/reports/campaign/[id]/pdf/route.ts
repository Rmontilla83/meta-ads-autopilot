import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getCampaignAnalytics } from '@/lib/analytics/campaign-data';
import { checkPlanLimit } from '@/lib/plan-limits';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { REPORT_ANALYST, buildReportAnalysisPrompt } from '@/lib/gemini/prompts';
import { reportAnalysisSchema } from '@/lib/gemini/validators';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { renderToBuffer } from '@react-pdf/renderer';
import { ReportDocument } from '@/lib/reports/pdf-document';
import React from 'react';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`report-pdf:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    // Check plan feature
    const limitCheck = await checkPlanLimit(user.id, 'pdf_reports');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'Los reportes PDF requieren un plan Growth o superior',
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
        const campaign = analytics.campaign as { name?: string; objective?: string };
        const prompt = buildReportAnalysisPrompt({
          campaign_name: campaign.name || 'Campaña',
          objective: campaign.objective || 'No especificado',
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
        logger.error('AI analysis error for PDF', { route: 'reports/campaign/[id]/pdf' }, error);
      }
    }

    const reportData = {
      ...analytics,
      aiAnalysis,
      reportMeta: {
        generatedAt: new Date().toISOString(),
        days,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(ReportDocument, { data: reportData }) as any;
    const buffer = await renderToBuffer(element);

    const campaignName = (analytics.campaign as { name?: string }).name || 'campana';
    const safeName = campaignName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte-${safeName}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error, { route: 'reports/campaign/[id]/pdf' });
  }
}
