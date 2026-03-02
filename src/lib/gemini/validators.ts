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

// Normalize items that AI may return as plain strings instead of {id, name} objects
const namedItemSchema = z.preprocess(
  (val) => (typeof val === 'string' ? { id: val, name: val } : val),
  z.object({ id: z.string(), name: z.string() })
);

// Normalize geo items that AI may return without a "key" field
const geoItemSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') return { key: val, name: val };
    if (val && typeof val === 'object' && !('key' in val)) return { key: (val as { name?: string }).name || '', ...val };
    return val;
  },
  z.object({ key: z.string(), name: z.string() })
);

const targetingSchema = z.object({
  age_min: z.number().min(13).max(65).default(18),
  age_max: z.number().min(13).max(65).default(65),
  genders: z.preprocess(
    (val) => (typeof val === 'number' ? [val] : val),
    z.array(z.number().min(0).max(2)).default([0])
  ),
  geo_locations: z.object({
    countries: z.array(z.string()).optional(),
    cities: z.array(geoItemSchema).optional(),
    regions: z.array(geoItemSchema).optional(),
  }).default({ countries: ['MX'] }),
  interests: z.array(namedItemSchema).optional(),
  behaviors: z.array(namedItemSchema).optional(),
  custom_audiences: z.array(z.string()).optional(),
  excluded_interests: z.array(namedItemSchema).optional(),
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

// Normalize ads: Gemini 2.5 may use "text"/"body"/"copy" instead of "primary_text",
// "title" instead of "headline", or omit fields entirely
const adSchema = z.preprocess(
  (val) => {
    if (val && typeof val === 'object') {
      const ad = val as Record<string, unknown>;
      return {
        ...ad,
        primary_text: ad.primary_text || ad.text || ad.body || ad.copy || ad.message || '',
        headline: ad.headline || ad.title || ad.heading || '',
        description: ad.description || ad.desc || '',
        name: ad.name || ad.ad_name || 'Anuncio',
      };
    }
    return val;
  },
  z.object({
    name: z.string(),
    format: z.enum(['single_image', 'carousel', 'video']).default('single_image'),
    primary_text: z.string(),
    headline: z.string(),
    description: z.string().default(''),
    call_to_action: z.string().default('LEARN_MORE'),
    destination_url: z.string().optional(),
  })
);

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

export const interestKeywordsSchema = z.object({
  interests: z.array(z.string()).min(5),
});

export const personaSuggestionsSchema = z.object({
  buyer_personas: z.array(z.object({
    name: z.string(),
    description: z.string(),
    demographics: z.string(),
    pain_points: z.array(z.string()).min(1),
    motivations: z.array(z.string()).min(1),
    objections: z.array(z.string()).min(1),
  })).min(1),
  sales_angles: z.array(z.object({
    name: z.string(),
    hook: z.string(),
    value_proposition: z.string(),
    target_persona: z.string(),
    emotional_trigger: z.string(),
  })).min(1),
});

const categoryScoreSchema = z.object({
  score: z.number().min(0).max(100),
  label: z.string(),
});

export const campaignAuditSchema = z.object({
  overall_score: z.number().min(0).max(100),
  category_scores: z.object({
    estructura: categoryScoreSchema,
    presupuesto: categoryScoreSchema,
    segmentacion: categoryScoreSchema,
    creativos: categoryScoreSchema,
    coherencia: categoryScoreSchema,
  }),
  findings: z.array(z.object({
    type: z.enum(['positive', 'negative']),
    category: z.string(),
    title: z.string(),
    detail: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
  })).min(1),
  recommendations: z.array(z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    expected_impact: z.string(),
  })).min(1),
  summary: z.string(),
});

const metricStatusSchema = z.enum(['good', 'warning', 'critical']).catch('warning');

// Gemini may return trend in Spanish or different casing
const trendSchema = z.preprocess((val) => {
  if (typeof val !== 'string') return 'stable';
  const v = val.toLowerCase().trim();
  if (v === 'improving' || v === 'mejorando' || v === 'up' || v === 'ascending') return 'improving';
  if (v === 'declining' || v === 'declinando' || v === 'bajando' || v === 'down' || v === 'descending') return 'declining';
  return 'stable';
}, z.enum(['improving', 'stable', 'declining']));

// Gemini may return priority in Spanish or different values
const traffPrioritySchema = z.preprocess((val) => {
  if (typeof val !== 'string') return 'important';
  const v = val.toLowerCase().trim();
  if (v === 'urgent' || v === 'urgente' || v === 'critical' || v === 'high' || v === 'alta') return 'urgent';
  if (v === 'optimization' || v === 'optimización' || v === 'low' || v === 'baja') return 'optimization';
  return 'important';
}, z.enum(['urgent', 'important', 'optimization']));

// Nullable number that defaults to 0
const safeNumber = z.preprocess((val) => {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}, z.number());

export const traffickerAnalysisSchema = z.object({
  health_score: z.number().min(0).max(100),
  overall_assessment: z.string(),
  campaign_diagnostics: z.array(z.object({
    campaign_id: z.string(),
    campaign_name: z.string(),
    score: z.number().min(0).max(100),
    metrics_status: z.object({
      ctr: metricStatusSchema,
      cpc: metricStatusSchema,
      cpa: metricStatusSchema,
      frequency: metricStatusSchema,
      roas: metricStatusSchema,
    }),
    trend: trendSchema,
  })),
  recommendations: z.array(z.object({
    priority: traffPrioritySchema,
    title: z.string(),
    explanation: z.string(),
    action_type: z.preprocess(
      (val) => {
        if (typeof val !== 'string') return 'adjust_targeting';
        const valid = [
          'pause_ad', 'increase_budget', 'decrease_budget',
          'adjust_targeting', 'change_placement', 'rotate_creative',
          'duplicate_winner', 'change_bid', 'create_variation',
          'adjust_schedule',
          'create_ab_test', 'create_retargeting', 'scale_winner',
          'create_funnel', 'create_lookalike', 'apply_schedule',
          'test_hooks',
        ];
        return valid.includes(val) ? val : 'adjust_targeting';
      },
      z.enum([
        'pause_ad', 'increase_budget', 'decrease_budget',
        'adjust_targeting', 'change_placement', 'rotate_creative',
        'duplicate_winner', 'change_bid', 'create_variation',
        'adjust_schedule',
        'create_ab_test', 'create_retargeting', 'scale_winner',
        'create_funnel', 'create_lookalike', 'apply_schedule',
        'test_hooks',
      ])
    ),
    action_params: z.record(z.string(), z.unknown()).default({}),
    target_id: z.string().default(''),
    target_name: z.string().default(''),
    estimated_impact: z.string(),
  })).min(1),
  audience_insights: z.object({
    best_segment: z.string(),
    best_placement: z.string(),
    best_schedule: z.string(),
    creative_winner: z.string(),
  }),
  prediction_30d: z.object({
    current_trajectory: z.object({
      leads: safeNumber,
      spend: safeNumber,
      cpa: safeNumber,
    }),
    optimized_trajectory: z.object({
      leads: safeNumber,
      spend: safeNumber,
      cpa: safeNumber,
    }),
  }),
  industry_comparison: z.object({
    ctr: z.object({ yours: safeNumber, industry_avg: safeNumber, top_performers: safeNumber }),
    cpc: z.object({ yours: safeNumber, industry_avg: safeNumber, top_performers: safeNumber }),
    cpa: z.object({ yours: safeNumber, industry_avg: safeNumber, top_performers: safeNumber }),
  }),
});

export const brandAnalysisSchema = z.object({
  visual_style: z.string(),
  personality: z.array(z.string()).min(2),
  tone_description: z.string(),
  color_palette: z.array(z.object({
    hex: z.string(),
    name: z.string(),
    usage: z.string(),
  })).min(1),
  dos: z.array(z.string()).min(2),
  donts: z.array(z.string()).min(2),
  recommended_ad_styles: z.array(z.string()).min(2),
  summary: z.string(),
});

export const colorExtractionSchema = z.object({
  colors: z.array(z.object({
    hex: z.string(),
    name: z.string(),
  })).min(1).max(5),
});

export type BrandAnalysisOutput = z.infer<typeof brandAnalysisSchema>;
export type ColorExtractionOutput = z.infer<typeof colorExtractionSchema>;
export type TraffickerAnalysisOutput = z.infer<typeof traffickerAnalysisSchema>;

export type CampaignAuditOutput = z.infer<typeof campaignAuditSchema>;
export type PersonaSuggestionsOutput = z.infer<typeof personaSuggestionsSchema>;
export type InterestKeywordsOutput = z.infer<typeof interestKeywordsSchema>;
export type ReportAnalysisOutput = z.infer<typeof reportAnalysisSchema>;
export type CampaignStrategyOutput = z.infer<typeof campaignStrategySchema>;
export type CopyVariationsOutput = z.infer<typeof copyVariationsSchema>;
export type AudienceSuggestionsOutput = z.infer<typeof audienceSuggestionsSchema>;
export type OptimizationSuggestionsOutput = z.infer<typeof optimizationSuggestionsSchema>;

// A/B Test Design schema

const abTestVariantConfigSchema = z.object({
  copy: z.object({
    primary_text: z.string(),
    headline: z.string(),
    description: z.string().default(''),
  }).optional(),
  targeting: z.record(z.string(), z.unknown()).optional(),
  image_prompt: z.string().optional(),
  hook: z.string().optional(),
});

export const abTestDesignSchema = z.object({
  variants: z.array(z.object({
    name: z.string(),
    type: z.string(),
    config: abTestVariantConfigSchema,
  })).min(2),
  hypothesis: z.string(),
  recommended_duration: z.number().min(3).max(90).default(14),
});

export type ABTestDesignOutput = z.infer<typeof abTestDesignSchema>;

// Creative Rotation schema

export const creativeRotationSchema = z.object({
  replacements: z.array(z.object({
    name: z.string(),
    primary_text: z.string(),
    headline: z.string(),
    description: z.string(),
    image_prompt: z.string(),
    angle_description: z.string(),
  })).min(1),
});

export type CreativeRotationOutput = z.infer<typeof creativeRotationSchema>;

// Schedule Optimization schema

export const scheduleOptimizationSchema = z.object({
  schedule_matrix: z.array(z.array(z.boolean()).length(24)).length(7),
  expected_savings_pct: z.number().min(0).max(100),
  reasoning: z.string(),
  best_hours: z.string(),
  worst_hours: z.string(),
});

export type ScheduleOptimizationOutput = z.infer<typeof scheduleOptimizationSchema>;

// Funnel Design schema

const funnelAdSchema = z.preprocess(
  (val) => {
    if (val && typeof val === 'object') {
      const ad = val as Record<string, unknown>;
      return {
        ...ad,
        primary_text: ad.primary_text || ad.text || ad.body || ad.copy || '',
        headline: ad.headline || ad.title || ad.heading || '',
        description: ad.description || ad.desc || '',
        name: ad.name || ad.ad_name || 'Anuncio',
      };
    }
    return val;
  },
  z.object({
    name: z.string(),
    primary_text: z.string(),
    headline: z.string(),
    description: z.string().default(''),
    call_to_action: z.string().default('LEARN_MORE'),
    image_prompt: z.string().default(''),
  })
);

const funnelTargetingSchema = z.object({
  age_min: z.number().min(13).max(65).default(18),
  age_max: z.number().min(13).max(65).default(65),
  genders: z.preprocess(
    (val) => (typeof val === 'number' ? [val] : val),
    z.array(z.number().min(0).max(2)).default([0])
  ),
  geo_locations: z.object({
    countries: z.array(z.string()).optional(),
    cities: z.array(z.object({ key: z.string(), name: z.string() })).optional(),
    regions: z.array(z.object({ key: z.string(), name: z.string() })).optional(),
  }).default({ countries: ['MX'] }),
  interests: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  custom_audiences: z.array(z.string()).optional(),
});

const funnelStageSchema = z.object({
  campaign_name: z.string(),
  objective: z.string(),
  optimization_goal: z.string().default('LINK_CLICKS'),
  targeting: funnelTargetingSchema,
  placements: z.array(z.string()).default(['feed', 'stories', 'reels']),
  ads: z.array(funnelAdSchema).min(1),
  budget_percentage: z.number().min(1).max(100),
});

export const funnelDesignSchema = z.object({
  funnel_name: z.string(),
  strategy: z.string(),
  stages: z.object({
    tofu: funnelStageSchema,
    mofu: funnelStageSchema,
    bofu: funnelStageSchema,
  }),
});

export type FunnelDesignOutput = z.infer<typeof funnelDesignSchema>;

// ============================================
// Retargeting Strategy schema
// ============================================

export const retargetingStrategySchema = z.object({
  opportunities: z.array(z.object({
    name: z.string(),
    audience_type: z.enum([
      'website_visitors',
      'engaged_users',
      'video_viewers',
      'lead_form_openers',
      'past_purchasers',
      'page_visitors',
      'add_to_cart',
    ]),
    retention_days: z.number().min(1).max(365).default(30),
    estimated_size: z.string().default('Desconocido'),
    copy: z.object({
      primary_text: z.string(),
      headline: z.string(),
      description: z.string().default(''),
    }),
    offer_suggestion: z.string().default(''),
    rationale: z.string(),
  })).min(1),
});

export type RetargetingStrategyOutput = z.infer<typeof retargetingStrategySchema>;

// ============================================
// Scaling Recommendation schema
// ============================================

export const scalingRecommendationSchema = z.object({
  recommendation: z.object({
    should_scale: z.boolean(),
    scaling_type: z.enum(['vertical', 'horizontal', 'lookalike']).default('vertical'),
    amount_percentage: z.number().min(0).max(50).default(10),
    risk_level: z.enum(['low', 'medium', 'high']).default('medium'),
    reasoning: z.string(),
    current_metrics: z.object({
      daily_spend: z.number().default(0),
      cpa: z.number().default(0),
      ctr: z.number().default(0),
      roas: z.number().default(0),
      conversions_per_day: z.number().default(0),
    }),
    projected_metrics: z.object({
      daily_spend: z.number().default(0),
      cpa: z.number().default(0),
      ctr: z.number().default(0),
      roas: z.number().default(0),
      conversions_per_day: z.number().default(0),
    }),
    conditions_to_revert: z.string().default(''),
  }),
});

export type ScalingRecommendationOutput = z.infer<typeof scalingRecommendationSchema>;

// ============================================
// Hook Generator schema
// ============================================

export const hookGeneratorSchema = z.object({
  hooks: z.array(z.object({
    hook: z.string(),
    type: z.string(),
    viral_score: z.number().min(1).max(10).default(5),
    primary_text: z.string(),
    headline: z.string(),
    description: z.string().default(''),
  })).min(5),
});

export type HookGeneratorOutput = z.infer<typeof hookGeneratorSchema>;
