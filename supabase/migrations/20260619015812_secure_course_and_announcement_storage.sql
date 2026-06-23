begin;

-- Course materials and post attachments belong to enrolled course members.
-- A public bucket bypasses SELECT RLS, so make it private and restore an
-- explicit member-only read policy before the frontend switches to signed URLs.
update storage.buckets
set public = false,
    allowed_mime_types = array[
      'text/plain',
      'text/csv',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ]::text[],
    updated_at = now()
where id = 'course_content';

drop policy if exists "Course content files are viewable"
  on storage.objects;
drop policy if exists "Course members can read course content"
  on storage.objects;

create policy "Course members can read course content"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'course_content'
    and private.is_course_member(
      public.course_id_from_storage_path(name)
    )
  );

-- Announcements are visible only after authentication. Keep their paths in the
-- announcement JSON and issue short-lived URLs to signed-in users at read time.
update storage.buckets
set public = false,
    allowed_mime_types = array[
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
      'image/gif'
    ]::text[],
    updated_at = now()
where id = 'announcement-attachments';

drop policy if exists "Announcement attachments are viewable"
  on storage.objects;
drop policy if exists "Authenticated users can read announcement attachments"
  on storage.objects;

create policy "Authenticated users can read announcement attachments"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'announcement-attachments');

commit;
