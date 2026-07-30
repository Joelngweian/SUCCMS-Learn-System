-- Supabase live health hardening.
-- Safe to run in SQL Editor after the existing schema/migrations are present.

-- 1) Supabase Advisor: add the missing index for the FK on assignment_marking_guides.updated_by.
create index if not exists idx_assignment_marking_guides_updated_by
  on public.assignment_marking_guides (updated_by);

-- 2) Storage hardening: study group files should not accept arbitrary MIME types.
update storage.buckets
set allowed_mime_types = array[
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/zip',
  'application/x-zip-compressed'
]
where id = 'study-group-files'
  and allowed_mime_types is null;

-- 3) RLS policy cleanup: merge duplicate permissive SELECT policies on attendance_sessions.
-- This keeps the same access rules: course lecturers OR enrolled students can read sessions.
drop policy if exists "Course lecturers can view attendance sessions"
  on public.attendance_sessions;

drop policy if exists "Students can view enrolled attendance sessions"
  on public.attendance_sessions;

drop policy if exists "Course members can view attendance sessions"
  on public.attendance_sessions;

create policy "Course members can view attendance sessions"
  on public.attendance_sessions
  for select
  to authenticated
  using (
    private.is_course_instructor(course_id)
    or exists (
      select 1
      from public.course_enrollments enrollment
      where enrollment.course_id = attendance_sessions.course_id
        and enrollment.student_id = (select auth.uid())
    )
  );

-- 4) RPC/function hardening: revoke browser-callable EXECUTE grants from internal helpers.
do $$
begin
  if to_regprocedure('public.expire_old_stories()') is not null then
    execute 'revoke execute on function public.expire_old_stories() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.malaysia_week_start(timestamp with time zone)') is not null then
    execute 'revoke execute on function public.malaysia_week_start(timestamp with time zone) from public, anon, authenticated';
  end if;

  if to_regprocedure('public.refresh_progress_leaderboard()') is not null then
    execute 'revoke execute on function public.refresh_progress_leaderboard() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.set_report_severity()') is not null then
    execute 'revoke execute on function public.set_report_severity() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.trigger_refresh_progress_leaderboard()') is not null then
    execute 'revoke execute on function public.trigger_refresh_progress_leaderboard() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.update_updated_at_column()') is not null then
    execute 'revoke execute on function public.update_updated_at_column() from public, anon, authenticated';
  end if;
end $$;
