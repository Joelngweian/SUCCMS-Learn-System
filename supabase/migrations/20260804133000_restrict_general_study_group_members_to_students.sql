BEGIN;

CREATE OR REPLACE FUNCTION public.get_study_group_member_candidates(
  p_group_id UUID,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  group_row public.study_groups%ROWTYPE;
  search_text TEXT := BTRIM(COALESCE(p_search, ''));
BEGIN
  IF NOT public.is_study_group_owner(p_group_id) THEN
    RAISE EXCEPTION 'Only the group owner can add members.';
  END IF;

  SELECT * INTO group_row
  FROM public.study_groups
  WHERE id = p_group_id;

  IF group_row.id IS NULL OR group_row.status <> 'active' THEN
    RAISE EXCEPTION 'This study group is not available.';
  END IF;

  RETURN QUERY
  SELECT
    profile.id,
    profile.full_name,
    profile.avatar_url,
    profile.role
  FROM public.user_profiles profile
  WHERE COALESCE(profile.is_active, TRUE)
    AND profile.role = 'student'
    AND (
      group_row.course_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.course_enrollments enrollment
        WHERE enrollment.course_id = group_row.course_id
          AND enrollment.student_id = profile.id
      )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.study_group_members member
      WHERE member.group_id = p_group_id
        AND member.user_id = profile.id
    )
    AND (
      search_text = ''
      OR profile.full_name ILIKE '%' || search_text || '%'
      OR COALESCE(profile.username, '') ILIKE '%' || search_text || '%'
    )
  ORDER BY profile.full_name
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 8), 1), 20);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_study_group_member(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_row public.study_groups%ROWTYPE;
  current_member_count INTEGER;
BEGIN
  SELECT * INTO group_row
  FROM public.study_groups
  WHERE id = p_group_id
  FOR UPDATE;

  IF group_row.id IS NULL OR group_row.status <> 'active' THEN
    RAISE EXCEPTION 'This study group is not available.';
  END IF;

  IF NOT public.is_study_group_owner(p_group_id) THEN
    RAISE EXCEPTION 'Only the group owner can add members.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = p_user_id
      AND COALESCE(profile.is_active, TRUE)
      AND profile.role = 'student'
  ) THEN
    RAISE EXCEPTION 'This student is not available.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.study_group_members member
    WHERE member.group_id = p_group_id
      AND member.user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  IF group_row.course_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.course_enrollments enrollment
    WHERE enrollment.course_id = group_row.course_id
      AND enrollment.student_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'This student must be enrolled in the course.';
  END IF;

  SELECT COUNT(*)::INTEGER INTO current_member_count
  FROM public.study_group_members
  WHERE group_id = p_group_id;

  IF current_member_count >= group_row.max_members THEN
    RAISE EXCEPTION 'This study group is full.';
  END IF;

  INSERT INTO public.study_group_members (group_id, user_id, role)
  VALUES (p_group_id, p_user_id, 'member');

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.get_study_group_member_candidates(UUID, TEXT, INTEGER)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_study_group_member(UUID, UUID)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_study_group_member_candidates(UUID, TEXT, INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_study_group_member(UUID, UUID)
  TO authenticated;

COMMIT;
