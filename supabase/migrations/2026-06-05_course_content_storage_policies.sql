INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'course_content',
  'course_content',
  true,
  26214400
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Course content files are viewable"
  ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload course content"
  ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can update course content"
  ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can delete course content"
  ON storage.objects;

CREATE POLICY "Course content files are viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course_content');

CREATE POLICY "Authenticated users can upload course content"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'course_content');

CREATE POLICY "Authenticated users can update course content"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'course_content')
  WITH CHECK (bucket_id = 'course_content');

CREATE POLICY "Authenticated users can delete course content"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'course_content');
