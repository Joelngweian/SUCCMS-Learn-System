BEGIN;

SET LOCAL search_path = public, pg_catalog;

-- Tighten direct client access to SECURITY DEFINER functions.
-- Triggers and function owners can still execute these internally; signed-in
-- users only get the small RPC/helper whitelist below.
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
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
  END LOOP;
END $$;

DO $$
DECLARE
  signature TEXT;
  fn REGPROCEDURE;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'approve_course_creation_request(uuid, text)',
    'can_view_forum_course(uuid)',
    'can_view_study_group(uuid, uuid)',
    'check_in_attendance(uuid, text)',
    'correct_attendance_session_date(uuid, date)',
    'course_material_parent_matches(uuid, uuid)',
    'create_course_offering(uuid, uuid)',
    'create_study_group(uuid, text, text, integer)',
    'delete_attendance_class(uuid)',
    'delete_user_account()',
    'dispatch_study_session_reminders()',
    'drop_course_offering(uuid)',
    'get_assignment_peer_benchmarks()',
    'get_my_upcoming_study_sessions(integer)',
    'get_my_xp_progress()',
    'get_profile_visibility(uuid)',
    'get_social_activity_feed(integer, timestamp with time zone, uuid)',
    'get_study_groups(integer, timestamp with time zone, uuid, uuid, text, boolean)',
    'get_weekly_xp_leaderboard(integer)',
    'is_admin(uuid)',
    'is_assignment_instructor(uuid)',
    'is_assignment_student(uuid, uuid)',
    'is_course_instructor(uuid)',
    'is_course_manager(uuid, uuid)',
    'is_course_member(uuid, uuid)',
    'is_study_group_member(uuid, uuid)',
    'is_study_group_owner(uuid, uuid)',
    'join_study_group(uuid)',
    'leave_study_group(uuid)',
    'reject_course_creation_request(uuid, text)',
    'remove_study_group_member(uuid, uuid)',
    'set_study_session_attendance(uuid, boolean)'
  ]
  LOOP
    fn := to_regprocedure('public.' || signature);
    IF fn IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_course_creation_requests_generated_course_id
  ON public.course_creation_requests (generated_course_id);

CREATE INDEX IF NOT EXISTS idx_course_creation_requests_reviewed_by
  ON public.course_creation_requests (reviewed_by);

-- The legacy advertisement feature has been replaced by announcements.
-- Keep existing files intact, but retire public delivery for the unused bucket.
UPDATE storage.buckets
SET public = false,
    updated_at = now()
WHERE id = 'campus-advertisements';

COMMIT;
