CREATE SCHEMA IF NOT EXISTS app_auth;

ALTER TABLE app_auth.users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS app_auth_users_email_verification_token_hash_idx
  ON app_auth.users (email_verification_token_hash)
  WHERE email_verification_token_hash IS NOT NULL;
