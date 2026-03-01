import type { PlanLimits } from '@/types';

export const PLANS: Record<string, { name: string; price: number; limits: PlanLimits; features: string[] }> = {
  free: {
    name: 'Gratis',
    price: 0,
    limits: {
      campaigns: 2,
      monthlySpend: 500,
      adAccounts: 1,
      aiSuggestions: 10,
      automationRules: 2,
      bulkCampaigns: 5,
      support: 'comunidad',
    },
    features: [
      '2 campañas activas',
      'Hasta $500 USD en inversión',
      '1 cuenta publicitaria',
      '10 sugerencias IA/mes',
      'Soporte comunidad',
    ],
  },
  starter: {
    name: 'Starter',
    price: 29,
    limits: {
      campaigns: 10,
      monthlySpend: 5000,
      adAccounts: 3,
      aiSuggestions: 100,
      automationRules: 10,
      bulkCampaigns: 20,
      support: 'email',
    },
    features: [
      '10 campañas activas',
      'Hasta $5,000 USD en inversión',
      '3 cuentas publicitarias',
      '100 sugerencias IA/mes',
      'Soporte por email',
    ],
  },
  professional: {
    name: 'Profesional',
    price: 79,
    limits: {
      campaigns: 50,
      monthlySpend: 50000,
      adAccounts: 10,
      aiSuggestions: -1, // unlimited
      automationRules: 50,
      bulkCampaigns: 100,
      support: 'prioritario',
    },
    features: [
      '50 campañas activas',
      'Hasta $50,000 USD en inversión',
      '10 cuentas publicitarias',
      'Sugerencias IA ilimitadas',
      'Soporte prioritario',
    ],
  },
  agency: {
    name: 'Agencia',
    price: 199,
    limits: {
      campaigns: -1, // unlimited
      monthlySpend: -1,
      adAccounts: -1,
      aiSuggestions: -1,
      automationRules: -1,
      bulkCampaigns: -1,
      support: 'dedicado',
    },
    features: [
      'Campañas ilimitadas',
      'Sin límite de inversión',
      'Cuentas ilimitadas',
      'Sugerencias IA ilimitadas',
      'Soporte dedicado + onboarding',
    ],
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLANS[plan]?.limits ?? PLANS.free.limits;
}
