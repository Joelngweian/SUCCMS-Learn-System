# SUCCMS Supabase Migration History

Last reviewed: 2026-06-19  
Project: `jfskyjzysvdwureenttw`

## Important rule

Do not run `supabase db push` against production yet. The repository currently
contains 67 migration files, while Supabase records only eight migrations. Many
older files were applied manually in SQL Editor and use legacy date-based names,
so the local folder is not a trustworthy push history yet.

## Migrations recorded by Supabase

| Remote version | Remote name | Local source |
| --- | --- | --- |
| `20260616115222` | `auto_assign_signup_roles_by_suc_email` | `2026-06-16_auto_assign_signup_roles_by_suc_email.sql` |
| `20260616115321` | `revoke_public_handle_new_user_execute` | Same local file as above; it was applied remotely in a second step |
| `20260616140428` | `st_email_signup_creates_admin` | `2026-06-16_st_email_signup_creates_admin.sql` |
| `20260616140532` | `create_course_creation_requests` | `2026-06-16_create_course_creation_requests.sql` |
| `20260616142816` | `grant_course_creation_request_access` | `2026-06-16_grant_course_creation_request_access.sql` |
| `20260617001648` | `harden_rpc_permissions_and_course_request_indexes` | `2026-06-17_harden_rpc_permissions_and_course_request_indexes.sql` |
| `20260618035705` | `scale_presence_storage_realtime_cache_security` | `20260618034629_scale_presence_storage_realtime_cache_security.sql`; remote timestamp differs |
| `20260618091209` | `move_internal_rls_helpers_private` | `20260618091040_move_internal_rls_helpers_private.sql`; remote timestamp differs |

## Applied manually but missing from remote migration history

These were verified from live database objects on 2026-06-19. They must not be
re-executed blindly.

| Local migration | Live verification |
| --- | --- |
| `20260618145127_async_ai_grading_worker_setup.sql` | `pgmq` queue, `ai_grading_jobs`, dequeue/delete/archive RPCs exist |
| `20260618164228_optimize_dashboard_search_shared_cache.sql` | dashboard RPC, course search RPC and shared-cache lease RPC exist |
| `20260619013606_restore_private_helper_default_arguments.sql` | public compatibility wrappers have the restored `auth.uid()` defaults |
| `20260619014812_fix_realtime_broadcast_write_failures.sql` | live trigger function uses JSONB plus `realtime.send` and catches broadcast errors |

## Pending SQL Editor migrations

Run these in this order:

1. `20260619015812_secure_course_and_announcement_storage.sql`
2. `20260619020309_broadcast_ai_grading_job_status.sql`

The first makes course and announcement files private and adds authenticated
read policies. Deploy the matching frontend only after it succeeds. The second
adds the private AI grading status notification; without it, the frontend still
works through the low-frequency fallback poll.

## History repair

No migration-history repair was executed. The local CLI is not linked to the
project, and repairing only the recent versions while leaving the legacy
baseline unresolved could create a false sense that `db push` is safe.

When the team decides to normalize history, first take a database backup, link
the CLI explicitly, export the live schema, and compare every legacy migration.
Only then use `supabase migration repair --status applied <version>` for SQL that
has been confirmed to match the live database. Until that audit is complete,
continue applying the specifically listed pending files through SQL Editor.
