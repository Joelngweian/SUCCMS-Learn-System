-- SUCCMS AI grading worker queue setup.
--
-- Intended for this Supabase project after the pgmq extension has been enabled.
-- This script creates database objects only. It does not deploy Edge Functions,
-- configure Edge Function secrets, or expose Queues through PostgREST.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pgmq'
  ) THEN
    RAISE EXCEPTION
      'PGMQ is not installed. Enable Integrations > Queues before running this script.';
  END IF;

  IF to_regprocedure('private.is_assignment_instructor(uuid)') IS NULL THEN
    RAISE EXCEPTION
      'Required helper private.is_assignment_instructor(uuid) is missing.';
  END IF;

  IF to_regclass('public.ai_grading_jobs') IS NOT NULL THEN
    RAISE EXCEPTION
      'public.ai_grading_jobs already exists. Stop and review the existing Worker setup.';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pgmq.meta
    WHERE queue_name = 'ai_grading'
  ) THEN
    PERFORM pgmq.create('ai_grading');
  END IF;
END;
$$;

-- The Queue stays server-side. Browser roles cannot read its tables directly.
ALTER TABLE pgmq.q_ai_grading ENABLE ROW LEVEL SECURITY;
ALTER TABLE pgmq.a_ai_grading ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE pgmq.q_ai_grading
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE pgmq.a_ai_grading
  FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA pgmq TO service_role;
GRANT SELECT, UPDATE, DELETE ON TABLE pgmq.q_ai_grading TO service_role;
GRANT SELECT, INSERT ON TABLE pgmq.a_ai_grading TO service_role;
GRANT EXECUTE ON FUNCTION pgmq.read(TEXT, INTEGER, INTEGER, JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION pgmq.delete(TEXT, BIGINT)
  TO service_role;
GRANT EXECUTE ON FUNCTION pgmq.archive(TEXT, BIGINT)
  TO service_role;

CREATE TABLE public.ai_grading_jobs (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  assignment_id UUID NOT NULL
    REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  attempts SMALLINT NOT NULL DEFAULT 0
    CHECK (attempts >= 0),
  max_attempts SMALLINT NOT NULL DEFAULT 3
    CHECK (max_attempts BETWEEN 1 AND 5),
  result JSONB,
  error_message TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one unfinished job may exist for one student/assignment pair.
CREATE UNIQUE INDEX ai_grading_jobs_one_active_request_idx
  ON public.ai_grading_jobs (assignment_id, student_id)
  WHERE status IN ('queued', 'processing');

CREATE INDEX ai_grading_jobs_assignment_id_idx
  ON public.ai_grading_jobs (assignment_id);

CREATE INDEX ai_grading_jobs_student_id_idx
  ON public.ai_grading_jobs (student_id);

CREATE INDEX ai_grading_jobs_requested_by_created_at_idx
  ON public.ai_grading_jobs (requested_by, created_at DESC);

CREATE INDEX ai_grading_jobs_pending_created_at_idx
  ON public.ai_grading_jobs (created_at)
  WHERE status IN ('queued', 'processing');

ALTER TABLE public.ai_grading_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_grading_jobs
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.ai_grading_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_grading_jobs
  TO service_role;

-- A job remains visible only to an active current instructor or active admin.
-- The helper lives in private, not public.
CREATE POLICY "Current instructors and admins can read AI grading jobs"
  ON public.ai_grading_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role IN ('lecturer', 'admin')
        AND COALESCE(profile.is_active, true)
    )
    AND private.is_assignment_instructor(assignment_id)
  );

CREATE OR REPLACE FUNCTION private.set_ai_grading_job_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.set_ai_grading_job_updated_at()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER set_ai_grading_jobs_updated_at
BEFORE UPDATE ON public.ai_grading_jobs
FOR EACH ROW
EXECUTE FUNCTION private.set_ai_grading_job_updated_at();

-- Inserts are performed by the server-side request Edge Function. This private
-- definer trigger enqueues only the new job id into the fixed ai_grading Queue.
CREATE OR REPLACE FUNCTION private.enqueue_ai_grading_job_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM pgmq.send(
    'ai_grading',
    jsonb_build_object('jobId', NEW.id)
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enqueue_ai_grading_job_message()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enqueue_ai_grading_job_message
AFTER INSERT ON public.ai_grading_jobs
FOR EACH ROW
EXECUTE FUNCTION private.enqueue_ai_grading_job_message();

-- These public RPCs are SECURITY INVOKER functions. Only service_role may call
-- them, and they are fixed to the SUCCMS ai_grading Queue.
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
    queued.msg_id,
    queued.read_ct,
    queued.enqueued_at,
    queued.vt,
    queued.message
  FROM pgmq.read(
    'ai_grading',
    600,
    LEAST(GREATEST(COALESCE(p_batch_size, 1), 1), 5),
    '{}'::jsonb
  ) AS queued;
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
  SELECT pgmq.delete('ai_grading', p_msg_id);
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
  SELECT pgmq.archive('ai_grading', p_msg_id);
$$;

REVOKE ALL ON FUNCTION public.archive_ai_grading_message(BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_ai_grading_message(BIGINT)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- SQL Editor verification output. Expected values are true, true, true, 1.
SELECT
  EXISTS (
    SELECT 1 FROM pgmq.meta WHERE queue_name = 'ai_grading'
  ) AS queue_created,
  to_regclass('public.ai_grading_jobs') IS NOT NULL AS jobs_table_created,
  to_regprocedure('public.dequeue_ai_grading_jobs(integer)') IS NOT NULL
    AS dequeue_rpc_created,
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_grading_jobs'
  ) AS jobs_rls_policy_count;
