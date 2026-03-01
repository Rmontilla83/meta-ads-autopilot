import { createAdminClient } from '@/lib/supabase/admin';
import { MetaAdsClient } from '@/lib/meta/client';
import { decrypt } from '@/lib/encryption';
import { createNotification } from '@/lib/notifications';
import type { AutomationRule } from '@/types';

const PERIOD_DAYS: Record<string, number> = {
  last_1_day: 1,
  last_3_days: 3,
  last_7_days: 7,
  last_14_days: 14,
  last_30_days: 30,
};

const OPERATOR_FN: Record<string, (a: number, b: number) => boolean> = {
  gt: (a, b) => a > b,
  lt: (a, b) => a < b,
  gte: (a, b) => a >= b,
  lte: (a, b) => a <= b,
  eq: (a, b) => Math.abs(a - b) < 0.001,
};

const ACTION_LABELS: Record<string, string> = {
  pause_campaign: 'Campaña pausada',
  activate_campaign: 'Campaña activada',
  increase_budget: 'Presupuesto aumentado',
  decrease_budget: 'Presupuesto reducido',
  notify_only: 'Notificación enviada',
};

export async function evaluateAllRules() {
  const supabase = createAdminClient();

  const { data: rules, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('is_enabled', true);

  if (error || !rules?.length) return;

  // Group rules by user
  const rulesByUser = new Map<string, AutomationRule[]>();
  for (const rule of rules as AutomationRule[]) {
    const existing = rulesByUser.get(rule.user_id) || [];
    existing.push(rule);
    rulesByUser.set(rule.user_id, existing);
  }

  for (const [userId, userRules] of rulesByUser) {
    try {
      // Get user's Meta token
      const { data: conn } = await supabase
        .from('meta_connections')
        .select('access_token_encrypted, ad_account_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!conn) continue;

      const accessToken = decrypt(conn.access_token_encrypted);
      const client = new MetaAdsClient(accessToken);

      for (const rule of userRules) {
        try {
          if (!shouldExecute(rule)) continue;

          // Get campaigns in scope
          const campaignIds = rule.campaign_ids?.length
            ? rule.campaign_ids
            : await getAllCampaignIds(supabase, userId);

          if (!campaignIds.length) continue;

          for (const campaignId of campaignIds) {
            const metricValue = await getMetricValue(supabase, campaignId, rule.condition_metric, rule.condition_period);
            if (metricValue === null) continue;

            const compare = OPERATOR_FN[rule.condition_operator];
            if (!compare || !compare(metricValue, rule.condition_value)) continue;

            // Condition met — execute action
            await executeAction(supabase, client, rule, campaignId, metricValue, conn.ad_account_id);
          }
        } catch (ruleError) {
          console.error(`Error evaluating rule ${rule.id}:`, ruleError);
        }
      }
    } catch (userError) {
      console.error(`Error processing rules for user ${userId}:`, userError);
    }
  }
}

async function getAllCampaignIds(supabase: ReturnType<typeof createAdminClient>, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('campaigns')
    .select('id')
    .eq('user_id', userId)
    .not('meta_campaign_id', 'is', null)
    .in('status', ['active', 'paused']);

  return data?.map(c => c.id) || [];
}

async function getMetricValue(
  supabase: ReturnType<typeof createAdminClient>,
  campaignId: string,
  metric: string,
  period: string
): Promise<number | null> {
  const days = PERIOD_DAYS[period] || 7;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const { data } = await supabase
    .from('campaign_metrics')
    .select('*')
    .eq('campaign_id', campaignId)
    .gte('date', sinceStr);

  if (!data?.length) return null;

  // Sum or average based on metric type
  const sumMetrics = ['impressions', 'reach', 'clicks', 'spend', 'conversions', 'leads'];
  const avgMetrics = ['ctr', 'cpc', 'cpm', 'cpa', 'frequency'];

  if (sumMetrics.includes(metric)) {
    return data.reduce((sum, row) => sum + (Number(row[metric]) || 0), 0);
  }
  if (avgMetrics.includes(metric)) {
    const total = data.reduce((sum, row) => sum + (Number(row[metric]) || 0), 0);
    return total / data.length;
  }

  return null;
}

function shouldExecute(rule: AutomationRule): boolean {
  // Check max executions
  if (rule.max_executions > 0 && rule.total_executions >= rule.max_executions) {
    return false;
  }

  // Check frequency
  if (!rule.last_executed_at) return true;

  const last = new Date(rule.last_executed_at);
  const now = new Date();
  const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);

  switch (rule.frequency) {
    case 'hourly': return diffHours >= 1;
    case 'daily': return diffHours >= 24;
    case 'weekly': return diffHours >= 168;
    default: return true;
  }
}

async function executeAction(
  supabase: ReturnType<typeof createAdminClient>,
  client: MetaAdsClient,
  rule: AutomationRule,
  campaignId: string,
  metricValue: number,
  adAccountId: string | null
) {
  // Get campaign info
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, meta_campaign_id, campaign_data')
    .eq('id', campaignId)
    .single();

  if (!campaign?.meta_campaign_id) return;

  let success = true;
  let errorMessage: string | null = null;
  let actionDescription = ACTION_LABELS[rule.action_type] || rule.action_type;

  try {
    switch (rule.action_type) {
      case 'pause_campaign':
        await client.updateCampaignStatus(campaign.meta_campaign_id, 'PAUSED');
        await supabase.from('campaigns').update({ status: 'paused' }).eq('id', campaignId);
        break;

      case 'activate_campaign':
        await client.updateCampaignStatus(campaign.meta_campaign_id, 'ACTIVE');
        await supabase.from('campaigns').update({ status: 'active' }).eq('id', campaignId);
        break;

      case 'increase_budget': {
        const campaignData = campaign.campaign_data as Record<string, unknown> | null;
        const currentBudget = (campaignData as { campaign?: { daily_budget?: number } })?.campaign?.daily_budget || 0;
        const newBudget = Math.round(currentBudget * (1 + rule.action_value / 100));
        const newBudgetCents = newBudget * 100;
        await client.updateCampaignBudget(campaign.meta_campaign_id, newBudgetCents);
        actionDescription = `Presupuesto aumentado ${rule.action_value}% ($${currentBudget} → $${newBudget})`;
        break;
      }

      case 'decrease_budget': {
        const campaignData = campaign.campaign_data as Record<string, unknown> | null;
        const currentBudget = (campaignData as { campaign?: { daily_budget?: number } })?.campaign?.daily_budget || 0;
        const newBudget = Math.max(5, Math.round(currentBudget * (1 - rule.action_value / 100)));
        const newBudgetCents = newBudget * 100;
        await client.updateCampaignBudget(campaign.meta_campaign_id, newBudgetCents);
        actionDescription = `Presupuesto reducido ${rule.action_value}% ($${currentBudget} → $${newBudget})`;
        break;
      }

      case 'notify_only':
        // Only notification, no Meta API action
        break;
    }
  } catch (err) {
    success = false;
    errorMessage = err instanceof Error ? err.message : 'Error desconocido';
  }

  // Log execution
  await supabase.from('rule_executions').insert({
    rule_id: rule.id,
    user_id: rule.user_id,
    campaign_id: campaignId,
    campaign_name: campaign.name,
    action_taken: actionDescription,
    metric_value: metricValue,
    threshold_value: rule.condition_value,
    success,
    error_message: errorMessage,
  });

  // Update rule counters
  await supabase
    .from('automation_rules')
    .update({
      total_executions: rule.total_executions + 1,
      last_executed_at: new Date().toISOString(),
    })
    .eq('id', rule.id);

  // Create notification
  await createNotification({
    user_id: rule.user_id,
    type: success ? 'rule_executed' : 'campaign_error',
    title: success ? `Regla "${rule.name}" ejecutada` : `Error en regla "${rule.name}"`,
    message: success
      ? `${actionDescription} para "${campaign.name}" (${rule.condition_metric}: ${metricValue.toFixed(2)})`
      : `No se pudo ejecutar la acción para "${campaign.name}": ${errorMessage}`,
    metadata: {
      rule_id: rule.id,
      campaign_id: campaignId,
      metric_value: metricValue,
      threshold_value: rule.condition_value,
    },
  });
}
