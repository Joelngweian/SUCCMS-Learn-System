import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

export const COURSE_OFFERING_SELECT = "*, courses(*), academic_terms(*)";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type CourseOfferingRow =
  Database["public"]["Tables"]["course_offerings"]["Row"];
type AcademicTermRow =
  Database["public"]["Tables"]["academic_terms"]["Row"];

export type NormalizedCourseOffering =
  Partial<CourseRow>
  & Partial<CourseOfferingRow>
  & {
    id: string;
    template_id: string;
    course_code: string;
    code: string;
    name: string;
    chinese_name: string | null;
    faculty: string;
    programme: string;
    course_type:
      | "common_core"
      | "discipline_core"
      | "elective_open"
      | "elective_core";
    credit_hours: number;
    max_capacity: number;
    enrollment_key: string | null;
    status: "active" | "unavailable" | "full" | "open";
    semester: string;
  };

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asCourseType = (
  value: unknown,
): NormalizedCourseOffering["course_type"] => {
  if (
    value === "common_core"
    || value === "discipline_core"
    || value === "elective_open"
    || value === "elective_core"
  ) {
    return value;
  }
  return "elective_open";
};

const asOfferingStatus = (
  value: unknown,
): NormalizedCourseOffering["status"] => {
  if (
    value === "active"
    || value === "unavailable"
    || value === "full"
    || value === "open"
  ) {
    return value;
  }
  return "active";
};

export function normalizeCourseOffering(
  row: unknown,
): NormalizedCourseOffering {
  const root = asRecord(row);
  const offeringRecord = Object.keys(asRecord(root.course_offerings)).length
    ? asRecord(root.course_offerings)
    : root;
  const courseRecord = asRecord(offeringRecord.courses);
  const termRecord = asRecord(offeringRecord.academic_terms);
  const offering = offeringRecord as Partial<CourseOfferingRow>;
  const course = courseRecord as Partial<CourseRow>;
  const term = termRecord as Partial<AcademicTermRow>;

  return {
    ...course,
    ...offering,
    id: asString(offering.id),
    template_id: asString(offering.course_id),
    course_code: asString(course.course_code || course.code),
    code: asString(course.code || course.course_code),
    name: asString(course.name),
    chinese_name: course.chinese_name ?? null,
    faculty: course.faculty || "",
    programme: course.programme || "",
    course_type: asCourseType(course.course_type),
    credits: course.credits,
    credit_hours: course.credit_hours ?? course.credits ?? 0,
    max_capacity:
      offering.max_capacity
      ?? course.max_capacity
      ?? course.max_students
      ?? 0,
    enrollment_key: offering.enrollment_key ?? course.enrollment_key ?? null,
    status: asOfferingStatus(offering.status ?? course.status),
    semester: term.code || term.name || "Current",
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

function collectAttachmentPaths(
  rows: unknown[],
  property: string,
  bucket: string,
) {
  const paths: string[] = [];

  rows.forEach((row) => {
    const record = asRecord(row);
    const rawAttachments = record[property];
    const attachments: unknown[] = Array.isArray(rawAttachments)
      ? rawAttachments
      : [];
    attachments.forEach((attachment: unknown) => {
      const attachmentRecord = asRecord(attachment);
      const path = extractStoragePath(
        attachmentRecord.path || attachmentRecord.url || attachment,
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
  const assignmentIds = assignments.map(assignment => assignment.id);
  const threads = threadsResult.data || [];
  const threadIds = threads.map(thread => thread.id).filter(Boolean);
  const submissionsResult = assignmentIds.length
    ? await supabase
        .from("assignment_submissions")
        .select("files, submission_file_url")
        .in("assignment_id", assignmentIds)
    : { data: [] };
  const repliesResult = threadIds.length
    ? await supabase
        .from("forum_replies")
        .select("image_url")
        .in("thread_id", threadIds)
    : { data: [] };

  const materialPaths = (materialsResult.data || [])
    .flatMap(material => [
      extractStoragePath(material.file_path, "course_content"),
      extractStoragePath(material.file_url, "course_content"),
    ])
    .filter(Boolean) as string[];

  const assignmentRubricPaths = assignments.flatMap(assignment => {
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
      .map(submission =>
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
          .map(reply => extractStoragePath(reply.image_url, "forum-images"))
          .filter(Boolean),
      ] as string[]
    ),
  ]);
}
