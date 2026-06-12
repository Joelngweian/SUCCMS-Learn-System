-- Allow lecturers assigned through course_instructors to manage course members.
-- The helper avoids recursive RLS checks when policies on course_instructors
-- need to know whether the current user teaches the same course.

CREATE OR REPLACE FUNCTION public.is_course_instructor(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = target_course_id
        AND c.lecturer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.course_instructors ci
      WHERE ci.course_id = target_course_id
        AND ci.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_course_instructor(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_course_members(target_course_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  faculty TEXT,
  programme TEXT,
  avatar_url TEXT,
  course_role TEXT,
  membership_id UUID,
  joined_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH allowed AS (
    SELECT
      public.is_course_instructor(target_course_id)
      OR EXISTS (
        SELECT 1
        FROM public.course_enrollments ce
        WHERE ce.course_id = target_course_id
          AND ce.student_id = auth.uid()
      ) AS can_view
  )
  SELECT
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.faculty,
    up.programme,
    up.avatar_url,
    'lecturer'::TEXT AS course_role,
    ci.id AS membership_id,
    ci.assigned_at AS joined_at
  FROM public.course_instructors ci
  JOIN public.user_profiles up ON up.id = ci.user_id
  CROSS JOIN allowed
  WHERE ci.course_id = target_course_id
    AND allowed.can_view

  UNION ALL

  SELECT
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.faculty,
    up.programme,
    up.avatar_url,
    'student'::TEXT AS course_role,
    ce.id AS membership_id,
    ce.enrolled_at AS joined_at
  FROM public.course_enrollments ce
  JOIN public.user_profiles up ON up.id = ce.student_id
  CROSS JOIN allowed
  WHERE ce.course_id = target_course_id
    AND allowed.can_view
  ORDER BY course_role, full_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_members(UUID) TO authenticated;

DROP POLICY IF EXISTS "Allow students to view their enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Allow students and lecturers to manage enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Allow course lecturers to remove enrollments" ON public.course_enrollments;

CREATE POLICY "Allow students and course lecturers to view enrollments"
  ON public.course_enrollments FOR SELECT
  USING (
    auth.uid() = student_id
    OR public.is_course_instructor(course_enrollments.course_id)
  );

CREATE POLICY "Allow students and course lecturers to add enrollments"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = course_enrollments.student_id
        AND up.role = 'student'
    )
    AND (
      auth.uid() = student_id
      OR public.is_course_instructor(course_enrollments.course_id)
    )
  );

CREATE POLICY "Allow students and course lecturers to remove enrollments"
  ON public.course_enrollments FOR DELETE
  USING (
    auth.uid() = student_id
    OR public.is_course_instructor(course_enrollments.course_id)
  );

DROP POLICY IF EXISTS "Allow lecturers to add themselves to courses" ON public.course_instructors;
DROP POLICY IF EXISTS "Allow lecturers to remove their own course links" ON public.course_instructors;

CREATE POLICY "Allow course lecturers to add lecturers"
  ON public.course_instructors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = course_instructors.user_id
        AND up.role = 'lecturer'
    )
    AND (
      auth.uid() = user_id
      OR public.is_course_instructor(course_instructors.course_id)
    )
  );

CREATE POLICY "Allow lecturers to remove their own course links"
  ON public.course_instructors FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

NOTIFY pgrst, 'reload schema';
