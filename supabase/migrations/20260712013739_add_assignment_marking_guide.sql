CREATE TABLE IF NOT EXISTS public.assignment_marking_guides (
  assignment_id uuid PRIMARY KEY REFERENCES public.assignments(id) ON DELETE CASCADE,
  marking_guide text NOT NULL,
  updated_by uuid REFERENCES public.user_profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assignment_marking_guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors manage assignment marking guides"
  ON public.assignment_marking_guides;

CREATE POLICY "Instructors manage assignment marking guides"
  ON public.assignment_marking_guides
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignments assignment
      WHERE assignment.id = assignment_marking_guides.assignment_id
        AND public.is_course_instructor(assignment.course_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.assignments assignment
      WHERE assignment.id = assignment_marking_guides.assignment_id
        AND public.is_course_instructor(assignment.course_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.assignment_marking_guides
  TO authenticated;

COMMENT ON TABLE public.assignment_marking_guides IS
  'Lecturer-only AI marking guide, answer key, or stored guide file metadata for an assessment.';
