CREATE SCHEMA IF NOT EXISTS app_auth;

CREATE TABLE IF NOT EXISTS app_auth.users (
  user_id uuid PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  password_set_at timestamptz DEFAULT now() NOT NULL,
  failed_login_count integer DEFAULT 0 NOT NULL CHECK (failed_login_count >= 0),
  locked_until timestamptz,
  disabled_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS app_auth_users_disabled_at_idx
  ON app_auth.users(disabled_at);
