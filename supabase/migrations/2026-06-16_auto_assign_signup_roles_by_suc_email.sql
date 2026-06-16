BEGIN;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('student', 'lecturer', 'staff', 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
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
    assigned_role := 'staff';
  ELSIF email_prefix LIKE 'lc%' THEN
    assigned_role := 'lecturer';
  ELSIF email_prefix LIKE 'd%'
    OR email_prefix LIKE 'b%'
    OR email_prefix LIKE 'p%' THEN
    assigned_role := 'student';
  ELSE
    RAISE EXCEPTION 'Unable to identify account type from this SUC email. Staff emails must start with ST, lecturer emails with LC, and student emails with D, B, or P.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    username,
    role
  )
  VALUES (
    NEW.id,
    normalized_email,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      normalized_email
    ),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    assigned_role
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;

COMMIT;
