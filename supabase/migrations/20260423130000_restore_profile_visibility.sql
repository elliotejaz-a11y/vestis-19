-- Restore profile visibility for the Discover / Friends / social features.
--
-- Migration 20260423025153 dropped "Profiles: visible profile rows" which allowed
-- authenticated users to read public profiles. Without it, only the profile owner
-- can read their own row, so Discover, Friends, and Notifications all return empty.
--
-- The fix: restore the policy using can_view_user() (SECURITY DEFINER, safe to
-- call here — it reads is_public from profiles with elevated privileges).
-- This allows any authenticated user to read profiles where is_public = true
-- or where they follow the target user, without exposing sensitive columns to
-- any code that doesn't deliberately SELECT them.

CREATE POLICY "Profiles: visible profile rows"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.can_view_user(auth.uid(), id)
);
