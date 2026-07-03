begin;

-- Adds AARO-controlled study plan tracks.
-- Example: CS 2026B B1 = CS students who entered in 2026 Semester B, normal entry.
-- Example: CS 2026B B2 = CS students who entered in 2026 Semester B, direct second year / credit transfer.

alter table public.study_plan_versions
  add column if not exists track_code text,
  add column if not exists entry_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'study_plan_versions_track_code_check'
      and conrelid = 'public.study_plan_versions'::regclass
  ) then
    alter table public.study_plan_versions
      add constraint study_plan_versions_track_code_check
      check (track_code is null or track_code ~ '^[ABC][12]$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'study_plan_versions_entry_type_check'
      and conrelid = 'public.study_plan_versions'::regclass
  ) then
    alter table public.study_plan_versions
      add constraint study_plan_versions_entry_type_check
      check (entry_type is null or entry_type in ('normal', 'direct_year_2'));
  end if;
end $$;

update public.study_plan_versions
set
  track_code = coalesce(
    track_code,
    substring(upper(coalesce(version_code, '') || ' ' || coalesce(source_label, '')) from '([ABC][12])'),
    case
      when intake_semester in ('A', 'B', 'C') then intake_semester || '1'
      else null
    end
  ),
  entry_type = coalesce(
    entry_type,
    case
      when coalesce(
        track_code,
        substring(upper(coalesce(version_code, '') || ' ' || coalesce(source_label, '')) from '([ABC][12])'),
        case
          when intake_semester in ('A', 'B', 'C') then intake_semester || '1'
          else null
        end
      ) like '%2'
        then 'direct_year_2'
      else 'normal'
    end
  )
where track_code is null
   or entry_type is null;

create index if not exists idx_study_plan_versions_track
  on public.study_plan_versions(programme_key, level, intake_year, intake_semester, track_code, status);

alter table public.study_plan_courses
  add column if not exists mpu_level text,
  add column if not exists mpu_unit text,
  add column if not exists mpu_student_type text,
  add column if not exists offer_until_term_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'study_plan_courses_mpu_level_check'
      and conrelid = 'public.study_plan_courses'::regclass
  ) then
    alter table public.study_plan_courses
      add constraint study_plan_courses_mpu_level_check
      check (mpu_level is null or mpu_level in ('diploma', 'bachelor'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'study_plan_courses_mpu_unit_check'
      and conrelid = 'public.study_plan_courses'::regclass
  ) then
    alter table public.study_plan_courses
      add constraint study_plan_courses_mpu_unit_check
      check (mpu_unit is null or mpu_unit in ('U1', 'U2', 'U3', 'U4'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'study_plan_courses_mpu_student_type_check'
      and conrelid = 'public.study_plan_courses'::regclass
  ) then
    alter table public.study_plan_courses
      add constraint study_plan_courses_mpu_student_type_check
      check (mpu_student_type is null or mpu_student_type in ('local', 'international', 'all'));
  end if;
end $$;

create table if not exists public.student_study_plan_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.user_profiles(id) on delete cascade,
  study_plan_version_id uuid not null references public.study_plan_versions(id) on delete restrict,
  assigned_by uuid references public.user_profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_student_study_plan_assignments_active_student
  on public.student_study_plan_assignments(student_id)
  where status = 'active';

create index if not exists idx_student_study_plan_assignments_student_status
  on public.student_study_plan_assignments(student_id, status);

create index if not exists idx_student_study_plan_assignments_version_status
  on public.student_study_plan_assignments(study_plan_version_id, status);

alter table public.student_study_plan_assignments enable row level security;

grant select, insert, update, delete on public.student_study_plan_assignments
  to authenticated;
grant all on public.student_study_plan_assignments
  to service_role;

drop policy if exists "Students can view their own active study plan assignment"
  on public.student_study_plan_assignments;
create policy "Students can view their own active study plan assignment"
  on public.student_study_plan_assignments for select
  to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role in ('staff', 'admin')
        and coalesce(profile.is_active, true)
    )
  );

drop policy if exists "AARO staff can manage student study plan assignments"
  on public.student_study_plan_assignments;
create policy "AARO staff can manage student study plan assignments"
  on public.student_study_plan_assignments for all
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role in ('staff', 'admin')
        and coalesce(profile.is_active, true)
    )
  )
  with check (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role in ('staff', 'admin')
        and coalesce(profile.is_active, true)
    )
  );

create or replace function public.staff_assign_student_study_plan(
  p_student_id uuid,
  p_study_plan_version_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  inserted_id uuid;
begin
  if actor_id is null or not exists (
    select 1
    from public.user_profiles profile
    where profile.id = actor_id
      and profile.role in ('staff', 'admin')
      and coalesce(profile.is_active, true)
  ) then
    raise exception 'Only AARO staff or administrators can assign study plans to students';
  end if;

  if not exists (
    select 1
    from public.user_profiles profile
    where profile.id = p_student_id
      and profile.role = 'student'
      and coalesce(profile.is_active, true)
  ) then
    raise exception 'Target user is not an active student';
  end if;

  if not exists (
    select 1
    from public.study_plan_versions version
    where version.id = p_study_plan_version_id
      and version.status = 'active'
  ) then
    raise exception 'Study plan version is not active or does not exist';
  end if;

  update public.student_study_plan_assignments
  set
    status = 'inactive',
    updated_at = now()
  where student_id = p_student_id
    and status = 'active';

  insert into public.student_study_plan_assignments (
    assigned_by,
    notes,
    status,
    student_id,
    study_plan_version_id
  )
  values (
    actor_id,
    nullif(trim(coalesce(p_notes, '')), ''),
    'active',
    p_student_id,
    p_study_plan_version_id
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.staff_unassign_student_study_plan(
  p_student_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  affected_count integer := 0;
begin
  if actor_id is null or not exists (
    select 1
    from public.user_profiles profile
    where profile.id = actor_id
      and profile.role in ('staff', 'admin')
      and coalesce(profile.is_active, true)
  ) then
    raise exception 'Only AARO staff or administrators can remove student study plan assignments';
  end if;

  update public.student_study_plan_assignments
  set
    status = 'inactive',
    updated_at = now()
  where student_id = p_student_id
    and status = 'active';

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create or replace function public.staff_list_assignable_students()
returns table (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  faculty text,
  programme text,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not exists (
    select 1
    from public.user_profiles profile
    where profile.id = actor_id
      and profile.role in ('staff', 'admin')
      and coalesce(profile.is_active, true)
  ) then
    raise exception 'Only AARO staff or administrators can list assignable students';
  end if;

  return query
  select
    profile.id,
    profile.email::text,
    profile.full_name::text,
    profile.avatar_url::text,
    profile.faculty::text,
    profile.programme::text,
    profile.role::text
  from public.user_profiles profile
  where profile.role = 'student'
    and coalesce(profile.is_active, true)
  order by profile.full_name nulls last, profile.email nulls last;
end;
$$;

create or replace function public.staff_list_lecturer_options()
returns table (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  faculty text,
  programme text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not exists (
    select 1
    from public.user_profiles profile
    where profile.id = actor_id
      and profile.role in ('staff', 'admin')
      and coalesce(profile.is_active, true)
  ) then
    raise exception 'Only AARO staff or administrators can list lecturer options';
  end if;

  return query
  select
    profile.id,
    profile.email::text,
    profile.full_name::text,
    profile.avatar_url::text,
    profile.faculty::text,
    profile.programme::text
  from public.user_profiles profile
  where profile.role = 'lecturer'
    and coalesce(profile.is_active, true)
  order by profile.full_name nulls last, profile.email nulls last;
end;
$$;
revoke all on function public.staff_assign_student_study_plan(uuid, uuid, text)
  from public, anon;
grant execute on function public.staff_assign_student_study_plan(uuid, uuid, text)
  to authenticated, service_role;

revoke all on function public.staff_unassign_student_study_plan(uuid)
  from public, anon;
grant execute on function public.staff_unassign_student_study_plan(uuid)
  to authenticated, service_role;


revoke all on function public.staff_list_assignable_students()
  from public, anon;
grant execute on function public.staff_list_assignable_students()
  to authenticated, service_role;

revoke all on function public.staff_list_lecturer_options()
  from public, anon;
grant execute on function public.staff_list_lecturer_options()
  to authenticated, service_role;
notify pgrst, 'reload schema';

commit;
