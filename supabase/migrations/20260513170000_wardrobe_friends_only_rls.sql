-- Revert clothing_items SELECT policy to require mutual follow (are_friends).
--
-- Migration 20260513150000 broadened item-level access to can_view_user
-- (any one-way follower or visitor of a public account). Wardrobe items
-- are personal data — only mutual friends should be able to browse them.
-- Aggregate counts remain visible to everyone via get_wardrobe_stats
-- (SECURITY DEFINER bypasses RLS, returns counts only).
--
-- This restores the original intent of "Friends can view non-private items"
-- while keeping the stats function available for the profile stat cards.

DROP POLICY IF EXISTS "Viewers can read non-private clothing items" ON public.clothing_items;

CREATE POLICY "Friends can view non-private items"
ON public.clothing_items
FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    is_private = false
    AND public.are_friends(auth.uid(), user_id)
  )
);
