import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { RULE_TEMPLATE_ADVISOR, ruleTemplateSchema, buildRuleTemplatePrompt } from '@/lib/gemini/rule-templates';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';
import { sanitizeString } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`suggest-rules:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const body = await request.json();

    // Get business profile for context
    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('industry, objectives')
      .eq('user_id', user.id)
      .single();

    // Get active campaign count
    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['active', 'paused']);

    const sanitizedIndustry = body.industry ? sanitizeString(body.industry, 500) : null;

    const model = getGeminiPro();
    const prompt = buildRuleTemplatePrompt({
      industry: sanitizedIndustry || businessProfile?.industry || null,
      objectives: businessProfile?.objectives || [],
      active_campaigns: activeCampaigns || 0,
      avg_spend: body.avg_spend,
      avg_ctr: body.avg_ctr,
    });

    const result = await generateStructuredJSON(model, RULE_TEMPLATE_ADVISOR, prompt, ruleTemplateSchema);

    return NextResponse.json({ suggestions: result.rules });
  } catch (error) {
    return handleApiError(error, { route: 'ai/suggest-rules' });
  }
}
