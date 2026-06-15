-- Course-scoped student study groups, sessions, resources and notifications.

CREATE TABLE IF NOT EXISTS public.study_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  max_members INTEGER NOT NULL DEFAULT 12 CHECK (max_members BETWEEN 2 AND 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT study_groups_name_not_blank CHECK (LENGTH(BTRIM(name)) > 0)
);

CREATE TABLE IF NOT EXISTS public.study_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_group_single_owner
  ON public.study_group_members(group_id)
  WHERE role = 'owner';

CREATE TABLE IF NOT EXISTS public.study_group_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('online', 'in_person')),
  location_text TEXT,
  meeting_url TEXT,
  max_attendees INTEGER CHECK (max_attendees IS NULL OR max_attendees BETWEEN 2 AND 100),
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT study_group_sessions_title_not_blank
    CHECK (LENGTH(BTRIM(title)) > 0),
  CONSTRAINT study_group_sessions_time_valid CHECK (ends_at > starts_at),
  CONSTRAINT study_group_sessions_location_valid CHECK (
    (
      location_type = 'online'
      AND LENGTH(BTRIM(COALESCE(meeting_url, ''))) > 0
    )
    OR
    (
      location_type = 'in_person'
      AND LENGTH(BTRIM(COALESCE(location_text, ''))) > 0
    )
  )
);

CREATE TABLE IF NOT EXISTS public.study_group_session_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.study_group_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'not_going')),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.study_group_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL DEFAULT 'discussion'
    CHECK (post_type IN ('discussion', 'resource')),
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  resource_url TEXT,
  attachment_name TEXT,
  attachment_path TEXT,
  attachment_type TEXT,
  attachment_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT study_group_posts_has_content CHECK (
    LENGTH(BTRIM(content)) > 0
    OR LENGTH(BTRIM(COALESCE(title, ''))) > 0
    OR resource_url IS NOT NULL
    OR attachment_path IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_study_groups_course_cursor
  ON public.study_groups(course_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_study_group_members_user
  ON public.study_group_members(user_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_group_sessions_group_start
  ON public.study_group_sessions(group_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_study_group_sessions_reminders
  ON public.study_group_sessions(starts_at)
  WHERE reminder_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_study_group_posts_group_created
  ON public.study_group_posts(group_id, created_at DESC);

DROP TRIGGER IF EXISTS update_study_groups_updated_at ON public.study_groups;
CREATE TRIGGER update_study_groups_updated_at
  BEFORE UPDATE ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_study_group_sessions_updated_at
  ON public.study_group_sessions;
CREATE TRIGGER update_study_group_sessions_updated_at
  BEFORE UPDATE ON public.study_group_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_study_group_posts_updated_at
  ON public.study_group_posts;
CREATE TRIGGER update_study_group_posts_updated_at
  BEFORE UPDATE ON public.study_group_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_study_group_member(
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
    FROM public.study_group_members member
    WHERE member.group_id = target_group_id
      AND member.user_id = target_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_study_group_owner(
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
    FROM public.study_group_members member
    WHERE member.group_id = target_group_id
      AND member.user_id = target_user_id
      AND member.role = 'owner'
  );
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
    JOIN public.course_enrollments enrollment
      ON enrollment.course_id = study_group.course_id
    WHERE study_group.id = target_group_id
      AND enrollment.student_id = target_user_id
  )
  OR public.is_study_group_member(target_group_id, target_user_id);
$$;

REVOKE ALL ON FUNCTION public.is_study_group_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_study_group_owner(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_study_group(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_study_group_member(UUID, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_study_group_owner(UUID, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_study_group(UUID, UUID)
  TO authenticated;

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_session_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view course study groups"
  ON public.study_groups;
CREATE POLICY "Students can view course study groups"
  ON public.study_groups FOR SELECT
  TO authenticated
  USING (public.can_view_study_group(id));

DROP POLICY IF EXISTS "Owners can update study groups"
  ON public.study_groups;
CREATE POLICY "Owners can update study groups"
  ON public.study_groups FOR UPDATE
  TO authenticated
  USING (public.is_study_group_owner(id))
  WITH CHECK (public.is_study_group_owner(id));

DROP POLICY IF EXISTS "Owners can delete study groups"
  ON public.study_groups;
CREATE POLICY "Owners can delete study groups"
  ON public.study_groups FOR DELETE
  TO authenticated
  USING (public.is_study_group_owner(id));

DROP POLICY IF EXISTS "Students can view visible group members"
  ON public.study_group_members;
CREATE POLICY "Students can view visible group members"
  ON public.study_group_members FOR SELECT
  TO authenticated
  USING (public.can_view_study_group(group_id));

DROP POLICY IF EXISTS "Members can view group sessions"
  ON public.study_group_sessions;
CREATE POLICY "Members can view group sessions"
  ON public.study_group_sessions FOR SELECT
  TO authenticated
  USING (public.is_study_group_member(group_id));

DROP POLICY IF EXISTS "Owners can create group sessions"
  ON public.study_group_sessions;
CREATE POLICY "Owners can create group sessions"
  ON public.study_group_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_study_group_owner(group_id)
  );

DROP POLICY IF EXISTS "Owners can update group sessions"
  ON public.study_group_sessions;
CREATE POLICY "Owners can update group sessions"
  ON public.study_group_sessions FOR UPDATE
  TO authenticated
  USING (public.is_study_group_owner(group_id))
  WITH CHECK (public.is_study_group_owner(group_id));

DROP POLICY IF EXISTS "Owners can delete group sessions"
  ON public.study_group_sessions;
CREATE POLICY "Owners can delete group sessions"
  ON public.study_group_sessions FOR DELETE
  TO authenticated
  USING (public.is_study_group_owner(group_id));

DROP POLICY IF EXISTS "Members can view session responses"
  ON public.study_group_session_attendees;
CREATE POLICY "Members can view session responses"
  ON public.study_group_session_attendees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.study_group_sessions session
      WHERE session.id = session_id
        AND public.is_study_group_member(session.group_id)
    )
  );

DROP POLICY IF EXISTS "Members can respond to sessions"
  ON public.study_group_session_attendees;
CREATE POLICY "Members can respond to sessions"
  ON public.study_group_session_attendees FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.study_group_sessions session
      WHERE session.id = session_id
        AND public.is_study_group_member(session.group_id)
    )
  );

DROP POLICY IF EXISTS "Members can update own session response"
  ON public.study_group_session_attendees;
CREATE POLICY "Members can update own session response"
  ON public.study_group_session_attendees FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.study_group_sessions session
      WHERE session.id = session_id
        AND public.is_study_group_member(session.group_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.study_group_sessions session
      WHERE session.id = session_id
        AND public.is_study_group_member(session.group_id)
    )
  );

DROP POLICY IF EXISTS "Members can remove own session response"
  ON public.study_group_session_attendees;
CREATE POLICY "Members can remove own session response"
  ON public.study_group_session_attendees FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.study_group_sessions session
      WHERE session.id = session_id
        AND public.is_study_group_member(session.group_id)
    )
  );

DROP POLICY IF EXISTS "Members can view group posts"
  ON public.study_group_posts;
CREATE POLICY "Members can view group posts"
  ON public.study_group_posts FOR SELECT
  TO authenticated
  USING (public.is_study_group_member(group_id));

DROP POLICY IF EXISTS "Members can create group posts"
  ON public.study_group_posts;
CREATE POLICY "Members can create group posts"
  ON public.study_group_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_study_group_member(group_id)
  );

DROP POLICY IF EXISTS "Authors can update group posts"
  ON public.study_group_posts;
CREATE POLICY "Authors can update group posts"
  ON public.study_group_posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors or owners can delete group posts"
  ON public.study_group_posts;
CREATE POLICY "Authors or owners can delete group posts"
  ON public.study_group_posts FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR public.is_study_group_owner(group_id)
  );

GRANT SELECT, UPDATE, DELETE ON public.study_groups TO authenticated;
GRANT SELECT ON public.study_group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.study_group_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.study_group_session_attendees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.study_group_posts TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('study-group-files', 'study-group-files', FALSE, 20971520)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Study group members can read files"
  ON storage.objects;
CREATE POLICY "Study group members can read files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'study-group-files'
    AND public.is_study_group_member(
      ((storage.foldername(name))[1])::UUID
    )
  );

DROP POLICY IF EXISTS "Study group members can upload files"
  ON storage.objects;
CREATE POLICY "Study group members can upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'study-group-files'
    AND public.is_study_group_member(
      ((storage.foldername(name))[1])::UUID
    )
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Study group uploaders or owners can delete files"
  ON storage.objects;
CREATE POLICY "Study group uploaders or owners can delete files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'study-group-files'
    AND (
      (storage.foldername(name))[2] = auth.uid()::TEXT
      OR public.is_study_group_owner(
        ((storage.foldername(name))[1])::UUID
      )
    )
  );

CREATE OR REPLACE FUNCTION public.cleanup_study_group_after_unenrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.study_group_session_attendees attendee
  USING
    public.study_group_sessions session,
    public.study_groups study_group
  WHERE attendee.session_id = session.id
    AND session.group_id = study_group.id
    AND study_group.course_id = OLD.course_id
    AND attendee.user_id = OLD.student_id;

  DELETE FROM public.study_groups
  WHERE course_id = OLD.course_id
    AND created_by = OLD.student_id;

  DELETE FROM public.study_group_members member
  USING public.study_groups study_group
  WHERE member.group_id = study_group.id
    AND study_group.course_id = OLD.course_id
    AND member.user_id = OLD.student_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_study_groups_after_unenrollment
  ON public.course_enrollments;
CREATE TRIGGER cleanup_study_groups_after_unenrollment
  AFTER DELETE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_study_group_after_unenrollment();

REVOKE ALL ON FUNCTION public.cleanup_study_group_after_unenrollment()
  FROM PUBLIC;

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

  IF NOT EXISTS (
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
  SELECT * INTO group_row
  FROM public.study_groups
  WHERE id = p_group_id
  FOR UPDATE;

  IF group_row.id IS NULL OR group_row.status <> 'active' THEN
    RAISE EXCEPTION 'This study group is not available.';
  END IF;

  IF NOT EXISTS (
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

CREATE OR REPLACE FUNCTION public.leave_study_group(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_study_group_owner(p_group_id) THEN
    RAISE EXCEPTION 'The group owner must delete the group instead.';
  END IF;

  DELETE FROM public.study_group_members
  WHERE group_id = p_group_id
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_study_group_member(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_study_group_owner(p_group_id) THEN
    RAISE EXCEPTION 'Only the group owner can remove members.';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'The group owner cannot remove themselves.';
  END IF;

  DELETE FROM public.study_group_members
  WHERE group_id = p_group_id
    AND user_id = p_user_id
    AND role = 'member';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_study_session_attendance(
  p_session_id UUID,
  p_attending BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_row public.study_group_sessions%ROWTYPE;
  attendee_count INTEGER;
BEGIN
  SELECT * INTO session_row
  FROM public.study_group_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF session_row.id IS NULL THEN
    RAISE EXCEPTION 'Study session not found.';
  END IF;

  IF NOT public.is_study_group_member(session_row.group_id) THEN
    RAISE EXCEPTION 'Only group members can respond to this session.';
  END IF;

  IF NOT COALESCE(p_attending, FALSE) THEN
    DELETE FROM public.study_group_session_attendees
    WHERE session_id = p_session_id
      AND user_id = auth.uid();
    RETURN FALSE;
  END IF;

  IF session_row.max_attendees IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER INTO attendee_count
    FROM public.study_group_session_attendees attendee
    WHERE attendee.session_id = p_session_id
      AND attendee.status = 'going'
      AND attendee.user_id <> auth.uid();

    IF attendee_count >= session_row.max_attendees THEN
      RAISE EXCEPTION 'This session has reached its attendee limit.';
    END IF;
  END IF;

  INSERT INTO public.study_group_session_attendees (
    session_id,
    user_id,
    status,
    responded_at
  )
  VALUES (
    p_session_id,
    auth.uid(),
    'going',
    NOW()
  )
  ON CONFLICT (session_id, user_id)
  DO UPDATE SET
    status = 'going',
    responded_at = NOW();

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_study_groups(
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
  next_session_title TEXT
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
    COALESCE(course.course_code, course.code, offering.section_code),
    course.name,
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
    END
  FROM public.study_groups study_group
  JOIN public.course_enrollments enrollment
    ON enrollment.course_id = study_group.course_id
   AND enrollment.student_id = auth.uid()
  JOIN public.user_profiles creator
    ON creator.id = study_group.created_by
  JOIN public.course_offerings offering
    ON offering.id = study_group.course_id
  JOIN public.courses course
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
    AND (p_course_id IS NULL OR study_group.course_id = p_course_id)
    AND (
      NULLIF(BTRIM(COALESCE(p_search, '')), '') IS NULL
      OR study_group.name ILIKE '%' || BTRIM(p_search) || '%'
      OR course.name ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(course.course_code, course.code, '') ILIKE
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
    COALESCE(course.course_code, course.code, offering.section_code),
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
  JOIN public.course_offerings offering
    ON offering.id = study_group.course_id
  JOIN public.courses course
    ON course.id = offering.course_id
  WHERE session.ends_at >= NOW()
  ORDER BY session.starts_at
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 3), 1), 10);
$$;

CREATE OR REPLACE FUNCTION public.notify_study_group_session_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_row public.study_groups%ROWTYPE;
  actor_name TEXT;
  recipient RECORD;
BEGIN
  SELECT * INTO group_row
  FROM public.study_groups
  WHERE id = NEW.group_id;

  SELECT COALESCE(full_name, 'A group owner') INTO actor_name
  FROM public.user_profiles
  WHERE id = NEW.created_by;

  FOR recipient IN
    SELECT member.user_id
    FROM public.study_group_members member
    WHERE member.group_id = NEW.group_id
  LOOP
    PERFORM public.create_user_notification(
      recipient.user_id,
      NEW.created_by,
      'study_group_session',
      'New study session scheduled',
      actor_name || ' scheduled ' || NEW.title ||
        ' for ' || TO_CHAR(NEW.starts_at, 'DD Mon YYYY HH24:MI'),
      group_row.course_id,
      'study_group_session',
      NEW.id,
      '/study-groups?groupId=' || NEW.group_id::TEXT,
      jsonb_build_object('group_id', NEW.group_id),
      'study-session-created:' || NEW.id || ':' || recipient.user_id,
      NULL
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_study_group_session_insert
  ON public.study_group_sessions;
CREATE TRIGGER notify_study_group_session_insert
  AFTER INSERT ON public.study_group_sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_study_group_session_created();

CREATE OR REPLACE FUNCTION public.dispatch_study_session_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_row RECORD;
  recipient RECORD;
  created_count INTEGER := 0;
BEGIN
  FOR session_row IN
    SELECT
      session.id,
      session.group_id,
      session.title,
      session.starts_at,
      study_group.course_id,
      study_group.created_by
    FROM public.study_group_sessions session
    JOIN public.study_groups study_group
      ON study_group.id = session.group_id
    WHERE session.reminder_sent_at IS NULL
      AND session.starts_at > NOW()
      AND session.starts_at <= NOW() + INTERVAL '30 minutes'
    FOR UPDATE OF session SKIP LOCKED
  LOOP
    FOR recipient IN
      SELECT member.user_id
      FROM public.study_group_members member
      WHERE member.group_id = session_row.group_id
    LOOP
      PERFORM public.create_user_notification(
        recipient.user_id,
        session_row.created_by,
        'study_group_reminder',
        'Study session starts soon',
        session_row.title || ' starts at ' ||
          TO_CHAR(session_row.starts_at, 'HH24:MI'),
        session_row.course_id,
        'study_group_session',
        session_row.id,
        '/study-groups?groupId=' || session_row.group_id::TEXT,
        jsonb_build_object('group_id', session_row.group_id),
        'study-session-reminder:' || session_row.id || ':' ||
          recipient.user_id,
        NULL
      );
      created_count := created_count + 1;
    END LOOP;

    UPDATE public.study_group_sessions
    SET reminder_sent_at = NOW()
    WHERE id = session_row.id;
  END LOOP;

  RETURN created_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_study_group(
  UUID,
  TEXT,
  TEXT,
  INTEGER
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_study_group(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.leave_study_group(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_study_group_member(UUID, UUID)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_study_session_attendance(UUID, BOOLEAN)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_study_groups(
  INTEGER,
  TIMESTAMPTZ,
  UUID,
  UUID,
  TEXT,
  BOOLEAN
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_upcoming_study_sessions(INTEGER)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_study_group_session_created()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispatch_study_session_reminders()
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_study_group(
  UUID,
  TEXT,
  TEXT,
  INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_study_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_study_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_study_group_member(UUID, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_study_session_attendance(UUID, BOOLEAN)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_study_groups(
  INTEGER,
  TIMESTAMPTZ,
  UUID,
  UUID,
  TEXT,
  BOOLEAN
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_upcoming_study_sessions(INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_study_session_reminders()
  TO authenticated;
