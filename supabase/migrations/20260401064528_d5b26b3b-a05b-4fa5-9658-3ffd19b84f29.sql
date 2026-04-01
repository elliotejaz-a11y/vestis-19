
-- Drop existing RLS policies on wishlist_items
DROP POLICY IF EXISTS "Users can add to wishlist" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can remove from wishlist" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can view own wishlist" ON public.wishlist_items;

-- Drop existing FK constraint
ALTER TABLE public.wishlist_items DROP CONSTRAINT IF EXISTS wishlist_items_clothing_item_id_fkey;

-- Drop old column
ALTER TABLE public.wishlist_items DROP COLUMN IF EXISTS clothing_item_id;

-- Add new standalone fields
ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fabric text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS size text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS estimated_price numeric,
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

-- RLS: owner can do everything
CREATE POLICY "Wishlist owner full access"
  ON public.wishlist_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS: public profile users' wishlists are viewable by anyone authenticated
CREATE POLICY "Public wishlist viewable"
  ON public.wishlist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = wishlist_items.user_id AND profiles.is_public = true
    )
  );
