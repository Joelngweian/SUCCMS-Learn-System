DROP POLICY IF EXISTS "Allow course members to view course posts"
  ON public.course_posts;

DROP POLICY IF EXISTS "Allow course members to create course posts"
  ON public.course_posts;

DROP POLICY IF EXISTS "Allow authenticated users to view course posts"
  ON public.course_posts;

DROP POLICY IF EXISTS "Allow authenticated users to create course posts"
  ON public.course_posts;

CREATE POLICY "Allow authenticated users to view course posts"
  ON public.course_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create course posts"
  ON public.course_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);
