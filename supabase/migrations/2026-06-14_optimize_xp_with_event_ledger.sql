-- Replace whole-school leaderboard refreshes with an incremental XP ledger.
-- Existing XP is backfilled once; future activity updates only one student.

DROP TRIGGER IF EXISTS refresh_progress_after_submission
  ON public.assignment_submissions;
DROP TRIGGER IF EXISTS refresh_progress_after_grade
  ON public.student_grades;
DROP TRIGGER IF EXISTS refresh_progress_after_attendance
  ON public.attendance;
DROP TRIGGER IF EXISTS refresh_progress_after_forum_thread
  ON public.forum_threads;
DROP TRIGGER IF EXISTS refresh_progress_after_forum_reply
  ON public.forum_replies;
DROP TRIGGER IF EXISTS refresh_progress_after_achievement
  ON public.user_achievements;
DROP TRIGGER IF EXISTS refresh_progress_after_profile
  ON public.user_profiles;

DO $$
DECLARE
  target_job_id BIGINT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_cron'
  ) THEN
    FOR target_job_id IN
      SELECT jobid
      FROM cron.job
      WHERE jobname = 'refresh-weekly-xp-leaderboard'
    LOOP
      PERFORM cron.unschedule(target_job_id);
    END LOOP;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.trigger_refresh_progress_leaderboard();
DROP FUNCTION IF EXISTS public.refresh_progress_leaderboard();

CREATE OR REPLACE FUNCTION public.malaysia_week_start(
  target_time TIMESTAMPTZ
)
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT DATE_TRUNC(
    'week',
    target_time AT TIME ZONE 'Asia/Kuala_Lumpur'
  )::DATE;
$$;

CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL
    REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (
    source_type IN (
      'assignment_submission',
      'forum_thread',
      'forum_reply',
      'attendance',
      'achievement'
    )
  ),
  source_id UUID NOT NULL,
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  earned_at TIMESTAMPTZ NOT NULL,
  week_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_type, source_id)
);

CREATE TABLE IF NOT EXISTS public.student_xp_summary (
  student_id UUID PRIMARY KEY
    REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.weekly_xp_summary (
  student_id UUID NOT NULL
    REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  weekly_xp INTEGER NOT NULL DEFAULT 0 CHECK (weekly_xp >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(student_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_xp_events_student_earned
  ON public.xp_events(student_id, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_xp_events_week_student
  ON public.xp_events(week_start_date, student_id);

CREATE INDEX IF NOT EXISTS idx_weekly_xp_ranking
  ON public.weekly_xp_summary(
    week_start_date,
    weekly_xp DESC,
    student_id
  )
  WHERE weekly_xp > 0;

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_xp_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_xp_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own XP events"
  ON public.xp_events;
CREATE POLICY "Students can view own XP events"
  ON public.xp_events FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can view XP summaries"
  ON public.student_xp_summary;
DROP POLICY IF EXISTS "Students can view own XP summary"
  ON public.student_xp_summary;
CREATE POLICY "Students can view own XP summary"
  ON public.student_xp_summary FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can view weekly XP summaries"
  ON public.weekly_xp_summary;
DROP POLICY IF EXISTS "Students can view own weekly XP summary"
  ON public.weekly_xp_summary;
CREATE POLICY "Students can view own weekly XP summary"
  ON public.weekly_xp_summary FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

GRANT SELECT ON public.xp_events TO authenticated;
GRANT SELECT ON public.student_xp_summary TO authenticated;
GRANT SELECT ON public.weekly_xp_summary TO authenticated;

-- Backfill all XP sources. ON CONFLICT keeps this migration repairable.
INSERT INTO public.xp_events (
  student_id,
  source_type,
  source_id,
  xp_amount,
  earned_at,
  week_start_date
)
SELECT
  submission.student_id,
  'assignment_submission',
  submission.id,
  100,
  submission.submitted_at,
  public.malaysia_week_start(submission.submitted_at)
FROM public.assignment_submissions submission
ON CONFLICT (source_type, source_id) DO UPDATE
SET
  student_id = EXCLUDED.student_id,
  xp_amount = EXCLUDED.xp_amount,
  earned_at = EXCLUDED.earned_at,
  week_start_date = EXCLUDED.week_start_date,
  updated_at = NOW();

INSERT INTO public.xp_events (
  student_id,
  source_type,
  source_id,
  xp_amount,
  earned_at,
  week_start_date
)
SELECT
  thread.author_id,
  'forum_thread',
  thread.id,
  20,
  thread.created_at,
  public.malaysia_week_start(thread.created_at)
FROM public.forum_threads thread
JOIN public.user_profiles profile
  ON profile.id = thread.author_id
  AND profile.role = 'student'
  AND COALESCE(profile.is_active, TRUE)
ON CONFLICT (source_type, source_id) DO UPDATE
SET
  student_id = EXCLUDED.student_id,
  xp_amount = EXCLUDED.xp_amount,
  earned_at = EXCLUDED.earned_at,
  week_start_date = EXCLUDED.week_start_date,
  updated_at = NOW();

INSERT INTO public.xp_events (
  student_id,
  source_type,
  source_id,
  xp_amount,
  earned_at,
  week_start_date
)
SELECT
  reply.author_id,
  'forum_reply',
  reply.id,
  20,
  reply.created_at,
  public.malaysia_week_start(reply.created_at)
FROM public.forum_replies reply
JOIN public.user_profiles profile
  ON profile.id = reply.author_id
  AND profile.role = 'student'
  AND COALESCE(profile.is_active, TRUE)
ON CONFLICT (source_type, source_id) DO UPDATE
SET
  student_id = EXCLUDED.student_id,
  xp_amount = EXCLUDED.xp_amount,
  earned_at = EXCLUDED.earned_at,
  week_start_date = EXCLUDED.week_start_date,
  updated_at = NOW();

INSERT INTO public.xp_events (
  student_id,
  source_type,
  source_id,
  xp_amount,
  earned_at,
  week_start_date
)
SELECT
  attendance.student_id,
  'attendance',
  attendance.id,
  25,
  attendance.class_date::TIMESTAMP
    AT TIME ZONE 'Asia/Kuala_Lumpur',
  DATE_TRUNC('week', attendance.class_date::TIMESTAMP)::DATE
FROM public.attendance attendance
WHERE attendance.marked_present
ON CONFLICT (source_type, source_id) DO UPDATE
SET
  student_id = EXCLUDED.student_id,
  xp_amount = EXCLUDED.xp_amount,
  earned_at = EXCLUDED.earned_at,
  week_start_date = EXCLUDED.week_start_date,
  updated_at = NOW();

INSERT INTO public.xp_events (
  student_id,
  source_type,
  source_id,
  xp_amount,
  earned_at,
  week_start_date
)
SELECT
  achievement.user_id,
  'achievement',
  achievement.id,
  achievement.xp_reward,
  achievement.earned_at,
  public.malaysia_week_start(achievement.earned_at)
FROM public.user_achievements achievement
WHERE achievement.xp_reward > 0
ON CONFLICT (source_type, source_id) DO UPDATE
SET
  student_id = EXCLUDED.student_id,
  xp_amount = EXCLUDED.xp_amount,
  earned_at = EXCLUDED.earned_at,
  week_start_date = EXCLUDED.week_start_date,
  updated_at = NOW();

DELETE FROM public.student_xp_summary;

INSERT INTO public.student_xp_summary (
  student_id,
  total_xp,
  level,
  updated_at
)
SELECT
  event.student_id,
  SUM(event.xp_amount)::INTEGER,
  FLOOR(SUM(event.xp_amount) / 500.0)::INTEGER + 1,
  NOW()
FROM public.xp_events event
GROUP BY event.student_id
ON CONFLICT (student_id) DO UPDATE
SET
  total_xp = EXCLUDED.total_xp,
  level = EXCLUDED.level,
  updated_at = NOW();

INSERT INTO public.student_xp_summary (
  student_id,
  total_xp,
  level,
  updated_at
)
SELECT
  profile.id,
  0,
  1,
  NOW()
FROM public.user_profiles profile
WHERE profile.role = 'student'
  AND COALESCE(profile.is_active, TRUE)
ON CONFLICT (student_id) DO NOTHING;

DELETE FROM public.weekly_xp_summary;

INSERT INTO public.weekly_xp_summary (
  student_id,
  week_start_date,
  weekly_xp,
  updated_at
)
SELECT
  event.student_id,
  event.week_start_date,
  SUM(event.xp_amount)::INTEGER,
  NOW()
FROM public.xp_events event
GROUP BY event.student_id, event.week_start_date;

CREATE OR REPLACE FUNCTION public.apply_xp_summary_delta(
  target_student_id UUID,
  target_week_start DATE,
  target_delta INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_student_id IS NULL
    OR target_week_start IS NULL
    OR target_delta = 0 THEN
    RETURN;
  END IF;

  IF target_delta > 0 THEN
    INSERT INTO public.student_xp_summary (
      student_id,
      total_xp,
      level,
      updated_at
    )
    VALUES (
      target_student_id,
      target_delta,
      FLOOR(target_delta / 500.0)::INTEGER + 1,
      NOW()
    )
    ON CONFLICT (student_id) DO UPDATE
    SET
      total_xp = public.student_xp_summary.total_xp + EXCLUDED.total_xp,
      level = FLOOR(
        (public.student_xp_summary.total_xp + EXCLUDED.total_xp) / 500.0
      )::INTEGER + 1,
      updated_at = NOW();

    INSERT INTO public.weekly_xp_summary (
      student_id,
      week_start_date,
      weekly_xp,
      updated_at
    )
    VALUES (
      target_student_id,
      target_week_start,
      target_delta,
      NOW()
    )
    ON CONFLICT (student_id, week_start_date) DO UPDATE
    SET
      weekly_xp =
        public.weekly_xp_summary.weekly_xp + EXCLUDED.weekly_xp,
      updated_at = NOW();
  ELSE
    UPDATE public.student_xp_summary
    SET
      total_xp = GREATEST(0, total_xp + target_delta),
      level = FLOOR(
        GREATEST(0, total_xp + target_delta) / 500.0
      )::INTEGER + 1,
      updated_at = NOW()
    WHERE student_id = target_student_id;

    UPDATE public.weekly_xp_summary
    SET
      weekly_xp = GREATEST(0, weekly_xp + target_delta),
      updated_at = NOW()
    WHERE student_id = target_student_id
      AND week_start_date = target_week_start;

    DELETE FROM public.weekly_xp_summary
    WHERE student_id = target_student_id
      AND week_start_date = target_week_start
      AND weekly_xp = 0;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_xp_event_to_summaries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.apply_xp_summary_delta(
      NEW.student_id,
      NEW.week_start_date,
      NEW.xp_amount
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.apply_xp_summary_delta(
      OLD.student_id,
      OLD.week_start_date,
      -OLD.xp_amount
    );
    RETURN OLD;
  END IF;

  IF OLD.student_id IS DISTINCT FROM NEW.student_id
    OR OLD.week_start_date IS DISTINCT FROM NEW.week_start_date
    OR OLD.xp_amount IS DISTINCT FROM NEW.xp_amount THEN
    PERFORM public.apply_xp_summary_delta(
      OLD.student_id,
      OLD.week_start_date,
      -OLD.xp_amount
    );
    PERFORM public.apply_xp_summary_delta(
      NEW.student_id,
      NEW.week_start_date,
      NEW.xp_amount
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_xp_summary_delta(UUID, DATE, INTEGER)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_xp_event_to_summaries()
  FROM PUBLIC;

DROP TRIGGER IF EXISTS apply_xp_event_summary
  ON public.xp_events;
CREATE TRIGGER apply_xp_event_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.xp_events
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_xp_event_to_summaries();

CREATE OR REPLACE FUNCTION public.sync_assignment_submission_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.xp_events
    WHERE source_type = 'assignment_submission'
      AND source_id = OLD.id;
    RETURN OLD;
  END IF;

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
    'assignment_submission',
    NEW.id,
    100,
    NEW.submitted_at,
    public.malaysia_week_start(NEW.submitted_at)
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

CREATE OR REPLACE FUNCTION public.sync_forum_thread_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.xp_events
    WHERE source_type = 'forum_thread'
      AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = NEW.author_id
      AND profile.role = 'student'
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    DELETE FROM public.xp_events
    WHERE source_type = 'forum_thread'
      AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.xp_events (
    student_id,
    source_type,
    source_id,
    xp_amount,
    earned_at,
    week_start_date
  )
  VALUES (
    NEW.author_id,
    'forum_thread',
    NEW.id,
    20,
    NEW.created_at,
    public.malaysia_week_start(NEW.created_at)
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

CREATE OR REPLACE FUNCTION public.sync_forum_reply_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.xp_events
    WHERE source_type = 'forum_reply'
      AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = NEW.author_id
      AND profile.role = 'student'
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    DELETE FROM public.xp_events
    WHERE source_type = 'forum_reply'
      AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.xp_events (
    student_id,
    source_type,
    source_id,
    xp_amount,
    earned_at,
    week_start_date
  )
  VALUES (
    NEW.author_id,
    'forum_reply',
    NEW.id,
    20,
    NEW.created_at,
    public.malaysia_week_start(NEW.created_at)
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

  IF NOT NEW.marked_present THEN
    DELETE FROM public.xp_events
    WHERE source_type = 'attendance'
      AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  target_earned_at :=
    NEW.class_date::TIMESTAMP AT TIME ZONE 'Asia/Kuala_Lumpur';

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

CREATE OR REPLACE FUNCTION public.sync_achievement_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.xp_events
    WHERE source_type = 'achievement'
      AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.xp_reward <= 0 THEN
    DELETE FROM public.xp_events
    WHERE source_type = 'achievement'
      AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.xp_events (
    student_id,
    source_type,
    source_id,
    xp_amount,
    earned_at,
    week_start_date
  )
  VALUES (
    NEW.user_id,
    'achievement',
    NEW.id,
    NEW.xp_reward,
    NEW.earned_at,
    public.malaysia_week_start(NEW.earned_at)
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

REVOKE ALL ON FUNCTION public.sync_assignment_submission_xp()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_forum_thread_xp()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_forum_reply_xp()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_attendance_xp()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_achievement_xp()
  FROM PUBLIC;

DROP TRIGGER IF EXISTS sync_xp_after_assignment_submission
  ON public.assignment_submissions;
CREATE TRIGGER sync_xp_after_assignment_submission
  AFTER INSERT OR DELETE OR UPDATE OF student_id, submitted_at
  ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_assignment_submission_xp();

DROP TRIGGER IF EXISTS sync_xp_after_forum_thread
  ON public.forum_threads;
CREATE TRIGGER sync_xp_after_forum_thread
  AFTER INSERT OR DELETE OR UPDATE OF author_id, created_at
  ON public.forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_forum_thread_xp();

DROP TRIGGER IF EXISTS sync_xp_after_forum_reply
  ON public.forum_replies;
CREATE TRIGGER sync_xp_after_forum_reply
  AFTER INSERT OR DELETE OR UPDATE OF author_id, created_at
  ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_forum_reply_xp();

DROP TRIGGER IF EXISTS sync_xp_after_attendance
  ON public.attendance;
CREATE TRIGGER sync_xp_after_attendance
  AFTER INSERT OR DELETE OR UPDATE OF student_id, class_date, marked_present
  ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_attendance_xp();

DROP TRIGGER IF EXISTS sync_xp_after_achievement
  ON public.user_achievements;
CREATE TRIGGER sync_xp_after_achievement
  AFTER INSERT OR DELETE OR UPDATE OF user_id, xp_reward, earned_at
  ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_achievement_xp();

CREATE OR REPLACE FUNCTION public.get_weekly_xp_leaderboard(
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  student_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  weekly_xp INTEGER,
  total_xp INTEGER,
  level INTEGER,
  rank BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH top_students AS (
    SELECT
      weekly.student_id,
      weekly.weekly_xp,
      summary.total_xp,
      summary.level
    FROM public.weekly_xp_summary weekly
    JOIN public.student_xp_summary summary
      ON summary.student_id = weekly.student_id
    JOIN public.user_profiles profile
      ON profile.id = weekly.student_id
    WHERE weekly.week_start_date = public.malaysia_week_start(NOW())
      AND weekly.weekly_xp > 0
      AND profile.role = 'student'
      AND COALESCE(profile.is_active, TRUE)
    ORDER BY weekly.weekly_xp DESC, weekly.student_id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  ),
  ranked_students AS (
    SELECT
      top_student.*,
      DENSE_RANK() OVER (
        ORDER BY top_student.weekly_xp DESC
      ) AS calculated_rank
    FROM top_students top_student
  )
  SELECT
    ranked.student_id,
    profile.full_name,
    profile.avatar_url,
    ranked.weekly_xp,
    ranked.total_xp,
    ranked.level,
    ranked.calculated_rank
  FROM ranked_students ranked
  JOIN public.user_profiles profile
    ON profile.id = ranked.student_id
  ORDER BY ranked.calculated_rank, ranked.student_id;
$$;

CREATE OR REPLACE FUNCTION public.get_my_xp_progress()
RETURNS TABLE (
  total_xp INTEGER,
  level INTEGER,
  weekly_xp INTEGER,
  weekly_rank BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH own_progress AS (
    SELECT
      COALESCE(summary.total_xp, 0)::INTEGER AS total_xp,
      COALESCE(summary.level, 1)::INTEGER AS level,
      COALESCE(weekly.weekly_xp, 0)::INTEGER AS weekly_xp
    FROM (SELECT auth.uid() AS student_id) viewer
    LEFT JOIN public.student_xp_summary summary
      ON summary.student_id = viewer.student_id
    LEFT JOIN public.weekly_xp_summary weekly
      ON weekly.student_id = viewer.student_id
      AND weekly.week_start_date = public.malaysia_week_start(NOW())
  )
  SELECT
    progress.total_xp,
    progress.level,
    progress.weekly_xp,
    CASE
      WHEN progress.weekly_xp <= 0 THEN NULL
      ELSE (
        SELECT COUNT(DISTINCT other.weekly_xp) + 1
        FROM public.weekly_xp_summary other
        JOIN public.user_profiles profile
          ON profile.id = other.student_id
        WHERE other.week_start_date = public.malaysia_week_start(NOW())
          AND other.weekly_xp > progress.weekly_xp
          AND profile.role = 'student'
          AND COALESCE(profile.is_active, TRUE)
      )
    END::BIGINT AS weekly_rank
  FROM own_progress progress;
$$;

REVOKE ALL ON FUNCTION public.get_weekly_xp_leaderboard(INTEGER)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_xp_progress()
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_weekly_xp_leaderboard(INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_xp_progress()
  TO authenticated;

NOTIFY pgrst, 'reload schema';
