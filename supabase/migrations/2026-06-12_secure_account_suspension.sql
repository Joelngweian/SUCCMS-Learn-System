CREATE OR REPLACE FUNCTION public.protect_user_account_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active IS NOT DISTINCT FROM OLD.is_active THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_profiles administrator
    WHERE administrator.id = auth.uid()
      AND administrator.role = 'admin'
      AND COALESCE(administrator.is_active, TRUE)
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only an administrator can change account status'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS protect_user_account_status_update
  ON public.user_profiles;
CREATE TRIGGER protect_user_account_status_update
  BEFORE UPDATE OF is_active ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_account_status();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

NOTIFY pgrst, 'reload schema';
