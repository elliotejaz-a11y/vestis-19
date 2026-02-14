
-- Add saved column to outfits for bookmarking
ALTER TABLE public.outfits ADD COLUMN saved boolean DEFAULT false;

-- Allow users to update their own outfits (needed for saving)
CREATE POLICY "Users can update own outfits"
ON public.outfits
FOR UPDATE
USING (auth.uid() = user_id);
