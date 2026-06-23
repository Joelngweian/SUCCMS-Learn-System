begin;

-- Notify only the lecturer who requested the job. The existing private
-- Realtime policy authorizes user:<auth.uid()>:* topics, and the payload keeps
-- the grading result out of realtime.messages; the browser reads it through
-- the ai_grading_jobs RLS policy after receiving this wake-up signal.
create or replace function private.broadcast_ai_grading_job_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME,
      'type', TG_OP,
      'new', jsonb_build_object(
        'id', NEW.id,
        'status', NEW.status
      )
    ),
    TG_OP,
    'user:' || NEW.requested_by::text || ':ai-grading',
    true
  );

  return null;
exception
  when others then
    raise warning 'AI grading Realtime broadcast failed for job %: %',
      NEW.id, SQLERRM;
    return null;
end;
$$;

revoke all on function private.broadcast_ai_grading_job_status()
  from public, anon, authenticated;

drop trigger if exists broadcast_ai_grading_job_status
  on public.ai_grading_jobs;
create trigger broadcast_ai_grading_job_status
after update of status, result, error_message
on public.ai_grading_jobs
for each row
when (
  OLD.status is distinct from NEW.status
  or OLD.result is distinct from NEW.result
  or OLD.error_message is distinct from NEW.error_message
)
execute function private.broadcast_ai_grading_job_status();

commit;
