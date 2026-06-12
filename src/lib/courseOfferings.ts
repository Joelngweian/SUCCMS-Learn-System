import { supabase } from "@/lib/supabase";

export const COURSE_OFFERING_SELECT = "*, courses(*), academic_terms(*)";

export function normalizeCourseOffering(row: any) {
  const offering = row?.course_offerings || row;
  const course = offering?.courses || {};
  const term = offering?.academic_terms || {};

  return {
    ...course,
    ...offering,
    id: offering?.id,
    template_id: offering?.course_id,
    course_code: course?.course_code || course?.code,
    code: course?.code || course?.course_code,
    name: course?.name,
    chinese_name: course?.chinese_name,
    faculty: course?.faculty,
    programme: course?.programme,
    course_type: course?.course_type,
    credits: course?.credits,
    credit_hours: course?.credit_hours ?? course?.credits,
    semester: term?.code || term?.name || "Current",
  };
}

function extractStoragePath(value: unknown, bucket: string) {
  if (typeof value !== "string" || !value) return null;

  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = value.indexOf(marker);
  if (markerIndex >= 0) {
    return decodeURIComponent(value.slice(markerIndex + marker.length).split("?")[0]);
  }

  if (/^https?:\/\//i.test(value)) return null;
  return value.replace(/^\/+/, "");
}

function collectAttachmentPaths(rows: any[], property: string, bucket: string) {
  const paths: string[] = [];

  rows.forEach((row) => {
    const attachments = Array.isArray(row?.[property]) ? row[property] : [];
    attachments.forEach((attachment: any) => {
      const path = extractStoragePath(
        attachment?.path || attachment?.url || attachment,
        bucket
      );
      if (path) paths.push(path);
    });
  });

  return paths;
}

async function removeStoragePaths(bucket: string, paths: string[]) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  for (let index = 0; index < uniquePaths.length; index += 100) {
    const batch = uniquePaths.slice(index, index + 100);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) console.warn(`Failed to remove some ${bucket} files:`, error);
  }
}

export async function removeCourseOfferingFiles(offeringId: string) {
  const [
    materialsResult,
    postsResult,
    assignmentsResult,
    threadsResult,
  ] = await Promise.all([
    supabase
      .from("course_materials")
      .select("file_path, file_url")
      .eq("course_id", offeringId),
    supabase
      .from("course_posts")
      .select("attachments")
      .eq("course_id", offeringId),
    supabase
      .from("assignments")
      .select("id, attachments, rubric")
      .eq("course_id", offeringId),
    supabase
      .from("forum_threads")
      .select("id, images")
      .eq("course_id", offeringId),
  ]);

  const assignments = assignmentsResult.data || [];
  const assignmentIds = assignments.map((assignment: any) => assignment.id);
  const threads = threadsResult.data || [];
  const threadIds = threads.map((thread: any) => thread.id).filter(Boolean);
  const submissionsResult = assignmentIds.length
    ? await supabase
        .from("assignment_submissions")
        .select("files, submission_file_url")
        .in("assignment_id", assignmentIds)
    : { data: [] as any[] };
  const repliesResult = threadIds.length
    ? await supabase
        .from("forum_replies")
        .select("image_url")
        .in("thread_id", threadIds)
    : { data: [] as any[] };

  const materialPaths = (materialsResult.data || [])
    .flatMap((material: any) => [
      extractStoragePath(material.file_path, "course_content"),
      extractStoragePath(material.file_url, "course_content"),
    ])
    .filter(Boolean) as string[];

  const assignmentRubricPaths = assignments.flatMap((assignment: any) => {
    try {
      const rubric = JSON.parse(assignment.rubric || "[]");
      return collectAttachmentPaths([{ rubric }], "rubric", "course_content");
    } catch {
      return [];
    }
  });

  const submissionRows = submissionsResult.data || [];
  const submissionPaths = [
    ...collectAttachmentPaths(submissionRows, "files", "course_content"),
    ...submissionRows
      .map((submission: any) =>
        extractStoragePath(submission.submission_file_url, "course_content")
      )
      .filter(Boolean),
  ] as string[];

  await Promise.all([
    removeStoragePaths("course_content", [
      ...materialPaths,
      ...collectAttachmentPaths(postsResult.data || [], "attachments", "course_content"),
      ...collectAttachmentPaths(assignments, "attachments", "course_content"),
      ...assignmentRubricPaths,
      ...submissionPaths,
    ]),
    removeStoragePaths(
      "forum-images",
      [
        ...collectAttachmentPaths(threads, "images", "forum-images"),
        ...(repliesResult.data || [])
          .map((reply: any) => extractStoragePath(reply.image_url, "forum-images"))
          .filter(Boolean),
      ] as string[]
    ),
  ]);
}
