ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'announcement-attachments',
  'announcement-attachments',
  TRUE,
  10485760,
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Announcement attachments are viewable"
  ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload announcement attachments"
  ON storage.objects;
DROP POLICY IF EXISTS "Admins can update announcement attachments"
  ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete announcement attachments"
  ON storage.objects;

CREATE POLICY "Announcement attachments are viewable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'announcement-attachments');

CREATE POLICY "Admins can upload announcement attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'announcement-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update announcement attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'announcement-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete announcement attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
