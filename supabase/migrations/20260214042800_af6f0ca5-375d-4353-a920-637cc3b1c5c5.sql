
-- Add notes column to clothing_items
ALTER TABLE public.clothing_items ADD COLUMN notes text DEFAULT '' NOT NULL;
