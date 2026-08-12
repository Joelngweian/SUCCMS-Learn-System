-- Supabase Realtime triggers are restored from the Supabase dump, but Azure
-- PostgreSQL does not provide the `realtime` schema/functions. SUCCMS now sends
-- live updates through the Azure Functions backend and Azure SignalR instead.

DO $$
DECLARE
  target_table text;
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
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON public.%I',
      'broadcast_' || target_table || '_changes',
      target_table
    );
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS broadcast_campus_posts_changes ON public.campus_posts CASCADE;
DROP TRIGGER IF EXISTS broadcast_ai_grading_job_status ON public.ai_grading_jobs CASCADE;

DROP FUNCTION IF EXISTS private.broadcast_succms_table_change();
DROP FUNCTION IF EXISTS private.broadcast_campus_post_change();
DROP FUNCTION IF EXISTS private.broadcast_ai_grading_job_status() CASCADE;
