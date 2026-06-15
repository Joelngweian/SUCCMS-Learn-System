BEGIN;

-- Foreign-key indexes reported by the Supabase performance advisor.
-- Existing composite indexes do not cover these columns when the foreign-key
-- column is not the leading index column.
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id
  ON public.announcement_reads(user_id);

CREATE INDEX IF NOT EXISTS idx_assignments_created_by
  ON public.assignments(created_by);

CREATE INDEX IF NOT EXISTS idx_attendance_marked_by
  ON public.attendance(marked_by);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_created_by
  ON public.attendance_sessions(created_by);

CREATE INDEX IF NOT EXISTS idx_course_materials_parent_id
  ON public.course_materials(parent_id);

CREATE INDEX IF NOT EXISTS idx_course_materials_uploaded_by
  ON public.course_materials(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_forum_reactions_user_id
  ON public.forum_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_forum_replies_author_id
  ON public.forum_replies(author_id);

CREATE INDEX IF NOT EXISTS idx_forum_reply_reactions_user_id
  ON public.forum_reply_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_leaderboard_course_id
  ON public.leaderboard(course_id);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id
  ON public.login_history(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_actor_id
  ON public.notifications(actor_id);

CREATE INDEX IF NOT EXISTS idx_notifications_course_id
  ON public.notifications(course_id);

CREATE INDEX IF NOT EXISTS idx_reports_resolved_by
  ON public.reports(resolved_by);

CREATE INDEX IF NOT EXISTS idx_reports_story_id
  ON public.reports(story_id);

CREATE INDEX IF NOT EXISTS idx_story_views_viewed_by
  ON public.story_views(viewed_by);

CREATE INDEX IF NOT EXISTS idx_student_grades_assignment_id
  ON public.student_grades(assignment_id);

CREATE INDEX IF NOT EXISTS idx_student_grades_graded_by
  ON public.student_grades(graded_by);

CREATE INDEX IF NOT EXISTS idx_study_group_posts_author_id
  ON public.study_group_posts(author_id);

CREATE INDEX IF NOT EXISTS idx_study_group_session_attendees_user_id
  ON public.study_group_session_attendees(user_id);

CREATE INDEX IF NOT EXISTS idx_study_group_sessions_created_by
  ON public.study_group_sessions(created_by);

CREATE INDEX IF NOT EXISTS idx_study_groups_created_by
  ON public.study_groups(created_by);

-- Reuse a single, stable administrator check in policies that need it.
CREATE OR REPLACE FUNCTION public.is_admin(
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = target_user_id
        AND profile.role = 'admin'
        AND COALESCE(profile.is_active, TRUE)
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Courses: keep one SELECT policy and split the previous FOR ALL policy into
-- write-only policies so it no longer also participates in every SELECT.
DROP POLICY IF EXISTS "Allow all authenticated users to view courses"
  ON public.courses;
DROP POLICY IF EXISTS "Allow lecturers to manage their courses"
  ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can view course templates"
  ON public.courses;
DROP POLICY IF EXISTS "Lecturers can create course templates"
  ON public.courses;
DROP POLICY IF EXISTS "Lecturers can update course templates"
  ON public.courses;
DROP POLICY IF EXISTS "Lecturers can delete course templates"
  ON public.courses;

CREATE POLICY "Authenticated users can view course templates"
  ON public.courses FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Lecturers can create course templates"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (
    lecturer_id = auth.uid()
    OR (SELECT public.is_admin())
  );

CREATE POLICY "Lecturers can update course templates"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (
    lecturer_id = auth.uid()
    OR (SELECT public.is_admin())
  )
  WITH CHECK (
    lecturer_id = auth.uid()
    OR (SELECT public.is_admin())
  );

CREATE POLICY "Lecturers can delete course templates"
  ON public.courses FOR DELETE
  TO authenticated
  USING (
    lecturer_id = auth.uid()
    OR (SELECT public.is_admin())
  );

-- Announcements: administrators retain access to inactive announcements,
-- while authenticated users continue to see active, non-expired items.
DROP POLICY IF EXISTS "Allow all authenticated users to view announcements"
  ON public.announcements;
DROP POLICY IF EXISTS "Allow admins to manage announcements"
  ON public.announcements;
DROP POLICY IF EXISTS "Authenticated users can view announcements"
  ON public.announcements;
DROP POLICY IF EXISTS "Admins can create announcements"
  ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements"
  ON public.announcements;
DROP POLICY IF EXISTS "Admins can delete announcements"
  ON public.announcements;

CREATE POLICY "Authenticated users can view announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    (
      is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
    )
    OR (SELECT public.is_admin())
  );

CREATE POLICY "Admins can create announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- Attendance: one read policy for students and course staff, plus write-only
-- lecturer policies. This preserves the previous FOR ALL behavior.
DROP POLICY IF EXISTS "Allow course members to view attendance"
  ON public.attendance;
DROP POLICY IF EXISTS "Allow course lecturers to manage attendance"
  ON public.attendance;
DROP POLICY IF EXISTS "Allow course lecturers to create attendance"
  ON public.attendance;
DROP POLICY IF EXISTS "Allow course lecturers to update attendance"
  ON public.attendance;
DROP POLICY IF EXISTS "Allow course lecturers to delete attendance"
  ON public.attendance;

CREATE POLICY "Allow course members to view attendance"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_course_instructor(course_id)
  );

CREATE POLICY "Allow course lecturers to create attendance"
  ON public.attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_course_instructor(course_id)
    AND (
      marked_by = auth.uid()
      OR (SELECT public.is_admin())
    )
  );

CREATE POLICY "Allow course lecturers to update attendance"
  ON public.attendance FOR UPDATE
  TO authenticated
  USING (public.is_course_instructor(course_id))
  WITH CHECK (
    public.is_course_instructor(course_id)
    AND (
      marked_by = auth.uid()
      OR (SELECT public.is_admin())
    )
  );

CREATE POLICY "Allow course lecturers to delete attendance"
  ON public.attendance FOR DELETE
  TO authenticated
  USING (public.is_course_instructor(course_id));

-- Attendance sessions: remove the SELECT overlap introduced by FOR ALL.
DROP POLICY IF EXISTS "Course lecturers can view attendance sessions"
  ON public.attendance_sessions;
DROP POLICY IF EXISTS "Course lecturers can manage attendance sessions"
  ON public.attendance_sessions;
DROP POLICY IF EXISTS "Course lecturers can create attendance sessions"
  ON public.attendance_sessions;
DROP POLICY IF EXISTS "Course lecturers can update attendance sessions"
  ON public.attendance_sessions;
DROP POLICY IF EXISTS "Course lecturers can delete attendance sessions"
  ON public.attendance_sessions;

CREATE POLICY "Course lecturers can view attendance sessions"
  ON public.attendance_sessions FOR SELECT
  TO authenticated
  USING (public.is_course_instructor(course_id));

CREATE POLICY "Course lecturers can create attendance sessions"
  ON public.attendance_sessions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_course_instructor(course_id));

CREATE POLICY "Course lecturers can update attendance sessions"
  ON public.attendance_sessions FOR UPDATE
  TO authenticated
  USING (public.is_course_instructor(course_id))
  WITH CHECK (public.is_course_instructor(course_id));

CREATE POLICY "Course lecturers can delete attendance sessions"
  ON public.attendance_sessions FOR DELETE
  TO authenticated
  USING (public.is_course_instructor(course_id));

-- Student grades: combine read access and split lecturer write access.
DROP POLICY IF EXISTS "Allow course members to view grades"
  ON public.student_grades;
DROP POLICY IF EXISTS "Allow course lecturers to manage grades"
  ON public.student_grades;
DROP POLICY IF EXISTS "Allow course lecturers to create grades"
  ON public.student_grades;
DROP POLICY IF EXISTS "Allow course lecturers to update grades"
  ON public.student_grades;
DROP POLICY IF EXISTS "Allow course lecturers to delete grades"
  ON public.student_grades;

CREATE POLICY "Allow course members to view grades"
  ON public.student_grades FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_course_instructor(course_id)
  );

CREATE POLICY "Allow course lecturers to create grades"
  ON public.student_grades FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_course_instructor(course_id)
    AND (
      graded_by = auth.uid()
      OR (SELECT public.is_admin())
    )
  );

CREATE POLICY "Allow course lecturers to update grades"
  ON public.student_grades FOR UPDATE
  TO authenticated
  USING (public.is_course_instructor(course_id))
  WITH CHECK (
    public.is_course_instructor(course_id)
    AND (
      graded_by = auth.uid()
      OR (SELECT public.is_admin())
    )
  );

CREATE POLICY "Allow course lecturers to delete grades"
  ON public.student_grades FOR DELETE
  TO authenticated
  USING (public.is_course_instructor(course_id));

-- Student GPA: one SELECT policy avoids evaluating three permissive policies
-- for every row while retaining student, lecturer and administrator access.
DROP POLICY IF EXISTS "Students can view own GPA"
  ON public.student_gpa;
DROP POLICY IF EXISTS "Course lecturers can view student GPA"
  ON public.student_gpa;
DROP POLICY IF EXISTS "Admins can manage student GPA"
  ON public.student_gpa;
DROP POLICY IF EXISTS "Students and course staff can view student GPA"
  ON public.student_gpa;
DROP POLICY IF EXISTS "Admins can create student GPA"
  ON public.student_gpa;
DROP POLICY IF EXISTS "Admins can update student GPA"
  ON public.student_gpa;
DROP POLICY IF EXISTS "Admins can delete student GPA"
  ON public.student_gpa;

CREATE POLICY "Students and course staff can view student GPA"
  ON public.student_gpa FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.course_enrollments enrollment
      JOIN public.course_instructors instructor
        ON instructor.course_id = enrollment.course_id
      WHERE enrollment.student_id = student_gpa.student_id
        AND instructor.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create student GPA"
  ON public.student_gpa FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can update student GPA"
  ON public.student_gpa FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can delete student GPA"
  ON public.student_gpa FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- Course instructors: preserve the combined lecturer/admin DELETE access in a
-- single policy.
DROP POLICY IF EXISTS "Allow course lecturers to remove lecturers"
  ON public.course_instructors;
DROP POLICY IF EXISTS "Only admins can remove course instructors directly"
  ON public.course_instructors;
DROP POLICY IF EXISTS "Allow lecturers to remove their own course links"
  ON public.course_instructors;
DROP POLICY IF EXISTS "Course lecturers can remove course instructors"
  ON public.course_instructors;

CREATE POLICY "Course lecturers can remove course instructors"
  ON public.course_instructors FOR DELETE
  TO authenticated
  USING (public.is_course_instructor(course_id));

-- Stories: combine owner and administrator DELETE access.
DROP POLICY IF EXISTS "Allow users to delete their own stories"
  ON public.stories;
DROP POLICY IF EXISTS "Admins can delete reported stories"
  ON public.stories;
DROP POLICY IF EXISTS "Story owners and admins can delete stories"
  ON public.stories;

CREATE POLICY "Story owners and admins can delete stories"
  ON public.stories FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT public.is_admin())
  );

-- PostgreSQL evaluates an unwrapped auth function once per row in an RLS
-- policy. Rebuild all current public/storage policy expressions so auth data is
-- initialized once per statement. Policy names, commands and roles are kept.
DO $$
DECLARE
  policy_row RECORD;
  optimized_using TEXT;
  optimized_check TEXT;
BEGIN
  FOR policy_row IN
    SELECT
      policy.polname,
      policy.polrelid,
      schema_row.nspname AS schema_name,
      table_row.relname AS table_name,
      PG_GET_EXPR(policy.polqual, policy.polrelid) AS using_expression,
      PG_GET_EXPR(policy.polwithcheck, policy.polrelid) AS check_expression
    FROM pg_policy policy
    JOIN pg_class table_row ON table_row.oid = policy.polrelid
    JOIN pg_namespace schema_row ON schema_row.oid = table_row.relnamespace
    WHERE schema_row.nspname IN ('public', 'storage')
      AND (
        COALESCE(PG_GET_EXPR(policy.polqual, policy.polrelid), '')
          ~ 'auth\.(uid|role|jwt)\(\)'
        OR COALESCE(PG_GET_EXPR(policy.polwithcheck, policy.polrelid), '')
          ~ 'auth\.(uid|role|jwt)\(\)'
      )
  LOOP
    optimized_using := policy_row.using_expression;
    optimized_check := policy_row.check_expression;

    IF optimized_using IS NOT NULL THEN
      optimized_using := REPLACE(
        optimized_using,
        'auth.uid()',
        '(SELECT auth.uid())'
      );
      optimized_using := REPLACE(
        optimized_using,
        'auth.role()',
        '(SELECT auth.role())'
      );
      optimized_using := REPLACE(
        optimized_using,
        'auth.jwt()',
        '(SELECT auth.jwt())'
      );
    END IF;

    IF optimized_check IS NOT NULL THEN
      optimized_check := REPLACE(
        optimized_check,
        'auth.uid()',
        '(SELECT auth.uid())'
      );
      optimized_check := REPLACE(
        optimized_check,
        'auth.role()',
        '(SELECT auth.role())'
      );
      optimized_check := REPLACE(
        optimized_check,
        'auth.jwt()',
        '(SELECT auth.jwt())'
      );
    END IF;

    EXECUTE FORMAT(
      'ALTER POLICY %I ON %I.%I%s%s',
      policy_row.polname,
      policy_row.schema_name,
      policy_row.table_name,
      CASE
        WHEN optimized_using IS NULL THEN ''
        ELSE FORMAT(' USING (%s)', optimized_using)
      END,
      CASE
        WHEN optimized_check IS NULL THEN ''
        ELSE FORMAT(' WITH CHECK (%s)', optimized_check)
      END
    );
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
