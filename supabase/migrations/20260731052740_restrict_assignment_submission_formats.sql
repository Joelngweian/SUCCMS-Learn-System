begin;

-- Student submissions use their own bucket, so the bucket-level MIME allowlist
-- can safely mirror the app-level submission upload rules.
update storage.buckets
set
  allowed_mime_types = array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]::text[],
  updated_at = now()
where id = 'assignment-submissions';

commit;
