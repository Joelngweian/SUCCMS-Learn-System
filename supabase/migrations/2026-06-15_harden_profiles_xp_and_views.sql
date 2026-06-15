-- Harden profile authorization, internal XP functions, and summary views.
-- Also preserve signup usernames and allow duplicate display names.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE public.user_profiles AS profile
SET username = NULLIF(TRIM(auth_user.raw_user_meta_data->>'username'), '')
FROM auth.users AS auth_user
WHERE auth_user.id = profile.id
  AND profile.username IS NULL;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_full_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_lower_key
  ON public.user_profiles (LOWER(username))
  WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    username,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NEW.email
    ),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    'student'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_user_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
    AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Users cannot change their own account role.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_user_profile_role()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_user_profile_role_update
  ON public.user_profiles;
CREATE TRIGGER protect_user_profile_role_update
  BEFORE UPDATE OF role ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_profile_role();

DROP POLICY IF EXISTS "Allow unauthenticated users to lookup profiles for login"
  ON public.user_profiles;
DROP POLICY IF EXISTS "Allow service role to insert profiles"
  ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles"
  ON public.user_profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile"
  ON public.user_profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can update editable profile fields"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

REVOKE ALL PRIVILEGES ON TABLE public.user_profiles
  FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_profiles
  FROM authenticated;

GRANT SELECT ON TABLE public.user_profiles
  TO authenticated;
GRANT UPDATE (
  full_name,
  username,
  program_or_department,
  avatar_url,
  bio,
  cover_url,
  faculty,
  programme,
  last_login_at
) ON TABLE public.user_profiles
  TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.user_profiles
  TO service_role;

-- Internal XP and achievement functions are trigger implementation details.
-- They must not be callable through PostgREST by anonymous or signed-in users.
REVOKE ALL ON FUNCTION public.apply_xp_event_to_summaries()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_xp_summary_delta(UUID, DATE, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_user_achievement(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  JSONB
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_achievement_from_activity()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_user_achievements(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_achievement_xp()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_assignment_submission_xp()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_attendance_xp()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_forum_reply_xp()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_forum_thread_xp()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_user_achievement_activity()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_xp_event_to_summaries()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_xp_summary_delta(UUID, DATE, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.award_user_achievement(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  JSONB
) TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_achievement_from_activity()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_user_achievements(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_achievement_xp()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_assignment_submission_xp()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_attendance_xp()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_forum_reply_xp()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_forum_thread_xp()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_user_achievement_activity()
  TO service_role;

-- These are the two read-only XP RPCs used by the student progress page.
REVOKE ALL ON FUNCTION public.get_my_xp_progress()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_weekly_xp_leaderboard(INTEGER)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_xp_progress()
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_weekly_xp_leaderboard(INTEGER)
  TO authenticated, service_role;

ALTER VIEW public.active_stories_summary
  SET (security_invoker = TRUE);
ALTER VIEW public.student_course_summary
  SET (security_invoker = TRUE);
ALTER VIEW public.course_summary
  SET (security_invoker = TRUE);

REVOKE ALL PRIVILEGES ON TABLE public.active_stories_summary
  FROM PUBLIC, anon;
REVOKE ALL PRIVILEGES ON TABLE public.student_course_summary
  FROM PUBLIC, anon;
REVOKE ALL PRIVILEGES ON TABLE public.course_summary
  FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.active_stories_summary
  TO authenticated, service_role;
GRANT SELECT ON TABLE public.student_course_summary
  TO authenticated, service_role;
GRANT SELECT ON TABLE public.course_summary
  TO authenticated, service_role;
