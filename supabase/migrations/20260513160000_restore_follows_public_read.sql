-- Restore public read access to the follows table.
--
-- Migration 20260216020553 restricted the follows SELECT policy to only rows where
-- auth.uid() = follower_id OR auth.uid() = following_id. This breaks follower and
-- following COUNT queries on another user's profile: User A viewing User B can only
-- see rows involving themselves, so the counts return at most 1.
--
-- In Vestis, follow relationships are public social data — any authenticated user
-- may read them. Restoring USING (true) fixes count queries in UserProfile.tsx and
-- the follower/following list in FollowListSheet.

DROP POLICY IF EXISTS "Users can view follows" ON public.follows;
CREATE POLICY "Users can view follows"
  ON public.follows
  FOR SELECT
  TO authenticated
  USING (true);
