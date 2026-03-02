import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getGeminiPro, generateStructuredJSON } from '@/lib/gemini/client';
import { CAMPAIGN_OPTIMIZER } from '@/lib/gemini/prompts';
import { optimizationSuggestionsSchema } from '@/lib/gemini/validators';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';
import { sanitizeString } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`analyze-campaign:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId es requerido' }, { status: 400 });
    }

    // Sanitize input
    const sanitizedCampaignId = sanitizeString(String(campaignId), 100);

    // Verify ownership
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', sanitizedCampaignId)
      .eq('user_id', user.id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    // Get last 14 days of metrics
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 14);

    const { data: metrics } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', sanitizedCampaignId)
      .gte('date', start.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (!metrics?.length) {
      return NextResponse.json({
        error: 'No hay suficientes datos para analizar. Espera a que se recopilen métricas.',
      }, { status: 400 });
    }

    // Build context for AI
    const totals = metrics.reduce((acc, m) => ({
      impressions: acc.impressions + Number(m.impressions),
      reach: acc.reach + Number(m.reach),
      clicks: acc.clicks + Number(m.clicks),
      spend: acc.spend + Number(m.spend),
      conversions: acc.conversions + Number(m.conversions),
      leads: acc.leads + Number(m.leads),
    }), { impressions: 0, reach: 0, clicks: 0, spend: 0, conversions: 0, leads: 0 });

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100).toFixed(2) : '0';
    const cpc = totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : '0';
    const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions * 1000).toFixed(2) : '0';

    const prompt = `CAMPAÑA: ${campaign.name}
OBJETIVO: ${campaign.objective || 'No especificado'}
ESTADO: ${campaign.status}
PERÍODO: Últimos 14 días

MÉTRICAS TOTALES:
- Impresiones: ${totals.impressions.toLocaleString()}
- Alcance: ${totals.reach.toLocaleString()}
- Clicks: ${totals.clicks.toLocaleString()}
- Inversión: $${totals.spend.toFixed(2)}
- Conversiones: ${totals.conversions}
- Leads: ${totals.leads}
- CTR: ${ctr}%
- CPC: $${cpc}
- CPM: $${cpm}

TENDENCIA DIARIA:
${metrics.map(m => `${m.date}: imp=${m.impressions} clicks=${m.clicks} spend=$${Number(m.spend).toFixed(2)}`).join('\n')}

Analiza el rendimiento y sugiere mejoras concretas.`;

    const model = getGeminiPro();
    const result = await generateStructuredJSON(
      model,
      CAMPAIGN_OPTIMIZER,
      prompt,
      optimizationSuggestionsSchema
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: 'ai/analyze-campaign' });
  }
}
