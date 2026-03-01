'use client';

import { getPlanLimits, PLANS } from '@/lib/plans';
import type { PlanLimits } from '@/types';

export function usePlan(plan: string = 'free') {
  // Normalize: treat 'professional' as 'growth'
  const normalizedPlan = plan === 'professional' ? 'growth' : plan;
  const limits = getPlanLimits(normalizedPlan);
  const planInfo = PLANS[normalizedPlan] || PLANS.free;

  const isWithinLimit = (resource: keyof PlanLimits, current: number): boolean => {
    const limit = limits[resource];
    if (typeof limit === 'boolean') return limit;
    if (typeof limit === 'number' && limit === -1) return true;
    if (typeof limit === 'number') return current < limit;
    return true;
  };

  const canUseFeature = (feature: 'autoOptimizer' | 'pdfReports' | 'bulkCreate' | 'advancedAnalytics'): boolean => {
    return limits[feature];
  };

  return {
    plan: normalizedPlan,
    planName: planInfo.name,
    limits,
    features: planInfo.features,
    price: planInfo.price,
    isWithinLimit,
    canUseFeature,
    isPro: normalizedPlan === 'growth' || normalizedPlan === 'agency',
  };
}
