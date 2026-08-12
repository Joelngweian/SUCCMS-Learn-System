import { z } from "zod";

export const aiGradingRequestSchema = z.object({
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid()
});

export const aiGradingJobStatusSchema = z.object({
  jobId: z.string().uuid()
});

export const aiGradeAssignmentSchema = z.object({
  assignmentTitle: z.string().min(1).max(200),
  submissionText: z.string().min(1).max(100_000),
  markingGuide: z.string().max(50_000).optional()
});

export const createUploadUrlSchema = z.object({
  domain: z.enum([
    "course-content",
    "assignment-submissions",
    "public-profiles",
    "announcement-attachments",
    "forum-images",
    "stories",
    "campus-posts",
    "study-group-files"
  ]),
  fileName: z.string().min(1).max(180),
  contentType: z.string().min(1).max(120)
});

export const createReadUrlSchema = z.object({
  path: z.string().min(1).max(1800),
  expiresInSeconds: z.number().int().min(60).max(3600).default(300)
});

const uploadedFileSchema = z.object({
  bucket: z.string().min(1).max(120).optional(),
  name: z.string().min(1).max(240),
  path: z.string().min(1).max(1800),
  size: z.number().nonnegative().optional(),
  type: z.string().max(160).optional(),
  url: z.string().max(1800).optional()
});

export const createCourseAssignmentSchema = z.object({
  courseId: z.string().uuid(),
  assessmentType: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  rubric: z.string().max(50000).nullable().optional(),
  maxScore: z.number().int().positive().max(100000).nullable().optional(),
  dueDate: z.string().datetime(),
  attachments: z.array(uploadedFileSchema).max(12).default([]),
  markingGuide: z.string().max(50000).optional()
});

export const courseIdParamSchema = z.object({
  courseId: z.string().uuid()
});

export const assignmentIdParamSchema = z.object({
  assignmentId: z.string().uuid()
});

export const submissionIdParamSchema = z.object({
  submissionId: z.string().uuid()
});

export const submitAssignmentSchema = z.object({
  files: z.array(uploadedFileSchema).max(12).default([])
});

export const gradeSubmissionSchema = z.object({
  grade: z.number().int().min(0).max(100000),
  feedback: z.string().max(50000).default(""),
  rubricGrades: z.array(z.unknown()).max(100).default([])
});

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(256)
});

export const signupSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(256),
  username: z.string().trim().min(1).max(80),
  fullName: z.string().trim().min(1).max(160)
});

export const bootstrapPasswordSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(256),
  bootstrapKey: z.string().min(16).max(512)
});
