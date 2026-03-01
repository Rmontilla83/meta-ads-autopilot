'use client';

import { getPlanLimits, PLANS } from '@/lib/plans';
import type { PlanLimits } from '@/types';

export function usePlan(plan: string = 'free') {
  const limits = getPlanLimits(plan);
  const planInfo = PLANS[plan] || PLANS.free;

  const isWithinLimit = (resource: keyof PlanLimits, current: number): boolean => {
    const limit = limits[resource];
    if (typeof limit === 'number' && limit === -1) return true; // unlimited
    if (typeof limit === 'number') return current < limit;
    return true;
  };

  return {
    plan,
    planName: planInfo.name,
    limits,
    features: planInfo.features,
    price: planInfo.price,
    isWithinLimit,
    isPro: plan === 'professional' || plan === 'agency',
  };
}
