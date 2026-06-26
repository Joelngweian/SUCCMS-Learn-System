-- Support hourly attendance slots for multi-hour classes.
--
-- Old attendance used one session and one attendance row per course/date/student.
-- This migration keeps existing data, then changes new attendance to be recorded
-- per check-in slot so a 3-hour class can require 3 separate check-ins.

CREATE TABLE IF NOT EXISTS public.attendance_class_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
  class_date DATE NOT NULL DEFAULT CURRENT_DATE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 60,
  total_slots INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_class_meetings_course_date_key UNIQUE (course_id, class_date),
  CONSTRAINT attendance_class_meetings_time_check CHECK (ends_at > starts_at),
  CONSTRAINT attendance_class_meetings_slot_minutes_check CHECK (slot_minutes > 0),
  CONSTRAINT attendance_class_meetings_total_slots_check CHECK (total_slots > 0)
);

CREATE INDEX IF NOT EXISTS idx_attendance_class_meetings_course_date
  ON public.attendance_class_meetings(course_id, class_date DESC);

ALTER TABLE public.attendance_class_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Course lecturers can view attendance class meetings"
  ON public.attendance_class_meetings;
DROP POLICY IF EXISTS "Course lecturers can manage attendance class meetings"
  ON public.attendance_class_meetings;

CREATE POLICY "Course lecturers can view attendance class meetings"
  ON public.attendance_class_meetings FOR SELECT
  TO authenticated
  USING (private.is_course_instructor(course_id));

CREATE POLICY "Course lecturers can manage attendance class meetings"
  ON public.attendance_class_meetings FOR ALL
  TO authenticated
  USING (private.is_course_instructor(course_id))
  WITH CHECK (private.is_course_instructor(course_id));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.attendance_class_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.attendance_class_meetings TO service_role;

ALTER TABLE public.attendance_sessions
  ADD COLUMN IF NOT EXISTS class_meeting_id UUID
    REFERENCES public.attendance_class_meetings(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS slot_no INTEGER,
  ADD COLUMN IF NOT EXISTS slot_label TEXT,
  ADD COLUMN IF NOT EXISTS check_in_window_minutes INTEGER;

INSERT INTO public.attendance_class_meetings (
  course_id,
  class_date,
  starts_at,
  ends_at,
  slot_minutes,
  total_slots,
  created_by,
  created_at,
  updated_at
)
SELECT
  session_row.course_id,
  session_row.class_date,
  MIN(session_row.starts_at),
  MAX(session_row.ends_at),
  60,
  COUNT(*)::INTEGER,
  (ARRAY_AGG(
    session_row.created_by
    ORDER BY session_row.created_at ASC, session_row.id ASC
  ))[1],
  MIN(session_row.created_at),
  MAX(session_row.updated_at)
FROM public.attendance_sessions session_row
GROUP BY session_row.course_id, session_row.class_date
ON CONFLICT (course_id, class_date) DO NOTHING;

UPDATE public.attendance_sessions session_row
SET class_meeting_id = meeting.id
FROM public.attendance_class_meetings meeting
WHERE session_row.class_meeting_id IS NULL
  AND meeting.course_id = session_row.course_id
  AND meeting.class_date = session_row.class_date;

WITH numbered_sessions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY course_id, class_date
      ORDER BY starts_at ASC, created_at ASC, id ASC
    )::INTEGER AS computed_slot_no
  FROM public.attendance_sessions
)
UPDATE public.attendance_sessions session_row
SET
  slot_no = COALESCE(session_row.slot_no, numbered_sessions.computed_slot_no),
  slot_label = COALESCE(
    session_row.slot_label,
    'Hour ' || numbered_sessions.computed_slot_no
  ),
  check_in_window_minutes = COALESCE(
    session_row.check_in_window_minutes,
    GREATEST(
      1,
      CEIL(
        EXTRACT(EPOCH FROM (session_row.ends_at - session_row.starts_at)) / 60
      )::INTEGER
    )
  )
FROM numbered_sessions
WHERE session_row.id = numbered_sessions.id;

ALTER TABLE public.attendance_sessions
  ALTER COLUMN slot_no SET DEFAULT 1,
  ALTER COLUMN slot_no SET NOT NULL,
  ALTER COLUMN check_in_window_minutes SET DEFAULT 15,
  ALTER COLUMN check_in_window_minutes SET NOT NULL;

ALTER TABLE public.attendance_sessions
  DROP CONSTRAINT IF EXISTS attendance_sessions_course_date_key,
  DROP CONSTRAINT IF EXISTS attendance_sessions_course_date_slot_key,
  DROP CONSTRAINT IF EXISTS attendance_sessions_slot_no_check,
  DROP CONSTRAINT IF EXISTS attendance_sessions_check_in_window_minutes_check;

ALTER TABLE public.attendance_sessions
  ADD CONSTRAINT attendance_sessions_slot_no_check CHECK (slot_no > 0),
  ADD CONSTRAINT attendance_sessions_check_in_window_minutes_check
    CHECK (check_in_window_minutes > 0),
  ADD CONSTRAINT attendance_sessions_course_date_slot_key
    UNIQUE (course_id, class_date, slot_no);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_meeting_slot
  ON public.attendance_sessions(class_meeting_id, slot_no);

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS class_meeting_id UUID
    REFERENCES public.attendance_class_meetings(id) ON DELETE SET NULL;

UPDATE public.attendance attendance_row
SET session_id = session_row.id
FROM public.attendance_sessions session_row
WHERE attendance_row.session_id IS NULL
  AND attendance_row.course_id = session_row.course_id
  AND attendance_row.class_date = session_row.class_date
  AND (
    SELECT COUNT(*)
    FROM public.attendance_sessions matching_session
    WHERE matching_session.course_id = attendance_row.course_id
      AND matching_session.class_date = attendance_row.class_date
  ) = 1;

UPDATE public.attendance attendance_row
SET class_meeting_id = session_row.class_meeting_id
FROM public.attendance_sessions session_row
WHERE attendance_row.session_id = session_row.id
  AND attendance_row.class_meeting_id IS NULL;

UPDATE public.attendance attendance_row
SET class_meeting_id = meeting.id
FROM public.attendance_class_meetings meeting
WHERE attendance_row.class_meeting_id IS NULL
  AND attendance_row.course_id = meeting.course_id
  AND attendance_row.class_date = meeting.class_date;

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT constraint_info.conname
    FROM (
      SELECT
        con.conname,
        ARRAY_AGG(att.attname::TEXT ORDER BY key_position.ordinality) AS column_names
      FROM pg_constraint con
      JOIN unnest(con.conkey) WITH ORDINALITY AS key_position(attnum, ordinality)
        ON TRUE
      JOIN pg_attribute att
        ON att.attrelid = con.conrelid
       AND att.attnum = key_position.attnum
      WHERE con.conrelid = 'public.attendance'::REGCLASS
        AND con.contype = 'u'
      GROUP BY con.conname
    ) AS constraint_info
    WHERE constraint_info.column_names = ARRAY[
      'course_id',
      'student_id',
      'class_date'
    ]
  LOOP
    EXECUTE FORMAT(
      'ALTER TABLE public.attendance DROP CONSTRAINT %I',
      constraint_record.conname
    );
  END LOOP;
END;
$$;

ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_session_student_key;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_session_student_key UNIQUE (session_id, student_id);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_legacy_course_student_date_key
  ON public.attendance(course_id, student_id, class_date)
  WHERE session_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_class_meeting_id
  ON public.attendance(class_meeting_id);

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
  attendance_status TEXT := 'present';
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
  ORDER BY session_row.starts_at DESC
  LIMIT 1;

  IF active_session.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'The check-in code is invalid or has expired.'
    );
  END IF;

  IF active_session.slot_no > 1
    AND active_session.class_meeting_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.attendance previous_attendance
      JOIN public.attendance_sessions previous_session
        ON previous_session.id = previous_attendance.session_id
      WHERE previous_attendance.student_id = actor_id
        AND previous_session.class_meeting_id = active_session.class_meeting_id
        AND previous_session.slot_no < active_session.slot_no
        AND previous_attendance.status IN ('present', 'late', 'excused')
        AND previous_attendance.marked_present = TRUE
    )
  THEN
    attendance_status := 'late';
  END IF;

  INSERT INTO public.attendance (
    course_id,
    student_id,
    class_date,
    marked_present,
    marked_at,
    marked_by,
    class_meeting_id,
    session_id,
    status,
    check_in_at,
    check_in_method
  )
  VALUES (
    p_course_id,
    actor_id,
    active_session.class_date,
    TRUE,
    NOW(),
    actor_id,
    active_session.class_meeting_id,
    active_session.id,
    attendance_status,
    NOW(),
    'code'
  )
  ON CONFLICT (session_id, student_id)
  DO UPDATE SET
    marked_present = TRUE,
    marked_at = NOW(),
    marked_by = actor_id,
    class_meeting_id = active_session.class_meeting_id,
    status = attendance_status,
    check_in_at = NOW(),
    check_in_method = 'code';

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE
      WHEN attendance_status = 'late' THEN 'Check-in successful. You are marked late for this class meeting.'
      ELSE 'Check-in successful.'
    END,
    'class_date', active_session.class_date,
    'slot_no', active_session.slot_no,
    'status', attendance_status,
    'check_in_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_attendance(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_attendance(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.correct_attendance_session_date(
  p_session_id UUID,
  p_new_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_row public.attendance_sessions%ROWTYPE;
BEGIN
  SELECT session_value.*
  INTO session_row
  FROM public.attendance_sessions session_value
  WHERE session_value.id = p_session_id;

  IF session_row.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Attendance session not found.'
    );
  END IF;

  IF NOT private.is_course_instructor(session_row.course_id) THEN
    RAISE EXCEPTION 'You are not allowed to modify this attendance session.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attendance_sessions active_session
    WHERE (
      active_session.id = session_row.id
      OR (
        session_row.class_meeting_id IS NOT NULL
        AND active_session.class_meeting_id = session_row.class_meeting_id
      )
    )
      AND active_session.status = 'open'
      AND NOW() <= active_session.ends_at
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Close the active check-in session before correcting its date.'
    );
  END IF;

  IF p_new_date = session_row.class_date THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'The class is already on this date.',
      'class_date', session_row.class_date
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attendance_sessions target_session
    WHERE target_session.course_id = session_row.course_id
      AND target_session.class_date = p_new_date
      AND (
        session_row.class_meeting_id IS NULL
        OR target_session.class_meeting_id IS DISTINCT FROM session_row.class_meeting_id
      )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Attendance already exists for the selected date.'
    );
  END IF;

  IF session_row.class_meeting_id IS NOT NULL THEN
    UPDATE public.attendance_class_meetings
    SET class_date = p_new_date,
        updated_at = NOW()
    WHERE id = session_row.class_meeting_id;

    UPDATE public.attendance_sessions
    SET class_date = p_new_date,
        updated_at = NOW()
    WHERE class_meeting_id = session_row.class_meeting_id;

    UPDATE public.attendance
    SET class_date = p_new_date
    WHERE class_meeting_id = session_row.class_meeting_id
      OR session_id IN (
        SELECT related_session.id
        FROM public.attendance_sessions related_session
        WHERE related_session.class_meeting_id = session_row.class_meeting_id
      );
  ELSE
    UPDATE public.attendance
    SET class_date = p_new_date
    WHERE session_id = session_row.id
       OR (
         course_id = session_row.course_id
         AND class_date = session_row.class_date
       );

    UPDATE public.attendance_sessions
    SET class_date = p_new_date,
        updated_at = NOW()
    WHERE id = session_row.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Class attendance date corrected.',
    'class_date', p_new_date
  );
END;
$$;

REVOKE ALL ON FUNCTION public.correct_attendance_session_date(UUID, DATE)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.correct_attendance_session_date(UUID, DATE)
  TO authenticated;
