# SUCCMS Registration and Role Assignment Update

Date: 2026-06-16  
Repository: `Joelngweian/SUCCMS-Learn-System`  
Commit pushed: `070d5b1 Harden signup role assignment`

## Purpose

This update removes public role selection from SUCCMS registration and makes role assignment controlled by verified school email patterns and the database trigger.

The main goal is to prevent users from manually choosing `Student`, `Lecturer`, or `Admin` during public signup. Admin accounts can only be created automatically from verified `ST...@sc.edu.my` school staff emails or assigned manually by an existing administrator.

## User-Facing Registration Changes

The public signup form now only asks for:

- Full Name
- Username
- SUC Email
- Password
- Confirm Password

The role selector buttons were removed from `src/components/Login.tsx`.

## Email Rules

Only school email addresses ending with `@sc.edu.my` are allowed to register.

Role assignment is based on the email prefix, ignoring case:

- `ST...@sc.edu.my` -> `admin`
- `LC...@sc.edu.my` -> `lecturer`
- `D...@sc.edu.my` -> `student`
- `B...@sc.edu.my` -> `student`
- `P...@sc.edu.my` -> `student`

If the email does not use the `@sc.edu.my` domain, registration is blocked with a clear error message.

If the email uses the school domain but the prefix cannot be recognized, registration is also blocked with a clear error message.

## Frontend Changes

### `src/components/Login.tsx`

Removed the role selection UI from the signup form.

Updated the email label to `SUC Email` and changed the placeholder to a school email example.

The signup call no longer passes a role selected by the user.

### `src/contexts/AuthContext.tsx`

Added frontend validation for SUC email rules before calling Supabase signup.

The frontend checks the email domain and prefix to show fast, clear validation errors to the user.

The frontend no longer writes `role` into Supabase signup metadata. It only sends:

- `full_name`
- `username`

The final role assignment is handled by the database.

### `src/App.tsx`

The app routes `admin` accounts to the Admin Dashboard. `ST...@sc.edu.my` accounts are created directly as `admin`, so no separate `staff` route is used.

### `src/components/ProtectedRoute.tsx`

This file was restored and is not part of the final change set.

It is currently not used by the app routing, so it was left untouched.

## Database Changes

### Local Migration Added

File:

`supabase/migrations/2026-06-16_auto_assign_signup_roles_by_suc_email.sql`

This migration:

- Updates `public.user_profiles.role` check constraint to allow `student`, `lecturer`, and `admin`
- Replaces `public.handle_new_user()` with database-side email validation and role assignment
- Ignores any user-provided `role` metadata during signup
- Revokes direct execution of `public.handle_new_user()` from `PUBLIC`, `anon`, and `authenticated`

### `supabase/schema.sql`

The schema file was updated to match the new signup role behavior for fresh database setup.

## Supabase MCP Work Performed

Supabase MCP was connected to project:

- Project name: `SUCCMS`
- Project ID: `jfskyjzysvdwureenttw`

Before applying changes, the remote database was inspected.

Confirmed existing remote objects:

- `on_auth_user_created` trigger already existed
- `protect_user_profile_role()` already existed
- `protect_user_profile_role_update` trigger already existed
- Existing roles were `admin`, `lecturer`, and `student`

Because these already existed, they were not recreated.

Only the missing pieces were applied:

- Keep the role check constraint aligned with `student`, `lecturer`, and `admin`
- Replace `handle_new_user()` role assignment logic
- Revoke public direct execution of `handle_new_user()`

Remote Supabase migrations applied:

- `20260616115222 auto_assign_signup_roles_by_suc_email`
- `20260616115321 revoke_public_handle_new_user_execute`

Remote verification confirmed:

- `user_profiles_role_check` now allows `student`, `lecturer`, and `admin`
- `handle_new_user()` now assigns roles from the school email prefix
- `handle_new_user()` can only be executed by `postgres` and `service_role`

## Admin Account Rule

Users cannot manually choose Admin during public registration.

Public signup can create:

- `student`
- `lecturer`
- `admin` for ST-prefixed school staff emails

Non-ST accounts cannot become Admin through public registration. Admin roles can also be assigned by an existing Admin through management functionality, or manually by a system/database administrator.

## Existing Users

Existing users are not affected by the new signup rules.

The database trigger only runs when a new `auth.users` record is created. Existing users keep their current roles and can continue logging in as before.

## SQL Editor Reference

The remote SUCCMS database has already been updated through Supabase MCP. Do not run this again on the same database unless intentionally reapplying to another environment.

For another database that has not received this change, the SQL is:

```sql
BEGIN;

UPDATE public.user_profiles
SET role = 'admin'
WHERE role = 'staff';

DO $$
DECLARE
  current_role_check TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid)
  INTO current_role_check
  FROM pg_constraint
  WHERE conrelid = 'public.user_profiles'::regclass
    AND conname = 'user_profiles_role_check';

  IF current_role_check IS NULL OR current_role_check LIKE '%staff%' THEN
    ALTER TABLE public.user_profiles
      DROP CONSTRAINT IF EXISTS user_profiles_role_check;

    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_role_check
      CHECK (role IN ('student', 'lecturer', 'admin'));
  END IF;
END $$;

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
    assigned_role := 'admin';
  ELSIF email_prefix LIKE 'lc%' THEN
    assigned_role := 'lecturer';
  ELSIF email_prefix LIKE 'd%'
    OR email_prefix LIKE 'b%'
    OR email_prefix LIKE 'p%' THEN
    assigned_role := 'student';
  ELSE
    RAISE EXCEPTION 'Unable to identify account type from this SUC email. Admin staff emails must start with ST, lecturer emails with LC, and student emails with D, B, or P.'
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
```

## Verification

The following checks passed before pushing the code:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

The final code was pushed to GitHub:

`https://github.com/Joelngweian/SUCCMS-Learn-System`
