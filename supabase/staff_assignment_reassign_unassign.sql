-- Staff Class Assignment: assign or reassign lecturer course offerings.
-- Run this in Supabase SQL Editor after the staff academic planning tables/functions exist.

begin;

create or replace function public.staff_assign_course_offering(
  p_course_id uuid,
  p_academic_term_id uuid,
  p_lecturer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  reusable_offering_id uuid;
  new_offering_id uuid := gen_random_uuid();
  new_section_code text;
begin
  if actor_id is null or not exists (
    select 1
    from public.user_profiles profile
    where profile.id = actor_id
      and profile.role in ('staff', 'admin')
      and coalesce(profile.is_active, true)
  ) then
    raise exception 'Only AARO staff or administrators can assign classes to lecturers';
  end if;

  if not exists (
    select 1
    from public.user_profiles profile
    where profile.id = p_lecturer_id
      and profile.role = 'lecturer'
      and coalesce(profile.is_active, true)
  ) then
    raise exception 'The selected user is not an active lecturer';
  end if;

  if not exists (select 1 from public.courses course_row where course_row.id = p_course_id) then
    raise exception 'Course template not found';
  end if;

  if not exists (select 1 from public.academic_terms term where term.id = p_academic_term_id) then
    raise exception 'Academic term not found';
  end if;

  -- Prefer an existing offering already owned by the selected lecturer to avoid the
  -- unique (course_id, academic_term_id, owner_id) constraint. Otherwise, reuse the
  -- current active offering so existing materials, assessments and enrolment key stay intact.
  select offering.id
    into reusable_offering_id
  from public.course_offerings offering
  where offering.course_id = p_course_id
    and offering.academic_term_id = p_academic_term_id
    and offering.owner_id = p_lecturer_id
  order by (offering.status = 'active') desc, offering.updated_at desc nulls last, offering.created_at desc nulls last
  limit 1;

  if reusable_offering_id is null then
    select offering.id
      into reusable_offering_id
    from public.course_offerings offering
    where offering.course_id = p_course_id
      and offering.academic_term_id = p_academic_term_id
      and offering.status = 'active'
    order by offering.updated_at desc nulls last, offering.created_at desc nulls last
    limit 1;
  end if;

  if reusable_offering_id is not null then
    update public.course_offerings offering
       set status = 'closed',
           updated_at = now()
     where offering.course_id = p_course_id
       and offering.academic_term_id = p_academic_term_id
       and offering.id <> reusable_offering_id
       and offering.status = 'active';

    update public.course_offerings offering
       set owner_id = p_lecturer_id,
           status = 'active',
           updated_at = now()
     where offering.id = reusable_offering_id;

    delete from public.course_instructors instructor
     where instructor.course_id = reusable_offering_id
       and instructor.user_id <> p_lecturer_id;

    insert into public.course_instructors (course_id, user_id)
    values (reusable_offering_id, p_lecturer_id)
    on conflict (course_id, user_id) do nothing;

    return reusable_offering_id;
  end if;

  new_section_code := upper(substring(replace(new_offering_id::text, '-', ''), 1, 6));

  insert into public.course_offerings (
    id,
    course_id,
    academic_term_id,
    owner_id,
    section_code,
    enrollment_key,
    max_capacity,
    status
  )
  select
    new_offering_id,
    course_row.id,
    p_academic_term_id,
    p_lecturer_id,
    new_section_code,
    upper(substring(md5(new_offering_id::text || clock_timestamp()::text), 1, 8)),
    coalesce(
      case
        when coalesce(to_jsonb(course_row) ->> 'max_capacity', '') ~ '^[0-9]+$'
        then (to_jsonb(course_row) ->> 'max_capacity')::integer
        else null
      end,
      case
        when coalesce(to_jsonb(course_row) ->> 'max_students', '') ~ '^[0-9]+$'
        then (to_jsonb(course_row) ->> 'max_students')::integer
        else null
      end
    ),
    'active'
  from public.courses course_row
  where course_row.id = p_course_id;

  insert into public.course_instructors (course_id, user_id)
  values (new_offering_id, p_lecturer_id)
  on conflict (course_id, user_id) do nothing;

  return new_offering_id;
end;
$$;


revoke all on function public.staff_assign_course_offering(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.staff_assign_course_offering(uuid, uuid, uuid)
  to authenticated, service_role;


notify pgrst, 'reload schema';

commit;