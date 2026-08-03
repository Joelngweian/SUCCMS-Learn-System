-- Keep assignment marking-guide RLS aligned with the internal helper schema.
-- The public compatibility wrapper is intentionally not executable by browser
-- roles, so policies created after the helper move must call private helpers.

alter table public.assignment_marking_guides enable row level security;

drop policy if exists "Instructors manage assignment marking guides"
  on public.assignment_marking_guides;

create policy "Instructors manage assignment marking guides"
  on public.assignment_marking_guides
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.assignments assignment
      where assignment.id = assignment_marking_guides.assignment_id
        and private.is_course_instructor(assignment.course_id)
    )
  )
  with check (
    exists (
      select 1
      from public.assignments assignment
      where assignment.id = assignment_marking_guides.assignment_id
        and private.is_course_instructor(assignment.course_id)
    )
  );

grant select, insert, update, delete
  on public.assignment_marking_guides
  to authenticated;
