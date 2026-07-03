-- SUCCMS Learn 4.0 - Complete Database Schema
-- This schema supports user authentication, courses, assignments, posts, stories, and leaderboards

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL UNIQUE, -- Username must be unique for login
  role TEXT NOT NULL CHECK (role IN ('student', 'lecturer', 'admin', 'staff')),
  program_or_department TEXT, -- e.g., "Computer Science" or "Faculty of Engineering"
  faculty TEXT,
  programme TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ
);

-- Social follows between student and lecturer profiles
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT follows_users_must_differ CHECK (follower_id <> following_id),
  CONSTRAINT follows_follower_following_unique UNIQUE (follower_id, following_id)
);

-- ============================================================================
-- COURSES & ASSIGNMENTS
-- ============================================================================

-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- e.g., "CS301"
  course_code TEXT UNIQUE,
  name TEXT NOT NULL,
  chinese_name TEXT,
  description TEXT,
  lecturer_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  faculty TEXT,
  programme TEXT,
  course_type TEXT,
  semester TEXT, -- e.g., "Spring 2024"
  credits INTEGER DEFAULT 3,
  credit_hours INTEGER,
  max_students INTEGER,
  max_capacity INTEGER,
  enrollment_key TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Course enrollments (students enrolled in courses)
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- Course instructors (lecturers teaching courses)
CREATE TABLE IF NOT EXISTS public.course_instructors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

-- Course materials (documents, videos, etc.)
CREATE TABLE IF NOT EXISTS public.course_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.course_materials(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_url TEXT,
  file_type TEXT, -- e.g., "pdf", "video", "document"
  size BIGINT DEFAULT 0,
  ms_drive_id TEXT,
  ms_drive_item_id TEXT,
  ms_web_url TEXT,
  ms_edit_url TEXT,
  ms_last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  downloads_count INTEGER DEFAULT 0
);

-- Assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ NOT NULL,
  max_score INTEGER DEFAULT 100,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assignment submissions
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  submission_file_url TEXT,
  submission_text TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_late BOOLEAN DEFAULT FALSE,
  grade INTEGER,
  feedback TEXT,
  UNIQUE(assignment_id, student_id)
);

-- ============================================================================
-- GRADES & ATTENDANCE
-- ============================================================================

-- Student grades
CREATE TABLE IF NOT EXISTS public.student_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  max_score INTEGER DEFAULT 100,
  graded_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  feedback TEXT,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id, assignment_id)
);

-- Attendance tracking
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  class_date DATE NOT NULL,
  marked_present BOOLEAN DEFAULT FALSE,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  marked_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  UNIQUE(course_id, student_id, class_date)
);

-- Student GPA summary (cached for performance)
CREATE TABLE IF NOT EXISTS public.student_gpa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID UNIQUE NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  gpa DECIMAL(3, 2) DEFAULT 0.0,
  total_credits INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- POSTS, COMMENTS, LIKES & REACTIONS
-- ============================================================================

-- Forum posts
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE
);

-- Course posts (course announcements and updates)
CREATE TABLE IF NOT EXISTS public.course_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT course_posts_has_content CHECK (
    LENGTH(TRIM(content)) > 0
    OR (
      jsonb_typeof(attachments) = 'array'
      AND jsonb_array_length(attachments) > 0
    )
  )
);

-- Comments on posts
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE, -- For nested replies
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Likes on posts
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Reactions on posts/comments (emoji reactions)
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL, -- e.g., "👍", "❤️", "😂", "😢", "🔥"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL)),
  UNIQUE(post_id, comment_id, user_id, reaction_type)
);

-- Post views tracking
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- ============================================================================
-- STORIES
-- ============================================================================

-- User stories (Instagram-like stories that expire after 24 hours)
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  content TEXT,
  content_type TEXT CHECK (content_type IN ('image', 'video', 'text', 'assignment', 'grade', 'course')),
  media_url TEXT,
  image_url TEXT,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Story views
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewed_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(story_id, viewed_by)
);

-- User and story reports for administrator moderation
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL
    CONSTRAINT reports_reporter_id_fkey
    REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL
    CONSTRAINT reports_reported_user_id_fkey
    REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('user', 'story')),
  story_id UUID
    CONSTRAINT reports_story_id_fkey
    REFERENCES public.stories(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (
    reason IN ('harassment', 'threats', 'impersonation', 'inappropriate', 'spam', 'other')
  ),
  details TEXT,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolved_by UUID
    CONSTRAINT reports_resolved_by_fkey
    REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reports_cannot_target_self CHECK (reporter_id <> reported_user_id),
  CONSTRAINT reports_target_matches_type CHECK (
    (report_type = 'user' AND story_id IS NULL)
    OR report_type = 'story'
  )
);

-- ============================================================================
-- ANNOUNCEMENTS
-- ============================================================================

-- Admin announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Announcement reads (track who has read which announcement)
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- ============================================================================
-- LEADERBOARD
-- ============================================================================

-- Leaderboard (cached table for performance)
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID UNIQUE NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE, -- NULL for overall leaderboard
  average_score DECIMAL(5, 2) DEFAULT 0.0,
  rank INTEGER,
  total_assignments_completed INTEGER DEFAULT 0,
  attendance_percentage DECIMAL(5, 2) DEFAULT 0.0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  week_start_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incremental XP event ledger and cached student summaries
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  earned_at TIMESTAMPTZ NOT NULL,
  week_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_type, source_id)
);

CREATE TABLE IF NOT EXISTS public.student_xp_summary (
  student_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.weekly_xp_summary (
  student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  weekly_xp INTEGER NOT NULL DEFAULT 0 CHECK (weekly_xp >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(student_id, week_start_date)
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_courses_lecturer_id ON public.courses(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_created ON public.follows(follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following_created ON public.follows(following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_instructors_user_id ON public.course_instructors(user_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_course_id ON public.course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_course_parent ON public.course_materials(course_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_created_by ON public.course_materials(created_by);
CREATE INDEX IF NOT EXISTS idx_course_materials_ms_drive_item_id ON public.course_materials(ms_drive_item_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_student_id ON public.student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_course_id ON public.student_grades(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_course_id ON public.posts(course_id);
CREATE INDEX IF NOT EXISTS idx_course_posts_course_id ON public.course_posts(course_id);
CREATE INDEX IF NOT EXISTS idx_course_posts_author_id ON public.course_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON public.story_views(story_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_pending_user_unique
  ON public.reports(reporter_id, reported_user_id)
  WHERE report_type = 'user' AND status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_pending_story_unique
  ON public.reports(reporter_id, story_id)
  WHERE report_type = 'story' AND status = 'pending' AND story_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON public.reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user
  ON public.reports(reported_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_admin_id ON public.announcements(admin_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_student_id ON public.leaderboard(student_id);

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

CREATE OR REPLACE FUNCTION public.protect_course_material_descendants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
GRANT EXECUTE ON FUNCTION public.course_id_from_storage_path(TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.course_material_parent_matches(UUID, UUID)
  TO authenticated;

DROP TRIGGER IF EXISTS protect_course_material_descendants
  ON public.course_materials;
CREATE TRIGGER protect_course_material_descendants
  BEFORE DELETE ON public.course_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_course_material_descendants();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_gpa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- USER_PROFILES RLS Policies

-- Unauthenticated users can read profiles (needed for login lookup)
CREATE POLICY "Allow unauthenticated users to lookup profiles for login"
  ON public.user_profiles FOR SELECT
  USING (true);

-- Service role can insert profiles (for trigger on auth user creation)
CREATE POLICY "Allow service role to insert profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (true);

-- Users can update their own profile
CREATE POLICY "Allow users to update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Only admins can insert new profiles (via trigger on auth.users)
CREATE POLICY "Allow admins to manage profiles"
  ON public.user_profiles FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role = 'admin'
    )
  );

-- FOLLOWS RLS Policies
CREATE POLICY "Authenticated users can view follows"
  ON public.follows FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can follow active profiles"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (
    follower_id = auth.uid()
    AND follower_id <> following_id
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles target
      WHERE target.id = following_id
        AND target.role <> 'admin'
        AND COALESCE(target.is_active, TRUE)
    )
  );

CREATE POLICY "Users can unfollow profiles"
  ON public.follows FOR DELETE
  TO authenticated
  USING (
    follower_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  );

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;

-- COURSES RLS Policies
-- All authenticated users can view courses
CREATE POLICY "Allow all authenticated users to view courses"
  ON public.courses FOR SELECT
  USING (auth.role() = 'authenticated');

-- Lecturers can create and edit their own courses
CREATE POLICY "Allow lecturers to manage their courses"
  ON public.courses FOR ALL
  USING (
    auth.uid() = lecturer_id OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- COURSE_ENROLLMENTS RLS Policies
-- Students can view their own enrollments
CREATE POLICY "Allow students to view their enrollments"
  ON public.course_enrollments FOR SELECT
  USING (
    auth.uid() = student_id OR
    auth.uid() IN (
      SELECT lecturer_id FROM public.courses WHERE id = course_id
    ) OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- Students can enroll themselves, lecturers can enroll students
CREATE POLICY "Allow students and lecturers to manage enrollments"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (
    auth.uid() = student_id OR
    auth.uid() IN (
      SELECT lecturer_id FROM public.courses WHERE id = course_id
    ) OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- COURSE_INSTRUCTORS RLS Policies
-- Authenticated users can view course lecturer assignments
CREATE POLICY "Allow authenticated users to view course instructors"
  ON public.course_instructors FOR SELECT
  USING (auth.role() = 'authenticated');

-- Lecturers can add themselves to a course from the course catalog
CREATE POLICY "Allow lecturers to add themselves to courses"
  ON public.course_instructors FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE role IN ('lecturer', 'admin')
    )
  );

-- Lecturers can remove their own course assignments
CREATE POLICY "Allow lecturers to remove their own course links"
  ON public.course_instructors FOR DELETE
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- COURSE_MATERIALS RLS Policies
CREATE POLICY "Course members can view materials"
  ON public.course_materials FOR SELECT
  TO authenticated
  USING (public.is_course_member(course_id));

CREATE POLICY "Course members can create materials"
  ON public.course_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.is_course_member(course_id)
    AND public.course_material_parent_matches(parent_id, course_id)
  );

CREATE POLICY "Material owners and course managers can update materials"
  ON public.course_materials FOR UPDATE
  TO authenticated
  USING (
    public.is_course_member(course_id)
    AND (
      auth.uid() = created_by
      OR public.is_course_manager(course_id)
    )
  )
  WITH CHECK (
    public.is_course_member(course_id)
    AND (
      auth.uid() = created_by
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
      auth.uid() = created_by
      OR public.is_course_manager(course_id)
    )
  );

-- ASSIGNMENTS RLS Policies
-- All authenticated users can view assignments for enrolled courses
CREATE POLICY "Allow enrolled users to view assignments"
  ON public.assignments FOR SELECT
  USING (
    auth.uid() IN (
      SELECT student_id FROM public.course_enrollments WHERE course_id = course_id
    ) OR
    auth.uid() IN (
      SELECT lecturer_id FROM public.courses WHERE id = course_id
    ) OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- Lecturers can create and edit assignments for their courses
CREATE POLICY "Allow lecturers to manage assignments"
  ON public.assignments FOR ALL
  USING (
    auth.uid() IN (
      SELECT lecturer_id FROM public.courses WHERE id = course_id
    ) OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- ASSIGNMENT_SUBMISSIONS RLS Policies
-- Students can view their own submissions
CREATE POLICY "Allow students to view their submissions"
  ON public.assignment_submissions FOR SELECT
  USING (
    auth.uid() = student_id OR
    auth.uid() IN (
      SELECT created_by FROM public.assignments WHERE id = assignment_id
    ) OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- Students can submit assignments
CREATE POLICY "Allow students to submit assignments"
  ON public.assignment_submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can update their own submissions, lecturers can update grades
CREATE POLICY "Allow students and lecturers to update submissions"
  ON public.assignment_submissions FOR UPDATE
  USING (
    auth.uid() = student_id OR
    auth.uid() IN (
      SELECT lecturer_id FROM public.courses WHERE id IN
        (SELECT course_id FROM public.assignments WHERE id = assignment_id)
    ) OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() = student_id OR
    auth.uid() IN (
      SELECT lecturer_id FROM public.courses WHERE id IN
        (SELECT course_id FROM public.assignments WHERE id = assignment_id)
    ) OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- STUDENT_GRADES RLS Policies
-- Students can view their own grades
CREATE POLICY "Allow students to view their grades"
  ON public.student_grades FOR SELECT
  USING (
    auth.uid() = student_id OR
    auth.uid() IN (
      SELECT lecturer_id FROM public.courses WHERE id = course_id
    ) OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- Lecturers can create and update grades
CREATE POLICY "Allow lecturers to manage grades"
  ON public.student_grades FOR ALL
  USING (
    auth.uid() = graded_by OR
    auth.uid() IN (
      SELECT lecturer_id FROM public.courses WHERE id = course_id
    ) OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- ATTENDANCE RLS Policies
-- Students can view their own attendance
CREATE POLICY "Allow students to view their attendance"
  ON public.attendance FOR SELECT
  USING (
    auth.uid() = student_id OR
    auth.uid() IN (
      SELECT lecturer_id FROM public.courses WHERE id = course_id
    ) OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- Lecturers can mark attendance
CREATE POLICY "Allow lecturers to mark attendance"
  ON public.attendance FOR ALL
  USING (
    auth.uid() IN (
      SELECT lecturer_id FROM public.courses WHERE id = course_id
    ) OR
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- POSTS RLS Policies
-- All authenticated users can view posts
CREATE POLICY "Allow all authenticated users to view posts"
  ON public.posts FOR SELECT
  USING (auth.role() = 'authenticated');

-- Any authenticated user can create posts
CREATE POLICY "Allow authenticated users to create posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own posts
CREATE POLICY "Allow users to update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'));

-- COURSE_POSTS RLS Policies
-- All authenticated users can view course posts
CREATE POLICY "Allow authenticated users to view course posts"
  ON public.course_posts FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can create their own course posts
CREATE POLICY "Allow authenticated users to create course posts"
  ON public.course_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own course posts
CREATE POLICY "Allow users to update own course posts"
  ON public.course_posts FOR UPDATE
  USING (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'));

-- Users can delete their own course posts
CREATE POLICY "Allow users to delete own course posts"
  ON public.course_posts FOR DELETE
  USING (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'));

-- POST_COMMENTS RLS Policies
-- All authenticated users can view comments
CREATE POLICY "Allow all authenticated users to view comments"
  ON public.post_comments FOR SELECT
  USING (auth.role() = 'authenticated');

-- Any authenticated user can create comments
CREATE POLICY "Allow authenticated users to create comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
CREATE POLICY "Allow users to update their own comments"
  ON public.post_comments FOR UPDATE
  USING (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'));

-- POST_LIKES RLS Policies
-- All authenticated users can view post likes
CREATE POLICY "Allow all authenticated users to view likes"
  ON public.post_likes FOR SELECT
  USING (auth.role() = 'authenticated');

-- Any authenticated user can like posts
CREATE POLICY "Allow authenticated users to like posts"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own likes
CREATE POLICY "Allow users to remove their own likes"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- REACTIONS RLS Policies
-- All authenticated users can view reactions
CREATE POLICY "Allow all authenticated users to view reactions"
  ON public.reactions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Any authenticated user can add reactions
CREATE POLICY "Allow authenticated users to add reactions"
  ON public.reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Allow users to remove their own reactions"
  ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);

-- POST_VIEWS RLS Policies
-- Users can record their own post views
CREATE POLICY "Allow users to record post views"
  ON public.post_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- STORIES RLS Policies
-- All authenticated users can view active stories
CREATE POLICY "Allow all authenticated users to view active stories"
  ON public.stories FOR SELECT
  USING (
    auth.role() = 'authenticated' AND 
    is_active = TRUE AND 
    expires_at > NOW()
  );

-- Users can create their own stories
CREATE POLICY "Allow users to create their own stories"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own stories
CREATE POLICY "Allow users to update their own stories"
  ON public.stories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own stories
CREATE POLICY "Allow users to delete their own stories"
  ON public.stories FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete reported stories"
  ON public.stories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  );

-- STORY_VIEWS RLS Policies
-- Users can record their own story views
CREATE POLICY "Allow users to record story views"
  ON public.story_views FOR INSERT
  WITH CHECK (auth.uid() = viewed_by);

-- Users can view their own story view records
CREATE POLICY "Allow users to view their own story views"
  ON public.story_views FOR SELECT
  USING (
    auth.uid() = viewed_by OR
    auth.uid() IN (
      SELECT user_id FROM public.stories WHERE id = story_id
    )
  );

-- REPORTS RLS Policies
CREATE POLICY "Users can submit reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND reporter_id <> reported_user_id
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles target
      WHERE target.id = reported_user_id
        AND target.role <> 'admin'
        AND COALESCE(target.is_active, TRUE)
    )
    AND (
      (report_type = 'user' AND story_id IS NULL)
      OR (
        report_type = 'story'
        AND story_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.stories reported_story
          WHERE reported_story.id = story_id
            AND reported_story.user_id = reported_user_id
        )
      )
    )
  );

CREATE POLICY "Users can view own reports and admins can view all"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  );

CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete reports"
  ON public.reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;

-- ANNOUNCEMENTS RLS Policies
-- All authenticated users can view active announcements
CREATE POLICY "Allow all authenticated users to view announcements"
  ON public.announcements FOR SELECT
  USING (
    auth.role() = 'authenticated' AND 
    is_active = TRUE AND 
    (expires_at IS NULL OR expires_at > NOW())
  );

-- Only admins can manage announcements
CREATE POLICY "Allow admins to manage announcements"
  ON public.announcements FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin')
  );

-- ANNOUNCEMENT_READS RLS Policies
-- Users can record their own reads
CREATE POLICY "Allow users to record announcement reads"
  ON public.announcement_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own reads
CREATE POLICY "Allow users to view their own reads"
  ON public.announcement_reads FOR SELECT
  USING (auth.uid() = user_id);

-- LEADERBOARD RLS Policies
-- All authenticated users can view leaderboard
CREATE POLICY "Allow all authenticated users to view leaderboard"
  ON public.leaderboard FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Create an in-app notification when one user follows another
CREATE OR REPLACE FUNCTION public.notify_user_followed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  SELECT COALESCE(full_name, 'Someone')
  INTO actor_name
  FROM public.user_profiles
  WHERE id = NEW.follower_id;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    EXECUTE $notification$
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
      VALUES ($1, $2, 'new_follower', $3, $4, 'follow', $5, $6, $7, $8)
      ON CONFLICT (dedupe_key) DO NOTHING
    $notification$
    USING
      NEW.following_id,
      NEW.follower_id,
      actor_name || ' started following you',
      'View their profile.',
      NEW.id,
      '/profile/' || NEW.follower_id,
      jsonb_build_object('follow_id', NEW.id),
      'follow:' || NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_user_followed_insert
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_followed();

CREATE OR REPLACE FUNCTION public.set_report_severity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.severity := CASE NEW.reason
    WHEN 'threats' THEN 'high'
    WHEN 'impersonation' THEN 'high'
    WHEN 'harassment' THEN 'medium'
    WHEN 'inappropriate' THEN 'medium'
    ELSE 'low'
  END;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_report_severity_change
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_report_severity();

CREATE OR REPLACE FUNCTION public.notify_admins_new_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reporter_name TEXT;
  target_name TEXT;
  admin_record RECORD;
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'A user')
  INTO reporter_name
  FROM public.user_profiles
  WHERE id = NEW.reporter_id;

  SELECT COALESCE(full_name, 'a user')
  INTO target_name
  FROM public.user_profiles
  WHERE id = NEW.reported_user_id;

  FOR admin_record IN
    SELECT id
    FROM public.user_profiles
    WHERE role = 'admin'
      AND COALESCE(is_active, TRUE)
  LOOP
    EXECUTE $notification$
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
      VALUES ($1, $2, 'moderation_report', $3, $4, 'report', $5, '/', $6, $7)
      ON CONFLICT (dedupe_key) DO NOTHING
    $notification$
    USING
      admin_record.id,
      NEW.reporter_id,
      'New ' || NEW.report_type || ' report',
      reporter_name || ' reported ' || target_name || '.',
      NEW.id,
      jsonb_build_object('report_id', NEW.id),
      'moderation-report:' || NEW.id || ':' || admin_record.id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_admins_new_report_insert
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_report();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_posts_updated_at
  BEFORE UPDATE ON public.course_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle user creation (auto-insert into user_profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  normalized_email TEXT;
  email_prefix TEXT;
  assigned_role TEXT;
BEGIN
  normalized_email := LOWER(TRIM(COALESCE(NEW.email, '')));

  IF normalized_email !~ '^[^@]+@sc\.edu\.my$' THEN
    RAISE EXCEPTION 'Only SUC email addresses ending in @sc.edu.my can register.'
      USING ERRCODE = '22023';
  END IF;

  email_prefix := SPLIT_PART(normalized_email, '@', 1);

  IF email_prefix LIKE 'st%' THEN
    assigned_role := 'admin';
  ELSIF email_prefix LIKE 'lc%' THEN
    assigned_role := 'lecturer';
  ELSIF email_prefix LIKE 'd%'
    OR email_prefix LIKE 'b%'
    OR email_prefix LIKE 'p%' THEN
    assigned_role := 'student';
  ELSE
    RAISE EXCEPTION 'Unable to identify account type from this SUC email. Admin staff emails must start with ST, lecturer emails with LC, and student emails with D, B, or P.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    normalized_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', normalized_email),
    assigned_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to expire stories automatically
CREATE OR REPLACE FUNCTION public.expire_old_stories()
RETURNS void AS $$
BEGIN
  UPDATE public.stories
  SET is_active = FALSE
  WHERE expires_at <= NOW() AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS (for easier data access)
-- ============================================================================

-- View: Course summary with enrollment counts
CREATE OR REPLACE VIEW public.course_summary AS
SELECT
  c.id,
  c.code,
  c.name,
  c.lecturer_id,
  up.full_name as lecturer_name,
  COUNT(ce.id) as enrolled_students,
  c.created_at
FROM public.courses c
LEFT JOIN public.user_profiles up ON c.lecturer_id = up.id
LEFT JOIN public.course_enrollments ce ON c.id = ce.course_id
GROUP BY c.id, c.code, c.name, c.lecturer_id, up.full_name, c.created_at;

-- View: Student course summary with grades
CREATE OR REPLACE VIEW public.student_course_summary AS
SELECT
  c.id as course_id,
  c.code,
  c.name,
  up.full_name as lecturer_name,
  ce.student_id,
  COALESCE(AVG(sg.score), 0)::DECIMAL(5, 2) as average_score,
  COUNT(DISTINCT sg.id) as grades_received,
  MAX(sg.graded_at) as last_graded
FROM public.courses c
JOIN public.user_profiles up ON c.lecturer_id = up.id
JOIN public.course_enrollments ce ON c.id = ce.course_id
LEFT JOIN public.student_grades sg ON c.id = sg.course_id AND ce.student_id = sg.student_id
GROUP BY c.id, c.code, c.name, up.full_name, ce.student_id;

-- View: Post engagement summary
CREATE OR REPLACE VIEW public.post_engagement AS
SELECT
  p.id,
  p.title,
  p.author_id,
  COUNT(DISTINCT pl.id) as like_count,
  COUNT(DISTINCT pc.id) as comment_count,
  COUNT(DISTINCT pv.id) as view_count,
  GREATEST(p.created_at, COALESCE(MAX(pc.created_at), p.created_at)) as last_activity
FROM public.posts p
LEFT JOIN public.post_likes pl ON p.id = pl.post_id
LEFT JOIN public.post_comments pc ON p.id = pc.post_id
LEFT JOIN public.post_views pv ON p.id = pv.post_id
GROUP BY p.id, p.title, p.author_id;

-- View: Active stories with view counts
CREATE OR REPLACE VIEW public.active_stories_summary AS
SELECT
  s.id,
  s.user_id,
  up.full_name as user_name,
  s.content_type,
  s.created_at,
  s.expires_at,
  COUNT(DISTINCT sv.id) as view_count
FROM public.stories s
JOIN public.user_profiles up ON s.user_id = up.id
LEFT JOIN public.story_views sv ON s.id = sv.story_id
WHERE s.is_active = TRUE AND s.expires_at > NOW()
GROUP BY s.id, s.user_id, up.full_name, s.content_type, s.created_at, s.expires_at;

-- ============================================================================
-- AARO ACADEMIC PLANNING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.study_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_key TEXT NOT NULL CHECK (programme_key IN ('IT', 'CS', 'BOSE')),
  programme_name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('Diploma', 'Bachelor')),
  intake_year INTEGER,
  intake_semester TEXT CHECK (intake_semester IN ('A', 'B', 'C')),
  track_code TEXT CHECK (track_code IS NULL OR track_code ~ '^[ABC][12]$'),
  entry_type TEXT CHECK (entry_type IS NULL OR entry_type IN ('normal', 'direct_year_2')),
  version_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  effective_from_term_code TEXT,
  source_label TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (programme_key, intake_year, intake_semester, version_code)
);

ALTER TABLE public.study_plan_versions
  ADD COLUMN IF NOT EXISTS track_code TEXT,
  ADD COLUMN IF NOT EXISTS entry_type TEXT;

CREATE TABLE IF NOT EXISTS public.study_plan_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_plan_version_id UUID NOT NULL REFERENCES public.study_plan_versions(id) ON DELETE CASCADE,
  term_code TEXT NOT NULL,
  course_code TEXT,
  course_name TEXT NOT NULL,
  category TEXT,
  credit_hours INTEGER,
  is_placeholder BOOLEAN NOT NULL DEFAULT FALSE,
  mpu_level TEXT CHECK (mpu_level IS NULL OR mpu_level IN ('diploma', 'bachelor')),
  mpu_unit TEXT CHECK (mpu_unit IS NULL OR mpu_unit IN ('U1', 'U2', 'U3', 'U4')),
  mpu_student_type TEXT CHECK (mpu_student_type IS NULL OR mpu_student_type IN ('local', 'international', 'all')),
  offer_until_term_code TEXT,
  position INTEGER NOT NULL DEFAULT 1,
  plan_course_key TEXT NOT NULL,
  source_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (study_plan_version_id, term_code, plan_course_key, position)
);

ALTER TABLE public.study_plan_courses
  ADD COLUMN IF NOT EXISTS mpu_level TEXT,
  ADD COLUMN IF NOT EXISTS mpu_unit TEXT,
  ADD COLUMN IF NOT EXISTS mpu_student_type TEXT,
  ADD COLUMN IF NOT EXISTS offer_until_term_code TEXT;

CREATE TABLE IF NOT EXISTS public.student_study_plan_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  study_plan_version_id UUID NOT NULL REFERENCES public.study_plan_versions(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_plan_versions_programme
  ON public.study_plan_versions(programme_key, level, intake_year, intake_semester, status);
CREATE INDEX IF NOT EXISTS idx_study_plan_versions_track
  ON public.study_plan_versions(programme_key, level, intake_year, intake_semester, track_code, status);
CREATE INDEX IF NOT EXISTS idx_study_plan_courses_version_term
  ON public.study_plan_courses(study_plan_version_id, term_code, position);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_study_plan_assignments_active_student
  ON public.student_study_plan_assignments(student_id)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_student_study_plan_assignments_student_status
  ON public.student_study_plan_assignments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_student_study_plan_assignments_version_status
  ON public.student_study_plan_assignments(study_plan_version_id, status);
CREATE INDEX IF NOT EXISTS idx_student_study_plan_assignments_assigned_by
  ON public.student_study_plan_assignments(assigned_by);

ALTER TABLE public.study_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plan_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_study_plan_assignments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.study_plan_versions, public.study_plan_courses
  TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.study_plan_versions, public.study_plan_courses
  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_study_plan_assignments
  TO authenticated;
GRANT ALL ON public.study_plan_versions, public.study_plan_courses, public.student_study_plan_assignments
  TO service_role;

CREATE POLICY "Authenticated users can view study plan versions"
  ON public.study_plan_versions FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "AARO staff can insert study plan versions"
  ON public.study_plan_versions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ));

CREATE POLICY "AARO staff can update study plan versions"
  ON public.study_plan_versions FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ));

CREATE POLICY "AARO staff can delete study plan versions"
  ON public.study_plan_versions FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ));

CREATE POLICY "Authenticated users can view study plan courses"
  ON public.study_plan_courses FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "AARO staff can insert study plan courses"
  ON public.study_plan_courses FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ));

CREATE POLICY "AARO staff can update study plan courses"
  ON public.study_plan_courses FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ));

CREATE POLICY "AARO staff can delete study plan courses"
  ON public.study_plan_courses FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ));

CREATE POLICY "Students and AARO staff can view study plan assignments"
  ON public.student_study_plan_assignments FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role IN ('staff', 'admin')
        AND COALESCE(profile.is_active, TRUE)
    )
  );

CREATE POLICY "AARO staff can insert student study plan assignments"
  ON public.student_study_plan_assignments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ));

CREATE POLICY "AARO staff can update student study plan assignments"
  ON public.student_study_plan_assignments FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ));

CREATE POLICY "AARO staff can delete student study plan assignments"
  ON public.student_study_plan_assignments FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ));

CREATE OR REPLACE FUNCTION public.staff_assign_student_study_plan(
  p_student_id UUID,
  p_study_plan_version_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  inserted_id UUID;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = actor_id
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    RAISE EXCEPTION 'Only AARO staff or administrators can assign study plans to students';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = p_student_id
      AND profile.role = 'student'
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    RAISE EXCEPTION 'Target user is not an active student';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.study_plan_versions version
    WHERE version.id = p_study_plan_version_id
      AND version.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Study plan version is not active or does not exist';
  END IF;

  UPDATE public.student_study_plan_assignments
  SET status = 'inactive', updated_at = NOW()
  WHERE student_id = p_student_id
    AND status = 'active';

  INSERT INTO public.student_study_plan_assignments (
    assigned_by,
    notes,
    status,
    student_id,
    study_plan_version_id
  )
  VALUES (
    actor_id,
    NULLIF(TRIM(COALESCE(p_notes, '')), ''),
    'active',
    p_student_id,
    p_study_plan_version_id
  )
  RETURNING id INTO inserted_id;

  RETURN inserted_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_unassign_student_study_plan(
  p_student_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  affected_count INTEGER := 0;
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = actor_id
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    RAISE EXCEPTION 'Only AARO staff or administrators can remove student study plan assignments';
  END IF;

  UPDATE public.student_study_plan_assignments
  SET status = 'inactive', updated_at = NOW()
  WHERE student_id = p_student_id
    AND status = 'active';

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_list_assignable_students()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  faculty TEXT,
  programme TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = actor_id
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    RAISE EXCEPTION 'Only AARO staff or administrators can list assignable students';
  END IF;

  RETURN QUERY
  SELECT
    profile.id,
    profile.email::TEXT,
    profile.full_name::TEXT,
    profile.avatar_url::TEXT,
    profile.faculty::TEXT,
    profile.programme::TEXT,
    profile.role::TEXT
  FROM public.user_profiles profile
  WHERE profile.role = 'student'
    AND COALESCE(profile.is_active, TRUE)
  ORDER BY profile.full_name NULLS LAST, profile.email NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_list_lecturer_options()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  faculty TEXT,
  programme TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = actor_id
      AND profile.role IN ('staff', 'admin')
      AND COALESCE(profile.is_active, TRUE)
  ) THEN
    RAISE EXCEPTION 'Only AARO staff or administrators can list lecturer options';
  END IF;

  RETURN QUERY
  SELECT
    profile.id,
    profile.email::TEXT,
    profile.full_name::TEXT,
    profile.avatar_url::TEXT,
    profile.faculty::TEXT,
    profile.programme::TEXT
  FROM public.user_profiles profile
  WHERE profile.role = 'lecturer'
    AND COALESCE(profile.is_active, TRUE)
  ORDER BY profile.full_name NULLS LAST, profile.email NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.staff_assign_student_study_plan(UUID, UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_assign_student_study_plan(UUID, UUID, TEXT)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.staff_unassign_student_study_plan(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_unassign_student_study_plan(UUID)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.staff_list_assignable_students()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_list_assignable_students()
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.staff_list_lecturer_options()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_list_lecturer_options()
  TO authenticated, service_role;

