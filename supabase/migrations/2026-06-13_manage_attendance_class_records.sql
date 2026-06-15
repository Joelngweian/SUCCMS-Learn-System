-- Safely correct or remove an attendance class after a lecturer notices that
-- the original class date was wrong.

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
  WHERE session_value.id = p_session_id
  FOR UPDATE;

  IF session_row.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Attendance session not found.'
    );
  END IF;

  IF NOT public.is_course_instructor(session_row.course_id) THEN
    RAISE EXCEPTION 'You are not allowed to modify this attendance session.';
  END IF;

  IF session_row.status = 'open' AND NOW() <= session_row.ends_at THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Close the active check-in session before correcting its date.'
    );
  END IF;

  IF p_new_date > CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'The class date cannot be in the future.'
    );
  END IF;

  IF p_new_date = session_row.class_date THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Choose a different class date.'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attendance_sessions target_session
    WHERE target_session.course_id = session_row.course_id
      AND target_session.class_date = p_new_date
      AND target_session.id <> session_row.id
  ) OR EXISTS (
    SELECT 1
    FROM public.attendance target_record
    WHERE target_record.course_id = session_row.course_id
      AND target_record.class_date = p_new_date
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Attendance already exists for the selected date.'
    );
  END IF;

  UPDATE public.attendance
  SET class_date = p_new_date
  WHERE course_id = session_row.course_id
    AND class_date = session_row.class_date;

  UPDATE public.attendance_sessions
  SET class_date = p_new_date,
      updated_at = NOW()
  WHERE id = session_row.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Class date corrected successfully.',
    'class_date', p_new_date
  );
END;
$$;

REVOKE ALL ON FUNCTION public.correct_attendance_session_date(UUID, DATE)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.correct_attendance_session_date(UUID, DATE)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_attendance_class(
  p_session_id UUID
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
  WHERE session_value.id = p_session_id
  FOR UPDATE;

  IF session_row.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Attendance session not found.'
    );
  END IF;

  IF NOT public.is_course_instructor(session_row.course_id) THEN
    RAISE EXCEPTION 'You are not allowed to delete this attendance session.';
  END IF;

  IF session_row.status = 'open' AND NOW() <= session_row.ends_at THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Close the active check-in session before deleting it.'
    );
  END IF;

  DELETE FROM public.attendance
  WHERE course_id = session_row.course_id
    AND class_date = session_row.class_date;

  DELETE FROM public.attendance_sessions
  WHERE id = session_row.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Class attendance record deleted.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_attendance_class(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_attendance_class(UUID)
  TO authenticated;

