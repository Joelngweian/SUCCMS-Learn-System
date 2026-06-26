begin;

create table if not exists public.course_assessment_items (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null
    references public.course_offerings(id) on delete cascade,
  item_type text not null,
  title text not null,
  max_marks numeric(7, 2) not null,
  weight_percentage numeric(5, 2) not null,
  position integer not null,
  created_by uuid not null references public.user_profiles(id),
  updated_by uuid not null references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_assessment_items_type_valid
    check (
      item_type in (
        'test',
        'individual_assignment',
        'group_project',
        'final_exam'
      )
    ),
  constraint course_assessment_items_title_valid
    check (
      char_length(btrim(title)) between 1 and 120
    ),
  constraint course_assessment_items_marks_valid
    check (max_marks > 0 and max_marks <= 1000),
  constraint course_assessment_items_weight_valid
    check (weight_percentage > 0 and weight_percentage <= 100),
  constraint course_assessment_items_position_valid
    check (position between 1 and 50),
  constraint course_assessment_items_course_position_unique
    unique (course_id, position)
);

create index if not exists idx_course_assessment_items_course_type
  on public.course_assessment_items(course_id, item_type, position);
create index if not exists idx_course_assessment_items_created_by
  on public.course_assessment_items(created_by);
create index if not exists idx_course_assessment_items_updated_by
  on public.course_assessment_items(updated_by);
create unique index if not exists idx_course_assessment_one_final_exam
  on public.course_assessment_items(course_id)
  where item_type = 'final_exam';

alter table public.course_assessment_items enable row level security;

drop policy if exists "Course members can view assessment items"
  on public.course_assessment_items;
create policy "Course members can view assessment items"
  on public.course_assessment_items
  for select
  to authenticated
  using (private.is_course_member(course_id, (select auth.uid())));

-- Browser clients read assessment data directly. All writes go through the
-- authorization-checking RPC below so the total can be validated atomically.
revoke all on table public.course_assessment_items
  from public, anon, authenticated;
grant select on table public.course_assessment_items
  to authenticated;
grant select, insert, update, delete
  on table public.course_assessment_items
  to service_role;

-- Convert any assessment structures created by the earlier fixed-category
-- version. Each old category weight is distributed across its individual
-- items, with the remainder assigned to the last item so the total is exact.
do $migration$
begin
  if to_regclass('public.course_assessment_structures') is not null then
    execute $sql$
      insert into public.course_assessment_items (
        course_id,
        item_type,
        title,
        max_marks,
        weight_percentage,
        position,
        created_by,
        updated_by,
        created_at,
        updated_at
      )
      select
        legacy_item.course_id,
        legacy_item.item_type,
        legacy_item.title,
        legacy_item.max_marks,
        legacy_item.weight_percentage,
        legacy_item.position,
        legacy_item.created_by,
        legacy_item.updated_by,
        legacy_item.created_at,
        legacy_item.updated_at
      from (
        select
          structure.course_id,
          'test'::text as item_type,
          'Test ' || generated.item_number as title,
          structure.test_marks_each as max_marks,
          case
            when generated.item_number < structure.test_count then
              trunc(structure.test_weight / structure.test_count, 2)
            else
              structure.test_weight
                - trunc(
                    structure.test_weight / structure.test_count,
                    2
                  ) * (structure.test_count - 1)
          end as weight_percentage,
          generated.item_number as position,
          structure.created_by,
          structure.updated_by,
          structure.created_at,
          structure.updated_at
        from public.course_assessment_structures structure
        cross join lateral generate_series(
          1,
          structure.test_count
        ) as generated(item_number)
        where structure.test_count > 0
          and structure.test_marks_each > 0
          and structure.test_weight > 0

        union all

        select
          structure.course_id,
          'individual_assignment'::text,
          'Individual Assignment ' || generated.item_number,
          structure.individual_assignment_marks_each,
          case
            when generated.item_number
              < structure.individual_assignment_count
            then
              trunc(
                structure.individual_assignment_weight
                  / structure.individual_assignment_count,
                2
              )
            else
              structure.individual_assignment_weight
                - trunc(
                    structure.individual_assignment_weight
                      / structure.individual_assignment_count,
                    2
                  ) * (structure.individual_assignment_count - 1)
          end,
          structure.test_count + generated.item_number,
          structure.created_by,
          structure.updated_by,
          structure.created_at,
          structure.updated_at
        from public.course_assessment_structures structure
        cross join lateral generate_series(
          1,
          structure.individual_assignment_count
        ) as generated(item_number)
        where structure.individual_assignment_count > 0
          and structure.individual_assignment_marks_each > 0
          and structure.individual_assignment_weight > 0

        union all

        select
          structure.course_id,
          'group_project'::text,
          'Group Project '
            || generated.item_number,
          structure.group_project_marks_each,
          case
            when generated.item_number < structure.group_project_count then
              trunc(
                structure.group_project_weight
                  / structure.group_project_count,
                2
              )
            else
              structure.group_project_weight
                - trunc(
                    structure.group_project_weight
                      / structure.group_project_count,
                    2
                  ) * (structure.group_project_count - 1)
          end,
          structure.test_count
            + structure.individual_assignment_count
            + generated.item_number,
          structure.created_by,
          structure.updated_by,
          structure.created_at,
          structure.updated_at
        from public.course_assessment_structures structure
        cross join lateral generate_series(
          1,
          structure.group_project_count
        ) as generated(item_number)
        where structure.group_project_count > 0
          and structure.group_project_marks_each > 0
          and structure.group_project_weight > 0

        union all

        select
          structure.course_id,
          'final_exam'::text,
          'Final Examination',
          structure.final_exam_marks,
          structure.final_exam_weight,
          structure.test_count
            + structure.individual_assignment_count
            + structure.group_project_count
            + 1,
          structure.created_by,
          structure.updated_by,
          structure.created_at,
          structure.updated_at
        from public.course_assessment_structures structure
        where structure.final_exam_marks > 0
          and structure.final_exam_weight > 0
      ) legacy_item
      order by legacy_item.course_id, legacy_item.position
      on conflict (course_id, position) do nothing
    $sql$;
  end if;
end;
$migration$;

-- Remove the obsolete overloads before dropping the old table. Keeping both
-- signatures would make the Data API expose two functions with the same name.
drop function if exists public.create_course_offering_with_assessment(
  uuid,
  integer,
  numeric,
  numeric,
  integer,
  numeric,
  numeric,
  integer,
  numeric,
  numeric,
  numeric,
  numeric,
  uuid
);
drop function if exists public.save_course_assessment_structure(
  uuid,
  integer,
  numeric,
  numeric,
  integer,
  numeric,
  numeric,
  integer,
  numeric,
  numeric,
  numeric,
  numeric
);
drop table if exists public.course_assessment_structures;

create or replace function public.save_course_assessment_structure(
  p_course_id uuid,
  p_items jsonb
)
returns setof public.course_assessment_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  item_count integer;
  final_exam_count integer;
  total_weight numeric(7, 2);
begin
  if actor_id is null
    or not private.is_course_manager(p_course_id, actor_id)
  then
    raise exception 'Only assigned lecturers and administrators can manage this assessment structure';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Assessment items must be provided as an array';
  end if;

  select
    count(*),
    count(*) filter (where item_type = 'final_exam'),
    coalesce(sum(weight_percentage), 0)
  into item_count, final_exam_count, total_weight
  from jsonb_to_recordset(p_items) as item(
    item_type text,
    title text,
    max_marks numeric,
    weight_percentage numeric,
    position integer
  );

  if item_count < 1 or item_count > 50 then
    raise exception 'A course must have between 1 and 50 assessment items';
  end if;

  if final_exam_count > 1 then
    raise exception 'A course can have at most one final examination';
  end if;

  if abs(total_weight - 100) > 0.001 then
    raise exception 'Assessment percentages must total 100';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(
      item_type text,
      title text,
      max_marks numeric,
      weight_percentage numeric,
      position integer
    )
    where item.item_type is null
      or item.item_type not in (
        'test',
        'individual_assignment',
        'group_project',
        'final_exam'
      )
      or item.title is null
      or char_length(btrim(item.title)) not between 1 and 120
      or item.max_marks is null
      or item.max_marks <= 0
      or item.max_marks > 1000
      or item.weight_percentage is null
      or item.weight_percentage <= 0
      or item.weight_percentage > 100
      or item.position is null
      or item.position not between 1 and 50
  ) then
    raise exception 'One or more assessment items contain invalid values';
  end if;

  if (
    select count(distinct item.position)
    from jsonb_to_recordset(p_items) as item(position integer)
  ) <> item_count then
    raise exception 'Assessment item positions must be unique';
  end if;

  delete from public.course_assessment_items
  where course_id = p_course_id;

  insert into public.course_assessment_items (
    course_id,
    item_type,
    title,
    max_marks,
    weight_percentage,
    position,
    created_by,
    updated_by
  )
  select
    p_course_id,
    item.item_type,
    btrim(item.title),
    item.max_marks,
    item.weight_percentage,
    item.position,
    actor_id,
    actor_id
  from jsonb_to_recordset(p_items) as item(
    item_type text,
    title text,
    max_marks numeric,
    weight_percentage numeric,
    position integer
  )
  order by item.position;

  return query
  select assessment_item.*
  from public.course_assessment_items assessment_item
  where assessment_item.course_id = p_course_id
  order by assessment_item.position;
end;
$$;

create or replace function public.create_course_offering_with_assessment(
  p_course_id uuid,
  p_items jsonb,
  p_academic_term_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_offering_id uuid;
begin
  new_offering_id := public.create_course_offering(
    p_course_id,
    p_academic_term_id
  );

  perform public.save_course_assessment_structure(
    new_offering_id,
    p_items
  );

  return new_offering_id;
end;
$$;

revoke all on function public.save_course_assessment_structure(uuid, jsonb)
  from public, anon;
grant execute on function public.save_course_assessment_structure(uuid, jsonb)
  to authenticated, service_role;

revoke all on function public.create_course_offering_with_assessment(
  uuid,
  jsonb,
  uuid
) from public, anon;
grant execute on function public.create_course_offering_with_assessment(
  uuid,
  jsonb,
  uuid
) to authenticated, service_role;

comment on table public.course_assessment_items is
  'Individual assessment components for a course offering. Item weights collectively contribute 100 percent of the final course grade.';

notify pgrst, 'reload schema';

commit;
