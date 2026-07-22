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
> & {
  email?: string | null;
};
export type CourseMaterial = TableRow<"course_materials">;
export type CourseProfileDisplay = {
  full_name: string;
  avatar_url?: string | null;
};

export type CourseResourceFile = {
  bucket?: string;
  name: string;
  path: string;
  size?: number;
  type?: string;
  url?: string;
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
  annotations: AiGradingAnnotation[];
};

export type RubricGradeItem = {
  name: string;
  aiScore: number;
  adjustment: number;
  finalScore: number;
  maxScore: number;
  reason: string;
};

export type AiGradingAnnotation = {
  fileName: string;
  page: number | null;
  status: "correct" | "incorrect" | "uncertain";
  excerpt: string;
  comment: string;
};

export type SubmissionFile = {
  bucket?: string;
  name: string;
  path: string;
  size?: number;
  type?: string;
  url?: string;
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
): value is {
  bucket?: string;
  name: string;
  path: string;
  url?: string;
  size?: number;
  type?: string;
} => {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  return typeof value.name === "string" && typeof value.path === "string";
};

export const getSubmissionFiles = (value: Json | null): SubmissionFile[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isFileRecord)
    .map(file => ({
      bucket: typeof file.bucket === "string" ? file.bucket : undefined,
      name: file.name,
      path: file.path,
      size: typeof file.size === "number" ? file.size : undefined,
      type: typeof file.type === "string" ? file.type : undefined,
      url: typeof file.url === "string" ? file.url : undefined,
    }));
};

export const getRubricGradeItems = (
  value: Json | null | undefined,
): RubricGradeItem[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Exclude<Json, null | string | number | boolean | Json[]> =>
        Boolean(item) && !Array.isArray(item) && typeof item === "object",
    )
    .map(item => {
      const maxScore = Number(item.maxScore);
      const aiScore = Number(item.aiScore);
      const adjustment = Number(item.adjustment);
      const finalScore = Number(item.finalScore);
      return {
        name: typeof item.name === "string" ? item.name : "Rubric criterion",
        aiScore: Number.isFinite(aiScore) ? aiScore : 0,
        adjustment: Number.isFinite(adjustment) ? adjustment : 0,
        finalScore: Number.isFinite(finalScore) ? finalScore : 0,
        maxScore: Number.isFinite(maxScore) ? maxScore : 0,
        reason: typeof item.reason === "string" ? item.reason : "",
      };
    })
    .filter(item => item.name && item.maxScore >= 0);
};

export const getCourseResourceFiles = (
  value: Json | null,
): CourseResourceFile[] => {
  if (!Array.isArray(value)) return [];

  return value.filter(isFileRecord).map(file => ({
    bucket: typeof file.bucket === "string" ? file.bucket : undefined,
    name: file.name,
    path: file.path,
    size: typeof file.size === "number" ? file.size : undefined,
    type: typeof file.type === "string" ? file.type : undefined,
    url: typeof file.url === "string" ? file.url : undefined,
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
