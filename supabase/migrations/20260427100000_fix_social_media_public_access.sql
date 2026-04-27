-- Definitively restore public read access to the social-media bucket so
-- avatar images load for all users, not just the file owner.
--
-- Background: migration 20260423024426 dropped "Anyone can view social media"
-- and replaced it with an owner-only policy. That broke avatar loading for
-- everyone else since other users cannot sign or directly read foreign objects.
--
-- This migration:
--   1. Forces the bucket public flag to true so /object/public/ URLs bypass RLS
--   2. Drops the owner-only SELECT policy
--   3. Adds a broad authenticated-read policy so createSignedUrls works for any
--      authenticated user (needed as a fallback when direct URLs are used)

-- 1. Ensure bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'social-media';

-- 2. Remove the owner-only restriction
DROP POLICY IF EXISTS "social-media: owner can list" ON storage.objects;

-- 3. Allow any authenticated user to read / sign social-media objects
DROP POLICY IF EXISTS "social-media: authenticated read" ON storage.objects;
CREATE POLICY "social-media: authenticated read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'social-media');
