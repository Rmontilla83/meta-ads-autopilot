-- Migration: Brand Identity fields for business profiles
-- Adds logo, brand files, colors, typography, gallery, and AI analysis

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_files TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_colors JSONB,
  ADD COLUMN IF NOT EXISTS brand_typography TEXT,
  ADD COLUMN IF NOT EXISTS brand_gallery TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_analysis JSONB;

-- Note: Create bucket 'business-branding' (public) in Supabase dashboard
-- or via: INSERT INTO storage.buckets (id, name, public) VALUES ('business-branding', 'business-branding', true);
