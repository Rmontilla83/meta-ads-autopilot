import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { CAMPAIGN_AUDITOR, buildCampaignAuditPrompt } from '@/lib/gemini/prompts';
import { campaignAuditSchema } from '@/lib/gemini/validators';

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`audit-campaign:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const limitCheck = await checkPlanLimit(user.id, 'ai_generations');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Has alcanzado el límite de generaciones IA de tu plan',
          upgrade: true,
          current: limitCheck.current,
          limit: limitCheck.limit,
          planRequired: limitCheck.planRequired,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { campaignData, businessName, industry } = body;

    if (!campaignData) {
      return NextResponse.json({ error: 'Datos de campaña requeridos' }, { status: 400 });
    }

    const model = getGeminiPro();
    const prompt = buildCampaignAuditPrompt({
      campaign: campaignData.campaign,
      ad_sets: campaignData.ad_sets,
      ads: campaignData.ads,
      businessName,
      industry,
    });

    const result = await generateStructuredJSON(
      model,
      CAMPAIGN_AUDITOR,
      prompt,
      campaignAuditSchema
    );

    await incrementUsage(user.id, 'ai_generations');

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: 'ai/audit-campaign' });
  }
}
