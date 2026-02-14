
-- Fix increment/decrement functions to use SECURITY DEFINER with validation
-- This ensures any authenticated user can update vote/like counts, but only if they have a corresponding vote/like record

CREATE OR REPLACE FUNCTION public.increment_feedback_votes(feedback_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM feedback_votes WHERE feedback_id = feedback_id_param AND user_id = auth.uid()) THEN
    UPDATE feedback SET votes = COALESCE(votes, 0) + 1 WHERE id = feedback_id_param;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_feedback_votes(feedback_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM feedback_votes WHERE feedback_id = feedback_id_param AND user_id = auth.uid()) THEN
    UPDATE feedback SET votes = GREATEST(COALESCE(votes, 0) - 1, 0) WHERE id = feedback_id_param;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_post_likes(post_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM social_likes WHERE post_id = post_id_param AND user_id = auth.uid()) THEN
    UPDATE social_posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = post_id_param;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_post_likes(post_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM social_likes WHERE post_id = post_id_param AND user_id = auth.uid()) THEN
    UPDATE social_posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = post_id_param;
  END IF;
END;
$$;
