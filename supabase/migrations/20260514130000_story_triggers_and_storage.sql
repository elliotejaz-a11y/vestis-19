-- ============================================================
-- Phase 1 (part 2): Story mention trigger + storage + expiry
-- ============================================================

-- ============================================================
-- Trigger: notify mentioned users
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_story_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_story_owner_id uuid;
BEGIN
  SELECT user_id INTO v_story_owner_id
  FROM public.stories
  WHERE id = NEW.story_id;

  -- Don't notify if user mentions themselves
  IF v_story_owner_id = NEW.mentioned_user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, from_user_id, reference_id, reference_type)
  VALUES (
    NEW.mentioned_user_id,
    'story_mention',
    'mentioned you in their story',
    v_story_owner_id,
    NEW.story_id,
    'story'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_story_mention ON public.story_mentions;
CREATE TRIGGER on_story_mention
  AFTER INSERT ON public.story_mentions
  FOR EACH ROW EXECUTE FUNCTION public.notify_story_mention();

-- ============================================================
-- Storage: story-media bucket
-- ============================================================
-- Private bucket; signed URLs generated server-side for reads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'story-media',
  'story-media',
  false,
  52428800, -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Upload path: stories/{uid}/{filename}
DROP POLICY IF EXISTS "story-media: owner can upload" ON storage.objects;
CREATE POLICY "story-media: owner can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'story-media'
  AND auth.uid()::text = (storage.foldername(name))[2]
  AND (storage.foldername(name))[1] = 'stories'
);

DROP POLICY IF EXISTS "story-media: owner can update" ON storage.objects;
CREATE POLICY "story-media: owner can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'story-media'
  AND auth.uid()::text = (storage.foldername(name))[2]
  AND (storage.foldername(name))[1] = 'stories'
);

DROP POLICY IF EXISTS "story-media: owner can delete" ON storage.objects;
CREATE POLICY "story-media: owner can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'story-media'
  AND auth.uid()::text = (storage.foldername(name))[2]
  AND (storage.foldername(name))[1] = 'stories'
);

DROP POLICY IF EXISTS "story-media: authenticated can read" ON storage.objects;
CREATE POLICY "story-media: authenticated can read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'story-media'
  AND (storage.foldername(name))[1] = 'stories'
);

-- ============================================================
-- Expiry: SQL function called by pg_cron
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_old_stories()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stories
  SET is_active = false
  WHERE is_active = true AND expires_at < now();
$$;

-- Schedule expiry every 15 minutes (requires pg_cron extension)
-- Run once manually if pg_cron is not yet enabled:
--   SELECT cron.schedule('expire-stories', '*/15 * * * *', 'SELECT public.expire_old_stories()');
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'expire-stories',
      '*/15 * * * *',
      'SELECT public.expire_old_stories()'
    );
  END IF;
END;
$$;
