-- Migration 008: Add buyer personas and sales angles to business profiles
-- These JSONB columns store structured buyer persona and sales angle data
-- that the AI uses to generate better-targeted campaigns.

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS buyer_personas jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sales_angles jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN business_profiles.buyer_personas IS 'Array of buyer persona objects: {id, name, description, demographics, pain_points, motivations, objections}';
COMMENT ON COLUMN business_profiles.sales_angles IS 'Array of sales angle objects: {id, name, hook, value_proposition, target_persona_id, emotional_trigger}';
