-- Make handle_new_user completely safe: any exception inside the trigger is
-- caught and silenced so the auth.users INSERT always succeeds.
-- This eliminates the "Database error saving new user" surfaced by GoTrue
-- when a stale/imported profile row already exists, or any other transient
-- Postgres error during profile insertion.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let a profile-creation error block the auth.users row from being
  -- committed. The profile will be created/repaired during onboarding.
  RETURN NEW;
END;
$function$;
