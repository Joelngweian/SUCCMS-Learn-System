-- Campus-wide social feed for students, lecturers, and administrators.
-- The feed uses cursor pagination and a low-volume private Broadcast channel.
-- Reactions and comments intentionally do not broadcast campus-wide.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.campus_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null
    references public.user_profiles(id) on delete cascade,
  content text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campus_posts_content_length_check
    check (char_length(content) <= 5000),
  constraint campus_posts_attachments_array_check
    check (jsonb_typeof(attachments) = 'array'),
  constraint campus_posts_has_content_check
    check (
      char_length(btrim(content)) > 0
      or jsonb_array_length(attachments) > 0
    )
);

create table if not exists public.campus_post_reactions (
  post_id uuid not null
    references public.campus_posts(id) on delete cascade,
  user_id uuid not null
    references public.user_profiles(id) on delete cascade,
  reaction text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id),
  constraint campus_post_reactions_type_check
    check (reaction in ('like', 'love', 'celebrate', 'support'))
);

create table if not exists public.campus_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.campus_posts(id) on delete cascade,
  author_id uuid not null
    references public.user_profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campus_post_comments_content_check
    check (
      char_length(btrim(content)) between 1 and 2000
    )
);

create index if not exists idx_campus_posts_created_id_desc
  on public.campus_posts (created_at desc, id desc);

create index if not exists idx_campus_posts_author_created_desc
  on public.campus_posts (author_id, created_at desc);

create index if not exists idx_campus_post_reactions_user_created
  on public.campus_post_reactions (user_id, created_at desc);

create index if not exists idx_campus_post_comments_post_created
  on public.campus_post_comments (post_id, created_at asc, id asc);

create index if not exists idx_campus_post_comments_author_created
  on public.campus_post_comments (author_id, created_at desc);

drop trigger if exists update_campus_posts_updated_at
  on public.campus_posts;
create trigger update_campus_posts_updated_at
  before update on public.campus_posts
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_campus_post_comments_updated_at
  on public.campus_post_comments;
create trigger update_campus_post_comments_updated_at
  before update on public.campus_post_comments
  for each row execute function public.update_updated_at_column();

alter table public.campus_posts enable row level security;
alter table public.campus_post_reactions enable row level security;
alter table public.campus_post_comments enable row level security;

drop policy if exists "Campus members can view campus posts"
  on public.campus_posts;
create policy "Campus members can view campus posts"
  on public.campus_posts
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.user_profiles profile
      where profile.id = campus_posts.author_id
        and coalesce(profile.is_active, true)
    )
  );

drop policy if exists "Active campus members can create own posts"
  on public.campus_posts;
create policy "Active campus members can create own posts"
  on public.campus_posts
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and coalesce(profile.is_active, true)
    )
  );

drop policy if exists "Post owners can update own campus posts"
  on public.campus_posts;
create policy "Post owners can update own campus posts"
  on public.campus_posts
  for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "Post owners and admins can delete campus posts"
  on public.campus_posts;
create policy "Post owners and admins can delete campus posts"
  on public.campus_posts
  for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'admin'
        and coalesce(profile.is_active, true)
    )
  );

drop policy if exists "Campus members can view post reactions"
  on public.campus_post_reactions;
create policy "Campus members can view post reactions"
  on public.campus_post_reactions
  for select
  to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "Active campus members can react"
  on public.campus_post_reactions;
create policy "Active campus members can react"
  on public.campus_post_reactions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and coalesce(profile.is_active, true)
    )
  );

drop policy if exists "Members can change own post reactions"
  on public.campus_post_reactions;
create policy "Members can change own post reactions"
  on public.campus_post_reactions
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Members can remove own post reactions"
  on public.campus_post_reactions;
create policy "Members can remove own post reactions"
  on public.campus_post_reactions
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Campus members can view post comments"
  on public.campus_post_comments;
create policy "Campus members can view post comments"
  on public.campus_post_comments
  for select
  to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "Active campus members can comment"
  on public.campus_post_comments;
create policy "Active campus members can comment"
  on public.campus_post_comments
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and coalesce(profile.is_active, true)
    )
  );

drop policy if exists "Comment owners can update own comments"
  on public.campus_post_comments;
create policy "Comment owners can update own comments"
  on public.campus_post_comments
  for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "Comment owners and admins can delete comments"
  on public.campus_post_comments;
create policy "Comment owners and admins can delete comments"
  on public.campus_post_comments
  for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1
      from public.user_profiles profile
      where profile.id = (select auth.uid())
        and profile.role = 'admin'
        and coalesce(profile.is_active, true)
    )
  );

revoke all on public.campus_posts
  from public, anon, authenticated;
revoke all on public.campus_post_reactions
  from public, anon, authenticated;
revoke all on public.campus_post_comments
  from public, anon, authenticated;

grant select, insert, update, delete on public.campus_posts
  to authenticated;
grant select, insert, update, delete on public.campus_post_reactions
  to authenticated;
grant select, insert, update, delete on public.campus_post_comments
  to authenticated;

create or replace function public.get_campus_posts_page(
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 11
)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  author_avatar_url text,
  author_role text,
  content text,
  attachments jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  reaction_count bigint,
  comment_count bigint,
  viewer_reaction text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    post.id,
    post.author_id,
    coalesce(nullif(author.full_name, ''), 'Campus member') as author_name,
    author.avatar_url as author_avatar_url,
    author.role as author_role,
    post.content,
    post.attachments,
    post.created_at,
    post.updated_at,
    (
      select count(*)
      from public.campus_post_reactions reaction
      where reaction.post_id = post.id
    ) as reaction_count,
    (
      select count(*)
      from public.campus_post_comments comment
      where comment.post_id = post.id
    ) as comment_count,
    (
      select reaction.reaction
      from public.campus_post_reactions reaction
      where reaction.post_id = post.id
        and reaction.user_id = (select auth.uid())
      limit 1
    ) as viewer_reaction
  from public.campus_posts post
  join public.user_profiles author
    on author.id = post.author_id
  where (select auth.uid()) is not null
    and coalesce(author.is_active, true)
    and (
      p_before_created_at is null
      or post.created_at < p_before_created_at
      or (
        post.created_at = p_before_created_at
        and p_before_id is not null
        and post.id < p_before_id
      )
    )
  order by post.created_at desc, post.id desc
  limit least(greatest(coalesce(p_limit, 11), 1), 26);
$function$;

revoke all on function public.get_campus_posts_page(
  timestamptz,
  uuid,
  integer
) from public, anon;
grant execute on function public.get_campus_posts_page(
  timestamptz,
  uuid,
  integer
) to authenticated, service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'campus-posts',
  'campus-posts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Campus members can view post media"
  on storage.objects;
create policy "Campus members can view post media"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'campus-posts');

drop policy if exists "Members can upload own campus post media"
  on storage.objects;
create policy "Members can upload own campus post media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'campus-posts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Members can update own campus post media"
  on storage.objects;
create policy "Members can update own campus post media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'campus-posts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'campus-posts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Members can delete own campus post media"
  on storage.objects;
create policy "Members can delete own campus post media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'campus-posts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create or replace function private.can_receive_realtime_topic(
  target_topic text,
  target_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  topic_id text;
begin
  if target_user_id is null or target_topic is null then
    return false;
  end if;

  if target_topic = 'campus:feed' then
    return exists (
      select 1
      from public.user_profiles profile
      where profile.id = target_user_id
        and coalesce(profile.is_active, true)
    );
  end if;

  if target_topic like 'user:%' then
    return split_part(target_topic, ':', 2) = target_user_id::text;
  end if;

  if target_topic like 'admin:%' then
    return exists (
      select 1
      from public.user_profiles profile
      where profile.id = target_user_id
        and profile.role = 'admin'
        and coalesce(profile.is_active, true)
    );
  end if;

  if target_topic like 'course:%' then
    topic_id := split_part(target_topic, ':', 2);
    return exists (
      select 1
      from public.course_enrollments enrollment
      where enrollment.course_id::text = topic_id
        and enrollment.student_id = target_user_id
    ) or exists (
      select 1
      from public.course_instructors instructor
      where instructor.course_id::text = topic_id
        and instructor.user_id = target_user_id
    ) or exists (
      select 1
      from public.course_offerings offering
      where offering.id::text = topic_id
        and offering.owner_id = target_user_id
    ) or exists (
      select 1
      from public.user_profiles profile
      where profile.id = target_user_id
        and profile.role = 'admin'
        and coalesce(profile.is_active, true)
    );
  end if;

  return false;
end;
$function$;

revoke all on function private.can_receive_realtime_topic(text, uuid)
  from public, anon;
grant execute on function private.can_receive_realtime_topic(text, uuid)
  to authenticated;

alter table realtime.messages enable row level security;
drop policy if exists "Authenticated users receive scoped broadcasts"
  on realtime.messages;
create policy "Authenticated users receive scoped broadcasts"
  on realtime.messages
  for select
  to authenticated
  using (
    extension = 'broadcast'
    and private.can_receive_realtime_topic(
      (select realtime.topic()),
      (select auth.uid())
    )
  );

create or replace function private.broadcast_campus_post_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  record_data jsonb;
begin
  record_data := case
    when TG_OP = 'DELETE' then to_jsonb(OLD)
    else to_jsonb(NEW)
  end;

  perform realtime.send(
    jsonb_build_object(
      'post_id', record_data->>'id',
      'author_id', record_data->>'author_id',
      'type', TG_OP
    ),
    TG_OP,
    'campus:feed',
    true
  );

  return null;
exception
  when others then
    raise warning 'Campus post Broadcast failed (%): %', TG_OP, SQLERRM;
    return null;
end;
$function$;

revoke all on function private.broadcast_campus_post_change()
  from public, anon, authenticated;

drop trigger if exists broadcast_campus_posts_changes
  on public.campus_posts;
create trigger broadcast_campus_posts_changes
  after insert or update or delete on public.campus_posts
  for each row execute function private.broadcast_campus_post_change();

notify pgrst, 'reload schema';

commit;
