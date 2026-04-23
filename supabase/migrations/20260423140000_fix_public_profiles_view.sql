-- Fix public_profiles view so non-owner reads actually work.
--
-- The view was created with security_invoker = true, which means it runs with
-- the caller's permissions and inherits the profiles table RLS. Since the
-- table now only allows owner reads (the permissive policy was dropped), the
-- view was also returning 0 rows for non-owners.
--
-- Recreating without security_invoker makes it run as the view owner (postgres,
-- a superuser) which bypasses RLS. The WHERE is_public = true clause ensures
-- only opted-in profiles are accessible. Sensitive columns (email, skin_tone,
-- body_type, etc.) are excluded from the SELECT list.

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  username,
  avatar_url,
  avatar_preset,
  avatar_position,
  bio,
  is_public,
  style_preference,
  created_at
FROM public.profiles
WHERE is_public = true;

GRANT SELECT ON public.public_profiles TO authenticated, anon;
