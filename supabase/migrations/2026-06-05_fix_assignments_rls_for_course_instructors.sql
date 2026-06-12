ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow enrolled users to view assignments"
  ON public.assignments;

DROP POLICY IF EXISTS "Allow lecturers to manage assignments"
  ON public.assignments;

DROP POLICY IF EXISTS "Allow enrolled users to view course assignments"
  ON public.assignments;

DROP POLICY IF EXISTS "Allow assigned lecturers to create assignments"
  ON public.assignments;

DROP POLICY IF EXISTS "Allow assigned lecturers to update assignments"
  ON public.assignments;

DROP POLICY IF EXISTS "Allow assigned lecturers to delete assignments"
  ON public.assignments;

CREATE POLICY "Allow enrolled users to view course assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT student_id
      FROM public.course_enrollments
      WHERE course_enrollments.course_id = assignments.course_id
    )
    OR auth.uid() IN (
      SELECT user_id
      FROM public.course_instructors
      WHERE course_instructors.course_id = assignments.course_id
    )
    OR auth.uid() IN (
      SELECT lecturer_id
      FROM public.courses
      WHERE courses.id = assignments.course_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Allow assigned lecturers to create assignments"
  ON public.assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      auth.uid() IN (
        SELECT user_id
        FROM public.course_instructors
        WHERE course_instructors.course_id = assignments.course_id
      )
      OR auth.uid() IN (
        SELECT lecturer_id
        FROM public.courses
        WHERE courses.id = assignments.course_id
      )
      OR auth.uid() IN (
        SELECT id FROM public.user_profiles WHERE role = 'admin'
      )
    )
  );

CREATE POLICY "Allow assigned lecturers to update assignments"
  ON public.assignments FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() IN (
      SELECT user_id
      FROM public.course_instructors
      WHERE course_instructors.course_id = assignments.course_id
    )
    OR auth.uid() IN (
      SELECT lecturer_id
      FROM public.courses
      WHERE courses.id = assignments.course_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR auth.uid() IN (
      SELECT user_id
      FROM public.course_instructors
      WHERE course_instructors.course_id = assignments.course_id
    )
    OR auth.uid() IN (
      SELECT lecturer_id
      FROM public.courses
      WHERE courses.id = assignments.course_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Allow assigned lecturers to delete assignments"
  ON public.assignments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() IN (
      SELECT user_id
      FROM public.course_instructors
      WHERE course_instructors.course_id = assignments.course_id
    )
    OR auth.uid() IN (
      SELECT lecturer_id
      FROM public.courses
      WHERE courses.id = assignments.course_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
