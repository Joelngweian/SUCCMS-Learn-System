ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.course_materials(id) ON DELETE CASCADE;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS file_path TEXT;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS size BIGINT DEFAULT 0;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS file_url TEXT;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS downloads_count INTEGER DEFAULT 0;

ALTER TABLE public.course_materials
ALTER COLUMN file_url DROP NOT NULL;

ALTER TABLE public.course_materials
ALTER COLUMN uploaded_by DROP NOT NULL;

UPDATE public.course_materials
SET created_by = uploaded_by
WHERE created_by IS NULL
  AND uploaded_by IS NOT NULL;

UPDATE public.course_materials
SET file_path = file_url
WHERE file_path IS NULL
  AND file_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_materials_course_parent
  ON public.course_materials(course_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_course_materials_created_by
  ON public.course_materials(created_by);

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

CREATE POLICY "Allow authenticated users to view course materials"
  ON public.course_materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create course materials"
  ON public.course_materials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow users to update own course materials"
  ON public.course_materials FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Allow users to delete own course materials"
  ON public.course_materials FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  );
