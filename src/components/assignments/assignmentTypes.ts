import type { Database } from "@/lib/database.types";
import type { NormalizedCourseOffering } from "@/lib/courseOfferings";

type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type AssignmentSubmission = TableRow<"assignment_submissions">;

export type AssignmentMetrics = {
  totalSubmissions: number;
  ungradedCount: number;
  gradedCount: number;
};

export type AssignmentListItem = TableRow<"assignments"> & {
  courses: NormalizedCourseOffering;
  submission?: AssignmentSubmission;
  metrics?: AssignmentMetrics;
  points?: number | null;
};

export type AssignmentCardType =
  | "upcoming"
  | "pastDue"
  | "completed"
  | "needsGrading"
  | "graded"
  | "all";

export type StudentAssignmentBuckets = {
  upcoming: AssignmentListItem[];
  pastDue: AssignmentListItem[];
  completed: AssignmentListItem[];
  crucialCount: number;
};

export type LecturerAssignmentBuckets = {
  all: AssignmentListItem[];
  needsGrading: AssignmentListItem[];
  graded: AssignmentListItem[];
};
