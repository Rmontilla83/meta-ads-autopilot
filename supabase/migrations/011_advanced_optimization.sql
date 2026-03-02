-- ============================================
-- Migration 011: Advanced Optimization Features
-- A/B Testing, Creative Fatigue, Funnels,
-- Custom Audiences, Scaling, Smart Scheduling
-- ============================================

-- 1. A/B Tests
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('copy', 'creative', 'audience', 'multivariate', 'hook')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'paused')),
  meta_campaign_id TEXT,
  variants JSONB NOT NULL DEFAULT '[]',
  winner_variant_id TEXT,
  success_metric TEXT NOT NULL DEFAULT 'ctr',
  test_duration_days INT NOT NULL DEFAULT 7,
  min_conversions_per_variant INT NOT NULL DEFAULT 50,
  auto_winner_enabled BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Creative Rotations
CREATE TABLE IF NOT EXISTS creative_rotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ad_id UUID REFERENCES campaign_ads(id) ON DELETE SET NULL,
  meta_ad_id TEXT,
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'fatigued', 'rotated')),
  frequency_at_detection NUMERIC(10,4) DEFAULT 0,
  ctr_at_detection NUMERIC(10,4) DEFAULT 0,
  ctr_baseline NUMERIC(10,4) DEFAULT 0,
  ctr_drop_percentage NUMERIC(10,4) DEFAULT 0,
  impressions_at_detection INT DEFAULT 0,
  replacement_ad_id UUID REFERENCES campaign_ads(id) ON DELETE SET NULL,
  detected_at TIMESTAMPTZ DEFAULT now(),
  rotated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Funnel Campaigns
CREATE TABLE IF NOT EXISTS funnel_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'publishing', 'active', 'paused', 'error')),
  tofu_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  mofu_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  bofu_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  funnel_config JSONB NOT NULL DEFAULT '{}',
  custom_audience_ids JSONB NOT NULL DEFAULT '[]',
  daily_budget NUMERIC(10,2) NOT NULL DEFAULT 30,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Custom Audiences
CREATE TABLE IF NOT EXISTS custom_audiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meta_audience_id TEXT,
  name TEXT NOT NULL,
  audience_type TEXT NOT NULL CHECK (audience_type IN ('custom', 'lookalike', 'retargeting')),
  subtype TEXT,
  source_audience_id UUID REFERENCES custom_audiences(id) ON DELETE SET NULL,
  lookalike_spec JSONB,
  approximate_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'error', 'deleted')),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Scaling Events
CREATE TABLE IF NOT EXISTS scaling_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  meta_adset_id TEXT,
  scaling_type TEXT NOT NULL CHECK (scaling_type IN ('vertical', 'horizontal', 'lookalike', 'revert')),
  action_detail JSONB NOT NULL DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  reverted BOOLEAN NOT NULL DEFAULT false,
  reverted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Schedule Configs
CREATE TABLE IF NOT EXISTS schedule_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  meta_adset_id TEXT,
  schedule_matrix JSONB NOT NULL DEFAULT '[]',
  performance_heatmap JSONB NOT NULL DEFAULT '[]',
  is_applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  last_evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add hypothesis column to ab_tests (for AI-generated hypothesis)
ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS hypothesis TEXT;

-- Extend usage_tracking
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS ab_tests_created INT DEFAULT 0;
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS funnels_created INT DEFAULT 0;

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scaling_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_configs ENABLE ROW LEVEL SECURITY;

-- ab_tests
CREATE POLICY "Users can view own ab_tests" ON ab_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ab_tests" ON ab_tests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ab_tests" ON ab_tests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ab_tests" ON ab_tests FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role ab_tests" ON ab_tests FOR ALL USING (auth.role() = 'service_role');

-- creative_rotations
CREATE POLICY "Users can view own creative_rotations" ON creative_rotations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own creative_rotations" ON creative_rotations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own creative_rotations" ON creative_rotations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own creative_rotations" ON creative_rotations FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role creative_rotations" ON creative_rotations FOR ALL USING (auth.role() = 'service_role');

-- funnel_campaigns
CREATE POLICY "Users can view own funnel_campaigns" ON funnel_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own funnel_campaigns" ON funnel_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own funnel_campaigns" ON funnel_campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own funnel_campaigns" ON funnel_campaigns FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role funnel_campaigns" ON funnel_campaigns FOR ALL USING (auth.role() = 'service_role');

-- custom_audiences
CREATE POLICY "Users can view own custom_audiences" ON custom_audiences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own custom_audiences" ON custom_audiences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom_audiences" ON custom_audiences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom_audiences" ON custom_audiences FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role custom_audiences" ON custom_audiences FOR ALL USING (auth.role() = 'service_role');

-- scaling_events
CREATE POLICY "Users can view own scaling_events" ON scaling_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scaling_events" ON scaling_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scaling_events" ON scaling_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role scaling_events" ON scaling_events FOR ALL USING (auth.role() = 'service_role');

-- schedule_configs
CREATE POLICY "Users can view own schedule_configs" ON schedule_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedule_configs" ON schedule_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedule_configs" ON schedule_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedule_configs" ON schedule_configs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role schedule_configs" ON schedule_configs FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_ab_tests_user ON ab_tests(user_id);
CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_ab_tests_campaign ON ab_tests(campaign_id);
CREATE INDEX idx_creative_rotations_user ON creative_rotations(user_id);
CREATE INDEX idx_creative_rotations_status ON creative_rotations(status);
CREATE INDEX idx_creative_rotations_campaign ON creative_rotations(campaign_id);
CREATE INDEX idx_funnel_campaigns_user ON funnel_campaigns(user_id);
CREATE INDEX idx_funnel_campaigns_status ON funnel_campaigns(status);
CREATE INDEX idx_custom_audiences_user ON custom_audiences(user_id);
CREATE INDEX idx_custom_audiences_type ON custom_audiences(audience_type);
CREATE INDEX idx_scaling_events_user ON scaling_events(user_id);
CREATE INDEX idx_scaling_events_campaign ON scaling_events(campaign_id);
CREATE INDEX idx_schedule_configs_user ON schedule_configs(user_id);
CREATE INDEX idx_schedule_configs_campaign ON schedule_configs(campaign_id);
