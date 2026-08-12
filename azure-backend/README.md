# SUCCMS Azure Backend Skeleton

This folder is the starting point for moving the full SUCCMS backend from Supabase to Azure.

It is intentionally separate from the current Vite React app so the existing app can keep running while Azure backend pieces are ported and tested.

## Scope

Included skeleton boundaries:

- Azure Functions HTTP routes.
- JWT-protected API helper.
- Azure password-auth bootstrap for migrated users.
- PostgreSQL connection helper for Azure Database for PostgreSQL.
- Azure Blob Storage upload SAS helper.
- Gemini adapter for AI grading.
- Realtime negotiation placeholder for Azure SignalR.

Not included yet:

- Cloud deployment resources.
- Real Azure secrets.
- Complete Supabase RPC replacements.
- Final frontend auth replacement.
- Complete AI grading queue worker.

## Local Setup

```powershell
cd azure-backend
npm install
Copy-Item local.settings.example.json local.settings.json
npm run build
npm start
```

Do not commit `local.settings.json`.

## Initial Routes

| Route | Purpose | Status |
| --- | --- | --- |
| `GET /api/health` | Backend liveness check | Working skeleton. |
| `POST /api/auth/bootstrap-password` | Set an Azure password for an already migrated user profile | Requires `AUTH_BOOTSTRAP_KEY`; migration-only. |
| `POST /api/auth/login` | Email/password login | Returns a first-party Azure JWT when `AUTH_JWT_SECRET` is configured. |
| `GET /api/auth/me` | Validate current bearer token | Returns the current user payload. |
| `POST /api/ai/grading-requests` | Create an AI grading job request | Validates input and auth; DB job insert still needs final schema. |
| `POST /api/ai/grade-assignment` | Gemini grading call boundary | Calls Gemini and returns a draft response. |
| `POST /api/storage/upload-url` | Create Blob upload SAS URL | Working skeleton once storage env vars are set. |
| `GET /api/realtime/negotiate` | SignalR negotiation | Placeholder until Azure SignalR binding is selected. |

## Migration Notes

The current frontend still talks directly to Supabase. Future work should add a typed frontend API client and then replace Supabase access feature by feature.

AI grading should move first because it is the priority test path. Port the request endpoint, worker, job table, file access, and realtime job status together.

## Azure Auth Bootstrap

After restoring the database, apply the auth table once:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" "$env:AZURE_DB_URL" -f "J:\succms\azure-backend\sql\001_app_auth.sql"
```

Set these Function App environment variables before testing auth:

- `AUTH_AUDIENCE=succms-api`
- `AUTH_ISSUER=https://<your-function-app>.azurewebsites.net/`
- `AUTH_JWT_SECRET=<at least 32 random characters>`
- `AUTH_BOOTSTRAP_KEY=<temporary setup key>`

Use `POST /api/auth/bootstrap-password` only during migration to attach a password to an existing row in `public.user_profiles`.
