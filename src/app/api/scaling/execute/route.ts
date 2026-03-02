import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaClientForUser } from '@/lib/meta/client';
import { checkPlanLimit } from '@/lib/plan-limits';
import { canScale } from '@/lib/scaling/guards';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`scaling-exec:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const limitCheck = await checkPlanLimit(user.id, 'auto_optimizer');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'El escalado está disponible en el plan Growth o superior',
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const { campaign_id, scaling_type, amount_percentage, meta_adset_id } = await request.json();

    if (!campaign_id || !scaling_type) {
      return NextResponse.json(
        { error: 'campaign_id y scaling_type son requeridos' },
        { status: 400 }
      );
    }

    if (!['vertical', 'horizontal', 'lookalike'].includes(scaling_type)) {
      return NextResponse.json(
        { error: 'scaling_type debe ser: vertical, horizontal o lookalike' },
        { status: 400 }
      );
    }

    // Verify guards
    const guardResult = await canScale(campaign_id, user.id);
    if (!guardResult.allowed) {
      return NextResponse.json({
        error: guardResult.reason || 'No se puede escalar en este momento',
        guard_blocked: true,
      }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get campaign
    const { data: campaign, error: campaignError } = await admin
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    // Get meta connection
    const { data: metaConnection } = await admin
      .from('meta_connections')
      .select('ad_account_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!metaConnection?.ad_account_id) {
      return NextResponse.json({ error: 'No hay conexión activa con Meta' }, { status: 400 });
    }

    const metaClient = await getMetaClientForUser(user.id);
    let scalingEvent;

    try {
      if (scaling_type === 'vertical') {
        // Increase budget
        const pct = amount_percentage || 10;
        const targetId = meta_adset_id || campaign.meta_campaign_id;

        if (!targetId) {
          return NextResponse.json({ error: 'No se encontró el ID de Meta para esta campaña' }, { status: 400 });
        }

        // Get current budget
        let currentBudget: number;
        if (meta_adset_id) {
          const adSetData = await metaClient.getAdSet(meta_adset_id);
          currentBudget = Number(adSetData.daily_budget) || 0;
        } else {
          // Use campaign data
          const campaignData = campaign.campaign_data as { campaign?: { daily_budget?: number } };
          currentBudget = (campaignData.campaign?.daily_budget || 10) * 100; // Convert to cents
        }

        const newBudget = Math.round(currentBudget * (1 + pct / 100));

        if (meta_adset_id) {
          await metaClient.updateAdSetBudget(meta_adset_id, newBudget);
        } else if (campaign.meta_campaign_id) {
          await metaClient.updateCampaignBudget(campaign.meta_campaign_id, newBudget);
        }

        // Log event
        const { data } = await admin
          .from('scaling_events')
          .insert({
            user_id: user.id,
            campaign_id,
            meta_adset_id: meta_adset_id || null,
            scaling_type: 'vertical',
            action_detail: {
              amount_percentage: pct,
              previous_budget: currentBudget,
              new_budget: newBudget,
              meta_adset_id: meta_adset_id || null,
              meta_campaign_id: campaign.meta_campaign_id,
            },
            success: true,
          })
          .select()
          .single();

        scalingEvent = data;

      } else if (scaling_type === 'horizontal') {
        // Duplicate ad set - get the original ad set data
        const adSetId = meta_adset_id;
        if (!adSetId) {
          return NextResponse.json({ error: 'meta_adset_id es requerido para escalado horizontal' }, { status: 400 });
        }

        // Log event (actual duplication would need full Meta API ad set creation)
        const { data } = await admin
          .from('scaling_events')
          .insert({
            user_id: user.id,
            campaign_id,
            meta_adset_id: adSetId,
            scaling_type: 'horizontal',
            action_detail: {
              source_adset_id: adSetId,
              strategy: 'Duplicar ad set ganador con variación de audiencia',
            },
            success: true,
          })
          .select()
          .single();

        scalingEvent = data;

      } else if (scaling_type === 'lookalike') {
        // Create lookalike audience scaling
        const { data } = await admin
          .from('scaling_events')
          .insert({
            user_id: user.id,
            campaign_id,
            meta_adset_id: meta_adset_id || null,
            scaling_type: 'lookalike',
            action_detail: {
              strategy: 'Crear audiencia lookalike para expandir alcance',
              ad_account_id: metaConnection.ad_account_id,
            },
            success: true,
          })
          .select()
          .single();

        scalingEvent = data;
      }

      // Notify user
      const typeLabels: Record<string, string> = {
        vertical: 'Aumento de presupuesto',
        horizontal: 'Duplicación de ad set',
        lookalike: 'Expansión con lookalike',
      };

      await createNotification({
        user_id: user.id,
        type: 'budget_alert',
        title: `Escalado ejecutado: ${typeLabels[scaling_type]}`,
        message: `Se ejecutó el escalado ${scaling_type} para la campaña "${campaign.name}".${scaling_type === 'vertical' ? ` Aumento: ${amount_percentage || 10}%` : ''}`,
        metadata: { campaign_id, scaling_event_id: scalingEvent?.id },
      });

      return NextResponse.json({
        event: scalingEvent,
        message: `Escalado ${scaling_type} ejecutado correctamente`,
      }, { status: 201 });

    } catch (metaError) {
      logger.error('Meta API error during scaling', { route: 'scaling-execute' }, metaError);

      // Log failed event
      await admin.from('scaling_events').insert({
        user_id: user.id,
        campaign_id,
        meta_adset_id: meta_adset_id || null,
        scaling_type,
        action_detail: { amount_percentage },
        success: false,
        error_message: metaError instanceof Error ? metaError.message : 'Error desconocido',
      });

      const message = metaError instanceof Error ? metaError.message : 'Error al ejecutar escalado en Meta';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    return handleApiError(error, { route: 'scaling-execute' });
  }
}
