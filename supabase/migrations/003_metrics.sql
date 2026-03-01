-- ============================================
-- Phase 3: Campaign Metrics
-- ============================================

-- Campaign metrics table (daily snapshots from Meta Insights API)
CREATE TABLE campaign_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,

  -- Core metrics
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,

  -- Calculated metrics
  ctr NUMERIC(8,4) DEFAULT 0,
  cpc NUMERIC(12,4) DEFAULT 0,
  cpm NUMERIC(12,4) DEFAULT 0,
  cpa NUMERIC(12,4) DEFAULT 0,
  frequency NUMERIC(8,4) DEFAULT 0,

  -- Breakdown data (JSONB arrays)
  breakdown_age JSONB DEFAULT '[]'::jsonb,
  breakdown_gender JSONB DEFAULT '[]'::jsonb,
  breakdown_placement JSONB DEFAULT '[]'::jsonb,
  breakdown_device JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(campaign_id, date)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_campaign_metrics_user_id ON campaign_metrics(user_id);
CREATE INDEX idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX idx_campaign_metrics_date ON campaign_metrics(date);
CREATE INDEX idx_campaign_metrics_campaign_date ON campaign_metrics(campaign_id, date);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics" ON campaign_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own metrics" ON campaign_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metrics" ON campaign_metrics
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own metrics" ON campaign_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE TRIGGER update_campaign_metrics_updated_at
  BEFORE UPDATE ON campaign_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
