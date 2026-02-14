
-- Add is_public flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Create storage bucket for social posts
INSERT INTO storage.buckets (id, name, public) VALUES ('social-media', 'social-media', true) ON CONFLICT DO NOTHING;

-- Storage policies for social-media bucket
CREATE POLICY "Anyone can view social media" ON storage.objects FOR SELECT USING (bucket_id = 'social-media');
CREATE POLICY "Authenticated users can upload social media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'social-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own social media" ON storage.objects FOR UPDATE USING (bucket_id = 'social-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own social media" ON storage.objects FOR DELETE USING (bucket_id = 'social-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Posts table
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  caption text DEFAULT '',
  image_urls text[] NOT NULL DEFAULT '{}',
  outfit_id uuid REFERENCES public.outfits(id) ON DELETE SET NULL,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Stories table (24h expiry)
CREATE TABLE public.social_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  caption text DEFAULT '',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_stories ENABLE ROW LEVEL SECURITY;

-- Follows table
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Follow requests (for private accounts)
CREATE TABLE public.follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, target_id)
);
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- Likes table
CREATE TABLE public.social_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
ALTER TABLE public.social_likes ENABLE ROW LEVEL SECURITY;

-- Comments table
CREATE TABLE public.social_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user can view another user's content
CREATE OR REPLACE FUNCTION public.can_view_user(viewer_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    viewer_id = target_user_id
    OR (SELECT is_public FROM public.profiles WHERE id = target_user_id)
    OR EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = viewer_id AND following_id = target_user_id
    )
$$;

-- RLS for social_posts
CREATE POLICY "Users can view public posts or posts from followed users" ON public.social_posts
  FOR SELECT USING (public.can_view_user(auth.uid(), user_id));
CREATE POLICY "Users can insert own posts" ON public.social_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.social_posts
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.social_posts
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS for social_stories
CREATE POLICY "Users can view stories from visible users" ON public.social_stories
  FOR SELECT USING (public.can_view_user(auth.uid(), user_id) AND expires_at > now());
CREATE POLICY "Users can insert own stories" ON public.social_stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own stories" ON public.social_stories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS for follows
CREATE POLICY "Users can view follows" ON public.follows
  FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- RLS for follow_requests
CREATE POLICY "Users can view own requests" ON public.follow_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_id);
CREATE POLICY "Users can create requests" ON public.follow_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Target can delete requests" ON public.follow_requests
  FOR DELETE USING (auth.uid() = target_id OR auth.uid() = requester_id);

-- RLS for social_likes
CREATE POLICY "Users can view likes" ON public.social_likes
  FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON public.social_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.social_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS for social_comments
CREATE POLICY "Users can view comments on visible posts" ON public.social_comments
  FOR SELECT USING (EXISTS (SELECT 1 FROM social_posts WHERE id = post_id AND public.can_view_user(auth.uid(), social_posts.user_id)));
CREATE POLICY "Users can comment" ON public.social_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.social_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Update profiles RLS to allow public profile viewing
CREATE POLICY "Anyone can view public profiles" ON public.profiles
  FOR SELECT USING (is_public = true OR auth.uid() = id);

-- Drop the old restrictive select policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_social_likes_post ON public.social_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_social_stories_user ON public.social_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_social_stories_expires ON public.social_stories(expires_at);
