-- Migration: Create user_settings and login_history tables

-- 1. Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  compact_mode BOOLEAN DEFAULT FALSE,
  animations_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  assignment_reminders BOOLEAN DEFAULT TRUE,
  forum_replies BOOLEAN DEFAULT TRUE,
  grade_updates BOOLEAN DEFAULT TRUE,
  course_announcements BOOLEAN DEFAULT TRUE,
  achievement_alerts BOOLEAN DEFAULT FALSE,
  sound_enabled BOOLEAN DEFAULT FALSE,
  profile_visibility TEXT DEFAULT 'everyone',
  show_online_status BOOLEAN DEFAULT TRUE,
  show_progress BOOLEAN DEFAULT TRUE,
  show_leaderboard BOOLEAN DEFAULT TRUE,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'auto',
  date_format TEXT DEFAULT 'mdy',
  high_contrast BOOLEAN DEFAULT FALSE,
  large_text BOOLEAN DEFAULT FALSE,
  reduce_motion BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT FALSE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  weekly_summary BOOLEAN DEFAULT FALSE,
  marketing_emails BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create login_history table
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device TEXT,
  browser TEXT,
  ip_address TEXT,
  login_time TIMESTAMPTZ DEFAULT NOW(),
  location TEXT
);

-- 3. Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for user_settings
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. RLS Policies for login_history
CREATE POLICY "Users can view own login history"
  ON public.login_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own login history"
  ON public.login_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Create trigger for updating 'updated_at' on user_settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Secure Delete Account RPC
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Delete the user from auth.users
  -- This will cascade delete from profiles, user_settings, login_history, etc., if ON DELETE CASCADE is properly set.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
