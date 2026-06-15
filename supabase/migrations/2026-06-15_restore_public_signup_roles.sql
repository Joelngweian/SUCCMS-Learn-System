-- Restore the original public signup role selection.
-- Existing users still cannot update their role through user_profiles.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT;
BEGIN
  requested_role := LOWER(
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'student')
  );

  IF requested_role NOT IN ('student', 'lecturer', 'admin') THEN
    requested_role := 'student';
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
    NEW.email,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NEW.email
    ),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    requested_role
  );

  RETURN NEW;
END;
$$;
