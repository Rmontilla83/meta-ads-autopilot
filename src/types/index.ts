export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'starter' | 'professional' | 'growth' | 'agency';
  stripe_customer_id?: string;
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  industry: string | null;
  description: string | null;
  location: string | null;
  website: string | null;
  whatsapp: string | null;
  objectives: string[];
  monthly_budget: string | null;
  experience_level: string | null;
  brand_tone: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaConnection {
  id: string;
  user_id: string;
  meta_user_id: string;
  access_token_encrypted: string;
  token_expires_at: string | null;
  ad_account_id: string | null;
  ad_account_name: string | null;
  page_id: string | null;
  page_name: string | null;
  pixel_id: string | null;
  pixel_name: string | null;
  scopes: string[];
  is_active: boolean;
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  account_status: number;
  business_name?: string;
}

export interface MetaPage {
  id: string;
  name: string;
  category: string;
  access_token: string;
}

export interface MetaPixel {
  id: string;
  name: string;
  last_fired_time?: string;
}

export interface PlanLimits {
  activeCampaigns: number;
  monthlySpend: number;
  adAccounts: number;
  aiGenerations: number;
  automationRules: number;
  bulkCampaigns: number;
  support: string;
  autoOptimizer: boolean;
  pdfReports: boolean;
  bulkCreate: boolean;
  advancedAnalytics: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'unpaid';
  billing_interval: 'monthly' | 'annual' | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  month: string;
  ai_generations: number;
  campaigns_created: number;
  reports_generated: number;
  created_at: string;
  updated_at: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  children?: NavItem[];
}

// Campaign types
export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  status: 'draft' | 'publishing' | 'active' | 'paused' | 'error';
  objective: string | null;
  meta_campaign_id: string | null;
  campaign_data: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignAdSet {
  id: string;
  campaign_id: string;
  name: string;
  meta_adset_id: string | null;
  targeting: Record<string, unknown>;
  budget: number;
  status: 'draft' | 'active' | 'paused' | 'error';
  created_at: string;
  updated_at: string;
}

export interface CampaignAd {
  id: string;
  campaign_id: string;
  ad_set_id: string;
  name: string;
  meta_ad_id: string | null;
  meta_creative_id: string | null;
  creative_data: Record<string, unknown>;
  status: 'draft' | 'active' | 'paused' | 'error';
  created_at: string;
  updated_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  campaign_id: string | null;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  created_at: string;
  updated_at: string;
}

// Phase 3: Metrics & Analytics types

export interface BreakdownEntry {
  label: string;
  value: number;
  percentage: number;
}

export interface CampaignMetric {
  id: string;
  campaign_id: string;
  user_id: string;
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  conversions: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  frequency: number;
  breakdown_age: BreakdownEntry[];
  breakdown_gender: BreakdownEntry[];
  breakdown_placement: BreakdownEntry[];
  breakdown_device: BreakdownEntry[];
  created_at: string;
  updated_at: string;
}

export interface DailyMetric {
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  conversions: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface DashboardKPIs {
  spend: number;
  spendChange: number;
  reach: number;
  reachChange: number;
  clicks: number;
  clicksChange: number;
  conversions: number;
  conversionsChange: number;
  impressions: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface CampaignDetailMetrics {
  campaign: Campaign;
  kpis: {
    impressions: number;
    reach: number;
    clicks: number;
    spend: number;
    conversions: number;
    leads: number;
    ctr: number;
    cpc: number;
    cpm: number;
    cpa: number;
    frequency: number;
  };
  timeSeries: DailyMetric[];
  breakdowns: {
    age: BreakdownEntry[];
    gender: BreakdownEntry[];
    placement: BreakdownEntry[];
    device: BreakdownEntry[];
  };
  adSets: (CampaignAdSet & { metrics?: { impressions: number; clicks: number; spend: number; ctr: number } })[];
  ads: (CampaignAd & { metrics?: { impressions: number; clicks: number; spend: number; ctr: number } })[];
}

// Phase 4: Automation, Notifications & Templates

export interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  is_enabled: boolean;
  condition_metric: string;
  condition_operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  condition_value: number;
  condition_period: 'last_1_day' | 'last_3_days' | 'last_7_days' | 'last_14_days' | 'last_30_days';
  campaign_ids: string[];
  action_type: 'pause_campaign' | 'activate_campaign' | 'increase_budget' | 'decrease_budget' | 'notify_only';
  action_value: number;
  frequency: 'hourly' | 'daily' | 'weekly';
  max_executions: number;
  total_executions: number;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuleExecution {
  id: string;
  rule_id: string;
  user_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  action_taken: string;
  metric_value: number;
  threshold_value: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'rule_executed' | 'campaign_published' | 'campaign_error' | 'budget_alert' | 'performance_alert' | 'system';
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  template_data: Record<string, unknown>;
  industry: string | null;
  objective: string | null;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}
