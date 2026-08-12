-- Azure PostgreSQL does not provide Supabase's pgmq schema.
-- The Azure Functions backend processes AI grading jobs directly, so the
-- Supabase queue trigger must be disabled after restoring the Supabase dump.

BEGIN;

DROP TRIGGER IF EXISTS enqueue_ai_grading_job_message
  ON public.ai_grading_jobs;

CREATE OR REPLACE FUNCTION private.enqueue_ai_grading_job_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enqueue_ai_grading_job_message()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dequeue_ai_grading_jobs(
  p_batch_size INTEGER DEFAULT 1
)
RETURNS TABLE (
  msg_id BIGINT,
  read_ct INTEGER,
  enqueued_at TIMESTAMPTZ,
  vt TIMESTAMPTZ,
  message JSONB
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    NULL::BIGINT AS msg_id,
    NULL::INTEGER AS read_ct,
    NULL::TIMESTAMPTZ AS enqueued_at,
    NULL::TIMESTAMPTZ AS vt,
    NULL::JSONB AS message
  WHERE FALSE;
$$;

REVOKE ALL ON FUNCTION public.dequeue_ai_grading_jobs(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dequeue_ai_grading_jobs(INTEGER)
  TO service_role;

CREATE OR REPLACE FUNCTION public.delete_ai_grading_message(
  p_msg_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT TRUE;
$$;

REVOKE ALL ON FUNCTION public.delete_ai_grading_message(BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_ai_grading_message(BIGINT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.archive_ai_grading_message(
  p_msg_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT TRUE;
$$;

REVOKE ALL ON FUNCTION public.archive_ai_grading_message(BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_ai_grading_message(BIGINT)
  TO service_role;

COMMIT;
