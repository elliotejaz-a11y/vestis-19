
-- Add estimated_price column to clothing_items for AI price estimation
ALTER TABLE public.clothing_items ADD COLUMN estimated_price numeric DEFAULT NULL;

-- Create planned_outfits table for calendar feature
CREATE TABLE public.planned_outfits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  outfit_id uuid REFERENCES public.outfits(id) ON DELETE CASCADE,
  planned_date date NOT NULL,
  notes text DEFAULT '',
  worn boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.planned_outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own planned outfits" ON public.planned_outfits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own planned outfits" ON public.planned_outfits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own planned outfits" ON public.planned_outfits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own planned outfits" ON public.planned_outfits FOR DELETE USING (auth.uid() = user_id);

-- Create feedback table
CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('idea', 'bug', 'help')),
  title text NOT NULL,
  description text DEFAULT '',
  votes integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all feedback" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "Users can insert own feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feedback" ON public.feedback FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feedback" ON public.feedback FOR DELETE USING (auth.uid() = user_id);

-- Create feedback_votes table to track who voted
CREATE TABLE public.feedback_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(feedback_id, user_id)
);

ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all votes" ON public.feedback_votes FOR SELECT USING (true);
CREATE POLICY "Users can insert own votes" ON public.feedback_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON public.feedback_votes FOR DELETE USING (auth.uid() = user_id);
