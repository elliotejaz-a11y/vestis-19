-- Add position column to wishlist_items so slot assignments persist
ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS position integer;
