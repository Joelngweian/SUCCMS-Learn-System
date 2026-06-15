BEGIN;

-- High-fanout notifications use set-based INSERT ... SELECT statements.
-- This keeps notification creation at one database statement per event instead
-- of one function call and insert for every recipient.

CREATE OR REPLACE FUNCTION public.notify_assignment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_name TEXT;
BEGIN
  course_name := public.get_course_offering_name(NEW.course_id);

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    message,
    course_id,
    entity_type,
    entity_id,
    action_url,
    metadata,
    dedupe_key
  )
  SELECT
    enrollment.student_id,
    NEW.created_by,
    'assignment_created',
    'New assignment: ' || NEW.title,
    COALESCE(course_name, 'Course') || ' - due ' ||
      TO_CHAR(NEW.due_date, 'DD Mon YYYY, HH24:MI'),
    NEW.course_id,
    'assignment',
    NEW.id,
    '/courses?courseId=' || NEW.course_id::TEXT ||
      '&assignmentId=' || NEW.id::TEXT,
    JSONB_BUILD_OBJECT('due_date', NEW.due_date),
    'assignment-created:' || NEW.id::TEXT || ':' ||
      enrollment.student_id::TEXT
  FROM public.course_enrollments enrollment
  JOIN public.user_profiles profile
    ON profile.id = enrollment.student_id
  LEFT JOIN public.user_settings settings
    ON settings.user_id = enrollment.student_id
  WHERE enrollment.course_id = NEW.course_id
    AND enrollment.student_id IS DISTINCT FROM NEW.created_by
    AND profile.role <> 'admin'
    AND COALESCE(profile.is_active, TRUE)
    AND COALESCE(settings.assignment_reminders, TRUE)
  ON CONFLICT (dedupe_key) DO NOTHING;

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
  source_actor_id UUID;
BEGIN
  IF NEW.file_type = 'folder' THEN
    RETURN NEW;
  END IF;

  source_actor_id := COALESCE(
    NEW.created_by,
    NEW.uploaded_by,
    auth.uid()
  );
  course_name := public.get_course_offering_name(NEW.course_id);

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    message,
    course_id,
    entity_type,
    entity_id,
    action_url,
    metadata,
    dedupe_key
  )
  SELECT
    enrollment.student_id,
    source_actor_id,
    'course_material_added',
    'New material: ' || NEW.title,
    COALESCE(course_name, 'Course'),
    NEW.course_id,
    'course_material',
    NEW.id,
    '/courses?courseId=' || NEW.course_id::TEXT,
    JSONB_BUILD_OBJECT('file_type', NEW.file_type),
    'course-material:' || NEW.id::TEXT || ':' ||
      enrollment.student_id::TEXT
  FROM public.course_enrollments enrollment
  JOIN public.user_profiles profile
    ON profile.id = enrollment.student_id
  LEFT JOIN public.user_settings settings
    ON settings.user_id = enrollment.student_id
  WHERE enrollment.course_id = NEW.course_id
    AND enrollment.student_id IS DISTINCT FROM source_actor_id
    AND profile.role <> 'admin'
    AND COALESCE(profile.is_active, TRUE)
    AND COALESCE(settings.course_announcements, TRUE)
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_course_post_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    message,
    course_id,
    entity_type,
    entity_id,
    action_url,
    metadata,
    dedupe_key
  )
  SELECT
    members.user_id,
    NEW.author_id,
    'course_post',
    NEW.author_name || ' posted in your course',
    LEFT(NEW.content, 160),
    NEW.course_id,
    'course_post',
    NEW.id,
    '/courses?courseId=' || NEW.course_id::TEXT,
    JSONB_BUILD_OBJECT(
      'attachment_count',
      JSONB_ARRAY_LENGTH(COALESCE(NEW.attachments, '[]'::JSONB))
    ),
    'course-post:' || NEW.id::TEXT || ':' || members.user_id::TEXT
  FROM (
    SELECT enrollment.student_id AS user_id
    FROM public.course_enrollments enrollment
    WHERE enrollment.course_id = NEW.course_id

    UNION

    SELECT instructor.user_id
    FROM public.course_instructors instructor
    WHERE instructor.course_id = NEW.course_id
  ) members
  JOIN public.user_profiles profile ON profile.id = members.user_id
  LEFT JOIN public.user_settings settings
    ON settings.user_id = members.user_id
  WHERE members.user_id IS DISTINCT FROM NEW.author_id
    AND profile.role <> 'admin'
    AND COALESCE(profile.is_active, TRUE)
    AND COALESCE(settings.course_announcements, TRUE)
  ON CONFLICT (dedupe_key) DO NOTHING;

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
BEGIN
  SELECT COALESCE(profile.full_name, 'A student')
  INTO student_name
  FROM public.user_profiles profile
  WHERE profile.id = NEW.student_id;

  course_name := public.get_course_offering_name(NEW.course_id);

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    message,
    course_id,
    entity_type,
    entity_id,
    action_url,
    metadata,
    dedupe_key
  )
  SELECT
    instructor.user_id,
    NEW.student_id,
    'student_enrolled',
    student_name || ' joined ' ||
      COALESCE(course_name, 'your course'),
    'The student now appears in the People list.',
    NEW.course_id,
    'course',
    NEW.course_id,
    '/courses?courseId=' || NEW.course_id::TEXT,
    JSONB_BUILD_OBJECT('enrollment_id', NEW.id),
    'course-enrollment:' || NEW.id::TEXT || ':' ||
      instructor.user_id::TEXT
  FROM public.course_instructors instructor
  JOIN public.user_profiles profile ON profile.id = instructor.user_id
  LEFT JOIN public.user_settings settings
    ON settings.user_id = instructor.user_id
  WHERE instructor.course_id = NEW.course_id
    AND instructor.user_id IS DISTINCT FROM NEW.student_id
    AND profile.role <> 'admin'
    AND COALESCE(profile.is_active, TRUE)
    AND COALESCE(settings.course_announcements, TRUE)
  ON CONFLICT (dedupe_key) DO NOTHING;

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
  source_actor_id UUID;
BEGIN
  source_actor_id := auth.uid();
  course_name := public.get_course_offering_name(NEW.course_id);

  SELECT COALESCE(profile.full_name, 'A lecturer')
  INTO instructor_name
  FROM public.user_profiles profile
  WHERE profile.id = NEW.user_id;

  PERFORM public.create_user_notification(
    NEW.user_id,
    source_actor_id,
    'course_assigned',
    'You are teaching ' || COALESCE(course_name, 'a course'),
    'The course has been added to your teaching list.',
    NEW.course_id,
    'course',
    NEW.course_id,
    '/courses?courseId=' || NEW.course_id::TEXT,
    JSONB_BUILD_OBJECT('course_instructor_id', NEW.id),
    'course-instructor:' || NEW.id::TEXT || ':' || NEW.user_id::TEXT,
    'course_announcements'
  );

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    message,
    course_id,
    entity_type,
    entity_id,
    action_url,
    metadata,
    dedupe_key
  )
  SELECT
    enrollment.student_id,
    source_actor_id,
    'course_instructor_added',
    instructor_name || ' is teaching ' ||
      COALESCE(course_name, 'your course'),
    'A lecturer was added to the course.',
    NEW.course_id,
    'course',
    NEW.course_id,
    '/courses?courseId=' || NEW.course_id::TEXT,
    JSONB_BUILD_OBJECT(
      'course_instructor_id', NEW.id,
      'instructor_id', NEW.user_id
    ),
    'course-instructor:' || NEW.id::TEXT || ':' ||
      enrollment.student_id::TEXT
  FROM public.course_enrollments enrollment
  JOIN public.user_profiles profile
    ON profile.id = enrollment.student_id
  LEFT JOIN public.user_settings settings
    ON settings.user_id = enrollment.student_id
  WHERE enrollment.course_id = NEW.course_id
    AND enrollment.student_id IS DISTINCT FROM source_actor_id
    AND profile.role <> 'admin'
    AND COALESCE(profile.is_active, TRUE)
    AND COALESCE(settings.course_announcements, TRUE)
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_assignment_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignment_row public.assignments%ROWTYPE;
  student_name TEXT;
  source_actor_id UUID;
  grade_changed BOOLEAN;
  submission_changed BOOLEAN;
BEGIN
  SELECT assignment.*
  INTO assignment_row
  FROM public.assignments assignment
  WHERE assignment.id = NEW.assignment_id;

  SELECT COALESCE(profile.full_name, 'A student')
  INTO student_name
  FROM public.user_profiles profile
  WHERE profile.id = NEW.student_id;

  source_actor_id := auth.uid();
  grade_changed := TG_OP = 'INSERT' AND NEW.grade IS NOT NULL;
  submission_changed := TG_OP = 'INSERT';

  IF TG_OP = 'UPDATE' THEN
    grade_changed :=
      NEW.grade IS DISTINCT FROM OLD.grade
      OR NEW.feedback IS DISTINCT FROM OLD.feedback;
    submission_changed :=
      NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
      OR NEW.files IS DISTINCT FROM OLD.files
      OR NEW.submission_file_url IS DISTINCT FROM OLD.submission_file_url
      OR NEW.submission_text IS DISTINCT FROM OLD.submission_text;
  END IF;

  IF submission_changed AND source_actor_id = NEW.student_id THEN
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      type,
      title,
      message,
      course_id,
      entity_type,
      entity_id,
      action_url,
      metadata,
      dedupe_key
    )
    SELECT
      instructor.user_id,
      NEW.student_id,
      'assignment_submitted',
      student_name || ' submitted ' || assignment_row.title,
      'A submission is ready for review.',
      assignment_row.course_id,
      'assignment',
      assignment_row.id,
      '/courses?courseId=' || assignment_row.course_id::TEXT ||
        '&assignmentId=' || assignment_row.id::TEXT,
      JSONB_BUILD_OBJECT('submission_id', NEW.id),
      'assignment-submitted:' || NEW.id::TEXT || ':' ||
        NEW.submitted_at::TEXT || ':' || instructor.user_id::TEXT
    FROM public.course_instructors instructor
    JOIN public.user_profiles profile ON profile.id = instructor.user_id
    LEFT JOIN public.user_settings settings
      ON settings.user_id = instructor.user_id
    WHERE instructor.course_id = assignment_row.course_id
      AND instructor.user_id IS DISTINCT FROM NEW.student_id
      AND profile.role <> 'admin'
      AND COALESCE(profile.is_active, TRUE)
      AND COALESCE(settings.course_announcements, TRUE)
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;

  IF grade_changed THEN
    PERFORM public.create_user_notification(
      NEW.student_id,
      source_actor_id,
      'grade_posted',
      'Grade posted for ' || assignment_row.title,
      CASE
        WHEN NEW.grade IS NULL
          THEN 'Your assignment feedback was updated.'
        ELSE 'Your grade is ' || NEW.grade || ' / ' ||
          assignment_row.max_score || '.'
      END,
      assignment_row.course_id,
      'assignment',
      assignment_row.id,
      '/courses?courseId=' || assignment_row.course_id::TEXT ||
        '&assignmentId=' || assignment_row.id::TEXT,
      JSONB_BUILD_OBJECT('submission_id', NEW.id, 'grade', NEW.grade),
      'assignment-grade:' || NEW.id::TEXT || ':' || TXID_CURRENT()::TEXT,
      'grade_updates'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_forum_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thread_row public.forum_threads%ROWTYPE;
  actor_name TEXT;
BEGIN
  SELECT thread.*
  INTO thread_row
  FROM public.forum_threads thread
  WHERE thread.id = NEW.thread_id;

  SELECT COALESCE(profile.full_name, 'Someone')
  INTO actor_name
  FROM public.user_profiles profile
  WHERE profile.id = NEW.author_id;

  WITH candidates AS (
    SELECT
      thread_row.author_id AS user_id,
      1 AS priority,
      'forum_reply'::TEXT AS notification_type,
      actor_name || ' replied to your discussion' AS notification_title,
      JSONB_BUILD_OBJECT('reply_id', NEW.id) AS notification_metadata

    UNION ALL

    SELECT
      parent.author_id,
      2,
      'forum_reply',
      actor_name || ' replied to your comment',
      JSONB_BUILD_OBJECT(
        'reply_id', NEW.id,
        'parent_id', NEW.parent_id
      )
    FROM public.forum_replies parent
    WHERE NEW.parent_id IS NOT NULL
      AND parent.id = NEW.parent_id

    UNION ALL

    SELECT
      members.user_id,
      3,
      'forum_mention',
      actor_name || ' mentioned everyone',
      JSONB_BUILD_OBJECT('reply_id', NEW.id)
    FROM (
      SELECT enrollment.student_id AS user_id
      FROM public.course_enrollments enrollment
      WHERE enrollment.course_id = thread_row.course_id

      UNION

      SELECT instructor.user_id
      FROM public.course_instructors instructor
      WHERE instructor.course_id = thread_row.course_id

      UNION

      SELECT profile.id
      FROM public.user_profiles profile
      WHERE thread_row.course_id IS NULL
        AND profile.role IN ('student', 'lecturer')
        AND COALESCE(profile.is_active, TRUE)
    ) members
    WHERE LOWER(NEW.content) LIKE '%@everyone%'

    UNION ALL

    SELECT
      mentioned.id,
      4,
      'forum_mention',
      actor_name || ' mentioned you',
      JSONB_BUILD_OBJECT('reply_id', NEW.id)
    FROM public.user_profiles mentioned
    WHERE mentioned.role IN ('student', 'lecturer')
      AND COALESCE(mentioned.is_active, TRUE)
      AND POSITION(
        LOWER(
          '@' || REGEXP_REPLACE(mentioned.full_name, '\s+', '', 'g')
        )
        IN LOWER(NEW.content)
      ) > 0
  ),
  recipients AS (
    SELECT DISTINCT ON (candidate.user_id)
      candidate.user_id,
      candidate.notification_type,
      candidate.notification_title,
      candidate.notification_metadata
    FROM candidates candidate
    WHERE candidate.user_id IS NOT NULL
    ORDER BY candidate.user_id, candidate.priority
  )
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    message,
    course_id,
    entity_type,
    entity_id,
    action_url,
    metadata,
    dedupe_key
  )
  SELECT
    recipient.user_id,
    NEW.author_id,
    recipient.notification_type,
    recipient.notification_title,
    LEFT(NEW.content, 160),
    thread_row.course_id,
    'forum_thread',
    thread_row.id,
    '/forum',
    recipient.notification_metadata,
    'forum-reply:' || NEW.id::TEXT || ':' || recipient.user_id::TEXT
  FROM recipients recipient
  JOIN public.user_profiles profile ON profile.id = recipient.user_id
  LEFT JOIN public.user_settings settings
    ON settings.user_id = recipient.user_id
  WHERE recipient.user_id IS DISTINCT FROM NEW.author_id
    AND profile.role <> 'admin'
    AND COALESCE(profile.is_active, TRUE)
    AND COALESCE(settings.forum_replies, TRUE)
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_study_group_session_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_course_id UUID;
  actor_name TEXT;
BEGIN
  SELECT study_group.course_id
  INTO group_course_id
  FROM public.study_groups study_group
  WHERE study_group.id = NEW.group_id;

  SELECT COALESCE(profile.full_name, 'A group owner')
  INTO actor_name
  FROM public.user_profiles profile
  WHERE profile.id = NEW.created_by;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    message,
    course_id,
    entity_type,
    entity_id,
    action_url,
    metadata,
    dedupe_key
  )
  SELECT
    member.user_id,
    NEW.created_by,
    'study_group_session',
    'New study session scheduled',
    actor_name || ' scheduled ' || NEW.title || ' for ' ||
      TO_CHAR(NEW.starts_at, 'DD Mon YYYY HH24:MI'),
    group_course_id,
    'study_group_session',
    NEW.id,
    '/study-groups?groupId=' || NEW.group_id::TEXT,
    JSONB_BUILD_OBJECT('group_id', NEW.group_id),
    'study-session-created:' || NEW.id::TEXT || ':' ||
      member.user_id::TEXT
  FROM public.study_group_members member
  JOIN public.user_profiles profile ON profile.id = member.user_id
  WHERE member.group_id = NEW.group_id
    AND member.user_id IS DISTINCT FROM NEW.created_by
    AND profile.role <> 'admin'
    AND COALESCE(profile.is_active, TRUE)
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_study_session_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_count INTEGER := 0;
BEGIN
  WITH due_sessions AS (
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
  ),
  inserted AS (
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      type,
      title,
      message,
      course_id,
      entity_type,
      entity_id,
      action_url,
      metadata,
      dedupe_key
    )
    SELECT
      member.user_id,
      due.created_by,
      'study_group_reminder',
      'Study session starts soon',
      due.title || ' starts at ' || TO_CHAR(due.starts_at, 'HH24:MI'),
      due.course_id,
      'study_group_session',
      due.id,
      '/study-groups?groupId=' || due.group_id::TEXT,
      JSONB_BUILD_OBJECT('group_id', due.group_id),
      'study-session-reminder:' || due.id::TEXT || ':' ||
        member.user_id::TEXT
    FROM due_sessions due
    JOIN public.study_group_members member
      ON member.group_id = due.group_id
    JOIN public.user_profiles profile ON profile.id = member.user_id
    WHERE member.user_id IS DISTINCT FROM due.created_by
      AND profile.role <> 'admin'
      AND COALESCE(profile.is_active, TRUE)
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING 1
  ),
  marked AS (
    UPDATE public.study_group_sessions session
    SET reminder_sent_at = NOW()
    WHERE session.id IN (SELECT due.id FROM due_sessions due)
    RETURNING session.id
  )
  SELECT COUNT(*)::INTEGER
  INTO created_count
  FROM inserted;

  RETURN created_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins_new_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reporter_name TEXT;
  target_name TEXT;
BEGIN
  IF TO_REGCLASS('public.notifications') IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(profile.full_name, 'A user')
  INTO reporter_name
  FROM public.user_profiles profile
  WHERE profile.id = NEW.reporter_id;

  SELECT COALESCE(profile.full_name, 'a user')
  INTO target_name
  FROM public.user_profiles profile
  WHERE profile.id = NEW.reported_user_id;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    message,
    entity_type,
    entity_id,
    action_url,
    metadata,
    dedupe_key
  )
  SELECT
    admin_profile.id,
    NEW.reporter_id,
    'moderation_report',
    'New ' || NEW.report_type || ' report',
    reporter_name || ' reported ' || target_name || '.',
    'report',
    NEW.id,
    '/',
    JSONB_BUILD_OBJECT('report_id', NEW.id),
    'moderation-report:' || NEW.id::TEXT || ':' ||
      admin_profile.id::TEXT
  FROM public.user_profiles admin_profile
  WHERE admin_profile.role = 'admin'
    AND COALESCE(admin_profile.is_active, TRUE)
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
