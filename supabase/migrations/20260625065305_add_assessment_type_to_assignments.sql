begin;

alter table public.assignments
  add column if not exists assessment_type text;

update public.assignments
set assessment_type = 'individual_assignment'
where assessment_type is null;

alter table public.assignments
  alter column assessment_type
    set default 'individual_assignment',
  alter column assessment_type
    set not null;

alter table public.assignments
  drop constraint if exists assignments_assessment_type_valid;

alter table public.assignments
  add constraint assignments_assessment_type_valid
  check (
    assessment_type in (
      'tutorial',
      'individual_assignment',
      'group_project',
      'mini_project'
    )
  );

comment on column public.assignments.assessment_type is
  'Assessment category selected by the lecturer: tutorial, individual assignment, group project, or mini project.';

notify pgrst, 'reload schema';

commit;
