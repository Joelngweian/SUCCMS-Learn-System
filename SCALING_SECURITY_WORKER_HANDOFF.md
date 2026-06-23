# SUCCMS Scaling, Storage, Realtime, Cache, Security, and AI Worker Handoff

Date: 2026-06-18
Supabase project: `SUCCMS` (`jfskyjzysvdwureenttw`)

## Purpose

This document separates changes that are already live from the asynchronous AI
grading Worker work that is intentionally still pending. It is the deployment
source of truth for this change set.

> **Important:** the AI Worker SQL has not been applied to Supabase. This
> document records the current state only; it does not authorize or perform a
> Worker deployment.

## Already Applied to Supabase

The following remote migrations are complete and must not be run again on the
same project:

- `20260618035705 scale_presence_storage_realtime_cache_security`
- `20260618091209 move_internal_rls_helpers_private`

The local source files and their corresponding remote records are:

- `20260618034629_scale_presence_storage_realtime_cache_security.sql` ->
  remote `20260618035705`
- `20260618091040_move_internal_rls_helpers_private.sql` ->
  remote `20260618091209`

The following Edge Functions are already active:

- `shared-read-cache` version 1, JWT verification enabled
- `ai-grade-assignment` version 5, JWT verification enabled
- `microsoft-office-link` version 10, JWT verification enabled

`microsoft-office-link` version 10 also verifies current course management
permission before using its service-role client.

## Completed Architecture Changes

### Presence

- Removed the campus-wide Realtime Presence channel.
- Browsers write a low-frequency heartbeat to `public.user_presence`.
- A scheduled database task refreshes one `presence_summary_cache` row.
- Stale presence rows are removed automatically.
- Clients read only the aggregate count and a small sample.

### Assignment Storage

- Student submissions use the private `assignment-submissions` bucket.
- The bucket has an 8 MB per-file limit and a MIME allowlist.
- Paths use `studentId/assignmentId/file` ownership boundaries.
- Downloads use short-lived signed URLs instead of public URLs.
- AI grading signs private files server-side before reading them.

### Shared Cache

- Active course offerings and announcements use `shared-read-cache`.
- A database cache is the shared fallback.
- A Redis-compatible REST cache can be enabled later with
  `SHARED_CACHE_REST_URL` and `SHARED_CACHE_REST_TOKEN` Edge Function secrets.
- Database triggers invalidate affected cache keys.

### Realtime

- Frontend Postgres Changes subscriptions were replaced by private Broadcast.
- Topics are scoped to `user:<id>:*`, `course:<id>:*`, or `admin:*`.
- The old application tables were removed from the `supabase_realtime`
  Postgres Changes publication.

### Security

- Internal RLS `SECURITY DEFINER` helpers were moved to the unexposed `private`
  schema.
- Existing policies now resolve the helpers as
  `private.is_assignment_student(...)` and
  `private.is_assignment_instructor(...)`.
- Do not recreate public versions of those helpers and do not rerun the old
  Presence/Storage migration in the SQL Editor.
- `microsoft-office-link` no longer permits an authenticated student to use the
  service-role client to modify arbitrary course files.

## AI Grading Worker: Database Ready, Functions Pending

The Worker database migration applied manually through the Supabase SQL Editor
is:

`supabase/migrations/20260618145127_async_ai_grading_worker_setup.sql`

It creates:

- A durable `pgmq` queue named `ai_grading`
- `public.ai_grading_jobs`
- Lecturer/admin RLS for grading results
- Service-role-only dequeue, delete, and archive RPCs
- A trigger that enqueues each new grading job

This replaced the obsolete `20260618035042_async_ai_grading.sql`. The new SQL
uses `private.is_assignment_instructor(uuid)`, restricts result visibility to
active current instructors/admins, uses SECURITY INVOKER public RPCs, and sets
a 600-second queue visibility timeout.

The remote database was verified after the SQL was applied:

- `pgmq` 1.5.1 is installed
- The `ai_grading` queue exists
- `public.ai_grading_jobs` exists
- The dequeue, delete, and archive queue RPCs exist
- `ai-grading-request` is not deployed
- No AI grading Worker Cron job exists

The existing Gemini `ai-grade-assignment` version 5 remains deployed. A separate
Azure-only replacement now exists locally at
`supabase/functions/ai-grade-assignment-azure/index.ts`; it has not been
deployed or connected to the request function.

The Azure Worker is also guarded by `AZURE_OPENAI_WORKER_ENABLED=true`. Without
that explicit Secret it returns a disabled response before dequeuing any job.

## Worker Deployment Order

1. Deploy `supabase/functions/ai-grading-request/index.ts` with JWT verification
   enabled.
2. Keep the existing Gemini request target until Azure is approved and tested.
3. Add a scheduled Worker invocation as a fail-safe. Request-time invocation is
   fast, but a Cron wake-up is still required if the request function or browser
   disappears after enqueueing.
4. Set Worker concurrency according to the model RPM/TPM and budget. The queue
   provides backpressure but does not by itself cap the number of concurrent
   Edge Function invocations.
5. Replace or reduce the current two-second frontend polling before high-volume
   production use, preferably with a private grading Broadcast plus fallback.
6. Deploy the frontend and run one end-to-end grading test with a private PDF
   or Word submission, then
   verify success, retry, permanent failure, and unauthorized lecturer cases.

## Azure OpenAI Worker Prepared but Disabled

The separate Azure implementation uses the Azure OpenAI v1 Responses API and
requires these Supabase Edge Function Secrets only when it is activated:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_GRADING_DEPLOYMENT`
- `AZURE_OPENAI_WORKER_ENABLED=true`

The v1 API sends the Azure Deployment Name in `model` and does not require the
older dated `AZURE_OPENAI_API_VERSION` query parameter. The Worker sends
`store: false`, uses strict structured output, supports text, PDF, image,
DOCX, PPTX, and XLSX input, and keeps the lecturer as the final grade
decision-maker.

When Azure access is available, first test the new function under the separate
name `ai-grade-assignment-azure`. Only after the test passes should the URL in
`ai-grading-request` and the fail-safe Cron target be changed from
`ai-grade-assignment` to `ai-grade-assignment-azure`.

## Worker Verification SQL

Run only after applying the pending Worker migration:

```sql
select exists (
  select 1 from pg_extension where extname = 'pgmq'
) as pgmq_installed;

select to_regclass('public.ai_grading_jobs') as jobs_table;

select queue_name
from pgmq.meta
where queue_name = 'ai_grading';

select
  to_regprocedure('public.dequeue_ai_grading_jobs(integer)') as dequeue_rpc,
  to_regprocedure('public.delete_ai_grading_message(bigint)') as delete_rpc,
  to_regprocedure('public.archive_ai_grading_message(bigint)') as archive_rpc;

select policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'ai_grading_jobs';
```

## Validation Already Completed

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `deno check` for `ai-grade-assignment-azure/index.ts`
- `git diff --check`
- Remote verification of private assignment storage, Realtime publication
  removal, Presence jobs, Broadcast policy, migration history, and Edge
  Function deployment status

These commands must be run again after the final Worker migration and frontend
changes are reviewed.

## Remaining Manual Production Items

- Enable Supabase Auth leaked-password protection.
- Configure and test the AI Worker Cron trigger.
- Confirm Gemini or Azure model quotas, RPM, TPM, concurrency, and monthly cost
  alerts.
- Run realistic load tests before claiming support for 10,000 simultaneous
  users.
- Define retention for `ai_grading_jobs.result`, because it contains student
  assessment data.

## Unrelated Workspace Changes

The pre-existing deletions of `SUCCMS_Technical_Report.doc` and
`SUCCMS_Technical_Report_Part2.doc` were not created or restored as part of this
work.
