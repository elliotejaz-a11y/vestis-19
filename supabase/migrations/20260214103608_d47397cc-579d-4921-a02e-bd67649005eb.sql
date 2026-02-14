
-- Add is_private column to clothing_items so users can hide specific items from friends
ALTER TABLE public.clothing_items ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- Create a security definer function to check if two users are mutual friends
CREATE OR REPLACE FUNCTION public.are_friends(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows f1
    JOIN public.follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
    WHERE f1.follower_id = user_a AND f1.following_id = user_b
  )
$$;

-- Allow friends to view non-private clothing items
CREATE POLICY "Friends can view non-private items"
ON public.clothing_items
FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    is_private = false
    AND public.are_friends(auth.uid(), user_id)
  )
);

-- Drop the old select policy since the new one covers it
DROP POLICY IF EXISTS "Users can view own items" ON public.clothing_items;
