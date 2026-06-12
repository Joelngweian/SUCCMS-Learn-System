-- Unified in-app notifications for user activity.

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  entity_type TEXT,
  entity_id UUID,
  action_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT NOT NULL UNIQUE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications(recipient_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (is_read, read_at) ON public.notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.notification_preference_enabled(
  target_user_id UUID,
  preference_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enabled BOOLEAN;
BEGIN
  SELECT CASE preference_name
    WHEN 'forum_replies' THEN settings.forum_replies
    WHEN 'grade_updates' THEN settings.grade_updates
    WHEN 'assignment_reminders' THEN settings.assignment_reminders
    WHEN 'course_announcements' THEN settings.course_announcements
    ELSE TRUE
  END
  INTO enabled
  FROM public.user_settings settings
  WHERE settings.user_id = target_user_id;

  RETURN COALESCE(enabled, TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_notification(
  target_user_id UUID,
  source_actor_id UUID,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  target_course_id UUID,
  target_entity_type TEXT,
  target_entity_id UUID,
  target_action_url TEXT,
  notification_metadata JSONB,
  notification_dedupe_key TEXT,
  preference_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_user_id IS NULL OR target_user_id = source_actor_id THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = target_user_id
      AND profile.role <> 'admin'
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    RETURN;
  END IF;

  IF preference_name IS NOT NULL
     AND NOT public.notification_preference_enabled(target_user_id, preference_name) THEN
    RETURN;
  END IF;

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
  VALUES (
    target_user_id,
    source_actor_id,
    notification_type,
    notification_title,
    COALESCE(notification_message, ''),
    target_course_id,
    target_entity_type,
    target_entity_id,
    target_action_url,
    COALESCE(notification_metadata, '{}'::jsonb),
    notification_dedupe_key
  )
  ON CONFLICT (dedupe_key) DO NOTHING;
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
  recipient RECORD;
  parent_author_id UUID;
  mention_token TEXT;
BEGIN
  SELECT * INTO thread_row
  FROM public.forum_threads
  WHERE id = NEW.thread_id;

  SELECT COALESCE(full_name, 'Someone') INTO actor_name
  FROM public.user_profiles
  WHERE id = NEW.author_id;

  PERFORM public.create_user_notification(
    thread_row.author_id,
    NEW.author_id,
    'forum_reply',
    actor_name || ' replied to your discussion',
    LEFT(NEW.content, 160),
    thread_row.course_id,
    'forum_thread',
    thread_row.id,
    '/forum',
    jsonb_build_object('reply_id', NEW.id),
    'forum-reply:' || NEW.id || ':' || thread_row.author_id,
    'forum_replies'
  );

  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_author_id
    FROM public.forum_replies
    WHERE id = NEW.parent_id;

    PERFORM public.create_user_notification(
      parent_author_id,
      NEW.author_id,
      'forum_reply',
      actor_name || ' replied to your comment',
      LEFT(NEW.content, 160),
      thread_row.course_id,
      'forum_thread',
      thread_row.id,
      '/forum',
      jsonb_build_object('reply_id', NEW.id, 'parent_id', NEW.parent_id),
      'forum-reply:' || NEW.id || ':' || parent_author_id,
      'forum_replies'
    );
  END IF;

  IF LOWER(NEW.content) LIKE '%@everyone%' THEN
    FOR recipient IN
      SELECT member_id
      FROM (
        SELECT enrollment.student_id AS member_id
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
    LOOP
      PERFORM public.create_user_notification(
        recipient.member_id,
        NEW.author_id,
        'forum_mention',
        actor_name || ' mentioned everyone',
        LEFT(NEW.content, 160),
        thread_row.course_id,
        'forum_thread',
        thread_row.id,
        '/forum',
        jsonb_build_object('reply_id', NEW.id),
        'forum-reply:' || NEW.id || ':' || recipient.member_id,
        'forum_replies'
      );
    END LOOP;
  END IF;

  FOR recipient IN
    SELECT profile.id, profile.full_name
    FROM public.user_profiles profile
    WHERE profile.role IN ('student', 'lecturer')
      AND COALESCE(profile.is_active, TRUE)
  LOOP
    mention_token := '@' || REGEXP_REPLACE(recipient.full_name, '\s+', '', 'g');

    IF POSITION(LOWER(mention_token) IN LOWER(NEW.content)) > 0 THEN
      PERFORM public.create_user_notification(
        recipient.id,
        NEW.author_id,
        'forum_mention',
        actor_name || ' mentioned you',
        LEFT(NEW.content, 160),
        thread_row.course_id,
        'forum_thread',
        thread_row.id,
        '/forum',
        jsonb_build_object('reply_id', NEW.id),
        'forum-reply:' || NEW.id || ':' || recipient.id,
        'forum_replies'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_forum_reply_insert ON public.forum_replies;
CREATE TRIGGER notify_forum_reply_insert
  AFTER INSERT ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_forum_reply();

CREATE OR REPLACE FUNCTION public.notify_forum_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_author_id UUID;
  target_course_id UUID;
  target_thread_id UUID;
  actor_name TEXT;
BEGIN
  SELECT COALESCE(full_name, 'Someone') INTO actor_name
  FROM public.user_profiles
  WHERE id = NEW.user_id;

  IF TG_TABLE_NAME = 'forum_reactions' THEN
    SELECT author_id, course_id, id
    INTO target_author_id, target_course_id, target_thread_id
    FROM public.forum_threads
    WHERE id = NEW.thread_id;
  ELSE
    SELECT reply.author_id, thread.course_id, thread.id
    INTO target_author_id, target_course_id, target_thread_id
    FROM public.forum_replies reply
    JOIN public.forum_threads thread ON thread.id = reply.thread_id
    WHERE reply.id = NEW.reply_id;
  END IF;

  PERFORM public.create_user_notification(
    target_author_id,
    NEW.user_id,
    'forum_reaction',
    actor_name || ' reacted to your ' ||
      CASE WHEN TG_TABLE_NAME = 'forum_reactions' THEN 'discussion' ELSE 'comment' END,
    NEW.type,
    target_course_id,
    'forum_thread',
    target_thread_id,
    '/forum',
    jsonb_build_object('reaction', NEW.type),
    'forum-reaction:' || TG_TABLE_NAME || ':' || NEW.id || ':' || target_author_id,
    'forum_replies'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_forum_thread_reaction_insert ON public.forum_reactions;
CREATE TRIGGER notify_forum_thread_reaction_insert
  AFTER INSERT ON public.forum_reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_forum_reaction();

DROP TRIGGER IF EXISTS notify_forum_reply_reaction_insert ON public.forum_reply_reactions;
CREATE TRIGGER notify_forum_reply_reaction_insert
  AFTER INSERT ON public.forum_reply_reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_forum_reaction();

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
  SELECT name INTO course_name FROM public.courses WHERE id = NEW.course_id;

  FOR recipient IN
    SELECT student_id FROM public.course_enrollments WHERE course_id = NEW.course_id
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
      jsonb_build_object('due_date', NEW.due_date),
      'assignment-created:' || NEW.id || ':' || recipient.student_id,
      'assignment_reminders'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_assignment_created_insert ON public.assignments;
CREATE TRIGGER notify_assignment_created_insert
  AFTER INSERT ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_created();

CREATE OR REPLACE FUNCTION public.notify_assignment_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignment_row public.assignments%ROWTYPE;
  student_name TEXT;
  recipient RECORD;
  source_actor_id UUID;
  grade_changed BOOLEAN;
  submission_changed BOOLEAN;
BEGIN
  SELECT * INTO assignment_row
  FROM public.assignments
  WHERE id = NEW.assignment_id;

  SELECT COALESCE(full_name, 'A student') INTO student_name
  FROM public.user_profiles
  WHERE id = NEW.student_id;

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
    FOR recipient IN
      SELECT user_id
      FROM public.course_instructors
      WHERE course_id = assignment_row.course_id
      UNION
      SELECT lecturer_id
      FROM public.courses
      WHERE id = assignment_row.course_id
        AND lecturer_id IS NOT NULL
    LOOP
      PERFORM public.create_user_notification(
        recipient.user_id,
        NEW.student_id,
        'assignment_submitted',
        student_name || ' submitted ' || assignment_row.title,
        'A submission is ready for review.',
        assignment_row.course_id,
        'assignment',
        assignment_row.id,
        '/courses?courseId=' || assignment_row.course_id || '&assignmentId=' || assignment_row.id,
        jsonb_build_object('submission_id', NEW.id),
        'assignment-submitted:' || NEW.id || ':' || NEW.submitted_at || ':' || recipient.user_id,
        'course_announcements'
      );
    END LOOP;
  END IF;

  IF grade_changed THEN
    PERFORM public.create_user_notification(
      NEW.student_id,
      source_actor_id,
      'grade_posted',
      'Grade posted for ' || assignment_row.title,
      CASE
        WHEN NEW.grade IS NULL THEN 'Your assignment feedback was updated.'
        ELSE 'Your grade is ' || NEW.grade || ' / ' || assignment_row.max_score || '.'
      END,
      assignment_row.course_id,
      'assignment',
      assignment_row.id,
      '/courses?courseId=' || assignment_row.course_id || '&assignmentId=' || assignment_row.id,
      jsonb_build_object('submission_id', NEW.id, 'grade', NEW.grade),
      'assignment-grade:' || NEW.id || ':' || TXID_CURRENT(),
      'grade_updates'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_assignment_submission_change ON public.assignment_submissions;
CREATE TRIGGER notify_assignment_submission_change
  AFTER INSERT OR UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_submission();

CREATE OR REPLACE FUNCTION public.notify_student_grade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignment_title TEXT;
BEGIN
  SELECT title INTO assignment_title
  FROM public.assignments
  WHERE id = NEW.assignment_id;

  PERFORM public.create_user_notification(
    NEW.student_id,
    NEW.graded_by,
    'grade_posted',
    'New grade posted',
    COALESCE(assignment_title, 'Course assessment') || ': ' || NEW.score || ' / ' || NEW.max_score,
    NEW.course_id,
    CASE WHEN NEW.assignment_id IS NULL THEN 'course' ELSE 'assignment' END,
    COALESCE(NEW.assignment_id, NEW.course_id),
    CASE
      WHEN NEW.assignment_id IS NULL THEN '/progress'
      ELSE '/courses?courseId=' || NEW.course_id || '&assignmentId=' || NEW.assignment_id
    END,
    jsonb_build_object('grade_id', NEW.id, 'score', NEW.score, 'max_score', NEW.max_score),
    'student-grade:' || NEW.id || ':' || TXID_CURRENT(),
    'grade_updates'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_student_grade_change ON public.student_grades;
CREATE TRIGGER notify_student_grade_change
  AFTER INSERT OR UPDATE OF score, max_score, feedback ON public.student_grades
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_grade();

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
  SELECT name INTO course_name FROM public.courses WHERE id = NEW.course_id;

  FOR recipient IN
    SELECT student_id FROM public.course_enrollments WHERE course_id = NEW.course_id
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
      jsonb_build_object('file_type', NEW.file_type),
      'course-material:' || NEW.id || ':' || recipient.student_id,
      'course_announcements'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_course_material_created_insert ON public.course_materials;
CREATE TRIGGER notify_course_material_created_insert
  AFTER INSERT ON public.course_materials
  FOR EACH ROW EXECUTE FUNCTION public.notify_course_material_created();

CREATE OR REPLACE FUNCTION public.notify_course_post_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient RECORD;
BEGIN
  FOR recipient IN
    SELECT member_id
    FROM (
      SELECT student_id AS member_id
      FROM public.course_enrollments
      WHERE course_id = NEW.course_id
      UNION
      SELECT user_id
      FROM public.course_instructors
      WHERE course_id = NEW.course_id
    ) members
  LOOP
    PERFORM public.create_user_notification(
      recipient.member_id,
      NEW.author_id,
      'course_post',
      NEW.author_name || ' posted in your course',
      LEFT(NEW.content, 160),
      NEW.course_id,
      'course_post',
      NEW.id,
      '/courses?courseId=' || NEW.course_id,
      jsonb_build_object('attachment_count', JSONB_ARRAY_LENGTH(NEW.attachments)),
      'course-post:' || NEW.id || ':' || recipient.member_id,
      'course_announcements'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_course_post_created_insert ON public.course_posts;
CREATE TRIGGER notify_course_post_created_insert
  AFTER INSERT ON public.course_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_course_post_created();

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
  SELECT COALESCE(full_name, 'A student') INTO student_name
  FROM public.user_profiles WHERE id = NEW.student_id;
  SELECT name INTO course_name FROM public.courses WHERE id = NEW.course_id;

  FOR recipient IN
    SELECT user_id
    FROM public.course_instructors
    WHERE course_id = NEW.course_id
    UNION
    SELECT lecturer_id
    FROM public.courses
    WHERE id = NEW.course_id
      AND lecturer_id IS NOT NULL
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
      jsonb_build_object('enrollment_id', NEW.id),
      'course-enrollment:' || NEW.id || ':' || recipient.user_id,
      'course_announcements'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_course_enrollment_created_insert ON public.course_enrollments;
CREATE TRIGGER notify_course_enrollment_created_insert
  AFTER INSERT ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.notify_course_enrollment_created();

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
  SELECT name INTO course_name FROM public.courses WHERE id = NEW.course_id;
  SELECT COALESCE(full_name, 'A lecturer') INTO instructor_name
  FROM public.user_profiles WHERE id = NEW.user_id;

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
    jsonb_build_object('course_instructor_id', NEW.id),
    'course-instructor:' || NEW.id || ':' || NEW.user_id,
    'course_announcements'
  );

  FOR recipient IN
    SELECT student_id FROM public.course_enrollments WHERE course_id = NEW.course_id
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
      jsonb_build_object('course_instructor_id', NEW.id, 'instructor_id', NEW.user_id),
      'course-instructor:' || NEW.id || ':' || recipient.student_id,
      'course_announcements'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_course_instructor_created_insert ON public.course_instructors;
CREATE TRIGGER notify_course_instructor_created_insert
  AFTER INSERT ON public.course_instructors
  FOR EACH ROW EXECUTE FUNCTION public.notify_course_instructor_created();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

NOTIFY pgrst, 'reload schema';
