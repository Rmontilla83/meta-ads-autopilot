-- Recommendation actions table for Trafiquer IA
CREATE TABLE IF NOT EXISTS recommendation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  recommendation_title TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_params JSONB DEFAULT '{}',
  target_id TEXT,
  target_name TEXT,
  result TEXT CHECK (result IN ('success', 'failed', 'pending')) DEFAULT 'pending',
  error_message TEXT,
  metrics_before JSONB,
  metrics_after JSONB,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recommendation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recommendation actions"
  ON recommendation_actions FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_recommendation_actions_user ON recommendation_actions(user_id);
CREATE INDEX idx_recommendation_actions_campaign ON recommendation_actions(campaign_id);
CREATE INDEX idx_recommendation_actions_applied ON recommendation_actions(applied_at DESC);
