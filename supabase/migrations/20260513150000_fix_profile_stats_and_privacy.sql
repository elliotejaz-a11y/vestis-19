-- Fix profile stats visibility and privacy enforcement for other-user profiles.
--
-- Root causes addressed:
--
-- 1. clothing_items SELECT policy used are_friends() (requires mutual follow).
--    Non-mutual followers and all viewers of public accounts got 0 rows back,
--    causing wardrobeCount / colorCount / categoryCount to show 0.
--    Fix: replace are_friends() with can_view_user() which handles public
--    accounts (any viewer) and private accounts (followers only).
--
-- 2. fit_pics SELECT policy had the same are_friends() problem.
--    Fix: same replacement.
--
-- 3. Stats (piece_count, color_count, category_count) must be visible to
--    everyone — including non-followers of private accounts — but individual
--    items must stay gated. A SECURITY DEFINER function returns only aggregate
--    counts, bypassing row-level access while exposing nothing item-specific.

-- ── 1. Fix clothing_items SELECT ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Friends can view non-private items" ON public.clothing_items;

CREATE POLICY "Viewers can read non-private clothing items"
ON public.clothing_items
FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    is_private = false
    AND public.can_view_user(auth.uid(), user_id)
  )
);

-- ── 2. Fix fit_pics SELECT ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Friends can view non-private fit pics" ON public.fit_pics;

CREATE POLICY "Viewers can read non-private fit pics"
ON public.fit_pics
FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    is_private = false
    AND public.can_view_user(auth.uid(), user_id)
  )
);

-- ── 3. Aggregate stats function (bypasses RLS, safe — returns counts only) ────
-- Privacy model:
--   - Non-followers of private accounts: CAN see piece/colour/category counts,
--     CANNOT see individual items (gated by clothing_items RLS + UI).
--   - Followers / viewers of public accounts: CAN see everything.
CREATE OR REPLACE FUNCTION public.get_wardrobe_stats(target_user_id uuid)
RETURNS TABLE(piece_count int, color_count int, category_count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::int          AS piece_count,
    COUNT(DISTINCT color)::int   AS color_count,
    COUNT(DISTINCT category)::int AS category_count
  FROM public.clothing_items
  WHERE user_id = target_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_wardrobe_stats(uuid) TO authenticated;
