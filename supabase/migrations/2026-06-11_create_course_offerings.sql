-- Separate reusable course catalogue records from lecturer-owned course instances.
-- Existing course-linked data keeps its current UUID by creating one legacy
-- offering with the same UUID as each existing course.

BEGIN;

CREATE TABLE IF NOT EXISTS public.academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  starts_at DATE,
  ends_at DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('planned', 'active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.academic_terms (code, name, status)
SELECT DISTINCT
  NULLIF(BTRIM(TO_JSONB(c) ->> 'semester'), ''),
  NULLIF(BTRIM(TO_JSONB(c) ->> 'semester'), ''),
  'closed'
FROM public.courses c
WHERE NULLIF(BTRIM(TO_JSONB(c) ->> 'semester'), '') IS NOT NULL
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.academic_terms (code, name, status)
VALUES ('CURRENT', 'Current Term', 'active')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.course_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  academic_term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
  owner_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  section_code TEXT NOT NULL,
  enrollment_key TEXT NOT NULL,
  max_capacity INTEGER,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, academic_term_id, section_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_offerings_owner_course_term
  ON public.course_offerings(course_id, academic_term_id, owner_id)
  WHERE owner_id IS NOT NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_course_offerings_course_id
  ON public.course_offerings(course_id);

CREATE INDEX IF NOT EXISTS idx_course_offerings_owner_id
  ON public.course_offerings(owner_id);

CREATE INDEX IF NOT EXISTS idx_course_offerings_term_id
  ON public.course_offerings(academic_term_id);

-- Preserve all existing relationships by using the course UUID as the legacy
-- offering UUID. Future lecturer claims receive a new UUID.
INSERT INTO public.course_offerings (
  id,
  course_id,
  academic_term_id,
  owner_id,
  section_code,
  enrollment_key,
  max_capacity,
  status,
  created_at,
  updated_at
)
SELECT
  c.id,
  c.id,
  COALESCE(
    (
      SELECT term.id
      FROM public.academic_terms term
      WHERE term.code = NULLIF(BTRIM(TO_JSONB(c) ->> 'semester'), '')
      LIMIT 1
    ),
    (SELECT id FROM public.academic_terms WHERE code = 'CURRENT')
  ),
  COALESCE(
    (
      SELECT ci.user_id
      FROM public.course_instructors ci
      WHERE ci.course_id = c.id
      ORDER BY ci.assigned_at, ci.id
      LIMIT 1
    ),
    CASE
      WHEN COALESCE(TO_JSONB(c) ->> 'lecturer_id', '') ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (TO_JSONB(c) ->> 'lecturer_id')::UUID
      ELSE NULL
    END
  ),
  'LEGACY',
  COALESCE(
    NULLIF(BTRIM(TO_JSONB(c) ->> 'enrollment_key'), ''),
    UPPER(SUBSTRING(MD5(c.id::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 8))
  ),
  COALESCE(
    CASE
      WHEN COALESCE(TO_JSONB(c) ->> 'max_capacity', '') ~ '^[0-9]+$'
      THEN (TO_JSONB(c) ->> 'max_capacity')::INTEGER
      ELSE NULL
    END,
    CASE
      WHEN COALESCE(TO_JSONB(c) ->> 'max_students', '') ~ '^[0-9]+$'
      THEN (TO_JSONB(c) ->> 'max_students')::INTEGER
      ELSE NULL
    END
  ),
  CASE
    WHEN LOWER(COALESCE(TO_JSONB(c) ->> 'status', '')) = 'unavailable'
    THEN 'closed'
    ELSE 'active'
  END,
  COALESCE(
    NULLIF(TO_JSONB(c) ->> 'created_at', '')::TIMESTAMPTZ,
    NOW()
  ),
  COALESCE(
    NULLIF(TO_JSONB(c) ->> 'updated_at', '')::TIMESTAMPTZ,
    NULLIF(TO_JSONB(c) ->> 'created_at', '')::TIMESTAMPTZ,
    NOW()
  )
FROM public.courses c
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_instructors (course_id, user_id, assigned_at)
SELECT
  offering.id,
  offering.owner_id,
  offering.created_at
FROM public.course_offerings offering
WHERE offering.owner_id IS NOT NULL
ON CONFLICT (course_id, user_id) DO NOTHING;

-- Repoint every existing course-linked foreign key to course_offerings.
-- Keeping the column name course_id avoids a destructive rewrite of all rows.
DO $$
DECLARE
  fk RECORD;
  target_table TEXT;
  target_tables TEXT[] := ARRAY[
    'course_enrollments',
    'course_instructors',
    'course_materials',
    'assignments',
    'student_grades',
    'attendance',
    'posts',
    'course_posts',
    'forum_threads',
    'notifications',
    'leaderboard'
  ];
BEGIN
  FOR fk IN
    SELECT
      constraint_row.conrelid::REGCLASS AS table_name,
      constraint_row.conname
    FROM pg_constraint constraint_row
    WHERE constraint_row.contype = 'f'
      AND constraint_row.confrelid = 'public.courses'::REGCLASS
      AND constraint_row.conrelid <> 'public.course_offerings'::REGCLASS
      AND constraint_row.conrelid IN (
        SELECT TO_REGCLASS('public.' || listed_table.table_name)
        FROM UNNEST(target_tables) AS listed_table(table_name)
      )
  LOOP
    EXECUTE FORMAT(
      'ALTER TABLE %s DROP CONSTRAINT %I',
      fk.table_name,
      fk.conname
    );
  END LOOP;

  FOREACH target_table IN ARRAY target_tables
  LOOP
    IF TO_REGCLASS('public.' || target_table) IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = target_table
          AND column_name = 'course_id'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_row
        WHERE constraint_row.contype = 'f'
          AND constraint_row.conrelid = TO_REGCLASS('public.' || target_table)
          AND constraint_row.confrelid = 'public.course_offerings'::REGCLASS
      )
    THEN
      EXECUTE FORMAT(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (course_id) REFERENCES public.course_offerings(id) ON DELETE CASCADE',
        target_table,
        target_table || '_course_offering_id_fkey'
      );
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_offerings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view academic terms"
  ON public.academic_terms;
CREATE POLICY "Authenticated users can view academic terms"
  ON public.academic_terms FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can view course offerings"
  ON public.course_offerings;
DROP POLICY IF EXISTS "Lecturers can create course offerings"
  ON public.course_offerings;
DROP POLICY IF EXISTS "Offering owners can update course offerings"
  ON public.course_offerings;
DROP POLICY IF EXISTS "Offering owners can delete course offerings"
  ON public.course_offerings;

CREATE POLICY "Authenticated users can view course offerings"
  ON public.course_offerings FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Lecturers can create course offerings"
  ON public.course_offerings FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = auth.uid()
        AND profile.role IN ('lecturer', 'admin')
    )
  );

CREATE POLICY "Offering owners can update course offerings"
  ON public.course_offerings FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles profile
      WHERE profile.id = auth.uid() AND profile.role = 'admin'
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles profile
      WHERE profile.id = auth.uid() AND profile.role = 'admin'
    )
  );

CREATE POLICY "Offering owners can delete course offerings"
  ON public.course_offerings FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles profile
      WHERE profile.id = auth.uid() AND profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Allow lecturers to remove their own course links"
  ON public.course_instructors;
DROP POLICY IF EXISTS "Only admins can remove course instructors directly"
  ON public.course_instructors;
CREATE POLICY "Only admins can remove course instructors directly"
  ON public.course_instructors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = auth.uid()
        AND profile.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.is_course_instructor(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.course_offerings offering
      WHERE offering.id = target_course_id
        AND offering.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.course_instructors instructor
      WHERE instructor.course_id = target_course_id
        AND instructor.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = auth.uid()
        AND profile.role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_course_instructor(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_forum_course(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    target_course_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.course_enrollments enrollment
      WHERE enrollment.course_id = target_course_id
        AND enrollment.student_id = auth.uid()
    )
    OR public.is_course_instructor(target_course_id);
$$;

GRANT EXECUTE ON FUNCTION public.can_view_forum_course(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_course_members(target_course_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  faculty TEXT,
  programme TEXT,
  avatar_url TEXT,
  course_role TEXT,
  membership_id UUID,
  joined_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH allowed AS (
    SELECT
      public.is_course_instructor(target_course_id)
      OR EXISTS (
        SELECT 1
        FROM public.course_enrollments enrollment
        WHERE enrollment.course_id = target_course_id
          AND enrollment.student_id = auth.uid()
      ) AS can_view
  )
  SELECT
    profile.id,
    profile.email,
    profile.full_name,
    profile.role,
    profile.faculty,
    profile.programme,
    profile.avatar_url,
    'lecturer'::TEXT,
    instructor.id,
    instructor.assigned_at
  FROM public.course_instructors instructor
  JOIN public.user_profiles profile ON profile.id = instructor.user_id
  CROSS JOIN allowed
  WHERE instructor.course_id = target_course_id
    AND allowed.can_view

  UNION ALL

  SELECT
    profile.id,
    profile.email,
    profile.full_name,
    profile.role,
    profile.faculty,
    profile.programme,
    profile.avatar_url,
    'student'::TEXT,
    enrollment.id,
    enrollment.enrolled_at
  FROM public.course_enrollments enrollment
  JOIN public.user_profiles profile ON profile.id = enrollment.student_id
  CROSS JOIN allowed
  WHERE enrollment.course_id = target_course_id
    AND allowed.can_view
  ORDER BY 8, 3;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_members(UUID) TO authenticated;

DROP POLICY IF EXISTS "Allow students to view their grades"
  ON public.student_grades;
DROP POLICY IF EXISTS "Allow lecturers to manage grades"
  ON public.student_grades;
DROP POLICY IF EXISTS "Allow course members to view grades"
  ON public.student_grades;
DROP POLICY IF EXISTS "Allow course lecturers to manage grades"
  ON public.student_grades;

CREATE POLICY "Allow course members to view grades"
  ON public.student_grades FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_course_instructor(course_id)
  );

CREATE POLICY "Allow course lecturers to manage grades"
  ON public.student_grades FOR ALL
  TO authenticated
  USING (public.is_course_instructor(course_id))
  WITH CHECK (
    public.is_course_instructor(course_id)
    AND (
      graded_by = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        WHERE profile.id = auth.uid()
          AND profile.role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS "Allow students to view their attendance"
  ON public.attendance;
DROP POLICY IF EXISTS "Allow lecturers to mark attendance"
  ON public.attendance;
DROP POLICY IF EXISTS "Allow course members to view attendance"
  ON public.attendance;
DROP POLICY IF EXISTS "Allow course lecturers to manage attendance"
  ON public.attendance;

CREATE POLICY "Allow course members to view attendance"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_course_instructor(course_id)
  );

CREATE POLICY "Allow course lecturers to manage attendance"
  ON public.attendance FOR ALL
  TO authenticated
  USING (public.is_course_instructor(course_id))
  WITH CHECK (
    public.is_course_instructor(course_id)
    AND (
      marked_by = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        WHERE profile.id = auth.uid()
          AND profile.role = 'admin'
      )
    )
  );

CREATE OR REPLACE FUNCTION public.create_course_offering(
  p_course_id UUID,
  p_academic_term_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  selected_term_id UUID;
  new_offering_id UUID := gen_random_uuid();
  new_section_code TEXT;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = actor_id
      AND profile.role IN ('lecturer', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only lecturers and administrators can create course offerings';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.courses course_row WHERE course_row.id = p_course_id) THEN
    RAISE EXCEPTION 'Course template not found';
  END IF;

  selected_term_id := p_academic_term_id;
  IF selected_term_id IS NULL THEN
    SELECT term.id
    INTO selected_term_id
    FROM public.academic_terms term
    WHERE term.status = 'active'
    ORDER BY
      CASE WHEN term.code = 'CURRENT' THEN 1 ELSE 0 END,
      term.starts_at DESC NULLS LAST,
      term.code DESC,
      term.created_at DESC
    LIMIT 1;
  END IF;

  IF selected_term_id IS NULL THEN
    RAISE EXCEPTION 'No active academic term is configured';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.course_offerings offering
    WHERE offering.course_id = p_course_id
      AND offering.academic_term_id = selected_term_id
      AND offering.owner_id = actor_id
      AND offering.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You are already teaching this course in the active term';
  END IF;

  new_section_code := UPPER(SUBSTRING(REPLACE(new_offering_id::TEXT, '-', ''), 1, 6));

  INSERT INTO public.course_offerings (
    id,
    course_id,
    academic_term_id,
    owner_id,
    section_code,
    enrollment_key,
    max_capacity,
    status
  )
  SELECT
    new_offering_id,
    course_row.id,
    selected_term_id,
    actor_id,
    new_section_code,
    UPPER(SUBSTRING(MD5(new_offering_id::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 8)),
    COALESCE(
      CASE
        WHEN COALESCE(TO_JSONB(course_row) ->> 'max_capacity', '') ~ '^[0-9]+$'
        THEN (TO_JSONB(course_row) ->> 'max_capacity')::INTEGER
        ELSE NULL
      END,
      CASE
        WHEN COALESCE(TO_JSONB(course_row) ->> 'max_students', '') ~ '^[0-9]+$'
        THEN (TO_JSONB(course_row) ->> 'max_students')::INTEGER
        ELSE NULL
      END
    ),
    'active'
  FROM public.courses course_row
  WHERE course_row.id = p_course_id;

  INSERT INTO public.course_instructors (course_id, user_id)
  VALUES (new_offering_id, actor_id);

  RETURN new_offering_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_course_offering(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.drop_course_offering(p_offering_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  offering_owner_id UUID;
  actor_is_admin BOOLEAN;
BEGIN
  SELECT offering.owner_id
  INTO offering_owner_id
  FROM public.course_offerings offering
  WHERE offering.id = p_offering_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course offering not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = actor_id
      AND profile.role = 'admin'
  )
  INTO actor_is_admin;

  IF offering_owner_id IS DISTINCT FROM actor_id AND NOT actor_is_admin THEN
    RAISE EXCEPTION 'Only the lecturer who opened this course can drop it';
  END IF;

  DELETE FROM public.course_offerings
  WHERE id = p_offering_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.drop_course_offering(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_course_offering_name(target_offering_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT course_row.name
  FROM public.course_offerings offering
  JOIN public.courses course_row ON course_row.id = offering.course_id
  WHERE offering.id = target_offering_id;
$$;

CREATE OR REPLACE FUNCTION public.notify_assignment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_name TEXT;
  recipient RECORD;
BEGIN
  course_name := public.get_course_offering_name(NEW.course_id);

  FOR recipient IN
    SELECT student_id
    FROM public.course_enrollments
    WHERE course_id = NEW.course_id
  LOOP
    PERFORM public.create_user_notification(
      recipient.student_id,
      NEW.created_by,
      'assignment_created',
      'New assignment: ' || NEW.title,
      COALESCE(course_name, 'Course') || ' - due ' || TO_CHAR(NEW.due_date, 'DD Mon YYYY, HH24:MI'),
      NEW.course_id,
      'assignment',
      NEW.id,
      '/courses?courseId=' || NEW.course_id || '&assignmentId=' || NEW.id,
      JSONB_BUILD_OBJECT('due_date', NEW.due_date),
      'assignment-created:' || NEW.id || ':' || recipient.student_id,
      'assignment_reminders'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_course_material_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_name TEXT;
  recipient RECORD;
  source_actor_id UUID;
BEGIN
  IF NEW.file_type = 'folder' THEN
    RETURN NEW;
  END IF;

  source_actor_id := COALESCE(NEW.created_by, NEW.uploaded_by, auth.uid());
  course_name := public.get_course_offering_name(NEW.course_id);

  FOR recipient IN
    SELECT student_id
    FROM public.course_enrollments
    WHERE course_id = NEW.course_id
  LOOP
    PERFORM public.create_user_notification(
      recipient.student_id,
      source_actor_id,
      'course_material_added',
      'New material: ' || NEW.title,
      COALESCE(course_name, 'Course'),
      NEW.course_id,
      'course_material',
      NEW.id,
      '/courses?courseId=' || NEW.course_id,
      JSONB_BUILD_OBJECT('file_type', NEW.file_type),
      'course-material:' || NEW.id || ':' || recipient.student_id,
      'course_announcements'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_course_enrollment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_name TEXT;
  course_name TEXT;
  recipient RECORD;
BEGIN
  SELECT COALESCE(full_name, 'A student')
  INTO student_name
  FROM public.user_profiles
  WHERE id = NEW.student_id;

  course_name := public.get_course_offering_name(NEW.course_id);

  FOR recipient IN
    SELECT user_id
    FROM public.course_instructors
    WHERE course_id = NEW.course_id
  LOOP
    PERFORM public.create_user_notification(
      recipient.user_id,
      NEW.student_id,
      'student_enrolled',
      student_name || ' joined ' || COALESCE(course_name, 'your course'),
      'The student now appears in the People list.',
      NEW.course_id,
      'course',
      NEW.course_id,
      '/courses?courseId=' || NEW.course_id,
      JSONB_BUILD_OBJECT('enrollment_id', NEW.id),
      'course-enrollment:' || NEW.id || ':' || recipient.user_id,
      'course_announcements'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_course_instructor_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_name TEXT;
  instructor_name TEXT;
  recipient RECORD;
  source_actor_id UUID;
BEGIN
  source_actor_id := auth.uid();
  course_name := public.get_course_offering_name(NEW.course_id);

  SELECT COALESCE(full_name, 'A lecturer')
  INTO instructor_name
  FROM public.user_profiles
  WHERE id = NEW.user_id;

  PERFORM public.create_user_notification(
    NEW.user_id,
    source_actor_id,
    'course_assigned',
    'You are teaching ' || COALESCE(course_name, 'a course'),
    'The course has been added to your teaching list.',
    NEW.course_id,
    'course',
    NEW.course_id,
    '/courses?courseId=' || NEW.course_id,
    JSONB_BUILD_OBJECT('course_instructor_id', NEW.id),
    'course-instructor:' || NEW.id || ':' || NEW.user_id,
    'course_announcements'
  );

  FOR recipient IN
    SELECT student_id
    FROM public.course_enrollments
    WHERE course_id = NEW.course_id
  LOOP
    PERFORM public.create_user_notification(
      recipient.student_id,
      source_actor_id,
      'course_instructor_added',
      instructor_name || ' is teaching ' || COALESCE(course_name, 'your course'),
      'A lecturer was added to the course.',
      NEW.course_id,
      'course',
      NEW.course_id,
      '/courses?courseId=' || NEW.course_id,
      JSONB_BUILD_OBJECT(
        'course_instructor_id', NEW.id,
        'instructor_id', NEW.user_id
      ),
      'course-instructor:' || NEW.id || ':' || recipient.student_id,
      'course_announcements'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Course owners can delete forum images"
  ON storage.objects;
CREATE POLICY "Course owners can delete forum images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'forum-images'
    AND (
      owner_id = auth.uid()::TEXT
      OR EXISTS (
        SELECT 1
        FROM public.course_offerings offering
        WHERE offering.id::TEXT = (storage.foldername(name))[1]
          AND offering.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles profile
        WHERE profile.id = auth.uid()
          AND profile.role = 'admin'
      )
    )
  );

CREATE OR REPLACE VIEW public.course_summary AS
SELECT
  offering.id,
  course_row.code,
  course_row.name,
  offering.owner_id AS lecturer_id,
  profile.full_name AS lecturer_name,
  COUNT(enrollment.id) AS enrolled_students,
  offering.created_at
FROM public.course_offerings offering
JOIN public.courses course_row ON course_row.id = offering.course_id
LEFT JOIN public.user_profiles profile ON profile.id = offering.owner_id
LEFT JOIN public.course_enrollments enrollment ON enrollment.course_id = offering.id
GROUP BY
  offering.id,
  course_row.code,
  course_row.name,
  offering.owner_id,
  profile.full_name,
  offering.created_at;

CREATE OR REPLACE VIEW public.student_course_summary AS
SELECT
  offering.id AS course_id,
  course_row.code,
  course_row.name,
  profile.full_name AS lecturer_name,
  enrollment.student_id,
  COALESCE(AVG(grade.score), 0)::DECIMAL(5, 2) AS average_score,
  COUNT(DISTINCT grade.id) AS grades_received,
  MAX(grade.graded_at) AS last_graded
FROM public.course_offerings offering
JOIN public.courses course_row ON course_row.id = offering.course_id
LEFT JOIN public.user_profiles profile ON profile.id = offering.owner_id
JOIN public.course_enrollments enrollment ON enrollment.course_id = offering.id
LEFT JOIN public.student_grades grade
  ON grade.course_id = offering.id
  AND enrollment.student_id = grade.student_id
GROUP BY
  offering.id,
  course_row.code,
  course_row.name,
  profile.full_name,
  enrollment.student_id;

NOTIFY pgrst, 'reload schema';

COMMIT;
