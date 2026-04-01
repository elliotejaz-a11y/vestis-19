
-- 1. Add size column to clothing_items
ALTER TABLE public.clothing_items ADD COLUMN IF NOT EXISTS size text DEFAULT '' NOT NULL;

-- 2. Add privacy column to outfits (public, friends_only, only_me)
ALTER TABLE public.outfits ADD COLUMN IF NOT EXISTS privacy text DEFAULT 'public' NOT NULL;

-- 3. Create wishlist_items table
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clothing_item_id uuid NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, clothing_item_id)
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wishlist" ON public.wishlist_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to wishlist" ON public.wishlist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from wishlist" ON public.wishlist_items
  FOR DELETE USING (auth.uid() = user_id);
