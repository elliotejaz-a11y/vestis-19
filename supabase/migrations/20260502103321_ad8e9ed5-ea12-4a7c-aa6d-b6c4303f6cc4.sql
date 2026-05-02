
CREATE TABLE public.shared_outfits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  username text,
  display_name text,
  outfit_name text,
  occasion text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_outfits ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can read shared outfits by id
CREATE POLICY "Public can view shared outfits"
ON public.shared_outfits
FOR SELECT
TO anon, authenticated
USING (true);

-- Only the authenticated owner can create their own share
CREATE POLICY "Users can create their own shared outfits"
ON public.shared_outfits
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only the owner can delete their share
CREATE POLICY "Users can delete their own shared outfits"
ON public.shared_outfits
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX shared_outfits_user_id_idx ON public.shared_outfits(user_id);
