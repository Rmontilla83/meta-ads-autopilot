'use client';

import { getPlanLimits, PLANS } from '@/lib/plans';
import type { PlanLimits } from '@/types';

type BooleanFeature = {
  [K in keyof PlanLimits]: PlanLimits[K] extends boolean ? K : never;
}[keyof PlanLimits];

type NumericLimit = {
  [K in keyof PlanLimits]: PlanLimits[K] extends number ? K : never;
}[keyof PlanLimits];

export function usePlan(plan: string = 'free') {
  // Normalize: treat 'professional' as 'growth'
  const normalizedPlan = plan === 'professional' ? 'growth' : plan;
  const limits = getPlanLimits(normalizedPlan);
  const planInfo = PLANS[normalizedPlan] || PLANS.free;

  const isWithinLimit = (resource: NumericLimit, current: number): boolean => {
    const limit = limits[resource];
    if (limit === -1) return true;
    return current < limit;
  };

  const canUseFeature = (feature: BooleanFeature): boolean => {
    return !!limits[feature];
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
