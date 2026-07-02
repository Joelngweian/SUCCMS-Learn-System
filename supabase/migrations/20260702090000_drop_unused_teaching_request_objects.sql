drop function if exists public.approve_course_teaching_request(uuid, text);
drop function if exists public.reject_course_teaching_request(uuid, text);
drop function if exists public.staff_unassign_course_offering(uuid, uuid);

drop table if exists public.course_teaching_requests;
