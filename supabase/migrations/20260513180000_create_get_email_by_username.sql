-- get_email_by_username: resolve a username to its auth email, pre-login.
--
-- Auth.tsx calls supabase.rpc("get_email_by_username") when the login input
-- does not contain "@". The function was present in the original Supabase
-- project but was never captured in a migration, so it is missing from the
-- current project's database.
--
-- Security notes:
--   - SECURITY DEFINER so it can read auth.users (anon cannot access that
--     schema directly).
--   - Returns only the email string — no other user data.
--   - Granted to anon so it is callable before the user is authenticated.
--   - Username lookup is case-insensitive (ILIKE) to match sign-up behaviour.

CREATE OR REPLACE FUNCTION public.get_email_by_username(lookup_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email::text
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE p.username ILIKE lookup_username
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;
