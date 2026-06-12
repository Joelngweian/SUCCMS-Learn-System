INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public_profiles',
  'public_profiles',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public profile images are viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;

CREATE POLICY "Public profile images are viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public_profiles');

CREATE POLICY "Users can upload own profile images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'public_profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own profile images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'public_profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'public_profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own profile images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'public_profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
