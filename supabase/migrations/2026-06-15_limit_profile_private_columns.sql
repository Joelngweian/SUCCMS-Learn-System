-- Keep profile directory fields available to signed-in users while preventing
-- direct browser access to private account data.

REVOKE SELECT ON TABLE public.user_profiles
  FROM authenticated;

GRANT SELECT (
  id,
  full_name,
  username,
  role,
  program_or_department,
  avatar_url,
  bio,
  created_at,
  updated_at,
  is_active,
  cover_url,
  faculty,
  programme
) ON TABLE public.user_profiles
  TO authenticated;

GRANT ALL PRIVILEGES ON TABLE public.user_profiles
  TO service_role;
