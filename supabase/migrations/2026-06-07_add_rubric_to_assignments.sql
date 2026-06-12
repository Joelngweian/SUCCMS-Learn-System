-- Add rubric column to assignments table
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS rubric text;

COMMENT ON COLUMN public.assignments.rubric IS 'Grading rubric or criteria for AI grading';
