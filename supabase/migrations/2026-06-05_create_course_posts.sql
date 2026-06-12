CREATE TABLE IF NOT EXISTS public.course_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.course_posts
DROP CONSTRAINT IF EXISTS course_posts_has_content;

ALTER TABLE public.course_posts
ADD CONSTRAINT course_posts_has_content
CHECK (
  LENGTH(TRIM(content)) > 0
  OR (
    jsonb_typeof(attachments) = 'array'
    AND jsonb_array_length(attachments) > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_course_posts_course_id
  ON public.course_posts(course_id);

CREATE INDEX IF NOT EXISTS idx_course_posts_author_id
  ON public.course_posts(author_id);

ALTER TABLE public.course_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow course members to view course posts"
  ON public.course_posts;

DROP POLICY IF EXISTS "Allow course members to create course posts"
  ON public.course_posts;

DROP POLICY IF EXISTS "Allow users to update own course posts"
  ON public.course_posts;

DROP POLICY IF EXISTS "Allow users to delete own course posts"
  ON public.course_posts;

CREATE POLICY "Allow course members to view course posts"
  ON public.course_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_enrollments ce
      WHERE ce.course_id = course_posts.course_id
        AND ce.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.course_instructors ci
      WHERE ci.course_id = course_posts.course_id
        AND ci.user_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Allow course members to create course posts"
  ON public.course_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.course_enrollments ce
        WHERE ce.course_id = course_posts.course_id
          AND ce.student_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.course_instructors ci
        WHERE ci.course_id = course_posts.course_id
          AND ci.user_id = auth.uid()
      )
      OR auth.uid() IN (
        SELECT id FROM public.user_profiles WHERE role = 'admin'
      )
    )
  );

CREATE POLICY "Allow users to update own course posts"
  ON public.course_posts FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = author_id
    OR auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = author_id
    OR auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Allow users to delete own course posts"
  ON public.course_posts FOR DELETE
  TO authenticated
  USING (
    auth.uid() = author_id
    OR auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_course_posts_updated_at
  ON public.course_posts;

CREATE TRIGGER update_course_posts_updated_at
  BEFORE UPDATE ON public.course_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
