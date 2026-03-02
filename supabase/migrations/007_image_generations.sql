-- Add image_generations column to usage_tracking
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS image_generations integer DEFAULT 0;

-- Storage bucket for generated ad images
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-creatives', 'ad-creatives', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to ad-creatives
CREATE POLICY "Users can upload ad creatives" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ad-creatives');

-- Allow public read access for ad creative images
CREATE POLICY "Public read ad creatives" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ad-creatives');

-- Allow users to delete their own ad creatives
CREATE POLICY "Users can delete own ad creatives" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ad-creatives' AND (storage.foldername(name))[1] = auth.uid()::text);
