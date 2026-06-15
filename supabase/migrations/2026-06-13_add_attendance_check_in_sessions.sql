-- Adds time-limited student check-in sessions while preserving the existing
-- attendance table used by dashboards, progress and analytics.

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
  class_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_sessions_course_date_key UNIQUE (course_id, class_date),
  CONSTRAINT attendance_sessions_time_check CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course_status
  ON public.attendance_sessions(course_id, status, ends_at DESC);

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Course lecturers can view attendance sessions"
  ON public.attendance_sessions;
DROP POLICY IF EXISTS "Course lecturers can manage attendance sessions"
  ON public.attendance_sessions;

CREATE POLICY "Course lecturers can view attendance sessions"
  ON public.attendance_sessions FOR SELECT
  TO authenticated
  USING (public.is_course_instructor(course_id));

CREATE POLICY "Course lecturers can manage attendance sessions"
  ON public.attendance_sessions FOR ALL
  TO authenticated
  USING (public.is_course_instructor(course_id))
  WITH CHECK (public.is_course_instructor(course_id));

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS session_id UUID
    REFERENCES public.attendance_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_in_method TEXT;

UPDATE public.attendance
SET status = CASE
  WHEN marked_present THEN 'present'
  ELSE 'absent'
END
WHERE status IS NULL;

ALTER TABLE public.attendance
  ALTER COLUMN status SET DEFAULT 'absent',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check,
  DROP CONSTRAINT IF EXISTS attendance_check_in_method_check;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check
    CHECK (status IN ('present', 'late', 'absent', 'excused')),
  ADD CONSTRAINT attendance_check_in_method_check
    CHECK (check_in_method IS NULL OR check_in_method IN ('code', 'manual'));

CREATE INDEX IF NOT EXISTS idx_attendance_session_id
  ON public.attendance(session_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_in_attendance(
  p_course_id UUID,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  active_session public.attendance_sessions%ROWTYPE;
BEGIN
  IF actor_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You must be signed in to check in.'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.course_enrollments enrollment
    WHERE enrollment.course_id = p_course_id
      AND enrollment.student_id = actor_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You are not enrolled in this course.'
    );
  END IF;

  SELECT session_row.*
  INTO active_session
  FROM public.attendance_sessions session_row
  WHERE session_row.course_id = p_course_id
    AND UPPER(session_row.check_in_code) = UPPER(TRIM(p_code))
    AND session_row.status = 'open'
    AND NOW() >= session_row.starts_at
    AND NOW() <= session_row.ends_at
  LIMIT 1;

  IF active_session.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'The check-in code is invalid or has expired.'
    );
  END IF;

  INSERT INTO public.attendance (
    course_id,
    student_id,
    class_date,
    marked_present,
    marked_at,
    marked_by,
    session_id,
    status,
    check_in_at,
    check_in_method
  )
  VALUES (
    p_course_id,
    actor_id,
    active_session.class_date,
    true,
    NOW(),
    actor_id,
    active_session.id,
    'present',
    NOW(),
    'code'
  )
  ON CONFLICT (course_id, student_id, class_date)
  DO UPDATE SET
    marked_present = true,
    marked_at = NOW(),
    marked_by = actor_id,
    session_id = active_session.id,
    status = 'present',
    check_in_at = NOW(),
    check_in_method = 'code';

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in successful.',
    'class_date', active_session.class_date,
    'check_in_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_attendance(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_attendance(UUID, TEXT) TO authenticated;
