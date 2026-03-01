-- ============================================
-- Phase 2: Campaigns & AI Tables
-- ============================================

-- Campaigns table
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'publishing', 'active', 'paused', 'error')) NOT NULL,
  objective TEXT,
  meta_campaign_id TEXT,
  campaign_data JSONB DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- AI conversations table
CREATE TABLE ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  messages JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Campaign ad sets table
CREATE TABLE campaign_ad_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  meta_adset_id TEXT,
  targeting JSONB DEFAULT '{}'::jsonb,
  budget NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'error')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Campaign ads table
CREATE TABLE campaign_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  ad_set_id UUID REFERENCES campaign_ad_sets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  meta_ad_id TEXT,
  meta_creative_id TEXT,
  creative_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'error')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_campaign_id ON ai_conversations(campaign_id);
CREATE INDEX idx_campaign_ad_sets_campaign_id ON campaign_ad_sets(campaign_id);
CREATE INDEX idx_campaign_ads_campaign_id ON campaign_ads(campaign_id);
CREATE INDEX idx_campaign_ads_ad_set_id ON campaign_ads(ad_set_id);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_ads ENABLE ROW LEVEL SECURITY;

-- Campaigns RLS
CREATE POLICY "Users can view own campaigns" ON campaigns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own campaigns" ON campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON campaigns
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- AI conversations RLS
CREATE POLICY "Users can view own conversations" ON ai_conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own conversations" ON ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON ai_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Campaign ad sets RLS
CREATE POLICY "Users can view own ad sets" ON campaign_ad_sets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_ad_sets.campaign_id AND campaigns.user_id = auth.uid())
  );
CREATE POLICY "Users can create own ad sets" ON campaign_ad_sets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_ad_sets.campaign_id AND campaigns.user_id = auth.uid())
  );
CREATE POLICY "Users can update own ad sets" ON campaign_ad_sets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_ad_sets.campaign_id AND campaigns.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own ad sets" ON campaign_ad_sets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_ad_sets.campaign_id AND campaigns.user_id = auth.uid())
  );

-- Campaign ads RLS
CREATE POLICY "Users can view own ads" ON campaign_ads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_ads.campaign_id AND campaigns.user_id = auth.uid())
  );
CREATE POLICY "Users can create own ads" ON campaign_ads
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_ads.campaign_id AND campaigns.user_id = auth.uid())
  );
CREATE POLICY "Users can update own ads" ON campaign_ads
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_ads.campaign_id AND campaigns.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own ads" ON campaign_ads
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_ads.campaign_id AND campaigns.user_id = auth.uid())
  );

-- ============================================
-- Updated_at triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_ad_sets_updated_at
  BEFORE UPDATE ON campaign_ad_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_ads_updated_at
  BEFORE UPDATE ON campaign_ads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
