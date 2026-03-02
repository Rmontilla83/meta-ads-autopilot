-- ============================================================
-- Migration 012: Persistent Trafficker IA Analyses
-- ============================================================

CREATE TABLE trafiquer_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  health_score INTEGER,
  overall_assessment TEXT,
  campaign_diagnostics JSONB,
  recommendations JSONB,
  audience_insights JSONB,
  prediction_30d JSONB,
  industry_comparison JSONB,
  feature_status JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE trafiquer_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
  ON trafiquer_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON trafiquer_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_trafiquer_analyses_user_created
  ON trafiquer_analyses(user_id, created_at DESC);
