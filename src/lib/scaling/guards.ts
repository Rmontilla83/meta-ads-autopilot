import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaClientForUser } from '@/lib/meta/client';
import { createNotification } from '@/lib/notifications';

const MAX_INCREASE_PER_DAY_PCT = 20;
const COOLDOWN_HOURS = 6;
const CPA_REVERT_THRESHOLD_PCT = 30;

export async function canScale(
  campaignId: string,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const admin = createAdminClient();

  // Get scaling events for this campaign in the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentEvents } = await admin
    .from('scaling_events')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false });

  // Check total increase in last 24h (vertical scaling only)
  if (recentEvents && recentEvents.length > 0) {
    const totalIncrease = recentEvents
      .filter((e) => e.scaling_type === 'vertical' && e.success && !e.reverted)
      .reduce((sum, e) => {
        const detail = e.action_detail as { amount_percentage?: number };
        return sum + (detail.amount_percentage || 0);
      }, 0);

    if (totalIncrease >= MAX_INCREASE_PER_DAY_PCT) {
      return {
        allowed: false,
        reason: `Ya se aumentó el presupuesto un ${totalIncrease}% en las últimas 24 horas. El límite diario es ${MAX_INCREASE_PER_DAY_PCT}%.`,
      };
    }
  }

  // Check cooldown between scaling events
  if (recentEvents && recentEvents.length > 0) {
    const lastEvent = recentEvents[0];
    const lastEventTime = new Date(lastEvent.created_at).getTime();
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
    const timeSinceLastEvent = Date.now() - lastEventTime;

    if (timeSinceLastEvent < cooldownMs) {
      const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastEvent) / 60_000);
      return {
        allowed: false,
        reason: `Debes esperar ${remainingMinutes} minutos antes de escalar de nuevo (cooldown de ${COOLDOWN_HOURS}h).`,
      };
    }
  }

  // Check CPA trend - get last 7 days of metrics
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: metrics } = await admin
    .from('campaign_metrics')
    .select('date, cpa, ctr')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: true });

  if (metrics && metrics.length >= 3) {
    // Check if CPA is trending up (last 3 days vs first 3 days)
    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));

    const firstAvgCpa = firstHalf.reduce((s, m) => s + (m.cpa || 0), 0) / firstHalf.length;
    const secondAvgCpa = secondHalf.reduce((s, m) => s + (m.cpa || 0), 0) / secondHalf.length;

    if (firstAvgCpa > 0 && secondAvgCpa > firstAvgCpa * 1.2) {
      return {
        allowed: false,
        reason: `El CPA está subiendo (de $${firstAvgCpa.toFixed(2)} a $${secondAvgCpa.toFixed(2)}). No se recomienda escalar hasta que se estabilice.`,
      };
    }
  }

  return { allowed: true };
}

export async function autoRevert(scalingEventId: string): Promise<void> {
  const admin = createAdminClient();

  // Get the scaling event
  const { data: event, error } = await admin
    .from('scaling_events')
    .select('*')
    .eq('id', scalingEventId)
    .single();

  if (error || !event) {
    console.error('Scaling event not found for revert:', scalingEventId);
    return;
  }

  if (event.reverted) {
    return; // Already reverted
  }

  const detail = event.action_detail as {
    previous_budget?: number;
    meta_adset_id?: string;
    meta_campaign_id?: string;
    amount_percentage?: number;
  };

  // Check if CPA rose more than threshold
  const campaignId = event.campaign_id;
  if (!campaignId) return;

  const eventDate = new Date(event.created_at);
  const now = new Date();
  const daysSinceScaling = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceScaling < 1) {
    return; // Too soon to evaluate
  }

  const { data: metricsBefore } = await admin
    .from('campaign_metrics')
    .select('cpa')
    .eq('campaign_id', campaignId)
    .lt('date', eventDate.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(3);

  const { data: metricsAfter } = await admin
    .from('campaign_metrics')
    .select('cpa')
    .eq('campaign_id', campaignId)
    .gte('date', eventDate.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(3);

  if (!metricsBefore?.length || !metricsAfter?.length) return;

  const avgCpaBefore = metricsBefore.reduce((s, m) => s + (m.cpa || 0), 0) / metricsBefore.length;
  const avgCpaAfter = metricsAfter.reduce((s, m) => s + (m.cpa || 0), 0) / metricsAfter.length;

  if (avgCpaBefore <= 0) return;

  const cpaIncreasePct = ((avgCpaAfter - avgCpaBefore) / avgCpaBefore) * 100;

  if (cpaIncreasePct > CPA_REVERT_THRESHOLD_PCT) {
    // Revert: restore previous budget
    try {
      if (detail.previous_budget && event.scaling_type === 'vertical') {
        const metaClient = await getMetaClientForUser(event.user_id);

        if (detail.meta_adset_id) {
          await metaClient.updateAdSetBudget(detail.meta_adset_id, detail.previous_budget);
        } else if (detail.meta_campaign_id) {
          await metaClient.updateCampaignBudget(detail.meta_campaign_id, detail.previous_budget);
        }
      }

      // Mark as reverted
      await admin
        .from('scaling_events')
        .update({ reverted: true, reverted_at: new Date().toISOString() })
        .eq('id', scalingEventId);

      // Log the revert event
      await admin.from('scaling_events').insert({
        user_id: event.user_id,
        campaign_id: event.campaign_id,
        meta_adset_id: event.meta_adset_id,
        scaling_type: 'revert',
        action_detail: {
          original_event_id: scalingEventId,
          reason: `CPA subió ${cpaIncreasePct.toFixed(1)}% (umbral: ${CPA_REVERT_THRESHOLD_PCT}%)`,
          cpa_before: avgCpaBefore,
          cpa_after: avgCpaAfter,
          restored_budget: detail.previous_budget,
        },
        success: true,
      });

      // Notify
      await createNotification({
        user_id: event.user_id,
        type: 'budget_alert',
        title: 'Escalado revertido automáticamente',
        message: `El escalado de presupuesto se revirtió porque el CPA subió ${cpaIncreasePct.toFixed(0)}%.`,
        metadata: { scaling_event_id: scalingEventId, campaign_id: campaignId },
      });
    } catch (revertError) {
      console.error('Error reverting scaling:', revertError);
      await admin.from('scaling_events').insert({
        user_id: event.user_id,
        campaign_id: event.campaign_id,
        scaling_type: 'revert',
        action_detail: {
          original_event_id: scalingEventId,
          reason: `CPA subió ${cpaIncreasePct.toFixed(1)}%`,
        },
        success: false,
        error_message: revertError instanceof Error ? revertError.message : 'Error desconocido',
      });
    }
  }
}
