import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMetaClientForUser } from '@/lib/meta/client';
import { CampaignPublisher, type PublishProgress } from '@/lib/meta/publisher';
import { createNotification } from '@/lib/notifications';
import type { GeneratedCampaign } from '@/lib/gemini/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { campaign_id } = await request.json();

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id es requerido' }, { status: 400 });
    }

    // Load campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    // Get Meta connection info
    const { data: metaConnection } = await supabase
      .from('meta_connections')
      .select('ad_account_id, page_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!metaConnection?.ad_account_id || !metaConnection?.page_id) {
      return NextResponse.json({
        error: 'Necesitas configurar tu cuenta publicitaria y página de Facebook',
      }, { status: 400 });
    }

    // Update status to publishing
    await supabase
      .from('campaigns')
      .update({ status: 'publishing' })
      .eq('id', campaign_id);

    const client = await getMetaClientForUser(user.id);
    const campaignData = campaign.campaign_data as unknown as GeneratedCampaign;
    const progress: PublishProgress[] = [];

    const publisher = new CampaignPublisher(
      client,
      campaignData,
      metaConnection.ad_account_id,
      metaConnection.page_id,
      (p) => progress.push(p)
    );

    const result = await publisher.publish();

    if (result.success) {
      // Update campaign with Meta IDs
      await supabase
        .from('campaigns')
        .update({
          status: 'active',
          meta_campaign_id: result.meta_campaign_id,
          published_at: new Date().toISOString(),
        })
        .eq('id', campaign_id);

      await createNotification({
        user_id: user.id,
        type: 'campaign_published',
        title: 'Campaña publicada',
        message: `Tu campaña "${campaign.name}" se publicó exitosamente en Meta Ads.`,
        metadata: { campaign_id, meta_campaign_id: result.meta_campaign_id },
      });

      return NextResponse.json({
        success: true,
        meta_campaign_id: result.meta_campaign_id,
        progress,
      });
    } else {
      await supabase
        .from('campaigns')
        .update({ status: 'error' })
        .eq('id', campaign_id);

      await createNotification({
        user_id: user.id,
        type: 'campaign_error',
        title: 'Error al publicar',
        message: `La campaña "${campaign.name}" no pudo publicarse: ${result.error}`,
        metadata: { campaign_id, error: result.error },
      });

      return NextResponse.json({
        success: false,
        error: result.error,
        progress,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Publish error:', error);
    const message = error instanceof Error ? error.message : 'Error al publicar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
