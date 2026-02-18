
-- Create wardrobe_items table
CREATE TABLE public.wardrobe_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  original_path text NOT NULL,
  cutout_path text,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  name text NOT NULL DEFAULT 'Untitled',
  category text NOT NULL DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for status (instead of CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_wardrobe_item_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('queued', 'processing', 'completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_wardrobe_item_status_trigger
BEFORE INSERT OR UPDATE ON public.wardrobe_items
FOR EACH ROW EXECUTE FUNCTION public.validate_wardrobe_item_status();

-- Auto-update updated_at
CREATE TRIGGER update_wardrobe_items_updated_at
BEFORE UPDATE ON public.wardrobe_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_wardrobe_items_user_created ON public.wardrobe_items (user_id, created_at DESC);
CREATE INDEX idx_wardrobe_items_user_status ON public.wardrobe_items (user_id, status);

-- Enable RLS
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own wardrobe items"
ON public.wardrobe_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wardrobe items"
ON public.wardrobe_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wardrobe items"
ON public.wardrobe_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wardrobe items"
ON public.wardrobe_items FOR DELETE
USING (auth.uid() = user_id);

-- Private storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('wardrobe-originals', 'wardrobe-originals', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('wardrobe-cutouts', 'wardrobe-cutouts', false);

-- Storage policies: users can upload originals to their own folder
CREATE POLICY "Users can upload own originals"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wardrobe-originals' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can read their own originals
CREATE POLICY "Users can read own originals"
ON storage.objects FOR SELECT
USING (bucket_id = 'wardrobe-originals' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own originals
CREATE POLICY "Users can delete own originals"
ON storage.objects FOR DELETE
USING (bucket_id = 'wardrobe-originals' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can read their own cutouts
CREATE POLICY "Users can read own cutouts"
ON storage.objects FOR SELECT
USING (bucket_id = 'wardrobe-cutouts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own cutouts  
CREATE POLICY "Users can delete own cutouts"
ON storage.objects FOR DELETE
USING (bucket_id = 'wardrobe-cutouts' AND auth.uid()::text = (storage.foldername(name))[1]);
