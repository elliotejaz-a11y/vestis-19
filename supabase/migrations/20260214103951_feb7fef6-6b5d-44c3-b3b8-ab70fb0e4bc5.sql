
-- Add currency preference to profiles
ALTER TABLE public.profiles ADD COLUMN currency_preference text NOT NULL DEFAULT 'NZD';
