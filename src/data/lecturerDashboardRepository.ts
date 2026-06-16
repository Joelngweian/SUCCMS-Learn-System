import {
  getCourseOfferings,
  getLecturerCourseIds,
} from "@/data/courseRepository";
import { getProfileSummaries } from "@/data/profileRepository";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

export type LecturerAssignmentRow = Pick<
  Database["public"]["Tables"]["assignments"]["Row"],
  "id" | "course_id" | "title" | "due_date" | "max_score" | "created_at"
>;
export type LecturerSubmissionRow = Pick<
  Database["public"]["Tables"]["assignment_submissions"]["Row"],
  "id" | "assignment_id" | "student_id" | "submitted_at" | "grade" | "is_late"
>;
export type LecturerEnrollmentRow = Pick<
  Database["public"]["Tables"]["course_enrollments"]["Row"],
  "course_id" | "student_id" | "enrolled_at"
>;
export type LecturerMaterialRow = Pick<
  Database["public"]["Tables"]["course_materials"]["Row"],
  "id" | "course_id"
>;
export type LecturerProfileSummary = Pick<
  Database["public"]["Tables"]["user_profiles"]["Row"],
  "id" | "full_name" | "avatar_url"
>;

export async function loadLecturerDashboardRawData(userId: string) {
  const courseIds = await getLecturerCourseIds(userId);

  if (courseIds.length === 0) {
    return {
      assignmentRows: [] as LecturerAssignmentRow[],
      courseRows: [],
      enrollmentRows: [] as LecturerEnrollmentRow[],
      forumPostsToday: 0,
      materialRows: [] as LecturerMaterialRow[],
      profileRows: [] as LecturerProfileSummary[],
      submissionRows: [] as LecturerSubmissionRow[],
    };
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    courseRows,
    enrollmentResult,
    assignmentResult,
    materialResult,
    forumResult,
  ] = await Promise.all([
    getCourseOfferings(courseIds),
    supabase
      .from("course_enrollments")
      .select("course_id, student_id, enrolled_at")
      .in("course_id", courseIds),
    supabase
      .from("assignments")
      .select("id, course_id, title, due_date, max_score, created_at")
      .in("course_id", courseIds)
      .order("due_date", { ascending: true }),
    supabase
      .from("course_materials")
      .select("id, course_id")
      .in("course_id", courseIds),
    supabase
      .from("forum_threads")
      .select("id, course_id, created_at")
      .in("course_id", courseIds)
      .gte("created_at", startOfToday.toISOString()),
  ]);

  if (enrollmentResult.error) throw enrollmentResult.error;
  if (assignmentResult.error) throw assignmentResult.error;
  if (materialResult.error) throw materialResult.error;
  if (forumResult.error) throw forumResult.error;

  const assignmentRows = assignmentResult.data || [];
  const assignmentIds = assignmentRows.map((assignment) => assignment.id);

  let submissionRows: LecturerSubmissionRow[] = [];
  if (assignmentIds.length > 0) {
    const submissionResult = await supabase
      .from("assignment_submissions")
      .select("id, assignment_id, student_id, submitted_at, grade, is_late")
      .in("assignment_id", assignmentIds)
      .order("submitted_at", { ascending: false });

    if (submissionResult.error) throw submissionResult.error;
    submissionRows = submissionResult.data || [];
  }

  const studentIds = Array.from(
    new Set(
      submissionRows
        .map((submission) => submission.student_id)
        .filter(Boolean),
    ),
  );

  const profileRows =
    studentIds.length > 0 ? await getProfileSummaries(studentIds) : [];

  return {
    assignmentRows,
    courseRows,
    enrollmentRows: enrollmentResult.data || [],
    forumPostsToday: forumResult.data?.length || 0,
    materialRows: materialResult.data || [],
    profileRows,
    submissionRows,
  };
}
