import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCampaignAnalytics } from '@/lib/analytics/campaign-data';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { REPORT_ANALYST, buildReportAnalysisPrompt } from '@/lib/gemini/prompts';
import { reportAnalysisSchema } from '@/lib/gemini/validators';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
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
      console.error('AI analysis error:', error);
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
}
