
-- Create fit_pics table for storing user photos of outfits
CREATE TABLE public.fit_pics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT DEFAULT '',
  pic_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_private BOOLEAN NOT NULL DEFAULT false,
  outfit_id UUID REFERENCES public.outfits(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fit_pics ENABLE ROW LEVEL SECURITY;

-- Users can view own fit pics
CREATE POLICY "Users can view own fit pics"
ON public.fit_pics FOR SELECT
USING (auth.uid() = user_id);

-- Friends can view non-private fit pics
CREATE POLICY "Friends can view non-private fit pics"
ON public.fit_pics FOR SELECT
USING (is_private = false AND are_friends(auth.uid(), user_id));

-- Users can insert own fit pics
CREATE POLICY "Users can insert own fit pics"
ON public.fit_pics FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own fit pics
CREATE POLICY "Users can update own fit pics"
ON public.fit_pics FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own fit pics
CREATE POLICY "Users can delete own fit pics"
ON public.fit_pics FOR DELETE
USING (auth.uid() = user_id);
