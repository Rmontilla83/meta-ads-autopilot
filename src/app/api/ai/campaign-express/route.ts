import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { CAMPAIGN_EXPRESS_PROMPT, campaignExpressSchema } from '@/lib/gemini/campaign-express';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeString } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`campaign-express:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const limitCheck = await checkPlanLimit(user.id, 'ai_generations');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'Has alcanzado el límite de generaciones IA de tu plan',
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const body = await request.json();
    const goal = sanitizeString(body.goal || '', 2000);

    const supabase = createAdminClient();

    // Fetch business profile
    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch buyer personas
    const { data: personas } = await supabase
      .from('buyer_personas')
      .select('*')
      .eq('user_id', user.id)
      .limit(5);

    // Fetch sales angles
    const { data: salesAngles } = await supabase
      .from('sales_angles')
      .select('*')
      .eq('user_id', user.id)
      .limit(5);

    // Fetch brand identity
    const { data: brandIdentity } = await supabase
      .from('brand_identity')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch top performing campaigns (last 30 days)
    const { data: topCampaigns } = await supabase
      .from('campaign_metrics')
      .select('campaign_id, spend, impressions, clicks, conversions, ctr, cpc, campaigns!inner(name, objective)')
      .eq('campaigns.user_id', user.id)
      .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
      .order('conversions', { ascending: false })
      .limit(5);

    // Build rich context prompt
    const contextParts: string[] = [];

    if (businessProfile) {
      contextParts.push(`NEGOCIO:
- Nombre: ${businessProfile.business_name || 'No especificado'}
- Industria: ${businessProfile.industry || 'No especificada'}
- Descripción: ${businessProfile.description || 'No especificada'}
- Público objetivo: ${businessProfile.target_audience || 'No especificado'}
- País: ${businessProfile.country || 'No especificado'}
- Sitio web: ${businessProfile.website_url || 'No especificado'}`);
    }

    if (personas && personas.length > 0) {
      contextParts.push(`PERSONAS COMPRADORAS:\n${personas.map((p: Record<string, unknown>) =>
        `- ${p.name}: ${p.description || ''} (${p.age_range || ''}, ${p.pain_points || ''})`
      ).join('\n')}`);
    }

    if (salesAngles && salesAngles.length > 0) {
      contextParts.push(`ÁNGULOS DE VENTA:\n${salesAngles.map((a: Record<string, unknown>) =>
        `- ${a.name}: ${a.description || ''}`
      ).join('\n')}`);
    }

    if (brandIdentity) {
      const bi = brandIdentity as Record<string, unknown>;
      contextParts.push(`MARCA:
- Tono: ${bi.tone || 'No especificado'}
- Colores: ${bi.primary_color || ''} / ${bi.secondary_color || ''}
- Valores: ${bi.values || 'No especificados'}`);
    }

    if (topCampaigns && topCampaigns.length > 0) {
      contextParts.push(`MEJORES CAMPAÑAS RECIENTES:\n${topCampaigns.map((c: Record<string, unknown>) => {
        const campaign = c.campaigns as Record<string, unknown> | null;
        return `- ${campaign?.name || 'Sin nombre'} (${campaign?.objective || '?'}): ${c.clicks} clicks, ${c.conversions} conversiones, CTR ${c.ctr}%`;
      }).join('\n')}`);
    }

    const userMessage = `${contextParts.join('\n\n')}

OBJETIVO DEL USUARIO: ${goal || 'Crear la mejor campaña posible basada en mi negocio'}

Genera una campaña express completa optimizada para este negocio.`;

    const model = getGeminiPro();
    const result = await generateStructuredJSON(
      model,
      CAMPAIGN_EXPRESS_PROMPT,
      userMessage,
      campaignExpressSchema
    );

    await incrementUsage(user.id, 'ai_generations');

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: 'ai/campaign-express' });
  }
}
