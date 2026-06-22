-- ============================================================
-- Essentials catalogue + user tracking + outfit sessions
-- ============================================================

-- ── 1. Shared, system-owned catalogue ───────────────────────
CREATE TABLE IF NOT EXISTS public.essentials_catalogue (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  category         TEXT        NOT NULL,
  subcategory      TEXT,
  colour           TEXT,
  colour_hex       TEXT,
  brand            TEXT,
  description      TEXT,
  image_url        TEXT        NOT NULL,
  image_url_full   TEXT,
  image_placeholder TEXT,
  tags             TEXT[]      DEFAULT '{}',
  sort_order       INT         DEFAULT 0,
  is_active        BOOLEAN     DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_essentials_category
  ON public.essentials_catalogue (category);

CREATE INDEX IF NOT EXISTS idx_essentials_active
  ON public.essentials_catalogue (is_active);

-- Publicly readable by all (auth and anon)
ALTER TABLE public.essentials_catalogue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Essentials catalogue readable by all"
  ON public.essentials_catalogue
  FOR SELECT
  USING (true);

-- ── 2. User–essential join table ────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_essentials (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  essential_id UUID        NOT NULL REFERENCES public.essentials_catalogue (id) ON DELETE CASCADE,
  added_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, essential_id)
);

CREATE INDEX IF NOT EXISTS idx_user_essentials_user
  ON public.user_essentials (user_id);

CREATE INDEX IF NOT EXISTS idx_user_essentials_essential
  ON public.user_essentials (essential_id);

ALTER TABLE public.user_essentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own essentials"
  ON public.user_essentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own essentials"
  ON public.user_essentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own essentials"
  ON public.user_essentials FOR DELETE
  USING (auth.uid() = user_id);

-- ── 3. Outfit generation session history ────────────────────
CREATE TABLE IF NOT EXISTS public.outfit_sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  anchor_item_id      UUID,
  anchor_essential_id UUID,
  weather_context     JSONB,
  occasion            TEXT,
  style_direction     TEXT,
  generated_outfit    JSONB,
  ai_reasoning        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.outfit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own outfit sessions"
  ON public.outfit_sessions FOR ALL
  USING (auth.uid() = user_id);

-- ── 4. Essentials storage bucket ────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'essentials',
  'essentials',
  TRUE,
  5242880, -- 5 MB max per file
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Essentials images are public — anyone can read them by URL
CREATE POLICY "Essentials images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'essentials');

-- Only service-role / admin can write (seeding is done server-side)
CREATE POLICY "Essentials images admin write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'essentials'
    AND auth.role() = 'service_role'
  );
