-- Fix: handle_new_user trigger can fail if a profile row already exists for the
-- new user's id (e.g. imported from the previous Supabase project). The INSERT
-- previously had no conflict handler, so a duplicate-key error propagated back
-- through GoTrue and surfaced as "Database error finding user" / "Sign up failed".
--
-- ON CONFLICT (id) DO NOTHING: if the profile already exists, leave it intact
-- and let the auth.users INSERT succeed.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
