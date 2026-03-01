export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface CampaignStrategy {
  rationale: string;
  objective: string;
  estimated_results: EstimatedResults;
  optimization_tips: string[];
}

export interface EstimatedResults {
  daily_reach_min: number;
  daily_reach_max: number;
  daily_clicks_min: number;
  daily_clicks_max: number;
  estimated_cpa_min: number;
  estimated_cpa_max: number;
  estimated_ctr: number;
}

export interface GeneratedAdSet {
  name: string;
  targeting: TargetingConfig;
  placements: string[];
  budget_percentage: number;
  optimization_goal: string;
  bid_strategy: string;
  schedule?: {
    start_date?: string;
    end_date?: string;
  };
}

export interface TargetingConfig {
  age_min: number;
  age_max: number;
  genders: number[]; // 0=all, 1=male, 2=female
  geo_locations: {
    countries?: string[];
    cities?: Array<{ key: string; name: string }>;
    regions?: Array<{ key: string; name: string }>;
  };
  interests?: Array<{ id: string; name: string }>;
  behaviors?: Array<{ id: string; name: string }>;
  custom_audiences?: string[];
  excluded_interests?: Array<{ id: string; name: string }>;
}

export interface GeneratedAd {
  name: string;
  format: 'single_image' | 'carousel' | 'video';
  primary_text: string;
  headline: string;
  description: string;
  call_to_action: string;
  destination_url?: string;
}

export interface GeneratedCampaign {
  strategy: CampaignStrategy;
  campaign: {
    name: string;
    objective: string;
    special_ad_categories: string[];
    daily_budget: number;
  };
  ad_sets: GeneratedAdSet[];
  ads: GeneratedAd[];
}

export interface CopyVariation {
  primary_text: string;
  headline: string;
  description: string;
}

export interface AudienceSuggestion {
  name: string;
  description: string;
  targeting: TargetingConfig;
  estimated_size: string;
  rationale: string;
}

export interface OptimizationSuggestion {
  recommendation: string;
  action: string;
  expected_impact: string;
  priority: 'high' | 'medium' | 'low';
}
