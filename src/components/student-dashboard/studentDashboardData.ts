import type { Database } from "@/lib/database.types";
import { withSignedStorageUrls } from "@/lib/storageUrls";
import type {
  Recommendation,
  StudyInsightCourseContext,
} from "./studentDashboardRecommendations";

export interface CourseActivity {
  courseCode: string;
  courseName: string;
  lastAccessed: Date;
  progress: number;
}

export interface StudentCourse {
  id: string;
  code: string;
  name: string;
  lecturer: string;
  progress: number;
  assignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  status: string;
  grade: string | null;
  credits: number;
  lastActivity: Date;
  nextAssignment?: {
    id: string;
    title: string;
    dueDate: string;
  };
}

export interface DashboardAssignment {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  title: string;
  dueDate: string;
}

export interface DashboardAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  attachments: Array<{
    name: string;
    path: string;
    url: string;
    type: string;
    size: number;
  }>;
  createdAt: string;
  isRead: boolean;
}

export type AssignmentRow = Pick<
  Database["public"]["Tables"]["assignments"]["Row"],
  | "id"
  | "course_id"
  | "title"
  | "description"
  | "rubric"
  | "due_date"
  | "max_score"
  | "created_at"
>;

export type SubmissionRow = Pick<
  Database["public"]["Tables"]["assignment_submissions"]["Row"],
  "id" | "assignment_id" | "submitted_at" | "is_late" | "grade" | "feedback"
>;

export type GradeRow = Pick<
  Database["public"]["Tables"]["student_grades"]["Row"],
  | "course_id"
  | "assignment_id"
  | "score"
  | "max_score"
  | "feedback"
  | "graded_at"
>;

export type AttendanceRow = Pick<
  Database["public"]["Tables"]["attendance"]["Row"],
  "course_id" | "class_date" | "status" | "marked_present"
>;

export type InstructorRow = {
  course_id: string;
  user_profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
};

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

export const asStringList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

export const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value: unknown) => value === true;

export const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

export const isRecommendation = (value: unknown): value is Recommendation => {
  const item = asRecord(value);
  return (
    typeof item.id === "string"
    && typeof item.title === "string"
    && typeof item.type === "string"
    && typeof item.url === "string"
    && /^https?:\/\//i.test(item.url)
  );
};

export const normalizeAnnouncementAttachments = (
  value: unknown,
): DashboardAnnouncement["attachments"] =>
  Array.isArray(value)
    ? value.flatMap((attachment) => {
        const item = asRecord(attachment);
        if (
          typeof item.name !== "string"
          || typeof item.url !== "string"
        ) {
          return [];
        }
        return [{
          name: item.name,
          path: typeof item.path === "string" ? item.path : "",
          url: item.url,
          type: typeof item.type === "string" ? item.type : "",
          size: typeof item.size === "number" ? item.size : 0,
        }];
      })
    : [];

export const normalizeDashboardCourse = (value: unknown): StudentCourse | null => {
  const course = asRecord(value);
  const id = asString(course.id);
  if (!id) return null;

  const next = asRecord(course.nextAssignment);
  const nextAssignment = asString(next.id)
    ? {
        dueDate: asString(next.dueDate),
        id: asString(next.id),
        title: asString(next.title),
      }
    : undefined;

  return {
    assignments: asNumber(course.assignments),
    code: asString(course.code, "N/A"),
    completedAssignments: asNumber(course.completedAssignments),
    credits: asNumber(course.credits),
    grade: typeof course.grade === "string" ? course.grade : null,
    id,
    lastActivity: new Date(asString(course.lastActivity)),
    lecturer: asString(course.lecturer, "No lecturer assigned"),
    name: asString(course.name, "Course"),
    nextAssignment,
    pendingAssignments: asNumber(course.pendingAssignments),
    progress: asNumber(course.progress),
    status: asString(course.status, "active"),
  };
};

export const normalizeUpcomingAssignment = (
  value: unknown,
): DashboardAssignment | null => {
  const assignment = asRecord(value);
  const id = asString(assignment.id);
  const courseId = asString(assignment.courseId);
  if (!id || !courseId) return null;

  return {
    courseCode: asString(assignment.courseCode, "N/A"),
    courseId,
    courseName: asString(assignment.courseName, "Course"),
    dueDate: asString(assignment.dueDate),
    id,
    title: asString(assignment.title),
  };
};

export const normalizeDashboardAnnouncement = (
  value: unknown,
): DashboardAnnouncement | null => {
  const announcement = asRecord(value);
  const id = asString(announcement.id);
  if (!id) return null;
  const priority = announcement.priority === "high" || announcement.priority === "low"
    ? announcement.priority
    : "medium";

  return {
    attachments: normalizeAnnouncementAttachments(announcement.attachments),
    content: asString(announcement.content),
    createdAt: asString(announcement.createdAt),
    id,
    isRead: asBoolean(announcement.isRead),
    priority,
    title: asString(announcement.title),
  };
};

export const signDashboardAnnouncementAttachments = async (
  announcements: DashboardAnnouncement[],
) => {
  const signedAttachments = await withSignedStorageUrls(
    "announcement-attachments",
    announcements.flatMap(announcement => announcement.attachments),
  );
  const attachmentUrlByPath = new Map(
    signedAttachments.map(attachment => [attachment.path, attachment.url]),
  );

  return announcements.map(announcement => ({
    ...announcement,
    attachments: announcement.attachments.map(attachment => ({
      ...attachment,
      url: attachmentUrlByPath.get(attachment.path) || attachment.url,
    })),
  }));
};

export const normalizeInsightCourse = (
  value: unknown,
): StudyInsightCourseContext | null => {
  const course = asRecord(value);
  const id = asString(course.id);
  if (!id) return null;

  return {
    assignments: asArray(course.assignments).map(asRecord).map(assignment => ({
      dueDate: asString(assignment.dueDate),
      isLate: asBoolean(assignment.isLate),
      submitted: asBoolean(assignment.submitted),
      title: asString(assignment.title),
    })),
    attendance: asArray(course.attendance).map(asRecord).map(record => ({
      classDate: asString(record.classDate),
      status: asString(record.status),
    })),
    code: asString(course.code, "N/A"),
    grades: asArray(course.grades).map(asRecord).map(grade => ({
      assignmentTitle: asString(grade.assignmentTitle, "Course assessment"),
      feedback: asString(grade.feedback),
      gradedAt: asString(grade.gradedAt),
      percentage: asNumber(grade.percentage),
      rubric: asString(grade.rubric),
    })),
    id,
    name: asString(course.name, "Course"),
  };
};

export const getCourseCode = (course: {
  course_code?: string | null;
  code?: string | null;
}) => course.course_code || course.code || "N/A";

export const percentageToGrade = (percentage: number | null) => {
  if (percentage == null) return null;
  if (percentage >= 80) return "A";
  if (percentage >= 75) return "A-";
  if (percentage >= 70) return "B+";
  if (percentage >= 65) return "B";
  if (percentage >= 60) return "B-";
  if (percentage >= 55) return "C+";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
};

export const formatRelativeDate = (value: string) => {
  const date = new Date(value);
  const difference = date.getTime() - Date.now();
  const absoluteDays = Math.ceil(Math.abs(difference) / 86400000);

  if (difference > 0 && absoluteDays === 1) return "Due tomorrow";
  if (difference > 0 && absoluteDays < 7) return `Due in ${absoluteDays} days`;
  if (difference < 0) return `Due ${date.toLocaleDateString()}`;
  return `Due ${date.toLocaleDateString()}`;
};
