-- Allow one private image attachment per campus-feed comment.
-- Comment media reuses the existing private campus-posts Storage bucket.

begin;

alter table public.campus_post_comments
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.campus_post_comments
  alter column content set default '';

alter table public.campus_post_comments
  drop constraint if exists campus_post_comments_content_check;

alter table public.campus_post_comments
  drop constraint if exists campus_post_comments_content_length_check;
alter table public.campus_post_comments
  add constraint campus_post_comments_content_length_check
  check (char_length(content) <= 2000);

alter table public.campus_post_comments
  drop constraint if exists campus_post_comments_attachments_check;
alter table public.campus_post_comments
  add constraint campus_post_comments_attachments_check
  check (
    jsonb_typeof(attachments) = 'array'
    and jsonb_array_length(attachments) <= 1
  );

alter table public.campus_post_comments
  drop constraint if exists campus_post_comments_has_content_check;
alter table public.campus_post_comments
  add constraint campus_post_comments_has_content_check
  check (
    char_length(btrim(content)) > 0
    or jsonb_array_length(attachments) > 0
  );

drop policy if exists "Members can delete own campus post media"
  on storage.objects;
create policy "Members and admins can delete campus post media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'campus-posts'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1
        from public.user_profiles profile
        where profile.id = (select auth.uid())
          and profile.role = 'admin'
          and coalesce(profile.is_active, true)
      )
    )
  );

notify pgrst, 'reload schema';

commit;
