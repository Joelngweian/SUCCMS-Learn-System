import { supabase } from "@/lib/supabase";

export const ASSIGNMENT_SUBMISSIONS_BUCKET = "assignment-submissions";

export type SubmissionFileReference = {
  bucket?: string;
  name: string;
  path: string;
  size?: number;
  type?: string;
  url?: string;
};

export async function resolveSubmissionFileUrl(
  file: SubmissionFileReference,
) {
  if (file.url) return file.url;
  if (/^https?:\/\//i.test(file.path)) return file.path;

  const bucket = file.bucket || ASSIGNMENT_SUBMISSIONS_BUCKET;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(file.path.replace(/^\/+/, ""), 300);
  if (error || !data?.signedUrl) {
    throw error || new Error("A secure download URL could not be created.");
  }
  return data.signedUrl;
}

export async function removeSubmissionFiles(
  files: SubmissionFileReference[] | null | undefined,
) {
  const byBucket = new Map<string, string[]>();
  (files || []).forEach((file) => {
    if (!file.path || /^https?:\/\//i.test(file.path)) return;
    const bucket = file.bucket || ASSIGNMENT_SUBMISSIONS_BUCKET;
    byBucket.set(bucket, [...(byBucket.get(bucket) || []), file.path]);
  });

  for (const [bucket, paths] of byBucket) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(Array.from(new Set(paths)));
    if (error) throw error;
  }
}
