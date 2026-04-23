-- Create private bucket for social content (posts, stories, fit pics, chat images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-content', 'social-content', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Owner: upload to own folder
DROP POLICY IF EXISTS "social-content: owner can upload" ON storage.objects;
CREATE POLICY "social-content: owner can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'social-content'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Owner: update own files
DROP POLICY IF EXISTS "social-content: owner can update" ON storage.objects;
CREATE POLICY "social-content: owner can update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'social-content'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Owner: delete own files
DROP POLICY IF EXISTS "social-content: owner can delete" ON storage.objects;
CREATE POLICY "social-content: owner can delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'social-content'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Read policy: gated by referring resource visibility
DROP POLICY IF EXISTS "social-content: gated read" ON storage.objects;
CREATE POLICY "social-content: gated read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'social-content'
  AND (
    -- 1. Owner can always read own files
    (auth.uid())::text = (storage.foldername(name))[1]
    -- 2. Post image referenced by a visible social_posts row
    OR EXISTS (
      SELECT 1
      FROM public.social_posts sp
      WHERE public.can_view_user(auth.uid(), sp.user_id)
        AND (
          ('https://' || (current_setting('request.headers', true)::json ->> 'host') || '/storage/v1/object/public/social-content/' || storage.objects.name) = ANY(sp.image_urls)
          OR EXISTS (
            SELECT 1 FROM unnest(sp.image_urls) AS u
            WHERE u LIKE '%/social-content/' || storage.objects.name
               OR u = storage.objects.name
          )
        )
    )
    -- 3. Story image referenced by a visible, non-expired social_stories row
    OR EXISTS (
      SELECT 1
      FROM public.social_stories ss
      WHERE public.can_view_user(auth.uid(), ss.user_id)
        AND ss.expires_at > now()
        AND (
          ss.image_url LIKE '%/social-content/' || storage.objects.name
          OR ss.image_url = storage.objects.name
        )
    )
    -- 4. Fit pic image, non-private, between mutual friends
    OR EXISTS (
      SELECT 1
      FROM public.fit_pics fp
      WHERE fp.is_private = false
        AND public.are_friends(auth.uid(), fp.user_id)
        AND (
          fp.image_url LIKE '%/social-content/' || storage.objects.name
          OR fp.image_url = storage.objects.name
        )
    )
    -- 5. Chat image embedded in a message where viewer is sender or receiver
    OR EXISTS (
      SELECT 1
      FROM public.messages m
      WHERE (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
        AND m.content LIKE '%/social-content/' || storage.objects.name || '%'
    )
  )
);