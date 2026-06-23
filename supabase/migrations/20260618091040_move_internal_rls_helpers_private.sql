-- Keep SECURITY DEFINER authorization helpers outside the exposed public schema.
-- Existing RLS policy expressions retain their function OID when a function moves.
alter function public.can_view_forum_course(uuid) set schema private;
alter function public.can_view_study_group(uuid, uuid) set schema private;
alter function public.course_material_parent_matches(uuid, uuid) set schema private;
alter function public.is_admin(uuid) set schema private;
alter function public.is_assignment_instructor(uuid) set schema private;
alter function public.is_assignment_student(uuid, uuid) set schema private;
alter function public.is_course_instructor(uuid) set schema private;
alter function public.is_course_manager(uuid, uuid) set schema private;
alter function public.is_course_member(uuid, uuid) set schema private;
alter function public.is_study_group_member(uuid, uuid) set schema private;
alter function public.is_study_group_owner(uuid, uuid) set schema private;

-- A few existing SECURITY DEFINER RPCs refer to these helpers by their original
-- qualified public names. Compatibility wrappers keep those function bodies
-- working without exposing another privileged entry point to API roles.
create function public.is_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin(target_user_id);
$$;

create function public.is_course_instructor(target_course_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_course_instructor(target_course_id);
$$;

create function public.is_course_manager(
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

create function public.is_study_group_member(
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

create function public.is_study_group_owner(
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

revoke all on function public.is_admin(uuid) from public, anon, authenticated;
revoke all on function public.is_course_instructor(uuid) from public, anon, authenticated;
revoke all on function public.is_course_manager(uuid, uuid) from public, anon, authenticated;
revoke all on function public.is_study_group_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.is_study_group_owner(uuid, uuid) from public, anon, authenticated;

comment on function public.is_admin(uuid) is
  'Internal compatibility wrapper. Not callable through browser API roles.';
comment on function public.is_course_instructor(uuid) is
  'Internal compatibility wrapper. Not callable through browser API roles.';
comment on function public.is_course_manager(uuid, uuid) is
  'Internal compatibility wrapper. Not callable through browser API roles.';
comment on function public.is_study_group_member(uuid, uuid) is
  'Internal compatibility wrapper. Not callable through browser API roles.';
comment on function public.is_study_group_owner(uuid, uuid) is
  'Internal compatibility wrapper. Not callable through browser API roles.';

-- RLS without a named policy is intentionally deny-all for browser roles. An
-- explicit service-role policy documents the cache's server-only access model.
create policy "Service role manages shared cache"
on public.shared_cache_entries
for all
to service_role
using (true)
with check (true);
