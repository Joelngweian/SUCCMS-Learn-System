BEGIN;

CREATE TABLE IF NOT EXISTS public.course_creation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL
    CONSTRAINT course_creation_requests_requested_by_fkey
    REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  faculty TEXT,
  programme TEXT,
  credits INTEGER CHECK (credits IS NULL OR credits > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID
    CONSTRAINT course_creation_requests_reviewed_by_fkey
    REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  generated_course_id UUID
    CONSTRAINT course_creation_requests_generated_course_id_fkey
    REFERENCES public.courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_creation_requests_requested_by
  ON public.course_creation_requests(requested_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_creation_requests_status_created
  ON public.course_creation_requests(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_creation_requests_pending_code
  ON public.course_creation_requests(LOWER(subject_code))
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS update_course_creation_requests_updated_at
  ON public.course_creation_requests;
CREATE TRIGGER update_course_creation_requests_updated_at
  BEFORE UPDATE ON public.course_creation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.course_creation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecturers can create course creation requests"
  ON public.course_creation_requests;
CREATE POLICY "Lecturers can create course creation requests"
  ON public.course_creation_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = auth.uid()
        AND profile.role = 'lecturer'
        AND COALESCE(profile.is_active, TRUE)
    )
  );

DROP POLICY IF EXISTS "Request owners and admins can view course creation requests"
  ON public.course_creation_requests;
CREATE POLICY "Request owners and admins can view course creation requests"
  ON public.course_creation_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = auth.uid()
        AND profile.role = 'admin'
        AND COALESCE(profile.is_active, TRUE)
    )
  );

DROP POLICY IF EXISTS "Admins can update course creation requests"
  ON public.course_creation_requests;
CREATE POLICY "Admins can update course creation requests"
  ON public.course_creation_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = auth.uid()
        AND profile.role = 'admin'
        AND COALESCE(profile.is_active, TRUE)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = auth.uid()
        AND profile.role = 'admin'
        AND COALESCE(profile.is_active, TRUE)
    )
  );

CREATE OR REPLACE FUNCTION public.approve_course_creation_request(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  actor_id UUID := auth.uid();
  request_row public.course_creation_requests%ROWTYPE;
  normalized_code TEXT;
  new_course_id UUID;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = actor_id
      AND profile.role = 'admin'
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    RAISE EXCEPTION 'Only active administrators can approve course creation requests';
  END IF;

  SELECT *
  INTO request_row
  FROM public.course_creation_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course creation request not found';
  END IF;

  IF request_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending course creation requests can be approved';
  END IF;

  normalized_code := UPPER(TRIM(request_row.subject_code));

  IF normalized_code = '' THEN
    RAISE EXCEPTION 'Subject code is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.courses course_row
    WHERE LOWER(course_row.code) = LOWER(normalized_code)
       OR LOWER(COALESCE(course_row.course_code, '')) = LOWER(normalized_code)
  ) THEN
    RAISE EXCEPTION 'A course with this subject code already exists';
  END IF;

  INSERT INTO public.courses (
    code,
    course_code,
    name,
    description,
    faculty,
    programme,
    credits,
    credit_hours,
    course_type,
    status
  )
  VALUES (
    normalized_code,
    normalized_code,
    TRIM(request_row.subject_name),
    NULLIF(TRIM(request_row.reason), ''),
    NULLIF(TRIM(COALESCE(request_row.faculty, '')), ''),
    NULLIF(TRIM(COALESCE(request_row.programme, '')), ''),
    request_row.credits,
    request_row.credits,
    'requested',
    'open'
  )
  RETURNING id INTO new_course_id;

  UPDATE public.course_creation_requests
  SET
    status = 'approved',
    admin_notes = NULLIF(TRIM(COALESCE(p_admin_notes, '')), ''),
    reviewed_by = actor_id,
    reviewed_at = NOW(),
    generated_course_id = new_course_id
  WHERE id = p_request_id;

  RETURN new_course_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_course_creation_request(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  actor_id UUID := auth.uid();
  request_status TEXT;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = actor_id
      AND profile.role = 'admin'
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    RAISE EXCEPTION 'Only active administrators can reject course creation requests';
  END IF;

  SELECT status
  INTO request_status
  FROM public.course_creation_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course creation request not found';
  END IF;

  IF request_status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending course creation requests can be rejected';
  END IF;

  UPDATE public.course_creation_requests
  SET
    status = 'rejected',
    admin_notes = NULLIF(TRIM(COALESCE(p_admin_notes, '')), ''),
    reviewed_by = actor_id,
    reviewed_at = NOW()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_course_creation_request(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_course_creation_request(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_course_creation_request(UUID, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_course_creation_request(UUID, TEXT)
  TO authenticated;

COMMIT;
