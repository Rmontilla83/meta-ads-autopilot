import { createAdminClient } from '@/lib/supabase/admin';
import { getPlanLimits } from '@/lib/plans';
import { getUsage } from '@/lib/usage';

export type LimitFeature =
  | 'ai_generations'
  | 'image_generations'
  | 'active_campaigns'
  | 'auto_optimizer'
  | 'pdf_reports'
  | 'bulk_create'
  | 'advanced_analytics'
  | 'ab_testing'
  | 'funnels'
  | 'retargeting'
  | 'smart_scheduling';

export interface LimitCheckResult {
  allowed: boolean;
  current?: number;
  limit?: number;
  planRequired?: string;
}

// ---------------------------------------------------------------------------
// In-memory TTL cache for user plan lookups.
// A user's plan changes infrequently (only on upgrade/downgrade), so caching
// the plan string for 5 minutes avoids a Supabase round-trip on every AI or
// feature-gated API call.
// ---------------------------------------------------------------------------
const PLAN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_PLAN_CACHE_SIZE = 500;

interface PlanCacheEntry {
  plan: string;
  expiresAt: number;
}

const planCache = new Map<string, PlanCacheEntry>();

/**
 * Retrieve the user's plan, using a short-lived in-memory cache to avoid
 * redundant DB queries within the same serverless invocation or during
 * bursts of requests from the same user.
 */
async function getUserPlan(userId: string): Promise<string> {
  const now = Date.now();

  // Check cache
  const cached = planCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.plan;
  }

  // Evict expired entries when cache grows beyond threshold
  if (planCache.size >= MAX_PLAN_CACHE_SIZE) {
    for (const [key, entry] of planCache) {
      if (entry.expiresAt <= now) {
        planCache.delete(key);
      }
    }
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  const plan = profile?.plan ?? 'free';

  planCache.set(userId, { plan, expiresAt: now + PLAN_CACHE_TTL_MS });

  return plan;
}

/**
 * Invalidate the cached plan for a user. Call this after a plan change
 * (e.g. Stripe webhook) so subsequent checks reflect the new plan immediately.
 */
export function invalidatePlanCache(userId: string): void {
  planCache.delete(userId);
}

export async function checkPlanLimit(
  userId: string,
  feature: LimitFeature
): Promise<LimitCheckResult> {
  const plan = await getUserPlan(userId);
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

    case 'image_generations': {
      if (limits.imageGenerations === -1) return { allowed: true };
      const usage = await getUsage(userId);
      return {
        allowed: usage.image_generations < limits.imageGenerations,
        current: usage.image_generations,
        limit: limits.imageGenerations,
        planRequired: limits.imageGenerations < 20 ? 'starter' : 'growth',
      };
    }

    case 'active_campaigns': {
      if (limits.activeCampaigns === -1) return { allowed: true };
      const supabase = createAdminClient();
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

    case 'ab_testing':
      return {
        allowed: limits.abTesting,
        planRequired: 'growth',
      };

    case 'funnels':
      return {
        allowed: limits.funnels,
        planRequired: 'growth',
      };

    case 'retargeting':
      return {
        allowed: limits.retargeting,
        planRequired: 'growth',
      };

    case 'smart_scheduling':
      return {
        allowed: limits.smartScheduling,
        planRequired: 'growth',
      };

    default:
      return { allowed: true };
  }
}
