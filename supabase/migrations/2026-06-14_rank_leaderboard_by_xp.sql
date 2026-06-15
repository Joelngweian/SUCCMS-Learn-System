-- Rank the overall leaderboard by the same cumulative XP and level rules
-- shown on My Progress.

ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;

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
  attendance_summary AS (
    SELECT
      student_id,
      COUNT(*) FILTER (WHERE marked_present)::INTEGER AS attended_classes,
      CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE (
          COUNT(*) FILTER (WHERE marked_present)::NUMERIC
          / COUNT(*)::NUMERIC
        ) * 100
      END AS attendance_percentage
    FROM public.attendance
    GROUP BY student_id
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

DROP TRIGGER IF EXISTS refresh_progress_after_submission
  ON public.assignment_submissions;
CREATE TRIGGER refresh_progress_after_submission
  AFTER INSERT OR UPDATE OR DELETE ON public.assignment_submissions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_progress_leaderboard();

DROP TRIGGER IF EXISTS refresh_progress_after_grade
  ON public.student_grades;
CREATE TRIGGER refresh_progress_after_grade
  AFTER INSERT OR UPDATE OR DELETE ON public.student_grades
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_progress_leaderboard();

DROP TRIGGER IF EXISTS refresh_progress_after_attendance
  ON public.attendance;
CREATE TRIGGER refresh_progress_after_attendance
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_progress_leaderboard();

DROP TRIGGER IF EXISTS refresh_progress_after_forum_thread
  ON public.forum_threads;
CREATE TRIGGER refresh_progress_after_forum_thread
  AFTER INSERT OR UPDATE OR DELETE ON public.forum_threads
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_progress_leaderboard();

DROP TRIGGER IF EXISTS refresh_progress_after_forum_reply
  ON public.forum_replies;
CREATE TRIGGER refresh_progress_after_forum_reply
  AFTER INSERT OR UPDATE OR DELETE ON public.forum_replies
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_progress_leaderboard();

DROP TRIGGER IF EXISTS refresh_progress_after_achievement
  ON public.user_achievements;
CREATE TRIGGER refresh_progress_after_achievement
  AFTER INSERT OR UPDATE OR DELETE ON public.user_achievements
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_progress_leaderboard();

DROP TRIGGER IF EXISTS refresh_progress_after_profile
  ON public.user_profiles;
CREATE TRIGGER refresh_progress_after_profile
  AFTER INSERT OR DELETE OR UPDATE OF role, is_active ON public.user_profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_progress_leaderboard();

SELECT public.refresh_progress_leaderboard();

NOTIFY pgrst, 'reload schema';
