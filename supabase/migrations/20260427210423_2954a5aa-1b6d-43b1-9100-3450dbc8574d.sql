DROP POLICY IF EXISTS "social-media: owner can list" ON storage.objects;
CREATE POLICY "social-media: authenticated can read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'social-media');
UPDATE storage.buckets SET public = true WHERE id = 'social-media';