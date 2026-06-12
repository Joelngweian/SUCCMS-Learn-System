CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL
    CONSTRAINT reports_reporter_id_fkey
    REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL
    CONSTRAINT reports_reported_user_id_fkey
    REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('user', 'story')),
  story_id UUID
    CONSTRAINT reports_story_id_fkey
    REFERENCES public.stories(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (
    reason IN (
      'harassment',
      'threats',
      'impersonation',
      'inappropriate',
      'spam',
      'other'
    )
  ),
  details TEXT,
  severity TEXT NOT NULL DEFAULT 'low'
    CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved')),
  resolved_by UUID
    CONSTRAINT reports_resolved_by_fkey
    REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reports_cannot_target_self CHECK (reporter_id <> reported_user_id),
  CONSTRAINT reports_target_matches_type CHECK (
    (report_type = 'user' AND story_id IS NULL)
    OR report_type = 'story'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_pending_user_unique
  ON public.reports(reporter_id, reported_user_id)
  WHERE report_type = 'user' AND status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_pending_story_unique
  ON public.reports(reporter_id, story_id)
  WHERE report_type = 'story' AND status = 'pending' AND story_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON public.reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reported_user
  ON public.reports(reported_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_report_severity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.severity := CASE NEW.reason
    WHEN 'threats' THEN 'high'
    WHEN 'impersonation' THEN 'high'
    WHEN 'harassment' THEN 'medium'
    WHEN 'inappropriate' THEN 'medium'
    ELSE 'low'
  END;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_report_severity_change ON public.reports;
CREATE TRIGGER set_report_severity_change
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_report_severity();

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit reports" ON public.reports;
CREATE POLICY "Users can submit reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND reporter_id <> reported_user_id
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles target
      WHERE target.id = reported_user_id
        AND target.role <> 'admin'
        AND COALESCE(target.is_active, TRUE)
    )
    AND (
      (report_type = 'user' AND story_id IS NULL)
      OR (
        report_type = 'story'
        AND story_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.stories reported_story
          WHERE reported_story.id = story_id
            AND reported_story.user_id = reported_user_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can view own reports and admins can view all"
  ON public.reports;
CREATE POLICY "Users can view own reports and admins can view all"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports"
  ON public.reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;

DROP POLICY IF EXISTS "Admins can delete reported stories" ON public.stories;
CREATE POLICY "Admins can delete reported stories"
  ON public.stories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete reported story images" ON storage.objects;
CREATE POLICY "Admins can delete reported story images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'stories'
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.notify_admins_new_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reporter_name TEXT;
  target_name TEXT;
  admin_record RECORD;
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'A user')
  INTO reporter_name
  FROM public.user_profiles
  WHERE id = NEW.reporter_id;

  SELECT COALESCE(full_name, 'a user')
  INTO target_name
  FROM public.user_profiles
  WHERE id = NEW.reported_user_id;

  FOR admin_record IN
    SELECT id
    FROM public.user_profiles
    WHERE role = 'admin'
      AND COALESCE(is_active, TRUE)
  LOOP
    EXECUTE $notification$
      INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        type,
        title,
        message,
        entity_type,
        entity_id,
        action_url,
        metadata,
        dedupe_key
      )
      VALUES ($1, $2, 'moderation_report', $3, $4, 'report', $5, '/', $6, $7)
      ON CONFLICT (dedupe_key) DO NOTHING
    $notification$
    USING
      admin_record.id,
      NEW.reporter_id,
      'New ' || NEW.report_type || ' report',
      reporter_name || ' reported ' || target_name || '.',
      NEW.id,
      jsonb_build_object('report_id', NEW.id),
      'moderation-report:' || NEW.id || ':' || admin_record.id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_admins_new_report_insert ON public.reports;
CREATE TRIGGER notify_admins_new_report_insert
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_report();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

NOTIFY pgrst, 'reload schema';
