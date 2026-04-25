-- Ensure social-media bucket is public so avatar URLs load for all users.
-- Previous migrations dropped the "Anyone can view social media" storage policy
-- which may have affected public URL serving on this bucket.

-- Force bucket public flag to true
UPDATE storage.buckets SET public = true WHERE id = 'social-media';

-- Re-add a permissive read policy so any authenticated or anonymous user
-- can fetch objects directly (covers both public URL and API access paths)
DROP POLICY IF EXISTS "social-media: public read" ON storage.objects;
CREATE POLICY "social-media: public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'social-media');
