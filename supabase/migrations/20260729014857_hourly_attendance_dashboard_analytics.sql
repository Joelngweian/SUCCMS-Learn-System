-- Align dashboard and lecturer analytics attendance calculations with hourly slots.
-- Completed hourly slots are the denominator; present, late and excused are credited.
-- Legacy non-hourly attendance rows remain supported through attendance.marked_present.

BEGIN;

SET LOCAL search_path = public, pg_catalog;

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course_status_date
  ON public.attendance_sessions (course_id, status, class_date DESC, slot_no);

CREATE INDEX IF NOT EXISTS idx_attendance_student_session
  ON public.attendance (student_id, session_id)
  WHERE session_id IS NOT NULL;

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
completed_attendance_sessions AS (
  SELECT
    session_row.id,
    session_row.course_id,
    session_row.class_date,
    session_row.slot_no
  FROM public.attendance_sessions session_row
  JOIN enrolled ON enrolled.course_id = session_row.course_id
  WHERE session_row.status IN ('closed', 'completed')
),
attendance_base AS (
  SELECT
    session_row.course_id,
    session_row.class_date,
    session_row.slot_no,
    CASE
      WHEN attendance.status IN ('present', 'late', 'absent', 'excused')
        THEN attendance.status
      WHEN attendance.marked_present THEN 'present'
      ELSE 'absent'
    END AS status
  FROM completed_attendance_sessions session_row
  LEFT JOIN public.attendance attendance
    ON attendance.session_id = session_row.id
   AND attendance.student_id = (SELECT id FROM actor)
  UNION ALL
  SELECT
    attendance.course_id,
    attendance.class_date,
    0 AS slot_no,
    CASE
      WHEN attendance.status IN ('present', 'late', 'absent', 'excused')
        THEN attendance.status
      WHEN attendance.marked_present THEN 'present'
      ELSE 'absent'
    END AS status
  FROM public.attendance attendance
  JOIN actor ON actor.id = attendance.student_id
  JOIN enrolled ON enrolled.course_id = attendance.course_id
  WHERE attendance.session_id IS NULL
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
        ORDER BY attendance.class_date DESC, attendance.slot_no DESC
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

create or replace function public.get_lecturer_analytics(
  p_period_start timestamptz,
  p_bucket_start timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
with
params as (
  select
    p_period_start as period_start,
    p_bucket_start as bucket_start,
    statement_timestamp() as now_at
),
my_courses as (
  select distinct
    offering.id,
    coalesce(nullif(course.course_code, ''), nullif(course.code, ''), 'N/A') as code,
    coalesce(course.name, '') as name
  from public.course_instructors as instructor
  join public.course_offerings as offering on offering.id = instructor.course_id
  join public.courses as course on course.id = offering.course_id
  where instructor.user_id = (select auth.uid())
),
enrollments as (
  select enrollment.course_id, enrollment.student_id, enrollment.enrolled_at
  from public.course_enrollments as enrollment
  join my_courses as course on course.id = enrollment.course_id
),
all_assignments as (
  select
    assignment.id,
    assignment.course_id,
    assignment.title,
    assignment.due_date,
    assignment.max_score,
    assignment.created_at
  from public.assignments as assignment
  join my_courses as course on course.id = assignment.course_id
),
period_assignments as (
  select assignment.*
  from all_assignments as assignment
  cross join params
  where (
      assignment.created_at >= params.period_start
      and assignment.created_at <= params.now_at
    )
    or (
      assignment.due_date >= params.period_start
      and assignment.due_date <= params.now_at
    )
),
all_submissions as (
  select
    submission.id,
    submission.assignment_id,
    submission.student_id,
    submission.submitted_at,
    submission.grade
  from public.assignment_submissions as submission
  join all_assignments as assignment on assignment.id = submission.assignment_id
),
completed_attendance_slots as (
  select
    session_row.id as session_id,
    session_row.course_id,
    enrollment.student_id,
    session_row.class_date,
    session_row.slot_no
  from public.attendance_sessions as session_row
  join my_courses as course on course.id = session_row.course_id
  join public.course_enrollments as enrollment on enrollment.course_id = session_row.course_id
  cross join params
  where session_row.status in ('closed', 'completed')
    and session_row.class_date >= params.period_start::date
),
attendance_rows as (
  select
    slot.course_id,
    slot.student_id,
    slot.class_date,
    case
      when attendance.status in ('present', 'late', 'absent', 'excused')
        then attendance.status
      when attendance.marked_present then 'present'
      else 'absent'
    end as status,
    case
      when attendance.status in ('present', 'late', 'excused') then true
      when attendance.status = 'absent' then false
      else coalesce(attendance.marked_present, false)
    end as credited
  from completed_attendance_slots as slot
  left join public.attendance as attendance
    on attendance.session_id = slot.session_id
   and attendance.student_id = slot.student_id
  union all
  select
    attendance.course_id,
    attendance.student_id,
    attendance.class_date,
    case
      when attendance.status in ('present', 'late', 'absent', 'excused')
        then attendance.status
      when attendance.marked_present then 'present'
      else 'absent'
    end as status,
    case
      when attendance.status in ('present', 'late', 'excused') then true
      when attendance.status = 'absent' then false
      else coalesce(attendance.marked_present, false)
    end as credited
  from public.attendance as attendance
  join my_courses as course on course.id = attendance.course_id
  cross join params
  where attendance.class_date >= params.period_start::date
    and attendance.session_id is null
),
all_threads as (
  select thread.id, thread.course_id, thread.author_id, thread.created_at
  from public.forum_threads as thread
  join my_courses as course on course.id = thread.course_id
),
period_threads as (
  select thread.*
  from all_threads as thread
  cross join params
  where thread.created_at >= params.period_start
    and thread.created_at <= params.now_at
),
all_replies as (
  select
    reply.id,
    thread.course_id,
    reply.thread_id,
    reply.author_id,
    reply.created_at
  from public.forum_replies as reply
  join all_threads as thread on thread.id = reply.thread_id
),
period_replies as (
  select reply.*
  from all_replies as reply
  cross join params
  where reply.created_at >= params.period_start
    and reply.created_at <= params.now_at
),
enrollment_counts as (
  select
    course.id as course_id,
    count(enrollment.student_id)::integer as student_count,
    coalesce(
      jsonb_agg(enrollment.student_id order by enrollment.enrolled_at, enrollment.student_id)
        filter (where enrollment.student_id is not null),
      '[]'::jsonb
    ) as student_ids
  from my_courses as course
  left join enrollments as enrollment on enrollment.course_id = course.id
  group by course.id
),
assignment_metrics as (
  select
    assignment.id,
    assignment.course_id,
    assignment.title,
    course.code as course,
    count(distinct submission.student_id)::integer as submitted,
    enrollment.student_count as total,
    case
      when count(submission.id) filter (where submission.grade is not null) > 0
      then least(100, greatest(0, round(avg(
        submission.grade * 100.0
        / case when coalesce(assignment.max_score, 0) = 0 then 100 else assignment.max_score end
      ) filter (where submission.grade is not null))))::integer
      else null
    end as average,
    count(submission.id) filter (where submission.grade is null)::integer as ungraded,
    assignment.due_date
  from period_assignments as assignment
  join my_courses as course on course.id = assignment.course_id
  join enrollment_counts as enrollment on enrollment.course_id = assignment.course_id
  left join all_submissions as submission on submission.assignment_id = assignment.id
  group by
    assignment.id,
    assignment.course_id,
    assignment.title,
    assignment.max_score,
    assignment.due_date,
    course.code,
    enrollment.student_count
),
student_assignment_stats as (
  select
    enrollment.course_id,
    enrollment.student_id,
    count(assignment.id)::integer as applicable_assignments,
    count(submission.assignment_id)::integer as submitted_assignments,
    case
      when count(submission.assignment_id) filter (where submission.grade is not null) > 0
      then least(100, greatest(0, round(avg(
        submission.grade * 100.0
        / case when coalesce(assignment.max_score, 0) = 0 then 100 else assignment.max_score end
      ) filter (where submission.grade is not null))))::integer
      else null
    end as average_score
  from enrollments as enrollment
  cross join params
  left join period_assignments as assignment
    on assignment.course_id = enrollment.course_id
    and assignment.due_date >= enrollment.enrolled_at
    and assignment.due_date <= params.now_at
  left join all_submissions as submission
    on submission.assignment_id = assignment.id
    and submission.student_id = enrollment.student_id
  group by enrollment.course_id, enrollment.student_id
),
student_attendance_stats as (
  select
    enrollment.course_id,
    enrollment.student_id,
    case
      when count(attendance.student_id) > 0
      then least(100, greatest(0, round(
        count(attendance.student_id) filter (where attendance.credited)
        * 100.0 / count(attendance.student_id)
      )))::integer
      else null
    end as attendance_rate
  from enrollments as enrollment
  left join attendance_rows as attendance
    on attendance.course_id = enrollment.course_id
    and attendance.student_id = enrollment.student_id
  group by enrollment.course_id, enrollment.student_id
),
forum_activity as (
  select thread.course_id, thread.author_id as student_id
  from period_threads as thread
  union
  select reply.course_id, reply.author_id as student_id
  from period_replies as reply
),
forum_counts as (
  select
    course.id as course_id,
    (
      (select count(*) from period_threads as thread where thread.course_id = course.id)
      + (select count(*) from period_replies as reply where reply.course_id = course.id)
    )::integer as forum_posts
  from my_courses as course
),
student_signals as (
  select
    stats.course_id,
    stats.student_id,
    greatest(stats.applicable_assignments - stats.submitted_assignments, 0) as missing_assignments,
    case
      when stats.applicable_assignments > 0
      then least(100, greatest(0, round(
        stats.submitted_assignments * 100.0 / stats.applicable_assignments
      )))::integer
      else null
    end as submission_rate,
    stats.average_score,
    attendance.attendance_rate,
    (activity.student_id is not null) as has_forum_activity,
    forum.forum_posts
  from student_assignment_stats as stats
  join student_attendance_stats as attendance
    on attendance.course_id = stats.course_id
    and attendance.student_id = stats.student_id
  join forum_counts as forum on forum.course_id = stats.course_id
  left join forum_activity as activity
    on activity.course_id = stats.course_id
    and activity.student_id = stats.student_id
),
student_signal_arrays as (
  select
    signal.*,
    array_remove(array[
      case when signal.missing_assignments >= 2
        then signal.missing_assignments || ' missed assignments' end,
      case when signal.average_score is not null and signal.average_score < 50
        then 'average grade ' || signal.average_score || '%' end,
      case when signal.attendance_rate is not null and signal.attendance_rate < 60
        then 'attendance ' || signal.attendance_rate || '%' end
    ]::text[], null) as high_signals,
    array_remove(array[
      case when signal.missing_assignments = 1 then '1 missed assignment' end,
      case when signal.average_score is not null
          and signal.average_score >= 50 and signal.average_score < 70
        then 'average grade ' || signal.average_score || '%' end,
      case when signal.attendance_rate is not null
          and signal.attendance_rate >= 60 and signal.attendance_rate < 75
        then 'attendance ' || signal.attendance_rate || '%' end,
      case when signal.submission_rate is not null
          and signal.submission_rate < 75 and signal.missing_assignments = 0
        then 'submission rate ' || signal.submission_rate || '%' end
    ]::text[], null) as base_medium_signals
  from student_signals as signal
),
risk_signals as (
  select
    signal.*,
    signal.base_medium_signals
      || case
          when signal.forum_posts > 0
            and not signal.has_forum_activity
            and (
              cardinality(signal.high_signals) > 0
              or cardinality(signal.base_medium_signals) > 0
            )
          then array['no discussion participation']::text[]
          else array[]::text[]
        end as medium_signals
  from student_signal_arrays as signal
),
risk_students as (
  select
    signal.student_id as id,
    signal.course_id,
    coalesce(nullif(profile.full_name, ''), 'Student ' || left(signal.student_id::text, 6)) as name,
    course.code as course,
    case when cardinality(signal.high_signals) > 0 then 'High' else 'Medium' end as risk,
    array_to_string(
      array(
        select item.value
        from unnest(signal.high_signals || signal.medium_signals)
          with ordinality as item(value, position)
        order by item.position
        limit 3
      ),
      ', '
    ) as reason,
    least(100, greatest(0, coalesce(
      signal.average_score,
      signal.submission_rate,
      signal.attendance_rate,
      case when signal.has_forum_activity then 100 else 0 end
    )))::integer as score
  from risk_signals as signal
  join my_courses as course on course.id = signal.course_id
  left join public.user_profiles as profile on profile.id = signal.student_id
  where cardinality(signal.high_signals) > 0
    or cardinality(signal.medium_signals) > 0
),
course_assignment_stats as (
  select
    course.id as course_id,
    count(distinct assignment.id)::integer as assignment_count,
    count(distinct assignment.id) filter (where assignment.due_date <= params.now_at)::integer
      as due_assignment_count
  from my_courses as course
  cross join params
  left join period_assignments as assignment on assignment.course_id = course.id
  group by course.id
),
course_submission_stats as (
  select
    course.id as course_id,
    count(distinct (submission.assignment_id, submission.student_id))::integer as submitted_count,
    count(distinct (submission.assignment_id, submission.student_id)) filter (
      where assignment.due_date <= params.now_at
    )::integer as due_submitted_count,
    count(submission.id) filter (where submission.grade is null)::integer as pending_grades,
    case
      when count(submission.id) filter (where submission.grade is not null) > 0
      then least(100, greatest(0, round(avg(
        submission.grade * 100.0
        / case when coalesce(assignment.max_score, 0) = 0 then 100 else assignment.max_score end
      ) filter (where submission.grade is not null))))::integer
      else 0
    end as average_score
  from my_courses as course
  cross join params
  left join period_assignments as assignment on assignment.course_id = course.id
  left join all_submissions as submission on submission.assignment_id = assignment.id
  group by course.id
),
activity_events as (
  select assignment.course_id, submission.student_id, submission.submitted_at as occurred_at
  from all_submissions as submission
  join all_assignments as assignment on assignment.id = submission.assignment_id
  join enrollments as enrollment
    on enrollment.course_id = assignment.course_id
    and enrollment.student_id = submission.student_id
  union all
  select thread.course_id, thread.author_id, thread.created_at
  from all_threads as thread
  join enrollments as enrollment
    on enrollment.course_id = thread.course_id
    and enrollment.student_id = thread.author_id
  union all
  select reply.course_id, reply.author_id, reply.created_at
  from all_replies as reply
  join enrollments as enrollment
    on enrollment.course_id = reply.course_id
    and enrollment.student_id = reply.author_id
  union all
  select attendance.course_id, attendance.student_id, attendance.class_date::timestamptz
  from attendance_rows as attendance
  join enrollments as enrollment
    on enrollment.course_id = attendance.course_id
    and enrollment.student_id = attendance.student_id
  where attendance.credited
),
period_active_students as (
  select distinct event.course_id, event.student_id
  from activity_events as event
  cross join params
  where event.occurred_at >= params.period_start
    and event.occurred_at <= params.now_at
),
course_active_counts as (
  select course.id as course_id, count(active.student_id)::integer as active_students
  from my_courses as course
  left join period_active_students as active on active.course_id = course.id
  group by course.id
),
course_metrics as (
  select
    course.id,
    course.code,
    course.name,
    enrollment.student_ids,
    enrollment.student_count as students,
    case
      when enrollment.student_count * assignment.due_assignment_count > 0
      then least(100, greatest(0, round(
        submission.due_submitted_count * 100.0
        / (enrollment.student_count * assignment.due_assignment_count)
      )))::integer
      else 0
    end as completion,
    case
      when enrollment.student_count > 0
      then least(100, greatest(0, round(
        active.active_students * 100.0 / enrollment.student_count
      )))::integer
      else 0
    end as engagement,
    submission.average_score,
    case
      when enrollment.student_count * assignment.assignment_count > 0
      then least(100, greatest(0, round(
        submission.submitted_count * 100.0
        / (enrollment.student_count * assignment.assignment_count)
      )))::integer
      else 0
    end as submission_rate,
    submission.pending_grades,
    (select count(*)::integer from risk_students as risk where risk.course_id = course.id)
      as risk_students,
    forum.forum_posts,
    assignment.due_assignment_count as due_assignments
  from my_courses as course
  join enrollment_counts as enrollment on enrollment.course_id = course.id
  join course_assignment_stats as assignment on assignment.course_id = course.id
  join course_submission_stats as submission on submission.course_id = course.id
  join course_active_counts as active on active.course_id = course.id
  join forum_counts as forum on forum.course_id = course.id
),
buckets as (
  select
    bucket.position::integer as bucket_number,
    bucket.start_at,
    bucket.start_at + interval '7 days' as end_at
  from params
  cross join lateral generate_series(
    params.bucket_start,
    params.now_at,
    interval '7 days'
  ) with ordinality as bucket(start_at, position)
  where bucket.position <= 24
),
target_keys as (
  select 'all'::text as series_key
  union
  select course.code from my_courses as course
),
target_courses as (
  select 'all'::text as series_key, course.id as course_id
  from my_courses as course
  union all
  select course.code, course.id
  from my_courses as course
),
target_buckets as (
  select target.series_key, bucket.bucket_number, bucket.start_at, bucket.end_at
  from target_keys as target
  cross join buckets as bucket
),
target_student_counts as (
  select target.series_key, count(distinct enrollment.student_id)::integer as student_count
  from target_keys as target
  left join target_courses as mapping on mapping.series_key = target.series_key
  left join enrollments as enrollment on enrollment.course_id = mapping.course_id
  group by target.series_key
),
bucket_activity as (
  select
    bucket.series_key,
    bucket.bucket_number,
    count(distinct event.student_id)::integer as active_students
  from target_buckets as bucket
  left join target_courses as mapping on mapping.series_key = bucket.series_key
  left join activity_events as event
    on event.course_id = mapping.course_id
    and event.occurred_at >= bucket.start_at
    and event.occurred_at < bucket.end_at
  group by bucket.series_key, bucket.bucket_number
),
bucket_submissions as (
  select
    bucket.series_key,
    bucket.bucket_number,
    count(distinct submission.student_id)::integer as submitters,
    case
      when count(submission.id) filter (where submission.grade is not null) > 0
      then least(100, greatest(0, round(avg(
        submission.grade * 100.0
        / case when coalesce(assignment.max_score, 0) = 0 then 100 else assignment.max_score end
      ) filter (where submission.grade is not null))))::integer
      else 0
    end as average_score
  from target_buckets as bucket
  left join target_courses as mapping on mapping.series_key = bucket.series_key
  left join all_assignments as assignment on assignment.course_id = mapping.course_id
  left join all_submissions as submission
    on submission.assignment_id = assignment.id
    and submission.submitted_at >= bucket.start_at
    and submission.submitted_at < bucket.end_at
  group by bucket.series_key, bucket.bucket_number
),
bucket_due_assignments as (
  select
    bucket.series_key,
    bucket.bucket_number,
    assignment.id as assignment_id,
    assignment.course_id
  from target_buckets as bucket
  join target_courses as mapping on mapping.series_key = bucket.series_key
  join all_assignments as assignment
    on assignment.course_id = mapping.course_id
    and assignment.due_date >= bucket.start_at
    and assignment.due_date < bucket.end_at
),
bucket_due_metrics as (
  select
    bucket.series_key,
    bucket.bucket_number,
    coalesce(sum((
      select count(*)
      from enrollments as enrollment
      where enrollment.course_id = due.course_id
    )), 0)::integer as expected_submissions,
    coalesce(sum((
      select count(distinct submission.student_id)
      from all_submissions as submission
      where submission.assignment_id = due.assignment_id
    )), 0)::integer as submitted_due
  from target_buckets as bucket
  left join bucket_due_assignments as due
    on due.series_key = bucket.series_key
    and due.bucket_number = bucket.bucket_number
  group by bucket.series_key, bucket.bucket_number
),
trend_points as (
  select
    bucket.series_key,
    bucket.bucket_number,
    jsonb_build_object(
      'week', 'Week ' || bucket.bucket_number,
      'engagement', case
        when students.student_count > 0
        then least(100, greatest(0, round(
          activity.active_students * 100.0 / students.student_count
        )))::integer
        else 0
      end,
      'submissions', case
        when due.expected_submissions > 0
        then least(100, greatest(0, round(
          due.submitted_due * 100.0 / due.expected_submissions
        )))::integer
        when students.student_count > 0
        then least(100, greatest(0, round(
          submission.submitters * 100.0 / students.student_count
        )))::integer
        else 0
      end,
      'averageScore', submission.average_score
    ) as point
  from target_buckets as bucket
  join target_student_counts as students on students.series_key = bucket.series_key
  join bucket_activity as activity
    on activity.series_key = bucket.series_key
    and activity.bucket_number = bucket.bucket_number
  join bucket_submissions as submission
    on submission.series_key = bucket.series_key
    and submission.bucket_number = bucket.bucket_number
  join bucket_due_metrics as due
    on due.series_key = bucket.series_key
    and due.bucket_number = bucket.bucket_number
),
trend_series as (
  select point.series_key, jsonb_agg(point.point order by point.bucket_number) as points
  from trend_points as point
  group by point.series_key
)
select jsonb_build_object(
  'courseMetrics', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', metric.id,
      'code', metric.code,
      'name', metric.name,
      'studentIds', metric.student_ids,
      'students', metric.students,
      'completion', metric.completion,
      'engagement', metric.engagement,
      'averageScore', metric.average_score,
      'submissionRate', metric.submission_rate,
      'pendingGrades', metric.pending_grades,
      'riskStudents', metric.risk_students,
      'forumPosts', metric.forum_posts,
      'dueAssignments', metric.due_assignments
    ) order by metric.code, metric.id)
    from course_metrics as metric
  ), '[]'::jsonb),
  'assignmentMetrics', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', metric.id,
      'courseId', metric.course_id,
      'title', metric.title,
      'course', metric.course,
      'submitted', metric.submitted,
      'total', metric.total,
      'average', metric.average,
      'ungraded', metric.ungraded
    ) order by metric.due_date desc, metric.id desc)
    from assignment_metrics as metric
  ), '[]'::jsonb),
  'riskStudents', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', risk.id,
      'courseId', risk.course_id,
      'name', risk.name,
      'course', risk.course,
      'risk', risk.risk,
      'reason', risk.reason,
      'score', risk.score
    ) order by case when risk.risk = 'High' then 0 else 1 end, risk.score, risk.name)
    from risk_students as risk
  ), '[]'::jsonb),
  'trendSeries', coalesce((
    select jsonb_object_agg(series.series_key, series.points)
    from trend_series as series
  ), '{}'::jsonb)
);
$function$;

revoke execute on function public.get_lecturer_analytics(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.get_lecturer_analytics(timestamptz, timestamptz)
  to authenticated, service_role;

COMMIT;
