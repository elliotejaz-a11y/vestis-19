
-- Add a timestamp to track when username was last changed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_changed_at timestamp with time zone;

-- Add unique constraint on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (lower(username)) WHERE username IS NOT NULL;
