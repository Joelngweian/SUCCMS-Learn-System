begin;

alter table public.academic_terms
  add column if not exists enrollment_starts_at date,
  add column if not exists enrollment_ends_at date,
  add column if not exists teaching_starts_at date,
  add column if not exists teaching_ends_at date,
  add column if not exists is_current_enrollment_term boolean not null default false;

create unique index if not exists idx_academic_terms_single_current_enrollment
  on public.academic_terms(is_current_enrollment_term)
  where is_current_enrollment_term;

insert into public.academic_terms (code, name, starts_at, ends_at, enrollment_starts_at, enrollment_ends_at, teaching_starts_at, teaching_ends_at, status) values
  ('2026A', 'Semester A 2026', '2026-03-02'::date, '2026-05-01'::date, '2026-02-09'::date, '2026-03-12'::date, '2026-03-02'::date, '2026-05-01'::date, 'closed'),
  ('2026B', 'Semester B 2026', '2026-05-25'::date, '2026-09-18'::date, '2026-05-18'::date, '2026-06-04'::date, '2026-05-25'::date, '2026-09-18'::date, 'active'),
  ('2026C', 'Semester C 2026', '2026-10-05'::date, '2027-01-29'::date, '2026-09-28'::date, '2026-10-15'::date, '2026-10-05'::date, '2027-01-29'::date, 'planned'),
  ('2027A', 'Semester A 2027', null::date, null::date, '2027-02-15'::date, '2027-02-26'::date, null::date, null::date, 'planned')
on conflict (code) do update set
  name = excluded.name,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  enrollment_starts_at = excluded.enrollment_starts_at,
  enrollment_ends_at = excluded.enrollment_ends_at,
  teaching_starts_at = excluded.teaching_starts_at,
  teaching_ends_at = excluded.teaching_ends_at,
  status = excluded.status,
  updated_at = now();


create or replace function public.get_current_enrollment_term_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  with ranked_terms as (
    select
      term.id,
      case
        when term.is_current_enrollment_term then 0
        when current_date between term.enrollment_starts_at and term.enrollment_ends_at then 1
        when current_date between coalesce(term.teaching_starts_at, term.starts_at) and coalesce(term.teaching_ends_at, term.ends_at) then 2
        when term.enrollment_starts_at >= current_date then 3
        when coalesce(term.teaching_starts_at, term.starts_at) >= current_date then 4
        when term.status = 'active' and term.code <> 'CURRENT' then 5
        when term.code = 'CURRENT' then 9
        else 8
      end as priority,
      case
        when term.enrollment_starts_at >= current_date then term.enrollment_starts_at
        when coalesce(term.teaching_starts_at, term.starts_at) >= current_date then coalesce(term.teaching_starts_at, term.starts_at)
        else null
      end as future_date,
      coalesce(term.teaching_ends_at, term.ends_at, term.enrollment_ends_at, term.created_at::date) as latest_date
    from public.academic_terms term
  )
  select ranked_terms.id
  from ranked_terms
  order by
    ranked_terms.priority,
    ranked_terms.future_date asc nulls last,
    ranked_terms.latest_date desc nulls last,
    ranked_terms.id
  limit 1;
$$;

create or replace function public.get_current_enrollment_term()
returns table (
  id uuid,
  code text,
  name text,
  starts_at date,
  ends_at date,
  enrollment_starts_at date,
  enrollment_ends_at date,
  status text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    term.id,
    term.code,
    term.name,
    term.starts_at,
    term.ends_at,
    term.enrollment_starts_at,
    term.enrollment_ends_at,
    term.status
  from public.academic_terms term
  where term.id = public.get_current_enrollment_term_id()
  limit 1;
$$;

revoke all on function public.get_current_enrollment_term_id() from public, anon;
revoke all on function public.get_current_enrollment_term() from public, anon;
grant execute on function public.get_current_enrollment_term_id() to authenticated, service_role;
grant execute on function public.get_current_enrollment_term() to authenticated, service_role;

update public.courses
set course_code = code
where course_code is null
  and upper(code) in (
    'AMPU3263', 'BBMK3113', 'BGEN1013', 'BMIA1043', 'BTID3006', 'BTIS1013', 'BTIS2013', 'BTIS2033',
    'BTIS2043', 'BTIS2053', 'BTIS2073', 'BTIS2083', 'BTIS3013', 'BTIS3043', 'BTIS3053', 'BTIS3073',
    'BTIS3103', 'BTIS3204', 'BTPR1003', 'BTPR1103', 'BTPR2013', 'BTPR2033', 'BTPR2043', 'BTPR2113',
    'BTPR2123', 'BTPR3203', 'BTSE1003', 'BTSE2003', 'BTSE2043', 'BTSE2113', 'BTSE2123', 'BTSE2133',
    'BTSE2153', 'BTSE2163', 'CSIS1003', 'CSIS1013', 'CSIS2013', 'CSIS2023', 'CSIS2033', 'CSIS2063',
    'CSIS2073', 'CSIS2083', 'CSIS2093', 'CSIS3003', 'CSIS3006', 'CSIS3013', 'CSIS3023', 'CSIS3033',
    'CSIS3043', 'CSIS3044', 'CSIS3053', 'CSIS3083', 'CSIS3103', 'DGEN1013', 'ENGL2113', 'HMPU3313',
    'KMPU2432', 'MATH1013', 'MATH1023', 'MATH1033', 'MATH1043', 'MPU2183', 'MPU2223', 'MPU2233',
    'MPU2323', 'PROG1003', 'PROG1013', 'PROG1103', 'PROG1114', 'PROG2013', 'PROG2023', 'PROG2033',
    'PROG2043', 'PROG2103', 'PROG2114', 'PROG2203'
  );

with course_seed(course_code, course_name, credit_hours, programme_key, programme_name, level, course_type) as (
  values
    ('AMPU3263', 'Free Elective', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'elective_open'),
    ('BBMK3113', 'Free Elective', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'elective_open'),
    ('BGEN1013', 'Academic English', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'elective_open'),
    ('BMIA1043', 'Free Elective', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'elective_open'),
    ('BTID3006', 'Industrial Training', 6, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTIS1013', 'Field Elective', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'elective_open'),
    ('BTIS2013', 'Database Systems', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTIS2033', 'Project Management', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTIS2043', 'Computer Organization and Architecture', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTIS2053', 'Introduction to Networks and Communication Systems', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTIS2073', 'Information Security and Assurance', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTIS2083', 'Field Elective', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'elective_open'),
    ('BTIS3013', 'Operating System', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTIS3043', 'Field Elective', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'elective_open'),
    ('BTIS3053', 'Social and Professional Issues', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTIS3073', 'Field Elective', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'elective_open'),
    ('BTIS3103', 'Final Year Project I', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTIS3204', 'Final Year Project II', 4, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTPR1003', 'Java Programming I', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTPR1103', 'Java Programming II', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTPR2013', 'Information Security and Assurance (CS)', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTPR2033', 'Field Elective', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'elective_open'),
    ('BTPR2043', 'Mobile Application Development', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTPR2113', 'Web Development', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTPR2123', 'Object-Oriented Programming', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTPR3203', 'Python for Data Science', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTSE1003', 'Object-Oriented System Modeling and Analysis', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTSE2003', 'Software Engineering', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTSE2043', 'Software Process', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTSE2113', 'Software Quality', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTSE2123', 'Software Testing', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTSE2133', 'Software Design', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTSE2153', 'Software Evolution and Maintenance', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('BTSE2163', 'Software Requirement', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'discipline_core'),
    ('CSIS1003', 'Computer System', 3, 'CS', 'Diploma in Computer Science', 'Diploma', 'discipline_core'),
    ('CSIS1013', 'Internet Application', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS2013', 'System Analysis and Design', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS2023', 'Database System Design', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS2033', 'Networking and Distributed System', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS2063', 'Project Management', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS2073', 'Web-Based Systems', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS2083', 'Computer Organization and Architecture', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS2093', 'Operating System', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS3003', 'Project I', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS3006', 'Industrial Training', 6, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS3013', 'System Security and Control', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS3023', 'Software Engineering', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS3033', 'Ethics in Computing', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('CSIS3043', 'Distributed Database System', 3, 'CS', 'Diploma in Computer Science', 'Diploma', 'discipline_core'),
    ('CSIS3044', 'Project (Sem C)', 4, 'CS', 'Diploma in Computer Science', 'Diploma', 'discipline_core'),
    ('CSIS3053', 'Fundamental of Artificial Intelligence', 3, 'CS', 'Diploma in Computer Science', 'Diploma', 'discipline_core'),
    ('CSIS3083', 'Ethics in Computing', 3, 'CS', 'Diploma in Computer Science', 'Diploma', 'discipline_core'),
    ('CSIS3103', 'Project II', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('DGEN1013', 'Communicative  English', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('ENGL2113', 'Communicative  English', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'elective_open'),
    ('HMPU3313', 'Free Elective', 3, 'BOSE', 'Bachelor of Software Engineering (Honours)', 'Bachelor', 'elective_open'),
    ('KMPU2432', 'Integrity and Anti-Corruption', 2, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('MATH1013', 'Statistics and Probability', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('MATH1023', 'Calculus and Algebra', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('MATH1033', 'Discrete Mathematics', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('MATH1043', 'Calculus', 3, 'CS', 'Diploma in Computer Science', 'Diploma', 'discipline_core'),
    ('MPU2183', 'Penghayatan Etika dan Peradaban (local) (U1)', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('MPU2223', 'Introduction to Mass Communication', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('MPU2233', 'Critical Thinking Skills', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('MPU2323', 'Moral Studies', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('PROG1003', 'Fundamentals of Software Design and Development', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('PROG1013', 'Introduction to Programming', 3, 'CS', 'Diploma in Computer Science', 'Diploma', 'discipline_core'),
    ('PROG1103', 'Software Development', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('PROG1114', 'Java Programming', 4, 'CS', 'Diploma in Computer Science', 'Diploma', 'discipline_core'),
    ('PROG2013', 'Object-Oriented Programming', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('PROG2023', 'Introduction to Cloud Computing', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('PROG2033', 'Mobile Application Development', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('PROG2043', 'Distributed Database System', 3, 'CS', 'Diploma in Computer Science', 'Diploma', 'discipline_core'),
    ('PROG2103', 'Data Structure and Algorithm', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core'),
    ('PROG2114', 'Advanced Java Programming', 4, 'CS', 'Diploma in Computer Science', 'Diploma', 'discipline_core'),
    ('PROG2203', 'Human Computer Interaction', 3, 'IT', 'Diploma in Information Technology', 'Diploma', 'discipline_core')
), ranked_course_seed as (
  select distinct on (course_code) *
  from course_seed
  order by course_code,
    case
      when lower(course_name) in ('elective', 'elective subject', 'field elective', 'free elective') then 1
      else 0
    end,
    course_name
)
insert into public.courses (
  code, course_code, name, faculty, programme, course_type, credits, credit_hours, status
)
select
  seed.course_code,
  seed.course_code,
  seed.course_name,
  case
    when seed.programme_key in ('IT', 'CS', 'BOSE') then 'Faculty of Engineering and Information Technology'
    else 'All Faculties'
  end,
  seed.programme_name,
  seed.course_type,
  seed.credit_hours,
  seed.credit_hours,
  'open'
from ranked_course_seed seed
on conflict (course_code) where course_code is not null do update set
  name = case
    when lower(public.courses.name) in ('elective', 'elective subject', 'field elective', 'free elective') then excluded.name
    else public.courses.name
  end,
  credit_hours = coalesce(public.courses.credit_hours, excluded.credit_hours),
  credits = coalesce(public.courses.credits, excluded.credits),
  programme = coalesce(public.courses.programme, excluded.programme),
  faculty = coalesce(public.courses.faculty, excluded.faculty),
  course_type = coalesce(public.courses.course_type, excluded.course_type);


create or replace function public.create_course_offering(
  p_course_id uuid,
  p_academic_term_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  selected_term_id uuid;
  new_offering_id uuid := gen_random_uuid();
  new_section_code text;
begin
  if actor_id is null or not exists (
    select 1
    from public.user_profiles profile
    where profile.id = actor_id
      and profile.role in ('lecturer', 'admin')
  ) then
    raise exception 'Only lecturers and administrators can create course offerings';
  end if;

  if not exists (select 1 from public.courses course_row where course_row.id = p_course_id) then
    raise exception 'Course template not found';
  end if;

  selected_term_id := p_academic_term_id;
  if selected_term_id is null then
    selected_term_id := public.get_current_enrollment_term_id();
  end if;

  if selected_term_id is null then
    raise exception 'No current academic term is configured';
  end if;

  if exists (
    select 1
    from public.course_offerings offering
    where offering.course_id = p_course_id
      and offering.academic_term_id = selected_term_id
      and offering.owner_id = actor_id
      and offering.status = 'active'
  ) then
    raise exception 'You are already teaching this course in the current term';
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
    selected_term_id,
    actor_id,
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
  values (new_offering_id, actor_id);

  return new_offering_id;
end;
$$;

grant execute on function public.create_course_offering(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
