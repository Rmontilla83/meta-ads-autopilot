import type { PlanLimits } from '@/types';

export interface PlanConfig {
  name: string;
  price: { monthly: number; annual: number };
  limits: PlanLimits;
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    name: 'Gratis',
    price: { monthly: 0, annual: 0 },
    limits: {
      activeCampaigns: 1,
      monthlySpend: 500,
      adAccounts: 1,
      aiGenerations: 5,
      automationRules: 0,
      bulkCampaigns: 0,
      support: 'comunidad',
      autoOptimizer: false,
      pdfReports: false,
      bulkCreate: false,
      advancedAnalytics: false,
    },
    features: [
      '1 campaña activa',
      '5 generaciones IA/mes',
      '1 cuenta publicitaria',
      'Dashboard básico',
      'Soporte comunidad',
    ],
  },
  starter: {
    name: 'Starter',
    price: { monthly: 29, annual: Math.round(29 * 12 * 0.8 / 12) },
    limits: {
      activeCampaigns: 3,
      monthlySpend: 5000,
      adAccounts: 2,
      aiGenerations: 50,
      automationRules: 5,
      bulkCampaigns: 10,
      support: 'email',
      autoOptimizer: false,
      pdfReports: false,
      bulkCreate: true,
      advancedAnalytics: false,
    },
    features: [
      '3 campañas activas',
      '50 generaciones IA/mes',
      '2 cuentas publicitarias',
      'Creación masiva',
      '5 reglas de automatización',
      'Soporte por email',
    ],
  },
  growth: {
    name: 'Growth',
    price: { monthly: 79, annual: Math.round(79 * 12 * 0.8 / 12) },
    limits: {
      activeCampaigns: 15,
      monthlySpend: 50000,
      adAccounts: 5,
      aiGenerations: -1,
      automationRules: 25,
      bulkCampaigns: 50,
      support: 'prioritario',
      autoOptimizer: true,
      pdfReports: true,
      bulkCreate: true,
      advancedAnalytics: true,
    },
    features: [
      '15 campañas activas',
      'Generaciones IA ilimitadas',
      '5 cuentas publicitarias',
      'Reportes PDF con IA',
      'Optimizador automático',
      'Analíticas avanzadas',
      'Soporte prioritario',
    ],
  },
  agency: {
    name: 'Agencia',
    price: { monthly: 199, annual: Math.round(199 * 12 * 0.8 / 12) },
    limits: {
      activeCampaigns: -1,
      monthlySpend: -1,
      adAccounts: -1,
      aiGenerations: -1,
      automationRules: -1,
      bulkCampaigns: -1,
      support: 'dedicado',
      autoOptimizer: true,
      pdfReports: true,
      bulkCreate: true,
      advancedAnalytics: true,
    },
    features: [
      'Campañas ilimitadas',
      'Sin límite de inversión',
      'Cuentas ilimitadas',
      'IA ilimitada',
      'Reportes PDF con IA',
      'Optimizador automático',
      'Soporte dedicado + onboarding',
    ],
  },
};

// Keep 'professional' as alias for 'growth' for backward compatibility
PLANS.professional = PLANS.growth;

export function getPlanLimits(plan: string): PlanLimits {
  return PLANS[plan]?.limits ?? PLANS.free.limits;
}

export const STRIPE_PRICE_MAP: Record<string, string | undefined> = {
  'starter_monthly': process.env.STRIPE_PRICE_STARTER_MONTHLY,
  'starter_annual': process.env.STRIPE_PRICE_STARTER_ANNUAL,
  'growth_monthly': process.env.STRIPE_PRICE_GROWTH_MONTHLY,
  'growth_annual': process.env.STRIPE_PRICE_GROWTH_ANNUAL,
  'agency_monthly': process.env.STRIPE_PRICE_AGENCY_MONTHLY,
  'agency_annual': process.env.STRIPE_PRICE_AGENCY_ANNUAL,
};

export function getPlanByStripePrice(priceId: string): { plan: string; interval: string } | null {
  for (const [key, value] of Object.entries(STRIPE_PRICE_MAP)) {
    if (value === priceId) {
      const [plan, interval] = key.split('_');
      return { plan, interval };
    }
  }
  return null;
}
