BEGIN;

SET LOCAL search_path = public, pg_catalog;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ---------------------------------------------------------------------------
-- Scalable campus presence: clients write a low-frequency heartbeat while all
-- readers consume one pre-computed summary row. No campus-wide Presence state
-- is copied to every browser.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen
  ON public.user_presence (last_seen_at DESC);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_presence FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_presence TO authenticated;

DROP POLICY IF EXISTS "Users can read own presence heartbeat"
  ON public.user_presence;
CREATE POLICY "Users can read own presence heartbeat"
  ON public.user_presence
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own presence heartbeat"
  ON public.user_presence;
CREATE POLICY "Users can create own presence heartbeat"
  ON public.user_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own presence heartbeat"
  ON public.user_presence;
CREATE POLICY "Users can update own presence heartbeat"
  ON public.user_presence
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own presence heartbeat"
  ON public.user_presence;
CREATE POLICY "Users can delete own presence heartbeat"
  ON public.user_presence
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.presence_summary_cache (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  online_count INTEGER NOT NULL DEFAULT 0 CHECK (online_count >= 0),
  sample_users JSONB NOT NULL DEFAULT '[]'::jsonb,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.presence_summary_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.presence_summary_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.presence_summary_cache TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can read presence summary"
  ON public.presence_summary_cache;
CREATE POLICY "Authenticated users can read presence summary"
  ON public.presence_summary_cache
  FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.presence_summary_cache (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION private.refresh_presence_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cutoff TIMESTAMPTZ := now() - interval '150 seconds';
BEGIN
  DELETE FROM public.user_presence
  WHERE last_seen_at < cutoff;

  UPDATE public.presence_summary_cache
  SET online_count = (
        SELECT count(*)::INTEGER
        FROM public.user_presence presence
        LEFT JOIN public.user_settings settings
          ON settings.user_id = presence.user_id
        WHERE presence.last_seen_at >= cutoff
          AND COALESCE(settings.show_online_status, true)
      ),
      sample_users = COALESCE((
        SELECT jsonb_agg(sample.user_payload ORDER BY sample.last_seen_at DESC)
        FROM (
          SELECT
            presence.last_seen_at,
            jsonb_build_object(
              'id', profile.id,
              'name', profile.full_name,
              'role', profile.role,
              'avatarUrl', profile.avatar_url,
              'onlineAt', presence.last_seen_at
            ) AS user_payload
          FROM public.user_presence presence
          JOIN public.user_profiles profile
            ON profile.id = presence.user_id
          LEFT JOIN public.user_settings settings
            ON settings.user_id = presence.user_id
          WHERE presence.last_seen_at >= cutoff
            AND COALESCE(settings.show_online_status, true)
            AND COALESCE(profile.is_active, true)
          ORDER BY presence.last_seen_at DESC
          LIMIT 4
        ) sample
      ), '[]'::jsonb),
      refreshed_at = now()
  WHERE singleton;
END;
$$;

REVOKE ALL ON FUNCTION private.refresh_presence_summary() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'refresh-presence-summary';
SELECT cron.schedule(
  'refresh-presence-summary',
  '* * * * *',
  'SELECT private.refresh_presence_summary();'
);
SELECT private.refresh_presence_summary();

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'dispatch-study-session-reminders';
SELECT cron.schedule(
  'dispatch-study-session-reminders',
  '*/5 * * * *',
  'SELECT public.dispatch_study_session_reminders();'
);

-- ---------------------------------------------------------------------------
-- Server-side shared cache. Only service-role Edge Functions can read/write
-- entries; authenticated browser clients have no direct table privileges.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shared_cache_entries (
  cache_key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_cache_entries_expires_at
  ON public.shared_cache_entries (expires_at);

ALTER TABLE public.shared_cache_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shared_cache_entries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_cache_entries
  TO service_role;

CREATE OR REPLACE FUNCTION private.invalidate_shared_read_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_TABLE_NAME IN ('courses', 'course_offerings', 'academic_terms') THEN
    DELETE FROM public.shared_cache_entries
    WHERE cache_key = 'active-course-offerings';
  ELSIF TG_TABLE_NAME = 'announcements' THEN
    DELETE FROM public.shared_cache_entries
    WHERE cache_key = 'active-announcements';
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.invalidate_shared_read_cache()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS invalidate_shared_cache_courses ON public.courses;
CREATE TRIGGER invalidate_shared_cache_courses
AFTER INSERT OR UPDATE OR DELETE ON public.courses
FOR EACH STATEMENT EXECUTE FUNCTION private.invalidate_shared_read_cache();

DROP TRIGGER IF EXISTS invalidate_shared_cache_course_offerings
  ON public.course_offerings;
CREATE TRIGGER invalidate_shared_cache_course_offerings
AFTER INSERT OR UPDATE OR DELETE ON public.course_offerings
FOR EACH STATEMENT EXECUTE FUNCTION private.invalidate_shared_read_cache();

DROP TRIGGER IF EXISTS invalidate_shared_cache_academic_terms
  ON public.academic_terms;
CREATE TRIGGER invalidate_shared_cache_academic_terms
AFTER INSERT OR UPDATE OR DELETE ON public.academic_terms
FOR EACH STATEMENT EXECUTE FUNCTION private.invalidate_shared_read_cache();

DROP TRIGGER IF EXISTS invalidate_shared_cache_announcements
  ON public.announcements;
CREATE TRIGGER invalidate_shared_cache_announcements
AFTER INSERT OR UPDATE OR DELETE ON public.announcements
FOR EACH STATEMENT EXECUTE FUNCTION private.invalidate_shared_read_cache();

-- ---------------------------------------------------------------------------
-- Private assignment storage. Paths are user/assignment/file so RLS can check
-- the uploader and the lecturer responsible for the assignment.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'assignment-submissions',
  'assignment-submissions',
  false,
  8388608,
  ARRAY[
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    updated_at = now();

DROP POLICY IF EXISTS "Students can upload own assignment submissions"
  ON storage.objects;
CREATE POLICY "Students can upload own assignment submissions"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assignment-submissions'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND public.is_assignment_student(
      ((storage.foldername(name))[2])::uuid,
      (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Students and lecturers can read assignment submissions"
  ON storage.objects;
CREATE POLICY "Students and lecturers can read assignment submissions"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'assignment-submissions'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.is_assignment_instructor(
        ((storage.foldername(name))[2])::uuid
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        WHERE profile.id = (SELECT auth.uid())
          AND profile.role = 'admin'
          AND COALESCE(profile.is_active, true)
      )
    )
  );

DROP POLICY IF EXISTS "Students can update own assignment submissions"
  ON storage.objects;
CREATE POLICY "Students can update own assignment submissions"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'assignment-submissions'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'assignment-submissions'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Students can delete own assignment submissions"
  ON storage.objects;
CREATE POLICY "Students can delete own assignment submissions"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'assignment-submissions'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- Scalable Realtime: database triggers publish private Broadcast messages to
-- narrowly scoped user/course/admin topics. Clients no longer subscribe to
-- RLS-heavy Postgres Changes publications.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.can_receive_realtime_topic(
  target_topic TEXT,
  target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  topic_id TEXT;
BEGIN
  IF target_user_id IS NULL OR target_topic IS NULL THEN
    RETURN false;
  END IF;

  IF target_topic LIKE 'user:%' THEN
    RETURN split_part(target_topic, ':', 2) = target_user_id::text;
  END IF;

  IF target_topic LIKE 'admin:%' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = target_user_id
        AND profile.role = 'admin'
        AND COALESCE(profile.is_active, true)
    );
  END IF;

  IF target_topic LIKE 'course:%' THEN
    topic_id := split_part(target_topic, ':', 2);
    RETURN EXISTS (
      SELECT 1
      FROM public.course_enrollments enrollment
      WHERE enrollment.course_id::text = topic_id
        AND enrollment.student_id = target_user_id
    ) OR EXISTS (
      SELECT 1
      FROM public.course_instructors instructor
      WHERE instructor.course_id::text = topic_id
        AND instructor.user_id = target_user_id
    ) OR EXISTS (
      SELECT 1
      FROM public.course_offerings offering
      WHERE offering.id::text = topic_id
        AND offering.owner_id = target_user_id
    ) OR EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = target_user_id
        AND profile.role = 'admin'
        AND COALESCE(profile.is_active, true)
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION private.can_receive_realtime_topic(TEXT, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_receive_realtime_topic(TEXT, UUID)
  TO authenticated;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users receive scoped broadcasts"
  ON realtime.messages;
CREATE POLICY "Authenticated users receive scoped broadcasts"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    extension = 'broadcast'
    AND private.can_receive_realtime_topic(
      (SELECT realtime.topic()),
      (SELECT auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION private.broadcast_succms_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  record_data JSONB;
  new_data JSONB;
  old_data JSONB;
  target_topic TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    record_data := old_data;
  ELSIF TG_OP = 'UPDATE' THEN
    new_data := to_jsonb(NEW);
    old_data := to_jsonb(OLD);
    record_data := new_data;
  ELSE
    new_data := to_jsonb(NEW);
    record_data := new_data;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'notifications' THEN
      target_topic := 'user:' || record_data->>'recipient_id' || ':notifications';
    WHEN 'user_achievements' THEN
      target_topic := 'user:' || record_data->>'user_id' || ':achievements';
    WHEN 'user_profiles' THEN
      target_topic := 'user:' || record_data->>'id' || ':account';
    WHEN 'course_enrollments' THEN
      target_topic := 'user:' || record_data->>'student_id' || ':enrollments';
    WHEN 'attendance' THEN
      target_topic := 'course:' || record_data->>'course_id' || ':attendance';
    WHEN 'course_posts' THEN
      target_topic := 'course:' || record_data->>'course_id' || ':posts';
    WHEN 'reports' THEN
      target_topic := 'admin:moderation';
    WHEN 'course_creation_requests' THEN
      target_topic := 'admin:course-requests';
    ELSE
      RETURN NULL;
  END CASE;

  IF target_topic IS NULL OR target_topic LIKE '%::%' THEN
    RETURN NULL;
  END IF;

  PERFORM realtime.send(
    jsonb_build_object(
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME,
      'type', TG_OP,
      'new', new_data,
      'old', old_data
    ),
    TG_OP,
    target_topic,
    true
  );
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Realtime is advisory. A delivery failure must never roll back the
    -- enrollment, profile update, attendance mark, or other primary write.
    RAISE WARNING 'SUCCMS Realtime broadcast failed for %.% (%): %',
      TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, SQLERRM;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.broadcast_succms_table_change()
  FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  target_table TEXT;
  trigger_name TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'notifications',
    'user_achievements',
    'user_profiles',
    'course_enrollments',
    'attendance',
    'course_posts',
    'reports',
    'course_creation_requests'
  ]
  LOOP
    trigger_name := 'broadcast_' || target_table || '_changes';
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON public.%I',
      trigger_name,
      target_table
    );
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION private.broadcast_succms_table_change()',
      trigger_name,
      target_table
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOR target_table IN
    SELECT tablename
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'attendance',
        'course_enrollments',
        'notifications',
        'reports',
        'user_achievements',
        'user_profiles'
      ])
  LOOP
    EXECUTE format(
      'ALTER PUBLICATION supabase_realtime DROP TABLE public.%I',
      target_table
    );
  END LOOP;
END;
$$;

-- Fix the remaining RLS initialization-plan warnings by evaluating auth.uid()
-- once per statement instead of once per row.
DROP POLICY IF EXISTS "Admins can update course creation requests"
  ON public.course_creation_requests;
CREATE POLICY "Admins can update course creation requests"
  ON public.course_creation_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role = 'admin'
        AND COALESCE(profile.is_active, true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role = 'admin'
        AND COALESCE(profile.is_active, true)
    )
  );

DROP POLICY IF EXISTS "Lecturers can create course creation requests"
  ON public.course_creation_requests;
CREATE POLICY "Lecturers can create course creation requests"
  ON public.course_creation_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = (SELECT auth.uid())
    AND status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role = 'lecturer'
        AND COALESCE(profile.is_active, true)
    )
  );

DROP POLICY IF EXISTS "Request owners and admins can view course creation requests"
  ON public.course_creation_requests;
CREATE POLICY "Request owners and admins can view course creation requests"
  ON public.course_creation_requests
  FOR SELECT
  TO authenticated
  USING (
    requested_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role = 'admin'
        AND COALESCE(profile.is_active, true)
    )
  );

-- This function is a scheduled maintenance task, not a browser RPC.
REVOKE EXECUTE ON FUNCTION public.dispatch_study_session_reminders()
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
