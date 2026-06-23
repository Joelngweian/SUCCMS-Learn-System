# SUCCMS Storage Security Audit

Last reviewed: 2026-06-19  
Project: `jfskyjzysvdwureenttw`

## Decision summary

| Bucket | Current remote state | Decision |
| --- | --- | --- |
| `assignment-submissions` | Private | Keep private; signed access is already used |
| `study-group-files` | Private | Keep private; members receive signed URLs |
| `campus-advertisements` | Private | Keep private; this legacy feature is retired |
| `course_content` | Public, 36 objects | Change to private; only course members may read |
| `announcement-attachments` | Public, 2 objects | Change to private; only authenticated campus users may read |
| `forum-images` | Public | Keep public because forum media is intentionally shared |
| `public_profiles` | Public | Keep public for avatars and profile media |
| `stories` | Public | Keep public for social story media |

## Implemented locally

- `20260619015812_secure_course_and_announcement_storage.sql` changes the two
  sensitive public buckets to private, adds read policies, and adds server-side
  MIME allowlists.
- Course files and Course Post attachments now use short-lived signed URLs.
- Student and Admin announcement views re-sign stored attachment paths when
  data is loaded. Existing permanent URL values are no longer trusted for
  access after the bucket becomes private.
- The code intentionally leaves profile, story, and forum `getPublicUrl` calls
  in place because those three buckets remain public by design.

## Deployment order

1. Paste and run `20260619015812_secure_course_and_announcement_storage.sql`
   in Supabase SQL Editor.
2. Confirm both buckets show `public = false` and the two new SELECT policies
   exist.
3. Deploy the frontend changes.
4. Test as an enrolled student, a non-member student, and an administrator.

The expected result is that enrolled members can open course files, non-members
cannot create a signed course URL, and signed-in users can open announcement
attachments. Old public URLs should return an authorization error after the
migration.
