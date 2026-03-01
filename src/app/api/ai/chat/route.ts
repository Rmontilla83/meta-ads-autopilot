import { createClient } from '@/lib/supabase/server';
import { getGeminiFlash, streamChat } from '@/lib/gemini/client';
import { CAMPAIGN_STRATEGIST } from '@/lib/gemini/prompts';
import type { ChatMessage } from '@/lib/gemini/types';
import type { BusinessProfile } from '@/types';
import type { GeneratedCampaign } from '@/lib/gemini/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

    let systemPrompt = `Eres un asistente experto en Meta Ads para negocios en Latinoamérica. Responde siempre en español de forma concisa y útil.

NEGOCIO: ${business_profile.business_name}
INDUSTRIA: ${business_profile.industry || 'No especificada'}
DESCRIPCIÓN: ${business_profile.description || 'No proporcionada'}`;

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
            lastUserMessage.content
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
    console.error('Chat error:', error);
    const message = error instanceof Error ? error.message : 'Error en el chat';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
