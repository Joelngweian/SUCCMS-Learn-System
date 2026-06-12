ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS faculty TEXT;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS programme TEXT;

UPDATE public.user_profiles
SET programme = COALESCE(programme, program_or_department)
WHERE programme IS NULL
  AND program_or_department IS NOT NULL;
