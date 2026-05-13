-- Wishlist infrastructure: bucket creation, stale policy cleanup, delete policy,
-- and wishlist_items RLS policies.
--
-- History: the wishlist-images bucket and wishlist_items table were created
-- manually via the Supabase Dashboard and never recorded in migrations. Two later
-- migrations (20260423024426, 20260423030555) defined storage RLS policies
-- assuming the bucket existed, but the INSERT INTO storage.buckets was never
-- written. This migration makes the bucket idempotent, cleans up a stale policy,
-- adds the missing delete policy, and ensures wishlist_items RLS is correct.

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- private=false keeps the storage URL scheme compatible with getPublicUrl()
-- (which the client stores in the DB), while the owner-scoped RLS policies below
-- prevent other users from reading or writing the objects.
INSERT INTO storage.buckets (id, name, public)
VALUES ('wishlist-images', 'wishlist-images', false)
ON CONFLICT (id) DO NOTHING;

-- ── Stale SELECT policy cleanup ───────────────────────────────────────────────
-- Migration 20260423024426 created "wishlist-images: owner can list" which checks
-- folder[1] = uid. But the actual upload path is wishlist/{uid}/{file}, so
-- folder[1] = 'wishlist' — never the uid. This policy silently never matched.
-- The correct SELECT policy (folder[2]=uid, folder[1]='wishlist') was created in
-- 20260423030555 and is already in place; drop the dead one to avoid confusion.
DROP POLICY IF EXISTS "wishlist-images: owner can list" ON storage.objects;

-- ── Delete policy (previously missing) ───────────────────────────────────────
-- Owners need to be able to clean up their own storage objects. Without this,
-- image files accumulate in the bucket even after the wishlist item DB row is
-- deleted. Path format matches the upload path: wishlist/{uid}/{filename}.
DROP POLICY IF EXISTS "wishlist-images: owner can delete" ON storage.objects;
CREATE POLICY "wishlist-images: owner can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'wishlist-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
  AND (storage.foldername(name))[1] = 'wishlist'
);

-- ── wishlist_items RLS policies ───────────────────────────────────────────────
-- The table was created via Dashboard with RLS enabled but no migration tracks
-- its policies. Idempotent: DROP IF EXISTS + CREATE for each policy.

DROP POLICY IF EXISTS "wishlist_items: owner can select" ON public.wishlist_items;
CREATE POLICY "wishlist_items: owner can select"
ON public.wishlist_items
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlist_items: owner can insert" ON public.wishlist_items;
CREATE POLICY "wishlist_items: owner can insert"
ON public.wishlist_items
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlist_items: owner can update" ON public.wishlist_items;
CREATE POLICY "wishlist_items: owner can update"
ON public.wishlist_items
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlist_items: owner can delete" ON public.wishlist_items;
CREATE POLICY "wishlist_items: owner can delete"
ON public.wishlist_items
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
