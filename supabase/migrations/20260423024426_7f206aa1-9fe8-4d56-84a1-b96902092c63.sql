
-- Drop overly broad public SELECT policies on storage.objects
DROP POLICY IF EXISTS "Anyone can view clothing images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view social media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view wishlist images" ON storage.objects;

-- Add owner-scoped listing for wishlist-images (clothing-images and social-media already have one)
CREATE POLICY "wishlist-images: owner can list"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'wishlist-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
