-- Campus Feed @mentions.
-- Supports:
--   @username / @FullNameWithoutSpaces -> direct user notification
--   @COURSECODE -> notification for students enrolled in active offerings

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.campus_post_mentions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.campus_posts(id) on delete cascade,
  target_type text not null
    check (target_type in ('user', 'course')),
  target_user_id uuid
    references public.user_profiles(id) on delete cascade,
  target_course_id uuid
    references public.course_offerings(id) on delete cascade,
  target_token text not null,
  created_at timestamptz not null default now(),
  constraint campus_post_mentions_target_check check (
    (
      target_type = 'user'
      and target_user_id is not null
      and target_course_id is null
    )
    or (
      target_type = 'course'
      and target_course_id is not null
      and target_user_id is null
    )
  )
);

create index if not exists idx_campus_post_mentions_post
  on public.campus_post_mentions(post_id);

create index if not exists idx_campus_post_mentions_user
  on public.campus_post_mentions(target_user_id)
  where target_user_id is not null;

create index if not exists idx_campus_post_mentions_course
  on public.campus_post_mentions(target_course_id)
  where target_course_id is not null;

create unique index if not exists idx_campus_post_mentions_user_unique
  on public.campus_post_mentions(post_id, target_user_id)
  where target_type = 'user' and target_user_id is not null;

create unique index if not exists idx_campus_post_mentions_course_unique
  on public.campus_post_mentions(post_id, target_course_id)
  where target_type = 'course' and target_course_id is not null;

alter table public.campus_post_mentions enable row level security;

drop policy if exists "Campus members can view campus post mentions"
  on public.campus_post_mentions;
create policy "Campus members can view campus post mentions"
  on public.campus_post_mentions
  for select
  to authenticated
  using ((select auth.uid()) is not null);

revoke all on public.campus_post_mentions
  from public, anon, authenticated;
grant select on public.campus_post_mentions to authenticated;

create or replace function private.extract_campus_mention_tokens(
  source_text text
)
returns table (
  token text,
  normalized_token text
)
language sql
immutable
set search_path = ''
as $function$
  select distinct
    found.parts[2] as token,
    upper(found.parts[2]) as normalized_token
  from regexp_matches(
    coalesce(source_text, ''),
    '(^|[^A-Za-z0-9_-])@([A-Za-z0-9][A-Za-z0-9_-]{1,63})',
    'g'
  ) as found(parts)
  where found.parts[2] is not null;
$function$;

revoke all on function private.extract_campus_mention_tokens(text)
  from public, anon, authenticated;

create or replace function private.refresh_campus_post_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_name text;
  post_excerpt text;
begin
  if TG_OP = 'UPDATE'
     and coalesce(NEW.content, '') = coalesce(OLD.content, '') then
    return NEW;
  end if;

  delete from public.campus_post_mentions
  where post_id = NEW.id;

  select coalesce(nullif(profile.full_name, ''), 'A campus member')
  into actor_name
  from public.user_profiles profile
  where profile.id = NEW.author_id;

  post_excerpt := left(
    regexp_replace(coalesce(NEW.content, ''), '\s+', ' ', 'g'),
    160
  );

  if nullif(btrim(post_excerpt), '') is null then
    post_excerpt := 'A campus post mentioned you.';
  end if;

  with tokens as (
    select token, normalized_token
    from private.extract_campus_mention_tokens(NEW.content)
  ),
  matched_courses as (
    select distinct
      offering.id as course_id,
      coalesce(
        nullif(btrim(course.course_code), ''),
        nullif(btrim(course.code), ''),
        tokens.token
      ) as course_code,
      upper(coalesce(
        nullif(btrim(course.course_code), ''),
        nullif(btrim(course.code), ''),
        tokens.token
      )) as normalized_course_code,
      tokens.token
    from tokens
    join public.courses course
      on upper(nullif(btrim(course.course_code), '')) = tokens.normalized_token
      or upper(nullif(btrim(course.code), '')) = tokens.normalized_token
    join public.course_offerings offering
      on offering.course_id = course.id
    where offering.status = 'active'
      and (
        offering.owner_id is not null
        or exists (
          select 1
          from public.course_instructors instructor
          where instructor.course_id = offering.id
        )
      )
  )
  insert into public.campus_post_mentions (
    post_id,
    target_type,
    target_course_id,
    target_token
  )
  select
    NEW.id,
    'course',
    matched_courses.course_id,
    '@' || matched_courses.token
  from matched_courses
  on conflict do nothing;

  with tokens as (
    select token, normalized_token
    from private.extract_campus_mention_tokens(NEW.content)
  ),
  matched_courses as (
    select distinct
      offering.id as course_id,
      coalesce(
        nullif(btrim(course.course_code), ''),
        nullif(btrim(course.code), ''),
        tokens.token
      ) as course_code,
      upper(coalesce(
        nullif(btrim(course.course_code), ''),
        nullif(btrim(course.code), ''),
        tokens.token
      )) as normalized_course_code,
      tokens.token
    from tokens
    join public.courses course
      on upper(nullif(btrim(course.course_code), '')) = tokens.normalized_token
      or upper(nullif(btrim(course.code), '')) = tokens.normalized_token
    join public.course_offerings offering
      on offering.course_id = course.id
    where offering.status = 'active'
      and (
        offering.owner_id is not null
        or exists (
          select 1
          from public.course_instructors instructor
          where instructor.course_id = offering.id
        )
      )
  ),
  course_recipients as (
    select distinct on (
      enrollment.student_id,
      matched_courses.normalized_course_code
    )
      enrollment.student_id as recipient_id,
      matched_courses.course_id,
      matched_courses.course_code,
      matched_courses.token
    from matched_courses
    join public.course_enrollments enrollment
      on enrollment.course_id = matched_courses.course_id
    join public.user_profiles recipient_profile
      on recipient_profile.id = enrollment.student_id
    where enrollment.student_id <> NEW.author_id
      and recipient_profile.role <> 'admin'
      and coalesce(recipient_profile.is_active, true)
    order by
      enrollment.student_id,
      matched_courses.normalized_course_code,
      matched_courses.course_id
  )
  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    message,
    course_id,
    entity_type,
    entity_id,
    action_url,
    metadata,
    dedupe_key
  )
  select
    course_recipients.recipient_id,
    NEW.author_id,
    'campus_post_mention',
    actor_name || ' mentioned @' || course_recipients.course_code,
    post_excerpt,
    course_recipients.course_id,
    'campus_post',
    NEW.id,
    '/#campus-post-' || NEW.id::text,
    jsonb_build_object(
      'post_id', NEW.id,
      'mention_type', 'course',
      'mention_token', '@' || course_recipients.token,
      'course_code', course_recipients.course_code
    ),
    'campus-post-course-mention:' || NEW.id::text || ':'
      || course_recipients.course_code || ':'
      || course_recipients.recipient_id::text
  from course_recipients
  on conflict (dedupe_key) do nothing;

  with tokens as (
    select token, normalized_token
    from private.extract_campus_mention_tokens(NEW.content)
  ),
  matched_users as (
    select distinct
      profile.id as user_id,
      coalesce(nullif(profile.full_name, ''), profile.username, 'Campus member')
        as display_name,
      tokens.token
    from tokens
    join public.user_profiles profile
      on upper(nullif(btrim(profile.username), '')) = tokens.normalized_token
      or upper(regexp_replace(coalesce(profile.full_name, ''), '\s+', '', 'g'))
        = tokens.normalized_token
    where profile.id <> NEW.author_id
      and profile.role <> 'admin'
      and coalesce(profile.is_active, true)
  )
  insert into public.campus_post_mentions (
    post_id,
    target_type,
    target_user_id,
    target_token
  )
  select
    NEW.id,
    'user',
    matched_users.user_id,
    '@' || matched_users.token
  from matched_users
  on conflict do nothing;

  with tokens as (
    select token, normalized_token
    from private.extract_campus_mention_tokens(NEW.content)
  ),
  matched_users as (
    select distinct
      profile.id as user_id,
      tokens.token
    from tokens
    join public.user_profiles profile
      on upper(nullif(btrim(profile.username), '')) = tokens.normalized_token
      or upper(regexp_replace(coalesce(profile.full_name, ''), '\s+', '', 'g'))
        = tokens.normalized_token
    where profile.id <> NEW.author_id
      and profile.role <> 'admin'
      and coalesce(profile.is_active, true)
  )
  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    message,
    course_id,
    entity_type,
    entity_id,
    action_url,
    metadata,
    dedupe_key
  )
  select
    matched_users.user_id,
    NEW.author_id,
    'campus_post_mention',
    actor_name || ' mentioned you in Campus Feed',
    post_excerpt,
    null,
    'campus_post',
    NEW.id,
    '/#campus-post-' || NEW.id::text,
    jsonb_build_object(
      'post_id', NEW.id,
      'mention_type', 'user',
      'mention_token', '@' || matched_users.token
    ),
    'campus-post-user-mention:' || NEW.id::text || ':'
      || matched_users.user_id::text
  from matched_users
  on conflict (dedupe_key) do nothing;

  return NEW;
end;
$function$;

revoke all on function private.refresh_campus_post_mentions()
  from public, anon, authenticated;

create or replace function public.search_campus_mention_courses(
  p_search text default null,
  p_limit integer default 6
)
returns table (
  id uuid,
  course_code text,
  name text,
  chinese_name text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with params as (
    select btrim(coalesce(p_search, '')) as search_text
  ),
  matched as (
    select distinct on (
      upper(coalesce(
        nullif(btrim(course.course_code), ''),
        nullif(btrim(course.code), '')
      ))
    )
      offering.id,
      coalesce(
        nullif(btrim(course.course_code), ''),
        nullif(btrim(course.code), '')
      ) as course_code,
      course.name,
      course.chinese_name
    from public.course_offerings offering
    join public.courses course
      on course.id = offering.course_id
    cross join params
    where offering.status = 'active'
      and (
        offering.owner_id is not null
        or exists (
          select 1
          from public.course_instructors instructor
          where instructor.course_id = offering.id
        )
      )
      and (
        params.search_text = ''
        or course.course_code ilike params.search_text || '%'
        or course.code ilike params.search_text || '%'
        or course.name ilike '%' || params.search_text || '%'
        or course.chinese_name ilike '%' || params.search_text || '%'
      )
    order by
      upper(coalesce(
        nullif(btrim(course.course_code), ''),
        nullif(btrim(course.code), '')
      )),
      course.name,
      offering.id
  )
  select matched.id, matched.course_code, matched.name, matched.chinese_name
  from matched
  where matched.course_code is not null
  order by matched.course_code, matched.name
  limit least(greatest(coalesce(p_limit, 6), 1), 12);
$function$;

revoke all on function public.search_campus_mention_courses(text, integer)
  from public, anon;
grant execute on function public.search_campus_mention_courses(text, integer)
  to authenticated, service_role;

drop trigger if exists refresh_campus_post_mentions_insert
  on public.campus_posts;
create trigger refresh_campus_post_mentions_insert
  after insert on public.campus_posts
  for each row execute function private.refresh_campus_post_mentions();

drop trigger if exists refresh_campus_post_mentions_update
  on public.campus_posts;
create trigger refresh_campus_post_mentions_update
  after update of content on public.campus_posts
  for each row execute function private.refresh_campus_post_mentions();

notify pgrst, 'reload schema';

commit;
