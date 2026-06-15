import type { Database, Json } from "@/lib/database.types";

type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type CoursePerson = Pick<
  TableRow<"user_profiles">,
  | "id"
  | "full_name"
  | "username"
  | "role"
  | "program_or_department"
  | "avatar_url"
  | "bio"
  | "created_at"
  | "updated_at"
  | "is_active"
  | "cover_url"
  | "faculty"
  | "programme"
>;
export type CourseMaterial = TableRow<"course_materials">;
export type CourseProfileDisplay = {
  full_name: string;
  avatar_url?: string | null;
};

export type CourseResourceFile = {
  name: string;
  path: string;
  size?: number;
  type?: string;
};

export type AiGradeDetails = {
  confidence: number | null;
  criteria: Array<{
    name: string;
    score: number;
    maxScore: number;
    reason: string;
  }>;
  warnings: string[];
};

export type SubmissionFile = {
  name: string;
  path: string;
};

export type CoursePostFile = CourseResourceFile & {
  url?: string;
};

export type CoursePost = Omit<TableRow<"course_posts">, "attachments"> & {
  attachments: CoursePostFile[];
};

export type CourseAssignment = Omit<
  TableRow<"assignments">,
  "attachments"
> & {
  attachments: CourseResourceFile[];
};

export type CourseSubmission = Omit<
  TableRow<"assignment_submissions">,
  "files"
> & {
  files: SubmissionFile[] | null;
};

export type MentionPerson = {
  id: string;
  name?: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
};

const isFileRecord = (
  value: Json,
): value is { name: string; path: string; url?: string; size?: number; type?: string } => {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  return typeof value.name === "string" && typeof value.path === "string";
};

export const getSubmissionFiles = (value: Json | null): SubmissionFile[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isFileRecord)
    .map(file => ({ name: file.name, path: file.path }));
};

export const getCourseResourceFiles = (
  value: Json | null,
): CourseResourceFile[] => {
  if (!Array.isArray(value)) return [];

  return value.filter(isFileRecord).map(file => ({
    name: file.name,
    path: file.path,
    size: typeof file.size === "number" ? file.size : undefined,
    type: typeof file.type === "string" ? file.type : undefined,
  }));
};

export const getCoursePostFiles = (value: Json | null): CoursePostFile[] =>
  !Array.isArray(value)
    ? []
    : value.filter(isFileRecord).map(file => ({
        name: file.name,
        path: file.path,
        url: typeof file.url === "string" ? file.url : undefined,
        size: typeof file.size === "number" ? file.size : undefined,
        type: typeof file.type === "string" ? file.type : undefined,
      }));

export const normalizeCoursePost = (
  post: TableRow<"course_posts">,
): CoursePost => ({
  ...post,
  attachments: getCoursePostFiles(post.attachments),
});

export const normalizeCourseAssignment = (
  assignment: TableRow<"assignments">,
): CourseAssignment => ({
  ...assignment,
  attachments: getCourseResourceFiles(assignment.attachments),
});

export const normalizeCourseSubmission = (
  submission: TableRow<"assignment_submissions">,
): CourseSubmission => ({
  ...submission,
  files: getSubmissionFiles(submission.files),
});

export const getAssignmentMaxScore = (
  assignment: Pick<CourseAssignment, "max_score"> | null | undefined,
) => {
  const value = Number(assignment?.max_score ?? 100);
  return Number.isFinite(value) && value > 0 ? value : 100;
};
