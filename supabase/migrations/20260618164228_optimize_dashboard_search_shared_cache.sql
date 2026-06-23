BEGIN;

SET LOCAL search_path = public, pg_catalog;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- User-name substring searches now use a trigram index instead of scanning the
-- whole profile table for every keystroke.
CREATE INDEX IF NOT EXISTS idx_user_profiles_full_name_trgm
  ON public.user_profiles
  USING GIN (full_name extensions.gin_trgm_ops);

-- Composite indexes match the bounded dashboard access patterns below.
CREATE INDEX IF NOT EXISTS idx_assignments_course_due
  ON public.assignments (course_id, due_date, id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_course_date
  ON public.attendance (student_id, course_id, class_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_grades_student_course_date
  ON public.student_grades (student_id, course_id, graded_at DESC);

-- One authenticated RPC replaces the student's browser-side fan-out across
-- enrollments, instructors, assignments, submissions, grades and attendance.
-- Historical arrays used for Insights are capped per course.
CREATE OR REPLACE FUNCTION public.get_student_dashboard_data()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
WITH actor AS (
  SELECT (SELECT auth.uid()) AS id
),
enrolled AS (
  SELECT
    enrollment.course_id,
    enrollment.enrolled_at,
    offering.course_id AS template_id,
    offering.status,
    offering.created_at,
    COALESCE(course.course_code, course.code, 'N/A') AS code,
    course.name,
    COALESCE(course.credit_hours, course.credits, 0) AS credits
  FROM public.course_enrollments enrollment
  JOIN actor ON actor.id = enrollment.student_id
  JOIN public.course_offerings offering ON offering.id = enrollment.course_id
  JOIN public.courses course ON course.id = offering.course_id
),
assignment_base AS (
  SELECT
    assignment.id,
    assignment.course_id,
    assignment.title,
    assignment.rubric,
    assignment.due_date,
    assignment.max_score,
    assignment.created_at
  FROM public.assignments assignment
  JOIN enrolled ON enrolled.course_id = assignment.course_id
),
submission_base AS (
  SELECT
    submission.id,
    submission.assignment_id,
    submission.submitted_at,
    COALESCE(submission.is_late, false) AS is_late,
    submission.grade,
    submission.feedback
  FROM public.assignment_submissions submission
  JOIN actor ON actor.id = submission.student_id
  JOIN assignment_base assignment ON assignment.id = submission.assignment_id
),
grade_base AS (
  SELECT
    grade.course_id,
    grade.assignment_id,
    grade.score,
    COALESCE(grade.max_score, 100) AS max_score,
    grade.feedback,
    grade.graded_at
  FROM public.student_grades grade
  JOIN actor ON actor.id = grade.student_id
  JOIN enrolled ON enrolled.course_id = grade.course_id
),
attendance_base AS (
  SELECT
    attendance.course_id,
    attendance.class_date,
    COALESCE(
      attendance.status,
      CASE WHEN attendance.marked_present THEN 'present' ELSE 'absent' END
    ) AS status
  FROM public.attendance attendance
  JOIN actor ON actor.id = attendance.student_id
  JOIN enrolled ON enrolled.course_id = attendance.course_id
),
instructor_summary AS (
  SELECT
    instructor.course_id,
    string_agg(profile.full_name, ', ' ORDER BY profile.full_name) AS lecturer
  FROM public.course_instructors instructor
  JOIN enrolled ON enrolled.course_id = instructor.course_id
  JOIN public.user_profiles profile ON profile.id = instructor.user_id
  GROUP BY instructor.course_id
),
assignment_summary AS (
  SELECT
    assignment.course_id,
    count(*)::INTEGER AS assignment_count,
    count(submission.id)::INTEGER AS completed_count,
    (count(*) - count(submission.id))::INTEGER AS pending_count,
    max(submission.submitted_at) AS last_submission_at
  FROM assignment_base assignment
  LEFT JOIN submission_base submission
    ON submission.assignment_id = assignment.id
  GROUP BY assignment.course_id
),
grade_summary AS (
  SELECT
    grade.course_id,
    avg((grade.score::NUMERIC / NULLIF(grade.max_score, 0)) * 100) AS percentage
  FROM grade_base grade
  GROUP BY grade.course_id
),
submission_grade_summary AS (
  SELECT
    assignment.course_id,
    avg((submission.grade::NUMERIC / NULLIF(COALESCE(assignment.max_score, 100), 0)) * 100)
      FILTER (WHERE submission.grade IS NOT NULL) AS percentage
  FROM assignment_base assignment
  JOIN submission_base submission ON submission.assignment_id = assignment.id
  GROUP BY assignment.course_id
),
course_card_rows AS (
  SELECT
    enrolled.course_id AS id,
    enrolled.code,
    enrolled.name,
    COALESCE(instructor_summary.lecturer, 'No lecturer assigned') AS lecturer,
    CASE
      WHEN COALESCE(assignment_summary.assignment_count, 0) = 0 THEN 0
      ELSE round(
        assignment_summary.completed_count::NUMERIC
        / assignment_summary.assignment_count::NUMERIC * 100
      )::INTEGER
    END AS progress,
    COALESCE(assignment_summary.assignment_count, 0) AS assignments,
    COALESCE(assignment_summary.completed_count, 0) AS completed_assignments,
    COALESCE(assignment_summary.pending_count, 0) AS pending_assignments,
    enrolled.status,
    CASE
      WHEN COALESCE(grade_summary.percentage, submission_grade_summary.percentage) IS NULL THEN NULL
      WHEN COALESCE(grade_summary.percentage, submission_grade_summary.percentage) >= 80 THEN 'A'
      WHEN COALESCE(grade_summary.percentage, submission_grade_summary.percentage) >= 75 THEN 'A-'
      WHEN COALESCE(grade_summary.percentage, submission_grade_summary.percentage) >= 70 THEN 'B+'
      WHEN COALESCE(grade_summary.percentage, submission_grade_summary.percentage) >= 65 THEN 'B'
      WHEN COALESCE(grade_summary.percentage, submission_grade_summary.percentage) >= 60 THEN 'B-'
      WHEN COALESCE(grade_summary.percentage, submission_grade_summary.percentage) >= 55 THEN 'C+'
      WHEN COALESCE(grade_summary.percentage, submission_grade_summary.percentage) >= 50 THEN 'C'
      WHEN COALESCE(grade_summary.percentage, submission_grade_summary.percentage) >= 40 THEN 'D'
      ELSE 'F'
    END AS grade,
    enrolled.credits,
    COALESCE(
      assignment_summary.last_submission_at,
      enrolled.enrolled_at,
      enrolled.created_at
    ) AS last_activity,
    (
      SELECT jsonb_build_object(
        'id', next_assignment.id,
        'title', next_assignment.title,
        'dueDate', next_assignment.due_date
      )
      FROM assignment_base next_assignment
      LEFT JOIN submission_base next_submission
        ON next_submission.assignment_id = next_assignment.id
      WHERE next_assignment.course_id = enrolled.course_id
        AND next_submission.id IS NULL
        AND next_assignment.due_date >= now()
      ORDER BY next_assignment.due_date, next_assignment.id
      LIMIT 1
    ) AS next_assignment
  FROM enrolled
  LEFT JOIN instructor_summary USING (course_id)
  LEFT JOIN assignment_summary USING (course_id)
  LEFT JOIN grade_summary USING (course_id)
  LEFT JOIN submission_grade_summary USING (course_id)
),
upcoming_rows AS (
  SELECT
    assignment.id,
    assignment.course_id,
    enrolled.code AS course_code,
    enrolled.name AS course_name,
    assignment.title,
    assignment.due_date
  FROM assignment_base assignment
  JOIN enrolled ON enrolled.course_id = assignment.course_id
  LEFT JOIN submission_base submission ON submission.assignment_id = assignment.id
  WHERE submission.id IS NULL
    AND assignment.due_date >= now()
  ORDER BY assignment.due_date, assignment.id
  LIMIT 5
),
announcement_rows AS (
  SELECT
    announcement.id,
    announcement.title,
    announcement.content,
    announcement.priority,
    announcement.attachments,
    announcement.created_at,
    EXISTS (
      SELECT 1
      FROM public.announcement_reads announcement_read
      JOIN actor ON actor.id = announcement_read.user_id
      WHERE announcement_read.announcement_id = announcement.id
    ) AS is_read
  FROM public.announcements announcement
  WHERE announcement.is_active = true
    AND (announcement.expires_at IS NULL OR announcement.expires_at > now())
  ORDER BY announcement.created_at DESC, announcement.id DESC
  LIMIT 5
),
insight_rows AS (
  SELECT
    enrolled.course_id AS id,
    enrolled.code,
    enrolled.name,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'percentage', grade_row.percentage,
          'gradedAt', grade_row.graded_at,
          'feedback', grade_row.feedback,
          'assignmentTitle', grade_row.assignment_title,
          'rubric', grade_row.rubric
        ) ORDER BY grade_row.graded_at
      )
      FROM (
        SELECT
          round((grade.score::NUMERIC / NULLIF(grade.max_score, 0)) * 100)::INTEGER
            AS percentage,
          grade.graded_at,
          COALESCE(grade.feedback, '') AS feedback,
          COALESCE(assignment.title, 'Course assessment') AS assignment_title,
          COALESCE(assignment.rubric, '') AS rubric
        FROM grade_base grade
        LEFT JOIN assignment_base assignment ON assignment.id = grade.assignment_id
        WHERE grade.course_id = enrolled.course_id
        ORDER BY grade.graded_at DESC, grade.assignment_id DESC NULLS LAST
        LIMIT 20
      ) grade_row
    ), '[]'::jsonb) AS grades,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'status', attendance_row.status,
          'classDate', attendance_row.class_date
        ) ORDER BY attendance_row.class_date
      )
      FROM (
        SELECT attendance.status, attendance.class_date
        FROM attendance_base attendance
        WHERE attendance.course_id = enrolled.course_id
        ORDER BY attendance.class_date DESC
        LIMIT 20
      ) attendance_row
    ), '[]'::jsonb) AS attendance,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'title', assignment_row.title,
          'dueDate', assignment_row.due_date,
          'submitted', assignment_row.submitted,
          'isLate', assignment_row.is_late
        ) ORDER BY assignment_row.due_date
      )
      FROM (
        SELECT
          assignment.title,
          assignment.due_date,
          (submission.id IS NOT NULL) AS submitted,
          COALESCE(submission.is_late, false) AS is_late
        FROM assignment_base assignment
        LEFT JOIN submission_base submission ON submission.assignment_id = assignment.id
        WHERE assignment.course_id = enrolled.course_id
        ORDER BY assignment.due_date DESC, assignment.id DESC
        LIMIT 30
      ) assignment_row
    ), '[]'::jsonb) AS assignments
  FROM enrolled
)
SELECT jsonb_build_object(
  'courses', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', course.id,
        'code', course.code,
        'name', course.name,
        'lecturer', course.lecturer,
        'progress', course.progress,
        'assignments', course.assignments,
        'completedAssignments', course.completed_assignments,
        'pendingAssignments', course.pending_assignments,
        'status', course.status,
        'grade', course.grade,
        'credits', course.credits,
        'lastActivity', course.last_activity,
        'nextAssignment', course.next_assignment
      ) ORDER BY course.name, course.id
    )
    FROM course_card_rows course
  ), '[]'::jsonb),
  'upcomingAssignments', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', upcoming.id,
        'courseId', upcoming.course_id,
        'courseCode', upcoming.course_code,
        'courseName', upcoming.course_name,
        'title', upcoming.title,
        'dueDate', upcoming.due_date
      ) ORDER BY upcoming.due_date, upcoming.id
    )
    FROM upcoming_rows upcoming
  ), '[]'::jsonb),
  'announcements', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', announcement.id,
        'title', announcement.title,
        'content', announcement.content,
        'priority', announcement.priority,
        'attachments', announcement.attachments,
        'createdAt', announcement.created_at,
        'isRead', announcement.is_read
      ) ORDER BY announcement.created_at DESC, announcement.id DESC
    )
    FROM announcement_rows announcement
  ), '[]'::jsonb),
  'stats', jsonb_build_object(
    'pendingAssignments', COALESCE((
      SELECT sum(course.pending_assignments)::INTEGER FROM course_card_rows course
    ), 0),
    'gpa', (
      SELECT gpa.gpa
      FROM public.student_gpa gpa
      JOIN actor ON actor.id = gpa.student_id
      LIMIT 1
    ),
    'credits', COALESCE((SELECT sum(enrolled.credits)::INTEGER FROM enrolled), 0),
    'unreadAlerts', COALESCE((
      SELECT count(*)::INTEGER FROM announcement_rows announcement WHERE NOT announcement.is_read
    ), 0)
  ),
  'insightContext', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', insight.id,
        'code', insight.code,
        'name', insight.name,
        'grades', insight.grades,
        'attendance', insight.attendance,
        'assignments', insight.assignments
      ) ORDER BY insight.name, insight.id
    )
    FROM insight_rows insight
  ), '[]'::jsonb)
);
$function$;

REVOKE ALL ON FUNCTION public.get_student_dashboard_data()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_dashboard_data()
  TO authenticated;

-- Course browsing is filtered and paginated in Postgres. The browser no longer
-- downloads every active offering just to show nine cards.
CREATE OR REPLACE FUNCTION public.get_available_course_offerings(
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 9,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  template_id UUID,
  course_code TEXT,
  code TEXT,
  name TEXT,
  chinese_name TEXT,
  faculty TEXT,
  programme TEXT,
  course_type TEXT,
  credit_hours INTEGER,
  max_capacity INTEGER,
  status TEXT,
  semester TEXT,
  created_at TIMESTAMPTZ,
  instructors JSONB,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
WITH actor_profile AS (
  SELECT profile.id, profile.faculty, profile.programme
  FROM public.user_profiles profile
  WHERE profile.id = (SELECT auth.uid())
    AND profile.role = 'student'
    AND COALESCE(profile.is_active, true)
),
eligible AS (
  SELECT
    offering.id,
    offering.course_id AS template_id,
    COALESCE(course.course_code, course.code, 'N/A') AS course_code,
    COALESCE(course.code, course.course_code, 'N/A') AS code,
    course.name,
    course.chinese_name,
    COALESCE(course.faculty, '') AS faculty,
    COALESCE(course.programme, '') AS programme,
    COALESCE(course.course_type, 'elective_open') AS course_type,
    COALESCE(course.credit_hours, course.credits, 0) AS credit_hours,
    COALESCE(offering.max_capacity, course.max_capacity, course.max_students, 0)
      AS max_capacity,
    offering.status,
    COALESCE(term.code, term.name, 'Current') AS semester,
    offering.created_at,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', profile.id,
          'full_name', profile.full_name,
          'avatar_url', profile.avatar_url
        ) ORDER BY profile.full_name, profile.id
      )
      FROM public.course_instructors instructor
      JOIN public.user_profiles profile ON profile.id = instructor.user_id
      WHERE instructor.course_id = offering.id
    ), '[]'::jsonb) AS instructors
  FROM public.course_offerings offering
  JOIN public.courses course ON course.id = offering.course_id
  JOIN public.academic_terms term ON term.id = offering.academic_term_id
  CROSS JOIN actor_profile profile
  WHERE offering.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM public.course_enrollments enrollment
      WHERE enrollment.course_id = offering.id
        AND enrollment.student_id = profile.id
    )
    AND (
      course.course_type = 'elective_open'
      OR (course.course_type = 'common_core' AND course.faculty = profile.faculty)
      OR (course.course_type = 'discipline_core' AND course.programme = profile.programme)
      OR (course.course_type = 'elective_core' AND course.faculty = profile.faculty)
    )
    AND (
      NULLIF(btrim(COALESCE(p_search, '')), '') IS NULL
      OR course.name ILIKE '%' || btrim(p_search) || '%'
      OR course.code ILIKE '%' || btrim(p_search) || '%'
      OR course.course_code ILIKE '%' || btrim(p_search) || '%'
    )
)
SELECT
  eligible.id,
  eligible.template_id,
  eligible.course_code,
  eligible.code,
  eligible.name,
  eligible.chinese_name,
  eligible.faculty,
  eligible.programme,
  eligible.course_type,
  eligible.credit_hours,
  eligible.max_capacity,
  eligible.status,
  eligible.semester,
  eligible.created_at,
  eligible.instructors,
  count(*) OVER () AS total_count
FROM eligible
ORDER BY eligible.code, eligible.name, eligible.id
LIMIT LEAST(GREATEST(COALESCE(p_limit, 9), 1), 30)
OFFSET LEAST(GREATEST(COALESCE(p_offset, 0), 0), 10000);
$function$;

REVOKE ALL ON FUNCTION public.get_available_course_offerings(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_available_course_offerings(TEXT, INTEGER, INTEGER)
  TO authenticated;

-- Validate enrollment keys on the server so the paginated catalogue never has
-- to send the key to an unenrolled student's browser.
CREATE OR REPLACE FUNCTION private.enroll_student_in_course_with_key(
  p_course_id UUID,
  p_enrollment_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor_id UUID := (SELECT auth.uid());
  actor_profile public.user_profiles%ROWTYPE;
  offering_row RECORD;
BEGIN
  SELECT * INTO actor_profile
  FROM public.user_profiles profile
  WHERE profile.id = actor_id
    AND profile.role = 'student'
    AND COALESCE(profile.is_active, true);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'An active student account is required';
  END IF;

  SELECT
    offering.enrollment_key,
    offering.status,
    course.course_type,
    course.faculty,
    course.programme
  INTO offering_row
  FROM public.course_offerings offering
  JOIN public.courses course ON course.id = offering.course_id
  WHERE offering.id = p_course_id
  FOR UPDATE OF offering;

  IF NOT FOUND OR offering_row.status <> 'active' THEN
    RAISE EXCEPTION 'Course offering is unavailable';
  END IF;

  IF NULLIF(btrim(COALESCE(p_enrollment_key, '')), '') IS NULL
     OR btrim(p_enrollment_key) <> btrim(offering_row.enrollment_key) THEN
    RAISE EXCEPTION 'Invalid enrollment key';
  END IF;

  IF NOT (
    offering_row.course_type = 'elective_open'
    OR (
      offering_row.course_type = 'common_core'
      AND offering_row.faculty = actor_profile.faculty
    )
    OR (
      offering_row.course_type = 'discipline_core'
      AND offering_row.programme = actor_profile.programme
    )
    OR (
      offering_row.course_type = 'elective_core'
      AND offering_row.faculty = actor_profile.faculty
    )
  ) THEN
    RAISE EXCEPTION 'This course is not available for your programme';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.course_instructors instructor
    WHERE instructor.course_id = p_course_id
  ) THEN
    RAISE EXCEPTION 'This course does not have an assigned lecturer';
  END IF;

  INSERT INTO public.course_enrollments (course_id, student_id)
  VALUES (p_course_id, actor_id);

  RETURN p_course_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Already enrolled';
END;
$function$;

REVOKE ALL ON FUNCTION private.enroll_student_in_course_with_key(UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.enroll_student_in_course_with_key(UUID, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.enroll_student_in_course(
  p_course_id UUID,
  p_enrollment_key TEXT
)
RETURNS UUID
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.enroll_student_in_course_with_key(p_course_id, p_enrollment_key);
$function$;

REVOKE ALL ON FUNCTION public.enroll_student_in_course(UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enroll_student_in_course(UUID, TEXT)
  TO authenticated;

-- Shared cache metadata supports one refresher and stale-while-revalidate.
ALTER TABLE public.shared_cache_entries
  ADD COLUMN IF NOT EXISTS stale_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refreshing_until TIMESTAMPTZ;

UPDATE public.shared_cache_entries
SET stale_until = COALESCE(stale_until, expires_at)
WHERE stale_until IS NULL;

ALTER TABLE public.shared_cache_entries
  ALTER COLUMN stale_until SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shared_cache_entries_refreshing_until
  ON public.shared_cache_entries (refreshing_until)
  WHERE refreshing_until IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_shared_cache_refresh(
  p_cache_key TEXT,
  p_lease_seconds INTEGER DEFAULT 15
)
RETURNS TABLE (
  cache_value JSONB,
  cache_expires_at TIMESTAMPTZ,
  cache_stale_until TIMESTAMPTZ,
  lease_acquired BOOLEAN
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  claimed_row public.shared_cache_entries%ROWTYPE;
BEGIN
  INSERT INTO public.shared_cache_entries (
    cache_key,
    value,
    expires_at,
    stale_until,
    refreshing_until,
    updated_at
  )
  VALUES (
    p_cache_key,
    'null'::jsonb,
    now() - interval '1 second',
    now() - interval '1 second',
    now() + make_interval(secs => LEAST(GREATEST(COALESCE(p_lease_seconds, 15), 5), 60)),
    now()
  )
  ON CONFLICT (cache_key) DO UPDATE
  SET refreshing_until = EXCLUDED.refreshing_until
  WHERE public.shared_cache_entries.refreshing_until IS NULL
     OR public.shared_cache_entries.refreshing_until <= now()
  RETURNING * INTO claimed_row;

  IF FOUND THEN
    RETURN QUERY SELECT
      claimed_row.value,
      claimed_row.expires_at,
      claimed_row.stale_until,
      true;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT cache.value, cache.expires_at, cache.stale_until, false
  FROM public.shared_cache_entries cache
  WHERE cache.cache_key = p_cache_key;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_shared_cache_refresh(TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_shared_cache_refresh(TEXT, INTEGER)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
