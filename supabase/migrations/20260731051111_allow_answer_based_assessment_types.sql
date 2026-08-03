begin;

alter table public.assignments
  drop constraint if exists assignments_assessment_type_valid;

alter table public.assignments
  add constraint assignments_assessment_type_valid
  check (
    assessment_type in (
      'tutorial',
      'individual_assignment',
      'group_project',
      'mini_project',
      'mcq',
      'structured',
      'calculation',
      'design'
    )
  );

comment on column public.assignments.assessment_type is
  'Assessment category selected by the lecturer: tutorial, individual assignment, group project, mini project, MCQ, structured question, calculation, or design.';

notify pgrst, 'reload schema';

commit;
