
-- Atomic increment/decrement for feedback votes
CREATE OR REPLACE FUNCTION public.increment_feedback_votes(feedback_id_param uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE feedback SET votes = COALESCE(votes, 0) + 1 WHERE id = feedback_id_param;
$$;

CREATE OR REPLACE FUNCTION public.decrement_feedback_votes(feedback_id_param uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE feedback SET votes = GREATEST(COALESCE(votes, 0) - 1, 0) WHERE id = feedback_id_param;
$$;

-- Atomic increment/decrement for social post likes
CREATE OR REPLACE FUNCTION public.increment_post_likes(post_id_param uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE social_posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = post_id_param;
$$;

CREATE OR REPLACE FUNCTION public.decrement_post_likes(post_id_param uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE social_posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = post_id_param;
$$;
