-- Realtime delivery is best-effort and must not roll back primary writes.
-- Build an explicit JSONB payload instead of passing trigger records through
-- realtime.broadcast_changes(), which failed JSON conversion in production.
begin;

create or replace function private.broadcast_succms_table_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_data jsonb;
  new_data jsonb;
  old_data jsonb;
  target_topic text;
begin
  if TG_OP = 'DELETE' then
    old_data := to_jsonb(OLD);
    record_data := old_data;
  elsif TG_OP = 'UPDATE' then
    new_data := to_jsonb(NEW);
    old_data := to_jsonb(OLD);
    record_data := new_data;
  else
    new_data := to_jsonb(NEW);
    record_data := new_data;
  end if;

  case TG_TABLE_NAME
    when 'notifications' then
      target_topic := 'user:' || record_data->>'recipient_id' || ':notifications';
    when 'user_achievements' then
      target_topic := 'user:' || record_data->>'user_id' || ':achievements';
    when 'user_profiles' then
      target_topic := 'user:' || record_data->>'id' || ':account';
    when 'course_enrollments' then
      target_topic := 'user:' || record_data->>'student_id' || ':enrollments';
    when 'attendance' then
      target_topic := 'course:' || record_data->>'course_id' || ':attendance';
    when 'course_posts' then
      target_topic := 'course:' || record_data->>'course_id' || ':posts';
    when 'reports' then
      target_topic := 'admin:moderation';
    when 'course_creation_requests' then
      target_topic := 'admin:course-requests';
    else
      return null;
  end case;

  if target_topic is null or target_topic like '%::%' then
    return null;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME,
      'type', TG_OP,
      'new', new_data,
      'old', old_data
    ),
    TG_OP,
    target_topic,
    true
  );

  return null;
exception
  when others then
    raise warning 'SUCCMS Realtime broadcast failed for %.% (%): %',
      TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, SQLERRM;
    return null;
end;
$$;

revoke all on function private.broadcast_succms_table_change()
  from public, anon, authenticated;

commit;
