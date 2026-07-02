-- Separate scheduled class-hour windows from the actual attendance check-in window.
-- starts_at / ends_at now represent the scheduled hour slot, while opened_at
-- records when a lecturer manually opens or reopens the code.

ALTER TABLE public.attendance_sessions
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

-- Older hourly slots stored ends_at as the check-in-window end, so a 1-hour
-- slot could appear as only 10/15 minutes. Normalize those rows for display
-- and exports. The code validity remains controlled by check_in_window_minutes.
UPDATE public.attendance_sessions
SET
  ends_at = starts_at + INTERVAL '1 hour',
  updated_at = NOW()
WHERE slot_no IS NOT NULL
  AND ends_at <= starts_at + INTERVAL '45 minutes';

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
  checked_at TIMESTAMPTZ := NOW();
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
    AND checked_at >= COALESCE(session_row.opened_at, session_row.starts_at)
    AND checked_at <= (
      COALESCE(session_row.opened_at, session_row.starts_at)
      + make_interval(
          mins => GREATEST(1, COALESCE(session_row.check_in_window_minutes, 15))
        )
    )
  ORDER BY COALESCE(session_row.opened_at, session_row.starts_at) DESC
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
    checked_at,
    actor_id,
    active_session.class_meeting_id,
    active_session.id,
    attendance_status,
    checked_at,
    'code'
  )
  ON CONFLICT (session_id, student_id)
  DO UPDATE SET
    marked_present = TRUE,
    marked_at = checked_at,
    marked_by = actor_id,
    class_meeting_id = active_session.class_meeting_id,
    status = attendance_status,
    check_in_at = checked_at,
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
    'check_in_at', checked_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_attendance(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_attendance(UUID, TEXT) TO authenticated;