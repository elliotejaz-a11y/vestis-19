-- Fix: "clothing-images: owner can list" policy is broken for cross-user signed URL generation.
--
-- Two bugs in the previous policy:
--   1. It references ci.privacy which does not exist (column is is_private). This causes
--      the EXISTS subquery to error at runtime, so the OR branch always fails → non-owners
--      can never generate signed URLs.
--   2. ci.image_url = name compares a full URL (legacy items) against a storage path,
--      so the match never succeeds for older items even if bug 1 were fixed.
--
-- Fix: replace with a simple friend-based check. Viewer just needs to be friends with the
-- file owner (determined from the user-id folder prefix in the storage path). Item-level
-- privacy is already enforced by clothing_items RLS before the frontend ever reaches storage.

DROP POLICY IF EXISTS "clothing-images: owner can list" ON storage.objects;

CREATE POLICY "clothing-images: owner and friends can select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'clothing-images'
  AND (
    -- File owner can always access their own files
    auth.uid()::text = (storage.foldername(name))[1]
    -- Mutual friends can generate signed URLs for each other's non-private items
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      AND public.are_friends(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
  )
);
