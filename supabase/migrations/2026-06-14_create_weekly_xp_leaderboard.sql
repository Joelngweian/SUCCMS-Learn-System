-- Keep total XP for long-term levels while ranking the leaderboard by XP
-- earned since Monday 00:00 in Asia/Kuala_Lumpur.

ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS weekly_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS week_start_date DATE;

CREATE OR REPLACE FUNCTION public.refresh_progress_leaderboard()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week_start TIMESTAMP;
  next_week_start TIMESTAMP;
BEGIN
  current_week_start :=
    DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Kuala_Lumpur');
  next_week_start := current_week_start + INTERVAL '7 days';

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
      COUNT(DISTINCT assignment_id)::INTEGER AS completed_assignments,
      (
        COUNT(DISTINCT assignment_id) FILTER (
          WHERE submitted_at >= current_week_start
            AT TIME ZONE 'Asia/Kuala_Lumpur'
            AND submitted_at < next_week_start
            AT TIME ZONE 'Asia/Kuala_Lumpur'
        ) * 100
      )::INTEGER AS weekly_submission_xp
    FROM public.assignment_submissions
    GROUP BY student_id
  ),
  discussion_activity AS (
    SELECT
      thread.author_id AS student_id,
      thread.created_at
    FROM public.forum_threads thread

    UNION ALL

    SELECT
      reply.author_id AS student_id,
      reply.created_at
    FROM public.forum_replies reply
  ),
  discussion_summary AS (
    SELECT
      student_id,
      COUNT(*)::INTEGER AS discussion_count,
      (
        COUNT(*) FILTER (
          WHERE created_at >= current_week_start
            AT TIME ZONE 'Asia/Kuala_Lumpur'
            AND created_at < next_week_start
            AT TIME ZONE 'Asia/Kuala_Lumpur'
        ) * 20
      )::INTEGER AS weekly_discussion_xp
    FROM discussion_activity
    GROUP BY student_id
  ),
  attendance_summary AS (
    SELECT
      student_id,
      COUNT(*) FILTER (WHERE marked_present)::INTEGER AS attended_classes,
      (
        COUNT(*) FILTER (
          WHERE marked_present
            AND class_date >= current_week_start::DATE
            AND class_date < next_week_start::DATE
        ) * 25
      )::INTEGER AS weekly_attendance_xp,
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
      COALESCE(SUM(achievement.xp_reward), 0)::INTEGER AS achievement_xp,
      COALESCE(
        SUM(achievement.xp_reward) FILTER (
          WHERE achievement.earned_at >= current_week_start
            AT TIME ZONE 'Asia/Kuala_Lumpur'
            AND achievement.earned_at < next_week_start
            AT TIME ZONE 'Asia/Kuala_Lumpur'
        ),
        0
      )::INTEGER AS weekly_achievement_xp
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
      )::INTEGER AS total_xp,
      (
        COALESCE(submissions.weekly_submission_xp, 0)
        + COALESCE(discussions.weekly_discussion_xp, 0)
        + COALESCE(attendance.weekly_attendance_xp, 0)
        + COALESCE(achievements.weekly_achievement_xp, 0)
      )::INTEGER AS weekly_xp
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
      weekly_xp,
      FLOOR(total_xp / 500.0)::INTEGER + 1 AS calculated_level
    FROM student_metrics
  ),
  ranked_metrics AS (
    SELECT
      *,
      CASE
        WHEN weekly_xp > 0 THEN
          DENSE_RANK() OVER (ORDER BY weekly_xp DESC)::INTEGER
        ELSE NULL
      END AS calculated_rank
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
    weekly_xp,
    week_start_date,
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
    weekly_xp,
    current_week_start::DATE,
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
    weekly_xp = EXCLUDED.weekly_xp,
    week_start_date = EXCLUDED.week_start_date,
    updated_at = NOW();
END;
$$;

SELECT public.refresh_progress_leaderboard();

-- Supabase Cron uses GMT in this project. Sunday 16:00 GMT is Monday
-- 00:00 in Asia/Kuala_Lumpur.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'refresh-weekly-xp-leaderboard';

SELECT cron.schedule(
  'refresh-weekly-xp-leaderboard',
  '0 16 * * 0',
  'SELECT public.refresh_progress_leaderboard();'
);

NOTIFY pgrst, 'reload schema';
