-- Supabase Storage objects must be removed through the Storage API.
-- Remove the earlier database trigger that attempted to delete storage.objects.

DROP TRIGGER IF EXISTS cleanup_study_group_storage_delete
  ON public.study_groups;

DROP FUNCTION IF EXISTS public.cleanup_study_group_storage();
