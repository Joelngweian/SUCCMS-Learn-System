-- Persist My Progress achievements and notify users when a new badge is earned.
-- Run after 2026-06-06_create_user_notifications.sql.

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  achievement_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  xp_reward INTEGER NOT NULL DEFAULT 0,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_code)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_earned
  ON public.user_achievements(user_id, earned_at DESC);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.user_achievements TO authenticated;

CREATE OR REPLACE FUNCTION public.notification_preference_enabled(
  target_user_id UUID,
  preference_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enabled BOOLEAN;
BEGIN
  SELECT CASE preference_name
    WHEN 'forum_replies' THEN settings.forum_replies
    WHEN 'grade_updates' THEN settings.grade_updates
    WHEN 'assignment_reminders' THEN settings.assignment_reminders
    WHEN 'course_announcements' THEN settings.course_announcements
    WHEN 'achievement_alerts' THEN settings.achievement_alerts
    ELSE TRUE
  END
  INTO enabled
  FROM public.user_settings settings
  WHERE settings.user_id = target_user_id;

  RETURN COALESCE(enabled, TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.award_user_achievement(
  target_user_id UUID,
  target_code TEXT,
  target_name TEXT,
  target_description TEXT,
  target_rarity TEXT,
  target_xp_reward INTEGER,
  target_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  awarded_id UUID;
BEGIN
  IF target_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = target_user_id
      AND profile.role = 'student'
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.user_achievements (
    user_id,
    achievement_code,
    name,
    description,
    rarity,
    xp_reward,
    metadata
  )
  VALUES (
    target_user_id,
    target_code,
    target_name,
    target_description,
    target_rarity,
    target_xp_reward,
    COALESCE(target_metadata, '{}'::jsonb)
  )
  ON CONFLICT (user_id, achievement_code) DO NOTHING
  RETURNING id INTO awarded_id;

  IF awarded_id IS NULL THEN
    RETURN FALSE;
  END IF;

  PERFORM public.create_user_notification(
    target_user_id,
    NULL,
    'achievement_earned',
    'Achievement unlocked: ' || target_name,
    target_description || ' +' || target_xp_reward || ' XP',
    NULL,
    'achievement',
    awarded_id,
    '/progress',
    jsonb_build_object(
      'achievement_code', target_code,
      'rarity', target_rarity,
      'xp_reward', target_xp_reward
    ),
    'achievement:' || target_user_id || ':' || target_code,
    'achievement_alerts'
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_user_achievements(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submission_count INTEGER;
  discussion_count INTEGER;
  reply_count INTEGER;
  perfect_score_count INTEGER;
BEGIN
  IF target_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO submission_count
  FROM public.assignment_submissions submission
  WHERE submission.student_id = target_user_id;

  SELECT (
    (SELECT COUNT(*) FROM public.forum_threads thread WHERE thread.author_id = target_user_id)
    +
    (SELECT COUNT(*) FROM public.forum_replies reply WHERE reply.author_id = target_user_id)
  )::INTEGER
  INTO discussion_count;

  SELECT COUNT(*)::INTEGER
  INTO reply_count
  FROM public.forum_replies reply
  WHERE reply.author_id = target_user_id;

  WITH effective_grades AS (
    SELECT
      grade.assignment_id,
      grade.score::NUMERIC AS score,
      COALESCE(NULLIF(grade.max_score, 0), 100)::NUMERIC AS max_score
    FROM public.student_grades grade
    WHERE grade.student_id = target_user_id

    UNION ALL

    SELECT
      submission.assignment_id,
      submission.grade::NUMERIC,
      COALESCE(NULLIF(assignment.max_score, 0), 100)::NUMERIC
    FROM public.assignment_submissions submission
    JOIN public.assignments assignment ON assignment.id = submission.assignment_id
    WHERE submission.student_id = target_user_id
      AND submission.grade IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.student_grades grade
        WHERE grade.student_id = submission.student_id
          AND grade.assignment_id = submission.assignment_id
      )
  )
  SELECT COUNT(*)::INTEGER
  INTO perfect_score_count
  FROM effective_grades
  WHERE score >= max_score;

  IF submission_count >= 1 THEN
    PERFORM public.award_user_achievement(
      target_user_id,
      'first-steps',
      'First Steps',
      'Submit your first assignment',
      'common',
      50,
      jsonb_build_object('submission_count', submission_count)
    );
  END IF;

  IF submission_count >= 5 THEN
    PERFORM public.award_user_achievement(
      target_user_id,
      'assignment-momentum',
      'Assignment Momentum',
      'Submit 5 assignments',
      'rare',
      200,
      jsonb_build_object('submission_count', submission_count)
    );
  END IF;

  IF discussion_count >= 5 THEN
    PERFORM public.award_user_achievement(
      target_user_id,
      'discussion-master',
      'Discussion Master',
      'Create 5 discussions or replies',
      'epic',
      500,
      jsonb_build_object('discussion_count', discussion_count)
    );
  END IF;

  IF perfect_score_count >= 3 THEN
    PERFORM public.award_user_achievement(
      target_user_id,
      'perfect-score',
      'Perfect Score',
      'Score 100% on 3 graded assignments',
      'legendary',
      1000,
      jsonb_build_object('perfect_score_count', perfect_score_count)
    );
  END IF;

  IF reply_count >= 10 THEN
    PERFORM public.award_user_achievement(
      target_user_id,
      'mentor',
      'Mentor',
      'Contribute 10 replies in discussions',
      'epic',
      750,
      jsonb_build_object('reply_count', reply_count)
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_achievement_from_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF TG_TABLE_NAME IN ('assignment_submissions', 'student_grades') THEN
    target_user_id := NEW.student_id;
  ELSE
    target_user_id := NEW.author_id;
  END IF;

  PERFORM public.evaluate_user_achievements(target_user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evaluate_achievements_after_submission ON public.assignment_submissions;
CREATE TRIGGER evaluate_achievements_after_submission
  AFTER INSERT OR UPDATE OF grade ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.evaluate_achievement_from_activity();

DROP TRIGGER IF EXISTS evaluate_achievements_after_grade ON public.student_grades;
CREATE TRIGGER evaluate_achievements_after_grade
  AFTER INSERT OR UPDATE OF score, max_score ON public.student_grades
  FOR EACH ROW EXECUTE FUNCTION public.evaluate_achievement_from_activity();

DROP TRIGGER IF EXISTS evaluate_achievements_after_thread ON public.forum_threads;
CREATE TRIGGER evaluate_achievements_after_thread
  AFTER INSERT ON public.forum_threads
  FOR EACH ROW EXECUTE FUNCTION public.evaluate_achievement_from_activity();

DROP TRIGGER IF EXISTS evaluate_achievements_after_reply ON public.forum_replies;
CREATE TRIGGER evaluate_achievements_after_reply
  AFTER INSERT ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.evaluate_achievement_from_activity();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

-- Backfill existing achievements without sending historical notifications.
WITH ranked_submissions AS (
  SELECT
    student_id,
    COUNT(*)::INTEGER AS submission_count,
    MIN(submitted_at) AS first_submission_at,
    (ARRAY_AGG(submitted_at ORDER BY submitted_at))[5] AS fifth_submission_at
  FROM public.assignment_submissions
  GROUP BY student_id
)
INSERT INTO public.user_achievements (
  user_id, achievement_code, name, description, rarity, xp_reward, earned_at
)
SELECT
  ranked.student_id, 'first-steps', 'First Steps', 'Submit your first assignment',
  'common', 50, first_submission_at
FROM ranked_submissions ranked
JOIN public.user_profiles profile ON profile.id = ranked.student_id
WHERE submission_count >= 1
  AND profile.role = 'student'
ON CONFLICT (user_id, achievement_code) DO NOTHING;

WITH ranked_submissions AS (
  SELECT
    student_id,
    COUNT(*)::INTEGER AS submission_count,
    (ARRAY_AGG(submitted_at ORDER BY submitted_at))[5] AS fifth_submission_at
  FROM public.assignment_submissions
  GROUP BY student_id
)
INSERT INTO public.user_achievements (
  user_id, achievement_code, name, description, rarity, xp_reward, earned_at
)
SELECT
  ranked.student_id, 'assignment-momentum', 'Assignment Momentum', 'Submit 5 assignments',
  'rare', 200, fifth_submission_at
FROM ranked_submissions ranked
JOIN public.user_profiles profile ON profile.id = ranked.student_id
WHERE submission_count >= 5
  AND profile.role = 'student'
ON CONFLICT (user_id, achievement_code) DO NOTHING;

WITH discussion_events AS (
  SELECT author_id AS user_id, created_at FROM public.forum_threads
  UNION ALL
  SELECT author_id, created_at FROM public.forum_replies
),
ranked_discussions AS (
  SELECT
    user_id,
    COUNT(*)::INTEGER AS event_count,
    (ARRAY_AGG(created_at ORDER BY created_at))[5] AS fifth_event_at
  FROM discussion_events
  GROUP BY user_id
)
INSERT INTO public.user_achievements (
  user_id, achievement_code, name, description, rarity, xp_reward, earned_at
)
SELECT
  ranked.user_id, 'discussion-master', 'Discussion Master', 'Create 5 discussions or replies',
  'epic', 500, fifth_event_at
FROM ranked_discussions ranked
JOIN public.user_profiles profile ON profile.id = ranked.user_id
WHERE event_count >= 5
  AND profile.role = 'student'
ON CONFLICT (user_id, achievement_code) DO NOTHING;

WITH ranked_replies AS (
  SELECT
    author_id AS user_id,
    COUNT(*)::INTEGER AS reply_count,
    (ARRAY_AGG(created_at ORDER BY created_at))[10] AS tenth_reply_at
  FROM public.forum_replies
  GROUP BY author_id
)
INSERT INTO public.user_achievements (
  user_id, achievement_code, name, description, rarity, xp_reward, earned_at
)
SELECT
  ranked.user_id, 'mentor', 'Mentor', 'Contribute 10 replies in discussions',
  'epic', 750, tenth_reply_at
FROM ranked_replies ranked
JOIN public.user_profiles profile ON profile.id = ranked.user_id
WHERE reply_count >= 10
  AND profile.role = 'student'
ON CONFLICT (user_id, achievement_code) DO NOTHING;

WITH effective_grades AS (
  SELECT
    grade.student_id,
    grade.graded_at AS event_at,
    grade.score::NUMERIC AS score,
    COALESCE(NULLIF(grade.max_score, 0), 100)::NUMERIC AS max_score
  FROM public.student_grades grade

  UNION ALL

  SELECT
    submission.student_id,
    submission.submitted_at,
    submission.grade::NUMERIC,
    COALESCE(NULLIF(assignment.max_score, 0), 100)::NUMERIC
  FROM public.assignment_submissions submission
  JOIN public.assignments assignment ON assignment.id = submission.assignment_id
  WHERE submission.grade IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.student_grades grade
      WHERE grade.student_id = submission.student_id
        AND grade.assignment_id = submission.assignment_id
    )
),
ranked_perfect_scores AS (
  SELECT
    student_id,
    COUNT(*)::INTEGER AS perfect_count,
    (ARRAY_AGG(event_at ORDER BY event_at))[3] AS third_perfect_at
  FROM effective_grades
  WHERE score >= max_score
  GROUP BY student_id
)
INSERT INTO public.user_achievements (
  user_id, achievement_code, name, description, rarity, xp_reward, earned_at
)
SELECT
  ranked.student_id, 'perfect-score', 'Perfect Score', 'Score 100% on 3 graded assignments',
  'legendary', 1000, third_perfect_at
FROM ranked_perfect_scores ranked
JOIN public.user_profiles profile ON profile.id = ranked.student_id
WHERE perfect_count >= 3
  AND profile.role = 'student'
ON CONFLICT (user_id, achievement_code) DO NOTHING;

NOTIFY pgrst, 'reload schema';
