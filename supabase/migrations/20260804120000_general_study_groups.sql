BEGIN;

ALTER TABLE public.study_groups
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.study_group_sessions
  DROP CONSTRAINT IF EXISTS study_group_sessions_location_valid;

ALTER TABLE public.study_group_sessions
  ADD CONSTRAINT study_group_sessions_location_valid CHECK (
    location_type = 'online'
    OR (
      location_type = 'in_person'
      AND LENGTH(BTRIM(COALESCE(location_text, ''))) > 0
    )
  );

CREATE OR REPLACE FUNCTION public.create_study_group(
  p_course_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT '',
  p_max_members INTEGER DEFAULT 12
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_group_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'student'
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    RAISE EXCEPTION 'Only active student accounts can create study groups.';
  END IF;

  IF p_course_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.course_enrollments enrollment
    WHERE enrollment.course_id = p_course_id
      AND enrollment.student_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You must be enrolled in this course.';
  END IF;

  INSERT INTO public.study_groups (
    course_id,
    name,
    description,
    created_by,
    max_members
  )
  VALUES (
    p_course_id,
    BTRIM(p_name),
    BTRIM(COALESCE(p_description, '')),
    auth.uid(),
    LEAST(GREATEST(COALESCE(p_max_members, 12), 2), 100)
  )
  RETURNING id INTO created_group_id;

  INSERT INTO public.study_group_members (group_id, user_id, role)
  VALUES (created_group_id, auth.uid(), 'owner');

  RETURN created_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_study_group(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_row public.study_groups%ROWTYPE;
  current_member_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = auth.uid()
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    RAISE EXCEPTION 'Only active accounts can join study groups.';
  END IF;

  SELECT * INTO group_row
  FROM public.study_groups
  WHERE id = p_group_id
  FOR UPDATE;

  IF group_row.id IS NULL OR group_row.status <> 'active' THEN
    RAISE EXCEPTION 'This study group is not available.';
  END IF;

  IF group_row.course_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.course_enrollments enrollment
    WHERE enrollment.course_id = group_row.course_id
      AND enrollment.student_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You must be enrolled in this course.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.study_group_members member
    WHERE member.group_id = p_group_id
      AND member.user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(*)::INTEGER INTO current_member_count
  FROM public.study_group_members
  WHERE group_id = p_group_id;

  IF current_member_count >= group_row.max_members THEN
    RAISE EXCEPTION 'This study group is full.';
  END IF;

  INSERT INTO public.study_group_members (group_id, user_id)
  VALUES (p_group_id, auth.uid());

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_study_group(
  target_group_id UUID,
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.study_groups study_group
    WHERE study_group.id = target_group_id
      AND study_group.status = 'active'
      AND study_group.course_id IS NULL
      AND target_user_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        WHERE profile.id = target_user_id
          AND COALESCE(profile.is_active, TRUE)
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.study_groups study_group
    JOIN public.course_enrollments enrollment
      ON enrollment.course_id = study_group.course_id
    WHERE study_group.id = target_group_id
      AND enrollment.student_id = target_user_id
  )
  OR public.is_study_group_member(target_group_id, target_user_id);
$$;

DROP FUNCTION IF EXISTS public.get_study_groups(
  INTEGER,
  TIMESTAMPTZ,
  UUID,
  UUID,
  TEXT,
  BOOLEAN
);

CREATE FUNCTION public.get_study_groups(
  p_limit INTEGER DEFAULT 13,
  p_before_created_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_joined_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  course_id UUID,
  name TEXT,
  description TEXT,
  max_members INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ,
  creator_id UUID,
  creator_name TEXT,
  creator_avatar_url TEXT,
  course_code TEXT,
  course_name TEXT,
  member_count INTEGER,
  is_member BOOLEAN,
  is_owner BOOLEAN,
  next_session_start TIMESTAMPTZ,
  next_session_title TEXT,
  has_online_session BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    study_group.id,
    study_group.course_id,
    study_group.name,
    study_group.description,
    study_group.max_members,
    study_group.status,
    study_group.created_at,
    creator.id,
    creator.full_name,
    creator.avatar_url,
    COALESCE(course.course_code, course.code, offering.section_code, 'General'),
    COALESCE(course.name, 'Open to everyone'),
    (
      SELECT COUNT(*)::INTEGER
      FROM public.study_group_members member_count
      WHERE member_count.group_id = study_group.id
    ),
    public.is_study_group_member(study_group.id),
    public.is_study_group_owner(study_group.id),
    CASE
      WHEN public.is_study_group_member(study_group.id)
      THEN next_session.starts_at
      ELSE NULL
    END,
    CASE
      WHEN public.is_study_group_member(study_group.id)
      THEN next_session.title
      ELSE NULL
    END,
    EXISTS (
      SELECT 1
      FROM public.study_group_sessions online_session
      WHERE online_session.group_id = study_group.id
        AND online_session.location_type = 'online'
        AND online_session.ends_at >= NOW()
    )
  FROM public.study_groups study_group
  JOIN public.user_profiles creator
    ON creator.id = study_group.created_by
  LEFT JOIN public.course_offerings offering
    ON offering.id = study_group.course_id
  LEFT JOIN public.courses course
    ON course.id = offering.course_id
  LEFT JOIN LATERAL (
    SELECT session.starts_at, session.title
    FROM public.study_group_sessions session
    WHERE session.group_id = study_group.id
      AND session.ends_at >= NOW()
    ORDER BY session.starts_at
    LIMIT 1
  ) next_session ON TRUE
  WHERE study_group.status = 'active'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles viewer
      WHERE viewer.id = auth.uid()
        AND COALESCE(viewer.is_active, TRUE)
    )
    AND (
      study_group.course_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.course_enrollments enrollment
        WHERE enrollment.course_id = study_group.course_id
          AND enrollment.student_id = auth.uid()
      )
    )
    AND (p_course_id IS NULL OR study_group.course_id = p_course_id)
    AND (
      NULLIF(BTRIM(COALESCE(p_search, '')), '') IS NULL
      OR study_group.name ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(course.name, 'General') ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(course.course_code, course.code, offering.section_code, 'General') ILIKE
        '%' || BTRIM(p_search) || '%'
    )
    AND (
      NOT COALESCE(p_joined_only, FALSE)
      OR public.is_study_group_member(study_group.id)
    )
    AND (
      p_before_created_at IS NULL
      OR study_group.created_at < p_before_created_at
      OR (
        study_group.created_at = p_before_created_at
        AND p_before_id IS NOT NULL
        AND study_group.id < p_before_id
      )
    )
  ORDER BY study_group.created_at DESC, study_group.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 13), 1), 31);
$$;

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
  ) THEN
    RAISE EXCEPTION 'This user is not available.';
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

CREATE OR REPLACE FUNCTION public.get_my_upcoming_study_sessions(
  p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  group_id UUID,
  group_name TEXT,
  course_code TEXT,
  title TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  location_type TEXT,
  location_text TEXT,
  meeting_url TEXT,
  attendee_count INTEGER,
  is_going BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    session.id,
    study_group.id,
    study_group.name,
    COALESCE(course.course_code, course.code, offering.section_code, 'General'),
    session.title,
    session.starts_at,
    session.ends_at,
    session.location_type,
    session.location_text,
    session.meeting_url,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.study_group_session_attendees attendee
      WHERE attendee.session_id = session.id
        AND attendee.status = 'going'
    ),
    EXISTS (
      SELECT 1
      FROM public.study_group_session_attendees own_response
      WHERE own_response.session_id = session.id
        AND own_response.user_id = auth.uid()
        AND own_response.status = 'going'
    )
  FROM public.study_group_sessions session
  JOIN public.study_groups study_group
    ON study_group.id = session.group_id
  JOIN public.study_group_members member
    ON member.group_id = study_group.id
   AND member.user_id = auth.uid()
  LEFT JOIN public.course_offerings offering
    ON offering.id = study_group.course_id
  LEFT JOIN public.courses course
    ON course.id = offering.course_id
  WHERE session.ends_at >= NOW()
  ORDER BY session.starts_at
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 3), 1), 10);
$$;

REVOKE ALL ON FUNCTION public.create_study_group(
  UUID,
  TEXT,
  TEXT,
  INTEGER
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_study_group(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_study_group(UUID, UUID)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_study_groups(
  INTEGER,
  TIMESTAMPTZ,
  UUID,
  UUID,
  TEXT,
  BOOLEAN
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_study_group_member_candidates(
  UUID,
  TEXT,
  INTEGER
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_study_group_member(UUID, UUID)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_upcoming_study_sessions(INTEGER)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_study_group(
  UUID,
  TEXT,
  TEXT,
  INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_study_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_study_group(UUID, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_study_groups(
  INTEGER,
  TIMESTAMPTZ,
  UUID,
  UUID,
  TEXT,
  BOOLEAN
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_study_group_member_candidates(
  UUID,
  TEXT,
  INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_study_group_member(UUID, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_upcoming_study_sessions(INTEGER)
  TO authenticated;

COMMIT;
