DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime
    ADD TABLE public.course_enrollments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

NOTIFY pgrst, 'reload schema';
