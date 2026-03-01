import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { RULE_TEMPLATE_ADVISOR, ruleTemplateSchema, buildRuleTemplatePrompt } from '@/lib/gemini/rule-templates';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
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

    const model = getGeminiPro();
    const prompt = buildRuleTemplatePrompt({
      industry: body.industry || businessProfile?.industry || null,
      objectives: businessProfile?.objectives || [],
      active_campaigns: activeCampaigns || 0,
      avg_spend: body.avg_spend,
      avg_ctr: body.avg_ctr,
    });

    const result = await generateStructuredJSON(model, RULE_TEMPLATE_ADVISOR, prompt, ruleTemplateSchema);

    return NextResponse.json({ suggestions: result.rules });
  } catch (error) {
    console.error('Suggest rules error:', error);
    const message = error instanceof Error ? error.message : 'Error al generar sugerencias';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
