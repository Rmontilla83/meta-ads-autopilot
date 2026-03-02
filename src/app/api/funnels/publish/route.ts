import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaClientForUser } from '@/lib/meta/client';
import { FunnelPublisher } from '@/lib/funnels/publisher';
import { createNotification } from '@/lib/notifications';
import { checkPlanLimit } from '@/lib/plan-limits';
import { incrementUsage } from '@/lib/usage';
import type { FunnelDesignOutput } from '@/lib/gemini/validators';

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`funnel-pub:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    // Check plan limit
    const limitCheck = await checkPlanLimit(user.id, 'funnels');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'Los funnels de ventas están disponibles desde el plan Growth',
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const body = await request.json();
    const { funnel_id } = body as { funnel_id: string };

    if (!funnel_id) {
      return NextResponse.json({ error: 'funnel_id es requerido' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get funnel from DB
    const { data: funnel, error: funnelError } = await admin
      .from('funnel_campaigns')
      .select('*')
      .eq('id', funnel_id)
      .eq('user_id', user.id)
      .single();

    if (funnelError || !funnel) {
      return NextResponse.json({ error: 'Funnel no encontrado' }, { status: 404 });
    }

    if (funnel.status === 'active') {
      return NextResponse.json({ error: 'Este funnel ya está activo' }, { status: 400 });
    }

    // Get Meta connection info
    const { data: metaConnection } = await supabase
      .from('meta_connections')
      .select('ad_account_id, page_id, pixel_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!metaConnection?.ad_account_id || !metaConnection?.page_id) {
      return NextResponse.json({
        error: 'Necesitas configurar tu cuenta publicitaria y página de Facebook',
      }, { status: 400 });
    }

    // Update status to publishing
    await admin
      .from('funnel_campaigns')
      .update({ status: 'publishing' })
      .eq('id', funnel_id);

    const client = await getMetaClientForUser(user.id);

    const funnelConfig: FunnelDesignOutput = {
      funnel_name: funnel.name,
      strategy: '',
      stages: funnel.funnel_config as FunnelDesignOutput['stages'],
    };

    const progressLog: Array<{ step: string; message: string; completed: boolean }> = [];

    const publisher = new FunnelPublisher(
      client,
      metaConnection.ad_account_id,
      metaConnection.page_id,
      (p) => progressLog.push({ step: p.step, message: p.message, completed: p.completed }),
      metaConnection.pixel_id,
    );

    const result = await publisher.publishFunnel(funnelConfig, funnel.daily_budget, user.id);

    if (result.success) {
      // Create campaign records for each stage and collect their local UUIDs
      const stagesInfo = [
        { key: 'tofu', metaId: result.tofuCampaignId, name: `TOFU - ${funnel.name}`, config: funnelConfig.stages.tofu },
        { key: 'mofu', metaId: result.mofuCampaignId, name: `MOFU - ${funnel.name}`, config: funnelConfig.stages.mofu },
        { key: 'bofu', metaId: result.bofuCampaignId, name: `BOFU - ${funnel.name}`, config: funnelConfig.stages.bofu },
      ];

      const localCampaignIds: Record<string, string | null> = {
        tofu: null,
        mofu: null,
        bofu: null,
      };

      for (const stage of stagesInfo) {
        if (stage.metaId) {
          const { data: inserted } = await admin.from('campaigns').insert({
            user_id: user.id,
            name: stage.name,
            status: 'active',
            objective: stage.config.objective,
            meta_campaign_id: stage.metaId,
            campaign_data: stage.config,
            published_at: new Date().toISOString(),
          }).select('id').single();

          if (inserted) {
            localCampaignIds[stage.key] = inserted.id;
          }
        }
      }

      // Update funnel with local campaign UUIDs (FK to campaigns table)
      await admin
        .from('funnel_campaigns')
        .update({
          status: 'active',
          tofu_campaign_id: localCampaignIds.tofu,
          mofu_campaign_id: localCampaignIds.mofu,
          bofu_campaign_id: localCampaignIds.bofu,
          custom_audience_ids: result.customAudienceIds || [],
          published_at: new Date().toISOString(),
        })
        .eq('id', funnel_id);

      await createNotification({
        user_id: user.id,
        type: 'campaign_published',
        title: 'Funnel publicado',
        message: `Tu funnel "${funnel.name}" se publicó exitosamente con 3 campañas (TOFU, MOFU, BOFU).`,
        metadata: {
          funnel_id,
          tofu_campaign_id: localCampaignIds.tofu,
          mofu_campaign_id: localCampaignIds.mofu,
          bofu_campaign_id: localCampaignIds.bofu,
          meta_tofu_id: result.tofuCampaignId,
          meta_mofu_id: result.mofuCampaignId,
          meta_bofu_id: result.bofuCampaignId,
        },
      });

      await incrementUsage(user.id, 'campaigns_created');

      return NextResponse.json({
        success: true,
        tofuCampaignId: localCampaignIds.tofu,
        mofuCampaignId: localCampaignIds.mofu,
        bofuCampaignId: localCampaignIds.bofu,
        customAudienceIds: result.customAudienceIds,
        progress: progressLog,
      });
    } else {
      await admin
        .from('funnel_campaigns')
        .update({ status: 'error' })
        .eq('id', funnel_id);

      await createNotification({
        user_id: user.id,
        type: 'campaign_error',
        title: 'Error al publicar funnel',
        message: `El funnel "${funnel.name}" no pudo publicarse: ${result.error}`,
        metadata: { funnel_id, error: result.error },
      });

      return NextResponse.json({
        success: false,
        error: result.error,
        progress: progressLog,
      }, { status: 500 });
    }
  } catch (error) {
    return handleApiError(error, { route: 'funnels-publish' });
  }
}
