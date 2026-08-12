# Azure Full Backend Migration Inventory

Date: 2026-08-05

## Decision

The backend migration target is a full move from Supabase-managed backend services to Azure-managed backend services.

Current direction:

- Keep the React frontend.
- Move database, authentication, storage, realtime, and Edge Functions away from Supabase.
- Keep all AI features on Gemini, called from Azure backend code.
- Introduce an Azure API layer so the frontend no longer talks directly to database tables, RPC functions, storage buckets, or service-role functions.

Target shape:

```text
React app
  -> Azure Functions API
  -> Azure Database for PostgreSQL Flexible Server
  -> Azure Blob Storage
  -> Azure SignalR Service
  -> Gemini API
```

## Current Supabase Footprint

Local scan summary from `src/` and `supabase/functions/`:

| Area | Observed usage | Migration meaning |
| --- | ---: | --- |
| Frontend `.from(...)` calls | Many direct table reads and writes | Replace with API endpoints or a typed API client. |
| Frontend `.rpc(...)` calls | 30+ RPC entry points | Rebuild as API endpoints, PostgreSQL functions, or service-layer queries. |
| Frontend `supabase.auth.*` calls | Login, signup, session, password update, sign out | Replace with Entra External ID/MSAL or a custom auth service. |
| Frontend `supabase.storage.*` calls | Upload, delete, public URL, signed URL | Replace with Blob upload/download APIs and short-lived SAS URLs. |
| Frontend `supabase.functions.invoke(...)` calls | 8 call sites | Move to Azure Functions routes. |
| Realtime broadcast subscriptions | 9 private topics found | Replace with Azure SignalR channels/groups. |
| Edge Function folders | 10 folders, 8 active `index.ts` handlers | Port active handlers to Azure Functions. |

Important limitation: this inventory is based on local repository state. Live Supabase database/function deployment state still needs separate verification before final cutover.

## Azure Service Mapping

| Supabase service | Current use | Azure replacement |
| --- | --- | --- |
| Postgres database | Tables, SQL functions, triggers, RLS, pgmq queue | Azure Database for PostgreSQL Flexible Server. |
| RLS policies | Authorization enforced inside Supabase Postgres | Move authorization into Azure API/service layer; keep DB constraints for integrity. |
| Supabase Auth | Email/password signup, login, sessions, user metadata | Microsoft Entra External ID or a custom auth service. For testing, re-register/reset users is simpler than password migration. |
| Supabase Storage | Course content, submissions, posts, profile images, stories | Azure Blob Storage containers plus generated SAS URLs. |
| Supabase Realtime broadcast | Notifications, course updates, AI job status, presence | Azure SignalR Service with per-user and per-room groups. |
| Supabase Edge Functions | AI grading, recommendations, Office link, admin actions, cache reads | Azure Functions TypeScript routes. |
| PGMQ | Async AI grading worker queue | Azure Storage Queue, Azure Service Bus, or a DB-backed jobs table. Service Bus is cleaner for later scale; DB jobs table is cheaper for 1-5 testers. |

## Edge Function Inventory

| Supabase function | Active local handler | Primary responsibility | Azure route target |
| --- | --- | --- | --- |
| `ai-grade-assignment` | Yes, 1121 lines | Gemini grading worker, file reading, rubric handling, job updates | `POST /api/ai/grade-assignment` and queue worker. |
| `ai-grading-request` | Yes, 196 lines | Lecturer auth, assignment/submission validation, job creation | `POST /api/ai/grading-requests`. |
| `gemini-lecturer-recommendations` | Yes, 534 lines | Gemini lecturer recommendations with shared cache | `POST /api/ai/lecturer-recommendations`. |
| `student-study-insights` | Yes, 330 lines | Student AI insights with cache | `POST /api/ai/student-study-insights`. |
| `student-study-recommendations` | Yes, 555 lines | Student study recommendations with cache | `POST /api/ai/student-study-recommendations`. |
| `microsoft-office-link` | Yes, 631 lines | Office/Graph link generation and material updates | `POST /api/integrations/microsoft-office-link`. |
| `shared-read-cache` | Yes, 235 lines | Shared cache reads and refresh claims | `POST /api/cache/shared-read`. |
| `admin-user-access` | Yes, 113 lines | Admin suspend/restore user access | `POST /api/admin/user-access`. |
| `ai-grade-assignment-azure` | No `index.ts` | Existing Azure experiment/stub | Review and remove or merge into new skeleton. |
| `lecturer-recommendations` | No `index.ts` | Stale/non-active folder | Review and remove or archive. |

## AI Grading Priority Path

AI grading is the highest-priority test flow.

Current moving parts:

- Lecturer requests grading from the course assignment UI.
- `ai-grading-request` validates lecturer access and creates `ai_grading_jobs`.
- A queue/worker path runs `ai-grade-assignment`.
- Files are read from Storage, including assignment submissions and marking guides.
- Gemini generates grading feedback, score, rubric breakdown, and highlights.
- `ai_grading_jobs` broadcasts status back to the lecturer UI.

Azure replacement:

1. `POST /api/ai/grading-requests`
   - Validate lecturer identity and course access.
   - Create a job row in Azure PostgreSQL.
   - Enqueue work.
2. Worker function
   - Load assignment, submission, rubric, and allowed files.
   - Fetch file bytes from Azure Blob Storage.
   - Call Gemini.
   - Save result and status to PostgreSQL.
   - Notify the lecturer through Azure SignalR.
3. Frontend
   - Poll or subscribe to SignalR job updates.
   - Render every AI-highlighted sentence already generated by Gemini.

Security notes:

- File provenance must be checked before Gemini can read a file.
- The frontend must never send raw Blob account keys.
- Gemini API key must live only in Azure Function app settings or Key Vault.
- Service/admin routes must check role and target-user authorization server-side.

## Storage Inventory

Observed buckets/uses:

| Supabase bucket | Current use | Azure Blob direction |
| --- | --- | --- |
| `course_content` | Course files, course posts, assignment attachments, some AI grading reads | Container path prefix `course-content/`. |
| `assignment-submissions` | Student submission files | Container path prefix `assignment-submissions/`; strict file type allowlist. |
| `public_profiles` | Avatar/cover images | Container path prefix `public-profiles/`; public CDN or signed reads. |
| `announcement-attachments` | Admin announcement attachments | Container path prefix `announcement-attachments/`. |
| `forum-images` | Discussion/forum images | Container path prefix `forum-images/`. |
| `stories` | Story media | Container path prefix `stories/`. |
| `campus-posts` | Campus feed media and comment media | Container path prefix `campus-posts/`. |
| `study-group-files` | Group chat image/file attachments | Container path prefix `study-group-files/`. |

Recommended Azure approach:

- Use one storage account.
- Use one private Blob container for application files during test stage.
- Generate short-lived SAS URLs from the API for upload/download.
- Keep path prefixes domain-scoped so authorization can be checked before issuing a SAS URL.

## Realtime Inventory

Observed frontend private broadcast topics:

| Topic pattern | Current consumer | Azure SignalR group |
| --- | --- | --- |
| `user:{userId}:account` | Account suspension/sign out | `user:{userId}:account`. |
| `user:{userId}:notifications` | Notifications | `user:{userId}:notifications`. |
| `user:{profileId}:enrollments` | Student course enrollment updates | `user:{userId}:enrollments`. |
| `user:{userId}:achievements` | Gamification achievement alerts | `user:{userId}:achievements`. |
| `user:{userId}:ai-grading` | AI grading job status | `user:{userId}:ai-grading`. |
| `course:{courseId}:posts` | Course posts | `course:{courseId}:posts`. |
| `course:{courseId}:attendance` | Attendance changes | `course:{courseId}:attendance`. |
| `campus:feed` | Campus feed posts | `campus:feed`. |
| `admin:moderation` | Admin reports/moderation | `admin:moderation`. |

Azure replacement:

- `GET /api/realtime/negotiate` returns a SignalR client token.
- API/worker code sends messages to allowed user/course/admin groups.
- Group membership is granted from server-side authorization checks.

## RPC Inventory

Observed RPC names from frontend and functions:

```text
add_study_group_member
archive_ai_grading_message
check_in_attendance
create_study_group
delete_ai_grading_message
delete_user_account
dequeue_ai_grading_jobs
drop_course_offering
enroll_student_in_course
get_assignment_peer_benchmarks
get_available_course_offerings
get_campus_posts_page
get_course_catalog_summary
get_course_members
get_course_posts_page
get_current_enrollment_term
get_lecturer_analytics
get_my_xp_progress
get_profile_visibility
get_social_activity_feed
get_student_dashboard_data
get_study_group_member_candidates
get_study_groups
get_weekly_xp_leaderboard
join_study_group
leave_study_group
remove_study_group_member
search_campus_mention_courses
set_study_session_attendance
staff_assign_course_offering
staff_assign_student_study_plan
staff_list_assignable_students
staff_list_lecturer_options
staff_unassign_student_study_plan
staff_upsert_academic_terms
```

Migration choice:

- Keep complex reporting SQL as database functions where it is still cleaner.
- Move role-changing actions to API routes.
- Move queue operations to worker code or a queue service.

## High-Risk Migration Areas

1. Auth migration
   - Supabase password hashes are not normally portable into Azure auth.
   - For 1-5 test users, safest path is account recreation or password reset.
2. RLS replacement
   - Supabase currently protects many frontend direct table calls.
   - After moving to Azure, every API route must enforce role and ownership checks.
3. AI grading file access
   - The worker must only read files linked to the assignment/submission/rubric being graded.
4. Realtime status
   - AI grading progress currently depends on broadcast triggers.
   - Azure SignalR must be wired before removing Supabase Realtime.
5. SQL drift
   - Local migrations may not equal live Supabase state.
   - Before migration, export schema/data from the live project and compare.

## Proposed Migration Phases

### Phase 1 - Azure skeleton and inventory

- Create Azure Functions TypeScript project skeleton.
- Add Gemini, DB, Blob, auth, and realtime boundaries.
- Document Supabase inventory and migration risks.

### Phase 2 - Database export and restore rehearsal

- Export live Supabase schema and data.
- Restore into Azure Database for PostgreSQL Flexible Server.
- Remove Supabase-only schemas/features or replace them.
- Verify tables, functions, triggers, indexes, and constraints.

### Phase 3 - AI grading first

- Port `ai-grading-request` and `ai-grade-assignment`.
- Use Gemini only.
- Move AI grading files to Blob Storage or temporarily bridge reads during rehearsal.
- Verify lecturer grading flow end to end with 1-5 test users.

### Phase 4 - Auth and API layer

- Choose Entra External ID or custom auth.
- Build API endpoints for current direct `.from(...)` and `.rpc(...)` calls.
- Remove service-role style access from frontend.

### Phase 5 - Storage and realtime

- Migrate files to Blob Storage.
- Replace Supabase Storage URLs with API-issued SAS URLs.
- Replace Supabase Realtime with Azure SignalR.

### Phase 6 - Cutover

- Freeze writes briefly.
- Run final export/import.
- Switch frontend environment variables to Azure API/auth.
- Keep Supabase read-only backup until verification is complete.

## Open Confirmations

- Azure subscription owner and credit limit policy.
- Whether the teacher accepts Entra External ID account reset/re-registration for test users.
- Whether production later requires Microsoft login, email/password, or both.
- Whether Blob files can be private-only during testing.
- Whether AI grading can be migrated first while non-AI features still use Supabase during rehearsal.
