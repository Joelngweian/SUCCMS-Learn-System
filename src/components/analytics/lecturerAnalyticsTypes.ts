import type { ComponentType } from "react";
import type { Database } from "@/lib/database.types";
import type { NormalizedCourseOffering } from "@/lib/courseOfferings";

type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type AnalyticsPeriod = "6-weeks" | "semester" | "month";
export type AnalyticsCourse = NormalizedCourseOffering;
export type AnalyticsEnrollment = Pick<
  TableRow<"course_enrollments">,
  "course_id" | "student_id" | "enrolled_at"
>;
export type AnalyticsAssignment = Pick<
  TableRow<"assignments">,
  "id" | "course_id" | "title" | "due_date" | "max_score" | "created_at"
>;
export type AnalyticsAttendance = Pick<
  TableRow<"attendance">,
  "course_id" | "student_id" | "class_date" | "marked_present"
>;
export type AnalyticsThread = Pick<
  TableRow<"forum_threads">,
  "id" | "course_id" | "author_id" | "created_at"
>;
export type AnalyticsReply = Pick<
  TableRow<"forum_replies">,
  "id" | "thread_id" | "author_id" | "created_at"
>;
export type AnalyticsSubmission = Pick<
  TableRow<"assignment_submissions">,
  "id" | "assignment_id" | "student_id" | "submitted_at" | "grade" | "is_late"
>;
export type AnalyticsProfile = Pick<
  TableRow<"user_profiles">,
  "id" | "full_name"
>;

export type CourseMetric = {
  id: string;
  code: string;
  name: string;
  studentIds: string[];
  students: number;
  completion: number;
  engagement: number;
  averageScore: number;
  submissionRate: number;
  pendingGrades: number;
  riskStudents: number;
  forumPosts: number;
  dueAssignments: number;
};

export type AssignmentMetric = {
  id: string;
  courseId: string;
  title: string;
  course: string;
  submitted: number;
  total: number;
  average: number | null;
  ungraded: number;
};

export type RiskStudent = {
  id: string;
  courseId: string;
  name: string;
  course: string;
  risk: "High" | "Medium";
  reason: string;
  score: number;
};

export type TrendPoint = {
  week: string;
  engagement: number;
  submissions: number;
  averageScore: number;
};

export type TrendBucket = {
  start: Date;
  end: Date;
  label: string;
};

export type TeachingInsight = {
  title: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  bg: string;
};

export type AnalyticsTotals = {
  students: number;
  engagement: number;
  completion: number;
  pendingGrades: number;
  riskStudents: number;
};

export const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
