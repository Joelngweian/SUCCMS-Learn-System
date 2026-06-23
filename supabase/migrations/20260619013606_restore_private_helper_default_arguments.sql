-- Restore the optional auth.uid() argument that existed before these helpers
-- moved to the private schema. Several SECURITY DEFINER functions still call
-- the public compatibility wrappers with the shorter argument list.
begin;

create or replace function public.is_admin(
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin(target_user_id);
$$;

create or replace function public.is_course_manager(
  target_course_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_course_manager(target_course_id, target_user_id);
$$;

create or replace function public.is_study_group_member(
  target_group_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_study_group_member(target_group_id, target_user_id);
$$;

create or replace function public.is_study_group_owner(
  target_group_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_study_group_owner(target_group_id, target_user_id);
$$;

revoke all on function public.is_admin(uuid)
  from public, anon, authenticated;
revoke all on function public.is_course_manager(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.is_study_group_member(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.is_study_group_owner(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.is_admin(uuid)
  to postgres, service_role;
grant execute on function public.is_course_manager(uuid, uuid)
  to postgres, service_role;
grant execute on function public.is_study_group_member(uuid, uuid)
  to postgres, service_role;
grant execute on function public.is_study_group_owner(uuid, uuid)
  to postgres, service_role;

notify pgrst, 'reload schema';

commit;
