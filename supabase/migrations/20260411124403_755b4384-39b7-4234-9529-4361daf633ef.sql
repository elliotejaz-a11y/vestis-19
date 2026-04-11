INSERT INTO storage.buckets (id, name, public) VALUES ('wishlist-images', 'wishlist-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload wishlist images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'wishlist-images');

CREATE POLICY "Anyone can view wishlist images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'wishlist-images');

CREATE POLICY "Users can delete own wishlist images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'wishlist-images' AND (storage.foldername(name))[1] = auth.uid()::text);