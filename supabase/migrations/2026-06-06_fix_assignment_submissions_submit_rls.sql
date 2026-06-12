-- Make assignment submissions work with file arrays and course_instructors.

ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS grade INTEGER,
ADD COLUMN IF NOT EXISTS feedback TEXT;

UPDATE public.assignment_submissions
SET files = '[]'::jsonb
WHERE files IS NULL;

ALTER TABLE public.assignment_submissions
ALTER COLUMN files SET DEFAULT '[]'::jsonb;

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_assignment_instructor(target_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.course_instructors ci ON ci.course_id = a.course_id
      WHERE a.id = target_assignment_id
        AND ci.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = target_assignment_id
        AND c.lecturer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_assignment_student(target_assignment_id UUID, target_student_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    auth.uid() = target_student_id
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.course_enrollments ce ON ce.course_id = a.course_id
      WHERE a.id = target_assignment_id
        AND ce.student_id = target_student_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_assignment_instructor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assignment_student(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Allow students to view their submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Allow students to submit assignments" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Allow students to update their submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Allow students and lecturers to update submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Allow assignment participants to view submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Allow enrolled students to submit assignments" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Allow assignment participants to update submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Allow students to delete own submissions" ON public.assignment_submissions;

CREATE POLICY "Allow assignment participants to view submissions"
  ON public.assignment_submissions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id
    OR public.is_assignment_instructor(assignment_submissions.assignment_id)
  );

CREATE POLICY "Allow enrolled students to submit assignments"
  ON public.assignment_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_assignment_student(
      assignment_submissions.assignment_id,
      assignment_submissions.student_id
    )
  );

CREATE POLICY "Allow assignment participants to update submissions"
  ON public.assignment_submissions FOR UPDATE
  TO authenticated
  USING (
    public.is_assignment_student(
      assignment_submissions.assignment_id,
      assignment_submissions.student_id
    )
    OR public.is_assignment_instructor(assignment_submissions.assignment_id)
  )
  WITH CHECK (
    public.is_assignment_student(
      assignment_submissions.assignment_id,
      assignment_submissions.student_id
    )
    OR public.is_assignment_instructor(assignment_submissions.assignment_id)
  );

CREATE POLICY "Allow students to delete own submissions"
  ON public.assignment_submissions FOR DELETE
  TO authenticated
  USING (
    public.is_assignment_student(
      assignment_submissions.assignment_id,
      assignment_submissions.student_id
    )
    OR public.is_assignment_instructor(assignment_submissions.assignment_id)
  );

NOTIFY pgrst, 'reload schema';
