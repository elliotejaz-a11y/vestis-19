-- Background removal: optional original URL, processing status, error, and hash for cache
ALTER TABLE public.clothing_items ADD COLUMN IF NOT EXISTS image_original_url text;
ALTER TABLE public.clothing_items ADD COLUMN IF NOT EXISTS image_status text NOT NULL DEFAULT 'ready';
ALTER TABLE public.clothing_items ADD COLUMN IF NOT EXISTS image_error text;
ALTER TABLE public.clothing_items ADD COLUMN IF NOT EXISTS image_hash text;

COMMENT ON COLUMN public.clothing_items.image_status IS 'processing | ready | failed';
COMMENT ON COLUMN public.clothing_items.image_hash IS 'Hash of original image for cache lookup';
