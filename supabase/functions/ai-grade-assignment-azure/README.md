# Azure OpenAI AI Grading Worker

This is the Azure-only replacement for `ai-grade-assignment`. It is intentionally
dormant and is not called by `ai-grading-request`.

## Required Supabase Edge Function Secrets

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_GRADING_DEPLOYMENT`
- `AZURE_OPENAI_WORKER_ENABLED=true` (set only when the school approves activation)

The function also uses Supabase-provided `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`.

Azure OpenAI v1 uses `POST /openai/v1/responses`; the deployment name is sent
in `model`. The v1 API does not require a dated `api-version`, so
`AZURE_OPENAI_API_VERSION` is not used by this function.

## Activation Later

1. Create the Azure model deployment and obtain its exact Deployment Name.
2. Add the four Secrets above to Supabase. Keep the enabled flag unset or false
   until the final cutover.
3. Deploy this function as `ai-grade-assignment-azure`.
4. Run one development grading test with text, an image, PDF, and DOCX.
5. Change the Worker URL in `ai-grading-request` from
   `ai-grade-assignment` to `ai-grade-assignment-azure`, then deploy that
   request function.
6. Point the fail-safe Cron invocation to the Azure function and monitor
   Azure RPM, TPM, content-filter failures, cost, and queue depth.

Do not deploy this source over the current Gemini Worker until Azure access,
quota, networking, privacy approval, and end-to-end tests are complete.

## Microsoft References

- [Azure OpenAI v1 API](https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle)
- [Azure OpenAI Responses API](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses)
- [Azure OpenAI structured outputs](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs)
