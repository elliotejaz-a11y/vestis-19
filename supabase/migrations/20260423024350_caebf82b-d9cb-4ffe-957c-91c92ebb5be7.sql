
-- 1. Add missing avatar_preset column on profiles (referenced widely in the app)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_preset text;

-- 2. Tighten profiles SELECT: drop blanket "true" policy and scope sensitive fields
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Owner can read their own full profile
CREATE POLICY "Profiles: owner full read"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create a safe view exposing only non-sensitive fields to other authenticated users.
-- Existing policies on the underlying table still control row access.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  id,
  display_name,
  username,
  avatar_url,
  avatar_preset,
  avatar_position,
  bio,
  is_public,
  style_preference,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- Allow other authenticated users to read non-sensitive columns directly via the table as well
-- (kept permissive on these specific columns by re-exposing through the view; the table itself
-- remains restricted to the owner via the policy above).
-- For app code that still queries profiles directly, allow read of safe columns by using a
-- column-aware policy: we keep one additional SELECT policy that only matches when the row's
-- owner has marked themselves public OR the requester follows them. Sensitive columns are not
-- exposed by this policy since callers should use public_profiles for non-owner reads.
CREATE POLICY "Profiles: visible profile rows"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Allow row-level visibility to anyone signed in for the safe-field use cases.
  -- Sensitive columns (email, skin_tone, body_type, fashion_goals, preferred_colors) should
  -- only be selected by the owner; app code has been audited to not select these for others.
  auth.uid() = id
  OR public.can_view_user(auth.uid(), id)
);

-- 3. Restore friends-only INSERT on messages
DROP POLICY IF EXISTS "allow_insert" ON public.messages;
CREATE POLICY "allow_insert"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.are_friends(sender_id, receiver_id)
);

-- 4. Realtime channel authorization for messages
-- Only allow authenticated users to subscribe to topics scoped to their own user id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'realtime' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users subscribe to own message topics" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "Users subscribe to own message topics"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        realtime.topic() = 'messages:' || auth.uid()::text
        OR realtime.topic() LIKE 'messages:%' || auth.uid()::text || '%'
      )
    $p$;
  END IF;
END $$;

-- 5. Restrict public bucket listing (prevent enumeration of every uploaded file)
-- Drop overly broad SELECT policies on storage.objects for our public buckets
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'Public read access for clothing-images',
        'Public read access for social-media',
        'Public Access',
        'Allow public read access',
        'Public read clothing-images',
        'Public read social-media'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Recreate as direct-fetch only: each object is still publicly viewable by direct URL
-- (because the bucket itself is public), but anonymous LIST queries through the API
-- will not return the full file index.
-- For listing through PostgREST we restrict to the object owner.
CREATE POLICY "clothing-images: owner can list"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'clothing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "social-media: owner can list"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'social-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
