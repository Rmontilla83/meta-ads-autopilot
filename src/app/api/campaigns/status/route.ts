import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMetaClientForUser } from '@/lib/meta/client';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { entityId, entityType, status } = await request.json();

  if (!entityId || !entityType || !status) {
    return NextResponse.json({ error: 'entityId, entityType y status son requeridos' }, { status: 400 });
  }

  if (!['ACTIVE', 'PAUSED'].includes(status)) {
    return NextResponse.json({ error: 'Status debe ser ACTIVE o PAUSED' }, { status: 400 });
  }

  try {
    const client = await getMetaClientForUser(user.id);
    const localStatus = status === 'ACTIVE' ? 'active' : 'paused';

    if (entityType === 'campaign') {
      // Verify ownership
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('meta_campaign_id')
        .eq('id', entityId)
        .eq('user_id', user.id)
        .single();

      if (!campaign?.meta_campaign_id) {
        return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
      }

      await client.updateCampaignStatus(campaign.meta_campaign_id, status);
      await supabase.from('campaigns').update({ status: localStatus }).eq('id', entityId);
    } else if (entityType === 'adset') {
      // Verify ownership through campaign
      const { data: adSet } = await supabase
        .from('campaign_ad_sets')
        .select('meta_adset_id, campaign_id, campaigns!inner(user_id)')
        .eq('id', entityId)
        .single();

      const adSetRecord = adSet as unknown as { meta_adset_id: string; campaign_id: string; campaigns: { user_id: string } };
      if (!adSetRecord?.meta_adset_id || adSetRecord.campaigns.user_id !== user.id) {
        return NextResponse.json({ error: 'Ad set no encontrado' }, { status: 404 });
      }

      await client.updateAdSetStatus(adSetRecord.meta_adset_id, status);
      await supabase.from('campaign_ad_sets').update({ status: localStatus }).eq('id', entityId);
    } else if (entityType === 'ad') {
      const { data: ad } = await supabase
        .from('campaign_ads')
        .select('meta_ad_id, campaign_id, campaigns!inner(user_id)')
        .eq('id', entityId)
        .single();

      const adRecord = ad as unknown as { meta_ad_id: string; campaign_id: string; campaigns: { user_id: string } };
      if (!adRecord?.meta_ad_id || adRecord.campaigns.user_id !== user.id) {
        return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 });
      }

      await client.updateAdStatus(adRecord.meta_ad_id, status);
      await supabase.from('campaign_ads').update({ status: localStatus }).eq('id', entityId);
    } else {
      return NextResponse.json({ error: 'entityType inválido' }, { status: 400 });
    }

    return NextResponse.json({ success: true, status: localStatus });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar estado' },
      { status: 500 }
    );
  }
}
