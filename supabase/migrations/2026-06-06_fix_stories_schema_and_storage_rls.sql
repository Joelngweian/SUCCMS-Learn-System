-- Align the Stories table with the dashboard implementation and allow users
-- to manage images stored inside their own folder.

CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stories'
      AND column_name = 'media_url'
  ) THEN
    EXECUTE '
      UPDATE public.stories
      SET image_url = media_url
      WHERE image_url IS NULL
        AND media_url IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stories'
      AND column_name = 'content_url'
  ) THEN
    EXECUTE '
      UPDATE public.stories
      SET image_url = content_url
      WHERE image_url IS NULL
        AND content_url IS NOT NULL
    ';
  END IF;
END
$$;

UPDATE public.stories
SET expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at IS NULL;

UPDATE public.stories
SET is_active = TRUE
WHERE is_active IS NULL;

ALTER TABLE public.stories
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '24 hours'),
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT TRUE,
  ALTER COLUMN is_active SET NOT NULL;

-- Older versions required fields that the image-only dashboard no longer uses.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stories'
      AND column_name = 'content'
  ) THEN
    EXECUTE 'ALTER TABLE public.stories ALTER COLUMN content DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stories'
      AND column_name = 'content_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.stories ALTER COLUMN content_type DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stories'
      AND column_name = 'type'
  ) THEN
    EXECUTE 'ALTER TABLE public.stories ALTER COLUMN type DROP NOT NULL';
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_stories_user_id
  ON public.stories(user_id);

CREATE INDEX IF NOT EXISTS idx_stories_expires_at
  ON public.stories(expires_at);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users to view active stories"
  ON public.stories;
DROP POLICY IF EXISTS "Allow users to create their own stories"
  ON public.stories;
DROP POLICY IF EXISTS "Allow users to update their own stories"
  ON public.stories;
DROP POLICY IF EXISTS "Allow users to delete their own stories"
  ON public.stories;
DROP POLICY IF EXISTS stories_select_authenticated
  ON public.stories;
DROP POLICY IF EXISTS stories_insert_own
  ON public.stories;
DROP POLICY IF EXISTS stories_update_own
  ON public.stories;
DROP POLICY IF EXISTS stories_delete_own
  ON public.stories;

CREATE POLICY "Allow all authenticated users to view active stories"
  ON public.stories FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND expires_at > NOW()
  );

CREATE POLICY "Allow users to create their own stories"
  ON public.stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own stories"
  ON public.stories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own stories"
  ON public.stories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'stories',
  'stories',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Story images are viewable"
  ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own story images"
  ON storage.objects;
DROP POLICY IF EXISTS "Users can update own story images"
  ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own story images"
  ON storage.objects;

CREATE POLICY "Story images are viewable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'stories');

CREATE POLICY "Users can upload own story images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own story images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own story images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

NOTIFY pgrst, 'reload schema';
