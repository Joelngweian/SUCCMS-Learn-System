BEGIN;

SET LOCAL search_path = public, pg_catalog;

-- SECURITY DEFINER functions should not be directly callable by anonymous users.
DO $$
DECLARE
  fn REGPROCEDURE;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
  END LOOP;
END $$;

-- Trigger/internal helpers should only run through their owning triggers or
-- trusted database functions, not as direct client RPC calls.
REVOKE EXECUTE ON FUNCTION public.cleanup_study_group_after_unenrollment()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_user_notification(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  TEXT,
  UUID,
  TEXT,
  JSONB,
  TEXT,
  TEXT
) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_course_offering_name(UUID)
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notification_preference_enabled(UUID, TEXT)
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_new_report()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_assignment_created()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_assignment_submission()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_course_enrollment_created()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_course_instructor_created()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_course_material_created()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_course_post_created()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_forum_reaction()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_forum_reply()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_student_grade()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_study_group_session_created()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user_followed()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_course_material_descendants()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_user_account_status()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_assignment_submission_activity()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_course_material_activity()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_forum_thread_activity()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_user_achievement_activity()
  FROM anon, authenticated;

-- Keep user-facing RPCs available to signed-in users only.
GRANT EXECUTE ON FUNCTION public.check_in_attendance(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.correct_attendance_session_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_course_offering(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_study_group(UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_attendance_class(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_study_session_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.drop_course_offering(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignment_peer_benchmarks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_upcoming_study_sessions(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_xp_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_visibility(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_social_activity_feed(INTEGER, TIMESTAMPTZ, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_study_groups(
  INTEGER,
  TIMESTAMPTZ,
  UUID,
  UUID,
  TEXT,
  BOOLEAN
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_xp_leaderboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_study_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_study_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_study_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_study_session_attendance(UUID, BOOLEAN)
  TO authenticated;

-- Fix mutable search_path warnings without changing behavior.
ALTER FUNCTION public.expire_old_stories()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_profile_visibility(UUID)
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.malaysia_week_start(TIMESTAMPTZ)
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_report_severity()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_catalog;

-- Public buckets can still serve public URLs, but clients should not be able to
-- list every object in these buckets through broad SELECT policies.
DROP POLICY IF EXISTS "Announcement attachments are viewable"
  ON storage.objects;
DROP POLICY IF EXISTS "Campus advertisements are publicly viewable"
  ON storage.objects;
DROP POLICY IF EXISTS "Course content files are viewable"
  ON storage.objects;
DROP POLICY IF EXISTS "Public can view forum images"
  ON storage.objects;
DROP POLICY IF EXISTS "Public profile images are viewable"
  ON storage.objects;
DROP POLICY IF EXISTS "Story images are viewable"
  ON storage.objects;

-- social_activity_events is read through RPC, but the table still needs a
-- matching direct RLS policy so RLS is not enabled with an empty policy set.
GRANT SELECT ON public.social_activity_events TO authenticated;

DROP POLICY IF EXISTS "Users can view visible social activity events"
  ON public.social_activity_events;
CREATE POLICY "Users can view visible social activity events"
  ON public.social_activity_events
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles actor
      WHERE actor.id = social_activity_events.actor_id
        AND COALESCE(actor.is_active, TRUE)
        AND actor.role <> 'admin'
    )
    AND (
      social_activity_events.actor_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles viewer
        WHERE viewer.id = (SELECT auth.uid())
          AND viewer.role = 'admin'
      )
      OR (
        social_activity_events.course_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1
            FROM public.course_enrollments enrollment
            WHERE enrollment.course_id = social_activity_events.course_id
              AND enrollment.student_id = (SELECT auth.uid())
          )
          OR EXISTS (
            SELECT 1
            FROM public.course_instructors instructor
            WHERE instructor.course_id = social_activity_events.course_id
              AND instructor.user_id = (SELECT auth.uid())
          )
        )
      )
      OR (
        social_activity_events.event_type = 'discussion'
        AND social_activity_events.course_id IS NULL
      )
      OR (
        social_activity_events.event_type = 'achievement'
        AND EXISTS (
          SELECT 1
          FROM public.course_enrollments viewer_enrollment
          JOIN public.course_enrollments actor_enrollment
            ON actor_enrollment.course_id = viewer_enrollment.course_id
          WHERE viewer_enrollment.student_id = (SELECT auth.uid())
            AND actor_enrollment.student_id = social_activity_events.actor_id
        )
      )
    )
  );

-- Lightweight course catalog RPC for lecturer CourseManagement.
CREATE OR REPLACE FUNCTION public.get_course_catalog_summary()
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  course_code TEXT,
  chinese_name TEXT,
  faculty TEXT,
  programme TEXT,
  course_type TEXT,
  credits INTEGER,
  credit_hours INTEGER,
  status TEXT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  SELECT
    course.id,
    course.code,
    course.name,
    course.course_code,
    course.chinese_name,
    course.faculty,
    course.programme,
    course.course_type,
    course.credits,
    course.credit_hours,
    course.status
  FROM public.courses course
  WHERE COALESCE(course.status, 'active') <> 'archived'
  ORDER BY COALESCE(course.course_code, course.code), course.name;
$$;

REVOKE ALL ON FUNCTION public.get_course_catalog_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_course_catalog_summary()
  TO authenticated;

COMMIT;
