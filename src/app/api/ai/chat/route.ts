import { requireAuth } from '@/lib/auth-utils';
import { getGeminiFlash, streamChat } from '@/lib/gemini/client';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import { rateLimit } from '@/lib/rate-limit';
import { rateLimitResponse, handleApiError } from '@/lib/api-errors';
import { sanitizeString } from '@/lib/validators';
import type { ChatMessage } from '@/lib/gemini/types';
import type { BusinessProfile } from '@/types';
import type { GeneratedCampaign } from '@/lib/gemini/types';

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`ai-chat:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    // Check AI generation limit
    const limitCheck = await checkPlanLimit(user.id, 'ai_generations');
    if (!limitCheck.allowed) {
      return new Response(JSON.stringify({
        error: `Has alcanzado el límite de ${limitCheck.limit} generaciones IA de tu plan`,
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    await incrementUsage(user.id, 'ai_generations');

    const body = await request.json();
    const { messages, campaign_context, business_profile } = body as {
      messages: ChatMessage[];
      campaign_context?: GeneratedCampaign;
      business_profile: BusinessProfile;
    };

    if (!messages?.length || !business_profile) {
      return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return new Response(JSON.stringify({ error: 'No se encontró mensaje del usuario' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Sanitize user input
    const sanitizedContent = sanitizeString(lastUserMessage.content, 10000);

    // Fetch brand analysis for context
    const { data: dbProfile } = await supabase
      .from('business_profiles')
      .select('brand_analysis, brand_tone, logo_url')
      .eq('user_id', user.id)
      .single();

    const brandAnalysis = dbProfile?.brand_analysis;

    let systemPrompt = `Eres un asistente experto en Meta Ads para negocios en Latinoamérica. Responde siempre en español de forma concisa y útil.

NEGOCIO: ${sanitizeString(business_profile.business_name, 500)}
INDUSTRIA: ${sanitizeString(business_profile.industry || 'No especificada', 500)}
DESCRIPCIÓN: ${sanitizeString(business_profile.description || 'No proporcionada', 2000)}`;

    if (brandAnalysis) {
      systemPrompt += `\n\nIDENTIDAD DE MARCA:
- Estilo visual: ${brandAnalysis.visual_style || 'No definido'}
- Personalidad: ${brandAnalysis.personality?.join(', ') || 'No definida'}
- Tono: ${brandAnalysis.tone_description || dbProfile?.brand_tone || 'No definido'}
- Colores: ${brandAnalysis.color_palette?.map((c: { hex: string; name: string }) => `${c.name} (${c.hex})`).join(', ') || 'No definidos'}
- Estilos recomendados: ${brandAnalysis.recommended_ad_styles?.join(', ') || 'No definidos'}

Cuando generes copy o sugieras creativos, asegúrate de que sean coherentes con esta identidad de marca.`;
    }

    if (campaign_context) {
      systemPrompt += `\n\nCAMPAÑA ACTUAL:\n${JSON.stringify(campaign_context, null, 2)}`;
      systemPrompt += `\n\nSi el usuario pide modificaciones a la campaña, responde con texto explicando los cambios. Si necesitas devolver la campaña modificada completa, incluye un bloque JSON al final de tu mensaje con el tag [CAMPAIGN_UPDATE] antes del JSON.`;
    }

    const model = getGeminiFlash();
    const history = messages.slice(0, -1).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamChat(
            model,
            systemPrompt,
            history,
            sanitizedContent
          );

          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Error de streaming';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return handleApiError(error, { route: 'ai/chat', userId: undefined });
  }
}
