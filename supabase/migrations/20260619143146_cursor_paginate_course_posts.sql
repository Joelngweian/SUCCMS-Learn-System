-- Keyset pagination keeps response time stable even when a course has many posts.
create index if not exists idx_course_posts_course_created_id_desc
  on public.course_posts (course_id, created_at desc, id desc);

create or replace function public.get_course_posts_page(
  p_course_id uuid,
  p_before_created_at timestamptz,
  p_before_id uuid,
  p_limit integer
)
returns setof public.course_posts
language sql
stable
security invoker
set search_path = ''
as $function$
  select post.*
  from public.course_posts as post
  where post.course_id = p_course_id
    and (
      p_before_created_at is null
      or (post.created_at, post.id) < (p_before_created_at, p_before_id)
    )
  order by post.created_at desc, post.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$function$;

revoke execute on function public.get_course_posts_page(uuid, timestamptz, uuid, integer)
  from public, anon;
grant execute on function public.get_course_posts_page(uuid, timestamptz, uuid, integer)
  to authenticated, service_role;
