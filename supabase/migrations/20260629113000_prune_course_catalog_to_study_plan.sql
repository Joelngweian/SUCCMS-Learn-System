begin;

-- Keep the course catalog aligned with the CS, IT, and BoSE study plans.
-- The study plan has many rows because the same course appears across intake study plans,
-- semesters, and plan versions. The actual unique concrete course codes are
-- listed below.

create temp table allowed_study_plan_course_codes (
  course_code text primary key
) on commit drop;

insert into allowed_study_plan_course_codes (course_code) values
  ('AMPU3263'),
  ('BBMK3113'),
  ('BGEN1013'),
  ('BMIA1043'),
  ('BTID3006'),
  ('BTIS1013'),
  ('BTIS2013'),
  ('BTIS2033'),
  ('BTIS2043'),
  ('BTIS2053'),
  ('BTIS2073'),
  ('BTIS2083'),
  ('BTIS3013'),
  ('BTIS3043'),
  ('BTIS3053'),
  ('BTIS3073'),
  ('BTIS3103'),
  ('BTIS3204'),
  ('BTPR1003'),
  ('BTPR1103'),
  ('BTPR2013'),
  ('BTPR2033'),
  ('BTPR2043'),
  ('BTPR2113'),
  ('BTPR2123'),
  ('BTPR3203'),
  ('BTSE1003'),
  ('BTSE2003'),
  ('BTSE2043'),
  ('BTSE2113'),
  ('BTSE2123'),
  ('BTSE2133'),
  ('BTSE2153'),
  ('BTSE2163'),
  ('CSIS1003'),
  ('CSIS1013'),
  ('CSIS2013'),
  ('CSIS2023'),
  ('CSIS2033'),
  ('CSIS2063'),
  ('CSIS2073'),
  ('CSIS2083'),
  ('CSIS2093'),
  ('CSIS3003'),
  ('CSIS3006'),
  ('CSIS3013'),
  ('CSIS3023'),
  ('CSIS3033'),
  ('CSIS3043'),
  ('CSIS3044'),
  ('CSIS3053'),
  ('CSIS3083'),
  ('CSIS3103'),
  ('DGEN1013'),
  ('ENGL2113'),
  ('HMPU3313'),
  ('KMPU2432'),
  ('MATH1013'),
  ('MATH1023'),
  ('MATH1033'),
  ('MATH1043'),
  ('MPU2183'),
  ('MPU2223'),
  ('MPU2233'),
  ('MPU2323'),
  ('PROG1003'),
  ('PROG1013'),
  ('PROG1103'),
  ('PROG1114'),
  ('PROG2013'),
  ('PROG2023'),
  ('PROG2033'),
  ('PROG2043'),
  ('PROG2103'),
  ('PROG2114'),
  ('PROG2203');

-- Normalize course_code for the retained study-plan courses.
update public.courses course
set course_code = upper(course.code)
where course.course_code is null
  and upper(course.code) in (
    select allowed.course_code from allowed_study_plan_course_codes allowed
  );

-- Make sure the study-plan course templates remain visible in the catalog.
update public.courses course
set
  status = 'open',
  updated_at = now()
where coalesce(nullif(upper(course.course_code), ''), upper(course.code)) in (
    select allowed.course_code from allowed_study_plan_course_codes allowed
  )
  and course.status is distinct from 'open';

-- Delete old non-study-plan offerings first. Most course-owned records now
-- point to course_offerings(id) with ON DELETE CASCADE, so this removes old
-- demo/enrollment/attendance/assignment data that belongs to unrelated courses.
delete from public.course_offerings offering
where offering.course_id in (
  select course.id
  from public.courses course
  where coalesce(nullif(upper(course.course_code), ''), upper(course.code)) not in (
    select allowed.course_code from allowed_study_plan_course_codes allowed
  )
);

-- Delete old unrelated course templates. Course-level records such as old
-- instructors, course posts, forum threads and notifications were designed to
-- cascade from courses(id), while generated course requests keep their history
-- through ON DELETE SET NULL.
delete from public.courses course
where coalesce(nullif(upper(course.course_code), ''), upper(course.code)) not in (
    select allowed.course_code from allowed_study_plan_course_codes allowed
  );

commit;
