-- Build a lightweight, privacy-aware activity stream for the student dashboard.
-- Source records remain authoritative; this table only stores compact feed events.

CREATE TABLE IF NOT EXISTS public.social_activity_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.course_offerings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'assignment_submission',
      'course_material',
      'discussion',
      'achievement'
    )
  ),
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  title TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_table, source_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_social_activity_events_cursor
  ON public.social_activity_events(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_social_activity_events_course_cursor
  ON public.social_activity_events(course_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_social_activity_events_actor_cursor
  ON public.social_activity_events(actor_id, created_at DESC, id DESC);

ALTER TABLE public.social_activity_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.social_activity_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_assignment_submission_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignment_row public.assignments%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.social_activity_events
    WHERE source_table = 'assignment_submissions'
      AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  SELECT *
  INTO assignment_row
  FROM public.assignments
  WHERE id = NEW.assignment_id;

  IF assignment_row.id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.social_activity_events (
    actor_id,
    course_id,
    event_type,
    source_table,
    source_id,
    title,
    metadata,
    created_at
  )
  VALUES (
    NEW.student_id,
    assignment_row.course_id,
    'assignment_submission',
    'assignment_submissions',
    NEW.id,
    assignment_row.title,
    jsonb_build_object(
      'assignment_id', NEW.assignment_id,
      'is_late', COALESCE(NEW.is_late, FALSE)
    ),
    NEW.submitted_at
  )
  ON CONFLICT (source_table, source_id, event_type)
  DO UPDATE SET
    actor_id = EXCLUDED.actor_id,
    course_id = EXCLUDED.course_id,
    title = EXCLUDED.title,
    metadata = EXCLUDED.metadata;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_forum_thread_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.social_activity_events
    WHERE source_table = 'forum_threads'
      AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.social_activity_events (
    actor_id,
    course_id,
    event_type,
    source_table,
    source_id,
    title,
    metadata,
    created_at
  )
  VALUES (
    NEW.author_id,
    NEW.course_id,
    'discussion',
    'forum_threads',
    NEW.id,
    NEW.title,
    jsonb_build_object('category', NEW.category),
    NEW.created_at
  )
  ON CONFLICT (source_table, source_id, event_type)
  DO UPDATE SET
    actor_id = EXCLUDED.actor_id,
    course_id = EXCLUDED.course_id,
    title = EXCLUDED.title,
    metadata = EXCLUDED.metadata;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_course_material_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  material_actor UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.social_activity_events
    WHERE source_table = 'course_materials'
      AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  IF COALESCE(NEW.file_type, '') = 'folder' THEN
    DELETE FROM public.social_activity_events
    WHERE source_table = 'course_materials'
      AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  material_actor := COALESCE(NEW.created_by, NEW.uploaded_by);
  IF material_actor IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.social_activity_events (
    actor_id,
    course_id,
    event_type,
    source_table,
    source_id,
    title,
    metadata,
    created_at
  )
  VALUES (
    material_actor,
    NEW.course_id,
    'course_material',
    'course_materials',
    NEW.id,
    NEW.title,
    jsonb_build_object('file_type', NEW.file_type),
    NEW.uploaded_at
  )
  ON CONFLICT (source_table, source_id, event_type)
  DO UPDATE SET
    actor_id = EXCLUDED.actor_id,
    course_id = EXCLUDED.course_id,
    title = EXCLUDED.title,
    metadata = EXCLUDED.metadata;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_achievement_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.social_activity_events
    WHERE source_table = 'user_achievements'
      AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.social_activity_events (
    actor_id,
    course_id,
    event_type,
    source_table,
    source_id,
    title,
    metadata,
    created_at
  )
  VALUES (
    NEW.user_id,
    NULL,
    'achievement',
    'user_achievements',
    NEW.id,
    NEW.name,
    jsonb_build_object(
      'rarity', NEW.rarity,
      'xp_reward', NEW.xp_reward
    ),
    NEW.earned_at
  )
  ON CONFLICT (source_table, source_id, event_type)
  DO UPDATE SET
    actor_id = EXCLUDED.actor_id,
    title = EXCLUDED.title,
    metadata = EXCLUDED.metadata;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_assignment_submission_activity()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_forum_thread_activity()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_course_material_activity()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_user_achievement_activity()
  FROM PUBLIC;

DROP TRIGGER IF EXISTS sync_activity_after_assignment_submission
  ON public.assignment_submissions;
CREATE TRIGGER sync_activity_after_assignment_submission
  AFTER INSERT OR DELETE OR UPDATE OF
    assignment_id,
    student_id,
    submitted_at,
    is_late
  ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_assignment_submission_activity();

DROP TRIGGER IF EXISTS sync_activity_after_forum_thread
  ON public.forum_threads;
CREATE TRIGGER sync_activity_after_forum_thread
  AFTER INSERT OR DELETE OR UPDATE OF
    author_id,
    course_id,
    title,
    category
  ON public.forum_threads
  FOR EACH ROW EXECUTE FUNCTION public.sync_forum_thread_activity();

DROP TRIGGER IF EXISTS sync_activity_after_course_material
  ON public.course_materials;
CREATE TRIGGER sync_activity_after_course_material
  AFTER INSERT OR DELETE OR UPDATE OF
    course_id,
    title,
    file_type,
    created_by,
    uploaded_by
  ON public.course_materials
  FOR EACH ROW EXECUTE FUNCTION public.sync_course_material_activity();

DROP TRIGGER IF EXISTS sync_activity_after_user_achievement
  ON public.user_achievements;
CREATE TRIGGER sync_activity_after_user_achievement
  AFTER INSERT OR DELETE OR UPDATE OF
    user_id,
    name,
    rarity,
    xp_reward
  ON public.user_achievements
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_achievement_activity();

-- Backfill existing activity so the feed is useful immediately.
INSERT INTO public.social_activity_events (
  actor_id,
  course_id,
  event_type,
  source_table,
  source_id,
  title,
  metadata,
  created_at
)
SELECT
  submission.student_id,
  assignment.course_id,
  'assignment_submission',
  'assignment_submissions',
  submission.id,
  assignment.title,
  jsonb_build_object(
    'assignment_id', submission.assignment_id,
    'is_late', COALESCE(submission.is_late, FALSE)
  ),
  submission.submitted_at
FROM public.assignment_submissions submission
JOIN public.assignments assignment
  ON assignment.id = submission.assignment_id
ON CONFLICT (source_table, source_id, event_type) DO NOTHING;

INSERT INTO public.social_activity_events (
  actor_id,
  course_id,
  event_type,
  source_table,
  source_id,
  title,
  metadata,
  created_at
)
SELECT
  thread.author_id,
  thread.course_id,
  'discussion',
  'forum_threads',
  thread.id,
  thread.title,
  jsonb_build_object('category', thread.category),
  thread.created_at
FROM public.forum_threads thread
ON CONFLICT (source_table, source_id, event_type) DO NOTHING;

INSERT INTO public.social_activity_events (
  actor_id,
  course_id,
  event_type,
  source_table,
  source_id,
  title,
  metadata,
  created_at
)
SELECT
  COALESCE(material.created_by, material.uploaded_by),
  material.course_id,
  'course_material',
  'course_materials',
  material.id,
  material.title,
  jsonb_build_object('file_type', material.file_type),
  material.uploaded_at
FROM public.course_materials material
WHERE COALESCE(material.file_type, '') <> 'folder'
  AND COALESCE(material.created_by, material.uploaded_by) IS NOT NULL
ON CONFLICT (source_table, source_id, event_type) DO NOTHING;

INSERT INTO public.social_activity_events (
  actor_id,
  course_id,
  event_type,
  source_table,
  source_id,
  title,
  metadata,
  created_at
)
SELECT
  achievement.user_id,
  NULL,
  'achievement',
  'user_achievements',
  achievement.id,
  achievement.name,
  jsonb_build_object(
    'rarity', achievement.rarity,
    'xp_reward', achievement.xp_reward
  ),
  achievement.earned_at
FROM public.user_achievements achievement
ON CONFLICT (source_table, source_id, event_type) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_social_activity_feed(
  p_limit INTEGER DEFAULT 11,
  p_before_created_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  source_id UUID,
  title TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  actor_id UUID,
  actor_name TEXT,
  actor_avatar_url TEXT,
  actor_role TEXT,
  course_id UUID,
  course_code TEXT,
  course_name TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    event.id,
    event.event_type,
    event.source_id,
    event.title,
    event.metadata,
    event.created_at,
    actor.id,
    actor.full_name,
    actor.avatar_url,
    actor.role,
    event.course_id,
    COALESCE(course.course_code, course.code, offering.section_code),
    course.name
  FROM public.social_activity_events event
  JOIN public.user_profiles actor
    ON actor.id = event.actor_id
  LEFT JOIN public.course_offerings offering
    ON offering.id = event.course_id
  LEFT JOIN public.courses course
    ON course.id = offering.course_id
  WHERE auth.uid() IS NOT NULL
    AND COALESCE(actor.is_active, TRUE)
    AND actor.role <> 'admin'
    AND (
      event.actor_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles viewer
        WHERE viewer.id = auth.uid()
          AND viewer.role = 'admin'
      )
      OR (
        event.course_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1
            FROM public.course_enrollments enrollment
            WHERE enrollment.course_id = event.course_id
              AND enrollment.student_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.course_instructors instructor
            WHERE instructor.course_id = event.course_id
              AND instructor.user_id = auth.uid()
          )
        )
      )
      OR (
        event.event_type = 'discussion'
        AND event.course_id IS NULL
      )
      OR (
        event.event_type = 'achievement'
        AND EXISTS (
          SELECT 1
          FROM public.course_enrollments viewer_enrollment
          JOIN public.course_enrollments actor_enrollment
            ON actor_enrollment.course_id = viewer_enrollment.course_id
          WHERE viewer_enrollment.student_id = auth.uid()
            AND actor_enrollment.student_id = event.actor_id
        )
      )
    )
    AND (
      p_before_created_at IS NULL
      OR event.created_at < p_before_created_at
      OR (
        event.created_at = p_before_created_at
        AND p_before_id IS NOT NULL
        AND event.id < p_before_id
      )
    )
  ORDER BY event.created_at DESC, event.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 11), 1), 26);
$$;

REVOKE ALL ON FUNCTION public.get_social_activity_feed(
  INTEGER,
  TIMESTAMPTZ,
  UUID
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_social_activity_feed(
  INTEGER,
  TIMESTAMPTZ,
  UUID
) TO authenticated;
