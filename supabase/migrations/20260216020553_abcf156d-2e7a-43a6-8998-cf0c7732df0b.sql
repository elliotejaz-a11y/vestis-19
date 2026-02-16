
-- 1. FOLLOWS: Restrict SELECT to only see follows involving the current user
DROP POLICY IF EXISTS "Users can view follows" ON public.follows;
CREATE POLICY "Users can view follows"
  ON public.follows
  FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- 2. SOCIAL_LIKES: Restrict SELECT to own likes or likes on posts the user can view
DROP POLICY IF EXISTS "Users can view likes" ON public.social_likes;
CREATE POLICY "Users can view likes"
  ON public.social_likes
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.social_posts
      WHERE social_posts.id = social_likes.post_id
      AND can_view_user(auth.uid(), social_posts.user_id)
    )
  );

-- 3. FEEDBACK_VOTES: Restrict SELECT to own votes only
DROP POLICY IF EXISTS "Users can view all votes" ON public.feedback_votes;
CREATE POLICY "Users can view own votes"
  ON public.feedback_votes
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. FEEDBACK: Restrict SELECT to own feedback only
DROP POLICY IF EXISTS "Users can view all feedback" ON public.feedback;
CREATE POLICY "Users can view own feedback"
  ON public.feedback
  FOR SELECT
  USING (auth.uid() = user_id);
