-- Tighten wishlist image uploads to the authenticated user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload wishlist images" ON storage.objects;
CREATE POLICY "Authenticated users can upload wishlist images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wishlist-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
  AND (storage.foldername(name))[1] = 'wishlist'
);

-- Keep wishlist images readable only by their owner via storage, even though the bucket stays public for compatibility
DROP POLICY IF EXISTS "wishlist-images: owner can view own objects" ON storage.objects;
CREATE POLICY "wishlist-images: owner can view own objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'wishlist-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
  AND (storage.foldername(name))[1] = 'wishlist'
);

-- Make clothing-images private so direct URLs no longer bypass wardrobe privacy
UPDATE storage.buckets
SET public = false
WHERE id = 'clothing-images';

-- Let owners keep managing files in their own clothing-images folder
DROP POLICY IF EXISTS "Authenticated users can upload clothing images" ON storage.objects;
CREATE POLICY "Authenticated users can upload clothing images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'clothing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own clothing images" ON storage.objects;
CREATE POLICY "Users can update own clothing images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'clothing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'clothing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own clothing images" ON storage.objects;
CREATE POLICY "Users can delete own clothing images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'clothing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- clothing-images select policy is created correctly in migration 20260430120000
DROP POLICY IF EXISTS "clothing-images: owner can list" ON storage.objects;