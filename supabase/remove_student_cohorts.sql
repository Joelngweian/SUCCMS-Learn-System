-- SUCCMS academic planning cleanup
-- Purpose: remove the old student_cohorts mapping table after the app was changed
-- to resolve student study plans directly from study_plan_versions.
--
-- Run this manually in Supabase SQL Editor only after the updated frontend/code is deployed.
-- This is intentionally not a numbered migration file because the local Supabase CLI is not available here.

begin;

drop table if exists public.student_cohorts cascade;

commit;
