begin;

-- Retire the old lecturer course-creation request workflow.
-- The current flow is AARO/staff-managed study plans and class assignment.
drop function if exists public.approve_course_creation_request(uuid, text);
drop function if exists public.reject_course_creation_request(uuid, text);
drop table if exists public.course_creation_requests cascade;

-- Retire the old unassign RPC. Reassignment keeps existing course data intact.
drop function if exists public.staff_unassign_course_offering(uuid, uuid);

-- Supabase Advisor: add indexes for foreign keys that are queried/joined.
create index if not exists idx_attendance_class_meetings_created_by
  on public.attendance_class_meetings (created_by);

create index if not exists idx_student_study_plan_assignments_assigned_by
  on public.student_study_plan_assignments (assigned_by);

create index if not exists idx_study_plan_versions_created_by
  on public.study_plan_versions (created_by);

create index if not exists idx_study_plan_versions_updated_by
  on public.study_plan_versions (updated_by);

-- Supabase Advisor: remove duplicate permissive SELECT paths.
-- The ALL policy already covers course lecturers for attendance meetings.
drop policy if exists "Course lecturers can view attendance class meetings"
  on public.attendance_class_meetings;

-- Courses are now managed through AARO/staff academic planning.
drop policy if exists "Lecturers can create course templates" on public.courses;
drop policy if exists "Lecturers can update course templates" on public.courses;
drop policy if exists "Lecturers can delete course templates" on public.courses;

drop policy if exists "AARO staff can delete course templates" on public.courses;
create policy "AARO staff can delete course templates"
  on public.courses
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  );

-- Replace ALL policies with command-specific policies so SELECT only has one
-- permissive policy per role/action.
drop policy if exists "AARO staff can manage study plan versions"
  on public.study_plan_versions;
drop policy if exists "AARO staff can insert study plan versions"
  on public.study_plan_versions;
drop policy if exists "AARO staff can update study plan versions"
  on public.study_plan_versions;
drop policy if exists "AARO staff can delete study plan versions"
  on public.study_plan_versions;

create policy "AARO staff can insert study plan versions"
  on public.study_plan_versions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  );

create policy "AARO staff can update study plan versions"
  on public.study_plan_versions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  )
  with check (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  );

create policy "AARO staff can delete study plan versions"
  on public.study_plan_versions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  );

drop policy if exists "AARO staff can manage study plan courses"
  on public.study_plan_courses;
drop policy if exists "AARO staff can insert study plan courses"
  on public.study_plan_courses;
drop policy if exists "AARO staff can update study plan courses"
  on public.study_plan_courses;
drop policy if exists "AARO staff can delete study plan courses"
  on public.study_plan_courses;

create policy "AARO staff can insert study plan courses"
  on public.study_plan_courses
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  );

create policy "AARO staff can update study plan courses"
  on public.study_plan_courses
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  )
  with check (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  );

create policy "AARO staff can delete study plan courses"
  on public.study_plan_courses
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  );

drop policy if exists "AARO staff can manage student study plan assignments"
  on public.student_study_plan_assignments;
drop policy if exists "AARO staff can insert student study plan assignments"
  on public.student_study_plan_assignments;
drop policy if exists "AARO staff can update student study plan assignments"
  on public.student_study_plan_assignments;
drop policy if exists "AARO staff can delete student study plan assignments"
  on public.student_study_plan_assignments;

create policy "AARO staff can insert student study plan assignments"
  on public.student_study_plan_assignments
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  );

create policy "AARO staff can update student study plan assignments"
  on public.student_study_plan_assignments
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  )
  with check (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  );

create policy "AARO staff can delete student study plan assignments"
  on public.student_study_plan_assignments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = any (array['staff'::text, 'admin'::text])
        and coalesce(profile.is_active, true)
    )
  );

-- RPC permission tightening: these browser-callable RPCs belonged to the old
-- self-service lecturer course creation path and are no longer used by the UI.
revoke all on function public.create_course_offering(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.create_course_offering(uuid, uuid)
  to service_role;

revoke all on function public.create_course_offering_with_assessment(uuid, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_course_offering_with_assessment(uuid, jsonb, uuid)
  to service_role;

-- Keep current staff assignment RPC explicit.
revoke all on function public.staff_assign_course_offering(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.staff_assign_course_offering(uuid, uuid, uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
