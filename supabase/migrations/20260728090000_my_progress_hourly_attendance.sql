-- My Progress should use hourly attendance slots:
-- credited slots / completed total slots.

DROP POLICY IF EXISTS "Students can view enrolled attendance sessions"
  ON public.attendance_sessions;

CREATE POLICY "Students can view enrolled attendance sessions"
  ON public.attendance_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_enrollments enrollment
      WHERE enrollment.course_id = attendance_sessions.course_id
        AND enrollment.student_id = (SELECT auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.refresh_progress_leaderboard()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.leaderboard leaderboard_row
  WHERE leaderboard_row.course_id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = leaderboard_row.student_id
        AND profile.role = 'student'
        AND COALESCE(profile.is_active, TRUE)
    );

  WITH grade_events AS (
    SELECT
      grade.student_id,
      (grade.score::NUMERIC / COALESCE(NULLIF(grade.max_score, 0), 100)) * 100
        AS percentage
    FROM public.student_grades grade

    UNION ALL

    SELECT
      submission.student_id,
      (
        submission.grade::NUMERIC
        / COALESCE(NULLIF(assignment.max_score, 0), 100)
      ) * 100 AS percentage
    FROM public.assignment_submissions submission
    JOIN public.assignments assignment
      ON assignment.id = submission.assignment_id
    WHERE submission.grade IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.student_grades grade
        WHERE grade.student_id = submission.student_id
          AND grade.assignment_id = submission.assignment_id
      )
  ),
  grade_summary AS (
    SELECT
      student_id,
      COALESCE(AVG(percentage), 0) AS average_score
    FROM grade_events
    GROUP BY student_id
  ),
  submission_summary AS (
    SELECT
      student_id,
      COUNT(DISTINCT assignment_id)::INTEGER AS completed_assignments
    FROM public.assignment_submissions
    GROUP BY student_id
  ),
  discussion_summary AS (
    SELECT
      activity.user_id AS student_id,
      COUNT(*)::INTEGER AS discussion_count
    FROM (
      SELECT thread.author_id AS user_id
      FROM public.forum_threads thread

      UNION ALL

      SELECT reply.author_id AS user_id
      FROM public.forum_replies reply
    ) activity
    GROUP BY activity.user_id
  ),
  completed_attendance_slots AS (
    SELECT
      enrollment.student_id,
      session_row.id AS session_id
    FROM public.course_enrollments enrollment
    JOIN public.attendance_sessions session_row
      ON session_row.course_id = enrollment.course_id
    WHERE session_row.status IN ('closed', 'completed')
  ),
  hourly_attendance_summary AS (
    SELECT
      slot.student_id,
      COUNT(*)::INTEGER AS total_slots,
      COUNT(attendance.id) FILTER (
        WHERE attendance.status IN ('present', 'late', 'excused')
      )::INTEGER AS credited_slots
    FROM completed_attendance_slots slot
    LEFT JOIN public.attendance attendance
      ON attendance.session_id = slot.session_id
      AND attendance.student_id = slot.student_id
    GROUP BY slot.student_id
  ),
  attendance_summary AS (
    SELECT
      hourly.student_id,
      hourly.credited_slots AS attended_classes,
      CASE
        WHEN hourly.total_slots = 0 THEN 0
        ELSE (hourly.credited_slots::NUMERIC / hourly.total_slots::NUMERIC) * 100
      END AS attendance_percentage
    FROM hourly_attendance_summary hourly
  ),
  achievement_summary AS (
    SELECT
      achievement.user_id AS student_id,
      COALESCE(SUM(achievement.xp_reward), 0)::INTEGER AS achievement_xp
    FROM public.user_achievements achievement
    GROUP BY achievement.user_id
  ),
  student_metrics AS (
    SELECT
      profile.id AS student_id,
      COALESCE(grades.average_score, 0) AS average_score,
      COALESCE(submissions.completed_assignments, 0) AS completed_assignments,
      COALESCE(attendance.attendance_percentage, 0) AS attendance_percentage,
      (
        COALESCE(submissions.completed_assignments, 0) * 100
        + COALESCE(discussions.discussion_count, 0) * 20
        + COALESCE(attendance.attended_classes, 0) * 25
        + COALESCE(achievements.achievement_xp, 0)
      )::INTEGER AS total_xp
    FROM public.user_profiles profile
    LEFT JOIN grade_summary grades
      ON grades.student_id = profile.id
    LEFT JOIN submission_summary submissions
      ON submissions.student_id = profile.id
    LEFT JOIN discussion_summary discussions
      ON discussions.student_id = profile.id
    LEFT JOIN attendance_summary attendance
      ON attendance.student_id = profile.id
    LEFT JOIN achievement_summary achievements
      ON achievements.student_id = profile.id
    WHERE profile.role = 'student'
      AND COALESCE(profile.is_active, TRUE)
  ),
  levelled_metrics AS (
    SELECT
      student_id,
      average_score,
      completed_assignments,
      attendance_percentage,
      total_xp,
      FLOOR(total_xp / 500.0)::INTEGER + 1 AS calculated_level
    FROM student_metrics
  ),
  ranked_metrics AS (
    SELECT
      *,
      DENSE_RANK() OVER (
        ORDER BY calculated_level DESC, total_xp DESC
      )::INTEGER AS calculated_rank
    FROM levelled_metrics
  )
  INSERT INTO public.leaderboard (
    student_id,
    course_id,
    average_score,
    rank,
    total_assignments_completed,
    attendance_percentage,
    total_xp,
    level,
    updated_at
  )
  SELECT
    student_id,
    NULL,
    ROUND(average_score, 2),
    calculated_rank,
    completed_assignments,
    ROUND(attendance_percentage, 2),
    total_xp,
    calculated_level,
    NOW()
  FROM ranked_metrics
  ON CONFLICT (student_id) DO UPDATE
  SET
    course_id = NULL,
    average_score = EXCLUDED.average_score,
    rank = EXCLUDED.rank,
    total_assignments_completed = EXCLUDED.total_assignments_completed,
    attendance_percentage = EXCLUDED.attendance_percentage,
    total_xp = EXCLUDED.total_xp,
    level = EXCLUDED.level,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_refresh_progress_leaderboard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_progress_leaderboard();
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_attendance_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_earned_at TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.xp_events
    WHERE source_type = 'attendance'
      AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  IF COALESCE(NULLIF(NEW.status, ''), 'absent') NOT IN ('present', 'late', 'excused') THEN
    DELETE FROM public.xp_events
    WHERE source_type = 'attendance'
      AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    NEW.check_in_at,
    NEW.marked_at,
    session_row.starts_at,
    NEW.class_date::TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur'
  )
  INTO target_earned_at
  FROM public.attendance_sessions session_row
  WHERE session_row.id = NEW.session_id;

  target_earned_at := COALESCE(
    target_earned_at,
    NEW.check_in_at,
    NEW.marked_at,
    NEW.class_date::TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur'
  );

  INSERT INTO public.xp_events (
    student_id,
    source_type,
    source_id,
    xp_amount,
    earned_at,
    week_start_date
  )
  VALUES (
    NEW.student_id,
    'attendance',
    NEW.id,
    25,
    target_earned_at,
    public.malaysia_week_start(target_earned_at)
  )
  ON CONFLICT (source_type, source_id) DO UPDATE
  SET
    student_id = EXCLUDED.student_id,
    xp_amount = EXCLUDED.xp_amount,
    earned_at = EXCLUDED.earned_at,
    week_start_date = EXCLUDED.week_start_date,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_attendance_xp()
  FROM PUBLIC;

DROP TRIGGER IF EXISTS refresh_progress_after_attendance
  ON public.attendance;
CREATE TRIGGER refresh_progress_after_attendance
  AFTER INSERT OR DELETE OR UPDATE OF student_id, course_id, class_date, session_id, status
  ON public.attendance
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_progress_leaderboard();

DROP TRIGGER IF EXISTS refresh_progress_after_attendance_session
  ON public.attendance_sessions;
DROP TRIGGER IF EXISTS refresh_progress_after_attendance_sessions
  ON public.attendance_sessions;
CREATE TRIGGER refresh_progress_after_attendance_sessions
  AFTER INSERT OR DELETE OR UPDATE OF course_id, status
  ON public.attendance_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_progress_leaderboard();

DROP TRIGGER IF EXISTS sync_xp_after_attendance
  ON public.attendance;
CREATE TRIGGER sync_xp_after_attendance
  AFTER INSERT OR DELETE OR UPDATE OF student_id, class_date, session_id, status, check_in_at, marked_at
  ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_attendance_xp();

DELETE FROM public.xp_events xp_event
USING public.attendance attendance
WHERE xp_event.source_type = 'attendance'
  AND xp_event.source_id = attendance.id
  AND COALESCE(NULLIF(attendance.status, ''), 'absent') NOT IN ('present', 'late', 'excused');

INSERT INTO public.xp_events (
  student_id,
  source_type,
  source_id,
  xp_amount,
  earned_at,
  week_start_date
)
SELECT
  attendance_event.student_id,
  'attendance',
  attendance_event.id,
  25,
  attendance_event.earned_at,
  public.malaysia_week_start(attendance_event.earned_at)
FROM (
  SELECT
    attendance.id,
    attendance.student_id,
    COALESCE(
      attendance.check_in_at,
      attendance.marked_at,
      session_row.starts_at,
      attendance.class_date::TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur'
    ) AS earned_at
  FROM public.attendance attendance
  LEFT JOIN public.attendance_sessions session_row
    ON session_row.id = attendance.session_id
  WHERE COALESCE(NULLIF(attendance.status, ''), 'absent') IN ('present', 'late', 'excused')
) attendance_event
ON CONFLICT (source_type, source_id) DO UPDATE
SET
  student_id = EXCLUDED.student_id,
  xp_amount = EXCLUDED.xp_amount,
  earned_at = EXCLUDED.earned_at,
  week_start_date = EXCLUDED.week_start_date,
  updated_at = NOW();

SELECT public.refresh_progress_leaderboard();

NOTIFY pgrst, 'reload schema';
