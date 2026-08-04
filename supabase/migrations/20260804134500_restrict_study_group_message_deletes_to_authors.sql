BEGIN;

DROP POLICY IF EXISTS "Authors or owners can delete group posts"
  ON public.study_group_posts;
DROP POLICY IF EXISTS "Authors can delete group posts"
  ON public.study_group_posts;
CREATE POLICY "Authors can delete group posts"
  ON public.study_group_posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Study group uploaders or owners can delete files"
  ON storage.objects;
DROP POLICY IF EXISTS "Study group uploaders can delete files"
  ON storage.objects;
CREATE POLICY "Study group uploaders can delete files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'study-group-files'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

COMMIT;
