-- Dashboard access for the official cached GPA record.

ALTER TABLE public.student_gpa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own GPA"
  ON public.student_gpa;
DROP POLICY IF EXISTS "Course lecturers can view student GPA"
  ON public.student_gpa;
DROP POLICY IF EXISTS "Admins can manage student GPA"
  ON public.student_gpa;

CREATE POLICY "Students can view own GPA"
  ON public.student_gpa FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Course lecturers can view student GPA"
  ON public.student_gpa FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_enrollments ce
      JOIN public.course_instructors ci
        ON ci.course_id = ce.course_id
      WHERE ce.student_id = student_gpa.student_id
        AND ci.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage student GPA"
  ON public.student_gpa FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
