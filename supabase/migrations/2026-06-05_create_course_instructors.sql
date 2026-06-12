CREATE TABLE IF NOT EXISTS public.course_instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_instructors_user_id
  ON public.course_instructors(user_id);

CREATE INDEX IF NOT EXISTS idx_course_instructors_course_id
  ON public.course_instructors(course_id);

ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view course instructors"
  ON public.course_instructors;

DROP POLICY IF EXISTS "Allow lecturers to add themselves to courses"
  ON public.course_instructors;

DROP POLICY IF EXISTS "Allow lecturers to remove their own course links"
  ON public.course_instructors;

CREATE POLICY "Allow authenticated users to view course instructors"
  ON public.course_instructors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow lecturers to add themselves to courses"
  ON public.course_instructors FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role IN ('lecturer', 'admin')
    )
  );

CREATE POLICY "Allow lecturers to remove their own course links"
  ON public.course_instructors FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  );
