BEGIN;

CREATE OR REPLACE FUNCTION public.is_course_member(
  target_course_id UUID,
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_course_id IS NOT NULL
    AND target_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = target_user_id
        AND COALESCE(profile.is_active, TRUE)
        AND (
          profile.role = 'admin'
          OR EXISTS (
            SELECT 1
            FROM public.course_enrollments enrollment
            WHERE enrollment.course_id = target_course_id
              AND enrollment.student_id = target_user_id
          )
          OR EXISTS (
            SELECT 1
            FROM public.course_instructors instructor
            WHERE instructor.course_id = target_course_id
              AND instructor.user_id = target_user_id
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_course_manager(
  target_course_id UUID,
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_course_id IS NOT NULL
    AND target_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = target_user_id
        AND COALESCE(profile.is_active, TRUE)
        AND (
          profile.role = 'admin'
          OR EXISTS (
            SELECT 1
            FROM public.course_instructors instructor
            WHERE instructor.course_id = target_course_id
              AND instructor.user_id = target_user_id
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.course_id_from_storage_path(
  object_name TEXT
)
RETURNS UUID
LANGUAGE SQL
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN SPLIT_PART(object_name, '/', 1) ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    THEN SPLIT_PART(object_name, '/', 1)::UUID
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.course_material_parent_matches(
  target_parent_id UUID,
  target_course_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_parent_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.course_materials parent
      WHERE parent.id = target_parent_id
        AND parent.course_id = target_course_id
        AND parent.file_type = 'folder'
    );
$$;

CREATE OR REPLACE FUNCTION public.protect_course_material_descendants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow trusted backend operations and course lifecycle cascades.
  IF auth.uid() IS NULL
    OR pg_trigger_depth() > 1
    OR public.is_course_manager(OLD.course_id)
  THEN
    RETURN OLD;
  END IF;

  IF OLD.created_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only delete course files that you uploaded.';
  END IF;

  IF OLD.file_type = 'folder' AND EXISTS (
    WITH RECURSIVE descendants AS (
      SELECT child.id, child.created_by
      FROM public.course_materials child
      WHERE child.parent_id = OLD.id

      UNION ALL

      SELECT child.id, child.created_by
      FROM public.course_materials child
      JOIN descendants parent ON child.parent_id = parent.id
    )
    SELECT 1
    FROM descendants
    WHERE created_by IS DISTINCT FROM auth.uid()
  ) THEN
    RAISE EXCEPTION
      'This folder contains files uploaded by another course member.';
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.is_course_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_course_manager(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.course_id_from_storage_path(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.course_material_parent_matches(UUID, UUID)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_course_material_descendants()
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_course_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_manager(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.course_id_from_storage_path(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.course_material_parent_matches(UUID, UUID)
  TO authenticated;

DROP TRIGGER IF EXISTS protect_course_material_descendants
  ON public.course_materials;
CREATE TRIGGER protect_course_material_descendants
  BEFORE DELETE ON public.course_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_course_material_descendants();

ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow enrolled students and lecturers to view materials"
  ON public.course_materials;
DROP POLICY IF EXISTS "Allow lecturers to manage materials"
  ON public.course_materials;
DROP POLICY IF EXISTS "Allow authenticated users to view course materials"
  ON public.course_materials;
DROP POLICY IF EXISTS "Allow authenticated users to create course materials"
  ON public.course_materials;
DROP POLICY IF EXISTS "Allow users to update own course materials"
  ON public.course_materials;
DROP POLICY IF EXISTS "Allow users to delete own course materials"
  ON public.course_materials;
DROP POLICY IF EXISTS "Course members can view materials"
  ON public.course_materials;
DROP POLICY IF EXISTS "Course members can create materials"
  ON public.course_materials;
DROP POLICY IF EXISTS "Material owners and course managers can update materials"
  ON public.course_materials;
DROP POLICY IF EXISTS "Material owners and course managers can delete materials"
  ON public.course_materials;

CREATE POLICY "Course members can view materials"
  ON public.course_materials FOR SELECT
  TO authenticated
  USING (public.is_course_member(course_id));

CREATE POLICY "Course members can create materials"
  ON public.course_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_course_member(course_id)
    AND public.course_material_parent_matches(parent_id, course_id)
  );

CREATE POLICY "Material owners and course managers can update materials"
  ON public.course_materials FOR UPDATE
  TO authenticated
  USING (
    public.is_course_member(course_id)
    AND (
      created_by = auth.uid()
      OR public.is_course_manager(course_id)
    )
  )
  WITH CHECK (
    public.is_course_member(course_id)
    AND (
      created_by = auth.uid()
      OR public.is_course_manager(course_id)
    )
    AND public.course_material_parent_matches(parent_id, course_id)
  );

CREATE POLICY "Material owners and course managers can delete materials"
  ON public.course_materials FOR DELETE
  TO authenticated
  USING (
    public.is_course_member(course_id)
    AND (
      created_by = auth.uid()
      OR public.is_course_manager(course_id)
    )
  );

DROP POLICY IF EXISTS "Course content files are viewable"
  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload course content"
  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update course content"
  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete course content"
  ON storage.objects;
DROP POLICY IF EXISTS "Course members can upload course content"
  ON storage.objects;
DROP POLICY IF EXISTS "Course file owners and managers can update course content"
  ON storage.objects;
DROP POLICY IF EXISTS "Course file owners and managers can delete course content"
  ON storage.objects;

-- The bucket remains public for compatibility with existing post, assignment,
-- and material URLs. Write operations are restricted to course members.
CREATE POLICY "Course content files are viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course_content');

CREATE POLICY "Course members can upload course content"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course_content'
    AND public.is_course_member(
      public.course_id_from_storage_path(name)
    )
  );

CREATE POLICY "Course file owners and managers can update course content"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course_content'
    AND public.is_course_member(
      public.course_id_from_storage_path(name)
    )
    AND (
      owner_id = auth.uid()::TEXT
      OR public.is_course_manager(
        public.course_id_from_storage_path(name)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'course_content'
    AND public.is_course_member(
      public.course_id_from_storage_path(name)
    )
    AND (
      owner_id = auth.uid()::TEXT
      OR public.is_course_manager(
        public.course_id_from_storage_path(name)
      )
    )
  );

CREATE POLICY "Course file owners and managers can delete course content"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course_content'
    AND public.is_course_member(
      public.course_id_from_storage_path(name)
    )
    AND (
      owner_id = auth.uid()::TEXT
      OR public.is_course_manager(
        public.course_id_from_storage_path(name)
      )
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
