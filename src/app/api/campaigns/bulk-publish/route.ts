import { createClient } from '@/lib/supabase/server';
import { getMetaClientForUser } from '@/lib/meta/client';
import { CampaignPublisher } from '@/lib/meta/publisher';
import { createNotification } from '@/lib/notifications';
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

    const { campaigns } = await request.json();

    if (!campaigns?.length) {
      return new Response(JSON.stringify({ error: 'No hay campañas para publicar' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get Meta connection
    const { data: metaConnection } = await supabase
      .from('meta_connections')
      .select('ad_account_id, page_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!metaConnection?.ad_account_id || !metaConnection?.page_id) {
      return new Response(JSON.stringify({ error: 'Configuración de Meta incompleta' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = await getMetaClientForUser(user.id);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        function sendEvent(data: Record<string, unknown>) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < campaigns.length; i++) {
          const campaignData = campaigns[i] as GeneratedCampaign;

          sendEvent({
            type: 'progress',
            index: i,
            total: campaigns.length,
            name: campaignData.campaign.name,
            status: 'publishing',
          });

          try {
            // Save to DB as draft first
            const { data: dbCampaign, error: insertError } = await supabase
              .from('campaigns')
              .insert({
                user_id: user.id,
                name: campaignData.campaign.name,
                status: 'publishing',
                objective: campaignData.campaign.objective,
                campaign_data: campaignData as unknown as Record<string, unknown>,
              })
              .select()
              .single();

            if (insertError || !dbCampaign) {
              throw new Error('Error al guardar campaña');
            }

            // Publish via CampaignPublisher
            const publisher = new CampaignPublisher(
              client,
              campaignData,
              metaConnection.ad_account_id,
              metaConnection.page_id,
              () => {} // Silent progress
            );

            const result = await publisher.publish();

            if (result.success) {
              await supabase
                .from('campaigns')
                .update({
                  status: 'active',
                  meta_campaign_id: result.meta_campaign_id,
                  published_at: new Date().toISOString(),
                })
                .eq('id', dbCampaign.id);

              successCount++;
              sendEvent({
                type: 'result',
                index: i,
                name: campaignData.campaign.name,
                status: 'success',
                campaign_id: dbCampaign.id,
                meta_campaign_id: result.meta_campaign_id,
              });
            } else {
              await supabase
                .from('campaigns')
                .update({ status: 'error' })
                .eq('id', dbCampaign.id);

              errorCount++;
              sendEvent({
                type: 'result',
                index: i,
                name: campaignData.campaign.name,
                status: 'error',
                error: result.error,
              });
            }
          } catch (error) {
            errorCount++;
            sendEvent({
              type: 'result',
              index: i,
              name: campaignData.campaign.name,
              status: 'error',
              error: error instanceof Error ? error.message : 'Error desconocido',
            });
          }
        }

        // Final summary
        sendEvent({
          type: 'done',
          total: campaigns.length,
          success: successCount,
          errors: errorCount,
        });

        // Notification
        await createNotification({
          user_id: user.id,
          type: successCount > 0 ? 'campaign_published' : 'campaign_error',
          title: 'Publicación masiva completada',
          message: `${successCount} de ${campaigns.length} campañas publicadas exitosamente${errorCount > 0 ? ` (${errorCount} con errores)` : ''}.`,
          metadata: { success: successCount, errors: errorCount },
        });

        controller.close();
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
    console.error('Bulk publish error:', error);
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
