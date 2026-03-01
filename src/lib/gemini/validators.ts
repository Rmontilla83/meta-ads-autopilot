import { z } from 'zod';

export const META_OBJECTIVE_MAP: Record<string, string> = {
  OUTCOME_AWARENESS: 'OUTCOME_AWARENESS',
  OUTCOME_TRAFFIC: 'OUTCOME_TRAFFIC',
  OUTCOME_ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
  OUTCOME_LEADS: 'OUTCOME_LEADS',
  OUTCOME_SALES: 'OUTCOME_SALES',
  OUTCOME_APP_PROMOTION: 'OUTCOME_APP_PROMOTION',
  // Legacy mappings
  BRAND_AWARENESS: 'OUTCOME_AWARENESS',
  REACH: 'OUTCOME_AWARENESS',
  TRAFFIC: 'OUTCOME_TRAFFIC',
  ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
  LEAD_GENERATION: 'OUTCOME_LEADS',
  CONVERSIONS: 'OUTCOME_SALES',
  APP_INSTALLS: 'OUTCOME_APP_PROMOTION',
};

const targetingSchema = z.object({
  age_min: z.number().min(18).max(65).default(18),
  age_max: z.number().min(18).max(65).default(65),
  genders: z.array(z.number().min(0).max(2)).default([0]),
  geo_locations: z.object({
    countries: z.array(z.string()).optional(),
    cities: z.array(z.object({ key: z.string(), name: z.string() })).optional(),
    regions: z.array(z.object({ key: z.string(), name: z.string() })).optional(),
  }).default({ countries: ['MX'] }),
  interests: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  behaviors: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  custom_audiences: z.array(z.string()).optional(),
  excluded_interests: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
});

const estimatedResultsSchema = z.object({
  daily_reach_min: z.number().default(1000),
  daily_reach_max: z.number().default(5000),
  daily_clicks_min: z.number().default(50),
  daily_clicks_max: z.number().default(200),
  estimated_cpa_min: z.number().default(0.5),
  estimated_cpa_max: z.number().default(5.0),
  estimated_ctr: z.number().default(1.5),
});

const adSetSchema = z.object({
  name: z.string(),
  targeting: targetingSchema,
  placements: z.array(z.string()).default(['feed', 'stories', 'reels']),
  budget_percentage: z.number().min(1).max(100).default(100),
  optimization_goal: z.string().default('LINK_CLICKS'),
  bid_strategy: z.string().default('LOWEST_COST_WITHOUT_CAP'),
  schedule: z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  }).optional(),
});

const adSchema = z.object({
  name: z.string(),
  format: z.enum(['single_image', 'carousel', 'video']).default('single_image'),
  primary_text: z.string(),
  headline: z.string(),
  description: z.string().default(''),
  call_to_action: z.string().default('LEARN_MORE'),
  destination_url: z.string().optional(),
});

export const campaignStrategySchema = z.object({
  strategy: z.object({
    rationale: z.string(),
    objective: z.string(),
    estimated_results: estimatedResultsSchema,
    optimization_tips: z.array(z.string()).default([]),
  }),
  campaign: z.object({
    name: z.string(),
    objective: z.string(),
    special_ad_categories: z.array(z.string()).default([]),
    daily_budget: z.number().min(1).default(10),
  }),
  ad_sets: z.array(adSetSchema).min(1),
  ads: z.array(adSchema).min(1),
});

export const copyVariationsSchema = z.object({
  variations: z.array(z.object({
    primary_text: z.string(),
    headline: z.string(),
    description: z.string().default(''),
  })).min(1),
});

export const audienceSuggestionsSchema = z.object({
  audiences: z.array(z.object({
    name: z.string(),
    description: z.string(),
    targeting: targetingSchema,
    estimated_size: z.string().default('Desconocido'),
    rationale: z.string(),
  })).min(1),
});

export const optimizationSuggestionsSchema = z.object({
  suggestions: z.array(z.object({
    recommendation: z.string(),
    action: z.string(),
    expected_impact: z.string(),
    priority: z.enum(['high', 'medium', 'low']).default('medium'),
  })).min(1),
});

export const reportAnalysisSchema = z.object({
  executive_summary: z.string(),
  strengths: z.array(z.string()).min(1),
  weaknesses: z.array(z.string()).min(1),
  recommendations: z.array(z.object({
    action: z.string(),
    priority: z.enum(['high', 'medium', 'low']).default('medium'),
    expected_impact: z.string(),
  })).min(1),
  overall_rating: z.enum(['Excelente', 'Bueno', 'Regular', 'Bajo']).default('Regular'),
  conclusion: z.string(),
});

export type ReportAnalysisOutput = z.infer<typeof reportAnalysisSchema>;
export type CampaignStrategyOutput = z.infer<typeof campaignStrategySchema>;
export type CopyVariationsOutput = z.infer<typeof copyVariationsSchema>;
export type AudienceSuggestionsOutput = z.infer<typeof audienceSuggestionsSchema>;
export type OptimizationSuggestionsOutput = z.infer<typeof optimizationSuggestionsSchema>;
