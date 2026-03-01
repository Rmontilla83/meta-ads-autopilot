import { createAdminClient } from '@/lib/supabase/admin';
import { getPlanLimits } from '@/lib/plans';
import { getUsage } from '@/lib/usage';

export type LimitFeature =
  | 'ai_generations'
  | 'active_campaigns'
  | 'auto_optimizer'
  | 'pdf_reports'
  | 'bulk_create'
  | 'advanced_analytics';

export interface LimitCheckResult {
  allowed: boolean;
  current?: number;
  limit?: number;
  planRequired?: string;
}

export async function checkPlanLimit(
  userId: string,
  feature: LimitFeature
): Promise<LimitCheckResult> {
  const supabase = createAdminClient();

  // Get user's plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  const plan = profile?.plan ?? 'free';
  const limits = getPlanLimits(plan);

  switch (feature) {
    case 'ai_generations': {
      if (limits.aiGenerations === -1) return { allowed: true };
      const usage = await getUsage(userId);
      return {
        allowed: usage.ai_generations < limits.aiGenerations,
        current: usage.ai_generations,
        limit: limits.aiGenerations,
        planRequired: limits.aiGenerations < 50 ? 'starter' : 'growth',
      };
    }

    case 'active_campaigns': {
      if (limits.activeCampaigns === -1) return { allowed: true };
      const { count } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['active', 'publishing']);
      const current = count ?? 0;
      return {
        allowed: current < limits.activeCampaigns,
        current,
        limit: limits.activeCampaigns,
        planRequired: limits.activeCampaigns < 3 ? 'starter' : 'growth',
      };
    }

    case 'auto_optimizer':
      return {
        allowed: limits.autoOptimizer,
        planRequired: 'growth',
      };

    case 'pdf_reports':
      return {
        allowed: limits.pdfReports,
        planRequired: 'growth',
      };

    case 'bulk_create':
      return {
        allowed: limits.bulkCreate,
        planRequired: 'starter',
      };

    case 'advanced_analytics':
      return {
        allowed: limits.advancedAnalytics,
        planRequired: 'growth',
      };

    default:
      return { allowed: true };
  }
}
