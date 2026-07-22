begin;

-- The RPC permission hardening migration revoked EXECUTE from every
-- SECURITY DEFINER function, but get_course_members is still a browser-facing
-- RPC used by course tabs and attendance to load authorized course people.
do $$
declare
  fn regprocedure;
begin
  for fn in
    select proc.oid::regprocedure
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.proname = 'get_course_members'
  loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
