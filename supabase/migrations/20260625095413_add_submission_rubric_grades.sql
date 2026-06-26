alter table public.assignment_submissions
  add column if not exists rubric_grades jsonb not null default '[]'::jsonb;

alter table public.assignment_submissions
  drop constraint if exists assignment_submissions_rubric_grades_is_array;

alter table public.assignment_submissions
  add constraint assignment_submissions_rubric_grades_is_array
  check (jsonb_typeof(rubric_grades) = 'array');

comment on column public.assignment_submissions.rubric_grades is
  'Lecturer-reviewed rubric breakdown containing the AI score, lecturer adjustment, final score, maximum score, and rationale for each criterion.';

notify pgrst, 'reload schema';
