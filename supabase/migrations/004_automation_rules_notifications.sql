-- ============================================
-- Phase 4: Automation Rules, Notifications & Campaign Templates
-- ============================================

-- ============================================
-- 1. Automation Rules
-- ============================================
CREATE TABLE automation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,

  -- Condition
  condition_metric TEXT NOT NULL,  -- spend, ctr, cpc, cpm, cpa, impressions, clicks, conversions, reach, frequency
  condition_operator TEXT NOT NULL, -- gt, lt, gte, lte, eq
  condition_value NUMERIC(12,4) NOT NULL,
  condition_period TEXT NOT NULL DEFAULT 'last_7_days', -- last_1_day, last_3_days, last_7_days, last_14_days, last_30_days

  -- Scope
  campaign_ids UUID[] DEFAULT '{}',

  -- Action
  action_type TEXT NOT NULL, -- pause_campaign, activate_campaign, increase_budget, decrease_budget, notify_only
  action_value NUMERIC(8,2) DEFAULT 0, -- percentage for budget changes

  -- Execution limits
  frequency TEXT NOT NULL DEFAULT 'daily', -- hourly, daily, weekly
  max_executions INTEGER DEFAULT 0, -- 0 = unlimited
  total_executions INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_automation_rules_user_id ON automation_rules(user_id);
CREATE INDEX idx_automation_rules_enabled ON automation_rules(is_enabled) WHERE is_enabled = true;

-- RLS
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own rules" ON automation_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rules" ON automation_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rules" ON automation_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rules" ON automation_rules FOR DELETE USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Rule Executions
-- ============================================
CREATE TABLE rule_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  campaign_name TEXT,
  action_taken TEXT NOT NULL,
  metric_value NUMERIC(12,4) NOT NULL,
  threshold_value NUMERIC(12,4) NOT NULL,
  success BOOLEAN DEFAULT true NOT NULL,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_rule_executions_rule_id ON rule_executions(rule_id);
CREATE INDEX idx_rule_executions_user_id ON rule_executions(user_id);
CREATE INDEX idx_rule_executions_created_at ON rule_executions(created_at DESC);

-- RLS
ALTER TABLE rule_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own executions" ON rule_executions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own executions" ON rule_executions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_rule_executions_updated_at
  BEFORE UPDATE ON rule_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Notifications
-- ============================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- rule_executed, campaign_published, campaign_error, budget_alert, performance_alert, system
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Campaign Templates
-- ============================================
CREATE TABLE campaign_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  industry TEXT,
  objective TEXT,
  is_public BOOLEAN DEFAULT false NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_campaign_templates_user_id ON campaign_templates(user_id);
CREATE INDEX idx_campaign_templates_public ON campaign_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_campaign_templates_industry ON campaign_templates(industry);

-- RLS
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own templates" ON campaign_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public templates" ON campaign_templates FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert own templates" ON campaign_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON campaign_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON campaign_templates FOR DELETE USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_campaign_templates_updated_at
  BEFORE UPDATE ON campaign_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
