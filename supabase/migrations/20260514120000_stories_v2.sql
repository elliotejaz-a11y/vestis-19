-- ============================================================
-- Phase 1: Drop old social_stories, rebuild full stories system
-- ============================================================

-- Drop old simple stories table (cascade handles storage policy refs)
DROP TABLE IF EXISTS public.social_stories CASCADE;

-- Add reference columns to notifications for deep-linking
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS reference_id uuid,
  ADD COLUMN IF NOT EXISTS reference_type text;

-- ============================================================
-- stories — one story per user per session (1–N slides inside)
-- ============================================================
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  view_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories_select" ON public.stories FOR SELECT
  USING (is_active = true AND expires_at > now() AND public.can_view_user(auth.uid(), user_id));
CREATE POLICY "stories_insert" ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stories_update" ON public.stories FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "stories_delete" ON public.stories FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_stories_user_id   ON public.stories(user_id);
CREATE INDEX idx_stories_expires   ON public.stories(expires_at);
CREATE INDEX idx_stories_active    ON public.stories(is_active, expires_at);

-- ============================================================
-- story_slides — individual slides within a story
-- ============================================================
CREATE TABLE public.story_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  slide_order int NOT NULL DEFAULT 0,
  media_url text,
  media_type text CHECK (media_type IN ('image', 'video')),
  text_overlays jsonb DEFAULT '[]'::jsonb,
  music_track_id text,
  music_track_name text,
  music_artist_name text,
  music_preview_url text,
  music_start_offset int NOT NULL DEFAULT 0,
  duration int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.story_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_slides_select" ON public.story_slides FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = story_id AND s.is_active AND s.expires_at > now()
      AND public.can_view_user(auth.uid(), s.user_id)
  ));
CREATE POLICY "story_slides_insert" ON public.story_slides FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()
  ));
CREATE POLICY "story_slides_update" ON public.story_slides FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()
  ));
CREATE POLICY "story_slides_delete" ON public.story_slides FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()
  ));

CREATE INDEX idx_story_slides_story_id ON public.story_slides(story_id, slide_order);

-- ============================================================
-- story_mentions
-- ============================================================
CREATE TABLE public.story_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  slide_id uuid NOT NULL REFERENCES public.story_slides(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.story_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_mentions_select" ON public.story_mentions FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "story_mentions_insert" ON public.story_mentions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()
  ));

CREATE INDEX idx_story_mentions_story   ON public.story_mentions(story_id);
CREATE INDEX idx_story_mentions_user    ON public.story_mentions(mentioned_user_id);

-- ============================================================
-- story_views — deduplicated per viewer
-- ============================================================
CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_views_select" ON public.story_views FOR SELECT
  USING (
    auth.uid() = viewer_id OR
    EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid())
  );
CREATE POLICY "story_views_insert" ON public.story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

CREATE INDEX idx_story_views_story  ON public.story_views(story_id);
CREATE INDEX idx_story_views_viewer ON public.story_views(viewer_id);

-- ============================================================
-- story_reposts
-- ============================================================
CREATE TABLE public.story_reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  reposting_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  new_story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.story_reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_reposts_select" ON public.story_reposts FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "story_reposts_insert" ON public.story_reposts FOR INSERT
  WITH CHECK (auth.uid() = reposting_user_id);

CREATE INDEX idx_story_reposts_original ON public.story_reposts(original_story_id);
CREATE INDEX idx_story_reposts_user     ON public.story_reposts(reposting_user_id);

-- ============================================================
-- story_reactions (heart etc.)
-- ============================================================
CREATE TABLE public.story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  slide_id uuid REFERENCES public.story_slides(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL DEFAULT 'heart',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_reactions_select" ON public.story_reactions FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "story_reactions_insert" ON public.story_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "story_reactions_delete" ON public.story_reactions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_story_reactions_story ON public.story_reactions(story_id);

-- ============================================================
-- RPC: record a view + increment view_count atomically
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_story_view(p_story_id uuid, p_viewer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO story_views (story_id, viewer_id)
  VALUES (p_story_id, p_viewer_id)
  ON CONFLICT (story_id, viewer_id) DO NOTHING;

  IF FOUND THEN
    UPDATE stories SET view_count = view_count + 1 WHERE id = p_story_id;
  END IF;
END;
$$;
