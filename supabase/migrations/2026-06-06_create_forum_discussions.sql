CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.can_view_forum_course(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_course_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.course_enrollments ce
      WHERE ce.course_id = target_course_id
        AND ce.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.course_instructors ci
      WHERE ci.course_id = target_course_id
        AND ci.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = target_course_id
        AND c.lecturer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    );
$$;

CREATE TABLE IF NOT EXISTS public.forum_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT forum_threads_has_content CHECK (
    LENGTH(TRIM(title)) > 0
    AND LENGTH(TRIM(content)) > 0
  )
);

CREATE TABLE IF NOT EXISTS public.forum_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT forum_replies_has_content CHECK (
    LENGTH(TRIM(content)) > 0
    OR image_url IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.forum_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.forum_reply_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reply_id UUID NOT NULL REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reply_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_threads_course_id ON public.forum_threads(course_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author_id ON public.forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_created_at ON public.forum_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread_id ON public.forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_parent_id ON public.forum_replies(parent_id);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_thread_id ON public.forum_reactions(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_reply_reactions_reply_id ON public.forum_reply_reactions(reply_id);

DROP TRIGGER IF EXISTS update_forum_threads_updated_at ON public.forum_threads;
CREATE TRIGGER update_forum_threads_updated_at
  BEFORE UPDATE ON public.forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_forum_replies_updated_at ON public.forum_replies;
CREATE TRIGGER update_forum_replies_updated_at
  BEFORE UPDATE ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reply_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Forum threads visible to course members" ON public.forum_threads;
DROP POLICY IF EXISTS "Authenticated users can create forum threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Thread authors can update forum threads" ON public.forum_threads;
DROP POLICY IF EXISTS "Thread authors can delete forum threads" ON public.forum_threads;

CREATE POLICY "Forum threads visible to course members"
  ON public.forum_threads FOR SELECT
  TO authenticated
  USING (public.can_view_forum_course(course_id));

CREATE POLICY "Authenticated users can create forum threads"
  ON public.forum_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.can_view_forum_course(course_id)
  );

CREATE POLICY "Thread authors can update forum threads"
  ON public.forum_threads FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  )
  WITH CHECK (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

CREATE POLICY "Thread authors can delete forum threads"
  ON public.forum_threads FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

DROP POLICY IF EXISTS "Forum replies visible to thread viewers" ON public.forum_replies;
DROP POLICY IF EXISTS "Authenticated users can create forum replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Reply authors can update forum replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Reply authors can delete forum replies" ON public.forum_replies;

CREATE POLICY "Forum replies visible to thread viewers"
  ON public.forum_replies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.forum_threads ft
      WHERE ft.id = forum_replies.thread_id
        AND public.can_view_forum_course(ft.course_id)
    )
  );

CREATE POLICY "Authenticated users can create forum replies"
  ON public.forum_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.forum_threads ft
      WHERE ft.id = forum_replies.thread_id
        AND public.can_view_forum_course(ft.course_id)
    )
  );

CREATE POLICY "Reply authors can update forum replies"
  ON public.forum_replies FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  )
  WITH CHECK (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

CREATE POLICY "Reply authors can delete forum replies"
  ON public.forum_replies FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

DROP POLICY IF EXISTS "Forum reactions visible to thread viewers" ON public.forum_reactions;
DROP POLICY IF EXISTS "Authenticated users can create forum reactions" ON public.forum_reactions;
DROP POLICY IF EXISTS "Users can update own forum reactions" ON public.forum_reactions;
DROP POLICY IF EXISTS "Users can delete own forum reactions" ON public.forum_reactions;

CREATE POLICY "Forum reactions visible to thread viewers"
  ON public.forum_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.forum_threads ft
      WHERE ft.id = forum_reactions.thread_id
        AND public.can_view_forum_course(ft.course_id)
    )
  );

CREATE POLICY "Authenticated users can create forum reactions"
  ON public.forum_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.forum_threads ft
      WHERE ft.id = forum_reactions.thread_id
        AND public.can_view_forum_course(ft.course_id)
    )
  );

CREATE POLICY "Users can update own forum reactions"
  ON public.forum_reactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own forum reactions"
  ON public.forum_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Forum reply reactions visible to thread viewers" ON public.forum_reply_reactions;
DROP POLICY IF EXISTS "Authenticated users can create forum reply reactions" ON public.forum_reply_reactions;
DROP POLICY IF EXISTS "Users can update own forum reply reactions" ON public.forum_reply_reactions;
DROP POLICY IF EXISTS "Users can delete own forum reply reactions" ON public.forum_reply_reactions;

CREATE POLICY "Forum reply reactions visible to thread viewers"
  ON public.forum_reply_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.forum_replies fr
      JOIN public.forum_threads ft ON ft.id = fr.thread_id
      WHERE fr.id = forum_reply_reactions.reply_id
        AND public.can_view_forum_course(ft.course_id)
    )
  );

CREATE POLICY "Authenticated users can create forum reply reactions"
  ON public.forum_reply_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.forum_replies fr
      JOIN public.forum_threads ft ON ft.id = fr.thread_id
      WHERE fr.id = forum_reply_reactions.reply_id
        AND public.can_view_forum_course(ft.course_id)
    )
  );

CREATE POLICY "Users can update own forum reply reactions"
  ON public.forum_reply_reactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own forum reply reactions"
  ON public.forum_reply_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-images',
  'forum-images',
  TRUE,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = TRUE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view forum images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload forum images" ON storage.objects;

CREATE POLICY "Public can view forum images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'forum-images');

CREATE POLICY "Authenticated users can upload forum images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'forum-images');

NOTIFY pgrst, 'reload schema';
