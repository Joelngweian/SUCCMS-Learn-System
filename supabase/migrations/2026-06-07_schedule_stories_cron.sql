-- Migration: 2026-06-07_schedule_stories_cron.sql
-- Description: Schedule the expire_old_stories function to run hourly

-- Enable pg_cron if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Unschedule just in case to prevent duplicates
SELECT cron.unschedule('expire_old_stories_job');

-- Schedule to run every hour
SELECT cron.schedule('expire_old_stories_job', '0 * * * *', 'SELECT public.expire_old_stories();');
