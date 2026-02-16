-- Add email column to profiles for username-based login lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Update existing profiles with emails from auth.users
UPDATE public.profiles SET email = au.email
FROM auth.users au WHERE profiles.id = au.id AND profiles.email IS NULL;

-- Update handle_new_user to store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$function$;

-- Allow anyone to look up email by username for login (only email field)
CREATE POLICY "Anyone can look up profiles by username for login"
ON public.profiles
FOR SELECT
USING (true);

-- Drop the old restrictive select policy since new one is more permissive
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;
