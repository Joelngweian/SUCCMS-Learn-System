begin;

create or replace function public.staff_upsert_academic_terms(p_terms jsonb)
returns setof public.academic_terms
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.user_profiles profile
    where profile.id = (select auth.uid())
      and profile.role in ('staff', 'admin')
      and coalesce(profile.is_active, true)
  ) then
    raise exception 'Only AARO staff or administrators can update academic calendar terms';
  end if;

  return query
  with input_terms as (
    select
      upper(btrim(term.code)) as code,
      nullif(btrim(term.name), '') as name,
      term.starts_at::date as starts_at,
      term.ends_at::date as ends_at,
      term.enrollment_starts_at::date as enrollment_starts_at,
      term.enrollment_ends_at::date as enrollment_ends_at,
      term.teaching_starts_at::date as teaching_starts_at,
      term.teaching_ends_at::date as teaching_ends_at,
      case
        when term.status in ('planned', 'active', 'closed') then term.status
        else 'planned'
      end as status
    from jsonb_to_recordset(coalesce(p_terms, '[]'::jsonb)) as term(
      code text,
      name text,
      starts_at text,
      ends_at text,
      enrollment_starts_at text,
      enrollment_ends_at text,
      teaching_starts_at text,
      teaching_ends_at text,
      status text
    )
  ),
  valid_terms as (
    select
      input_terms.code,
      coalesce(
        input_terms.name,
        'Semester ' || right(input_terms.code, 1) || ' ' || left(input_terms.code, 4)
      ) as name,
      input_terms.starts_at,
      input_terms.ends_at,
      input_terms.enrollment_starts_at,
      input_terms.enrollment_ends_at,
      input_terms.teaching_starts_at,
      input_terms.teaching_ends_at,
      input_terms.status
    from input_terms
    where input_terms.code ~ '^\d{4}[ABC]$'
  )
  insert into public.academic_terms (
    code,
    name,
    starts_at,
    ends_at,
    enrollment_starts_at,
    enrollment_ends_at,
    teaching_starts_at,
    teaching_ends_at,
    status
  )
  select
    valid_terms.code,
    valid_terms.name,
    valid_terms.starts_at,
    valid_terms.ends_at,
    valid_terms.enrollment_starts_at,
    valid_terms.enrollment_ends_at,
    valid_terms.teaching_starts_at,
    valid_terms.teaching_ends_at,
    valid_terms.status
  from valid_terms
  on conflict (code) do update set
    name = excluded.name,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    enrollment_starts_at = excluded.enrollment_starts_at,
    enrollment_ends_at = excluded.enrollment_ends_at,
    teaching_starts_at = excluded.teaching_starts_at,
    teaching_ends_at = excluded.teaching_ends_at,
    status = excluded.status,
    updated_at = now()
  returning public.academic_terms.*;
end;
$$;

revoke all on function public.staff_upsert_academic_terms(jsonb) from public, anon;
grant execute on function public.staff_upsert_academic_terms(jsonb) to authenticated, service_role;

commit;
