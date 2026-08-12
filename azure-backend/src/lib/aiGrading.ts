import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import mammoth from "mammoth";
import { getConfig } from "./config";
import { getPool } from "./db";
import { broadcastTableChanges } from "./realtime";
import type { AuthenticatedUser } from "../types/auth";

type GradingStatus = "queued" | "processing" | "completed" | "failed";

type UserProfileRow = {
  role: string;
  is_active: boolean | null;
};

type AssignmentRow = {
  id: string;
  course_id: string;
  assessment_type: string;
  title: string;
  description: string | null;
  max_score: number | null;
  rubric: string | null;
};

type SubmissionRow = {
  id: string;
  student_id: string;
  submission_text: string | null;
  files: unknown;
};

type MarkingGuideRow = {
  marking_guide: string | null;
};

type AiGradingJobRow = {
  id: string;
  assignment_id: string;
  student_id: string;
  requested_by: string;
  status: GradingStatus;
  attempts: number;
  max_attempts: number;
  result: unknown | null;
  error_message: string | null;
  model: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

type StoredFile = {
  bucket?: string;
  name: string;
  path: string;
  type?: string;
  size?: number;
};

type SubmissionTextSource = {
  fileName: string;
  text: string;
};

type GeminiAnnotation = {
  fileName?: string;
  page?: number | null;
  status?: string;
  excerpt?: string;
  comment?: string;
};

type GeminiGradeResponse = {
  suggestedScore?: number;
  feedback?: string;
  confidence?: number;
  criteria?: Array<{
    name?: string;
    score?: number;
    maxScore?: number;
    reason?: string;
  }>;
  warnings?: unknown[];
  annotations?: GeminiAnnotation[];
};

const MAX_FILES = 8;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 14 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 50000;
const MAX_SENTENCE_ANNOTATIONS = 220;

const textMimeTypes = new Set([
  "application/json",
  "application/xml",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain"
]);

const supportedInlineMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const docxMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const gradingSchema = {
  type: "object",
  properties: {
    suggestedScore: { type: "number" },
    feedback: { type: "string" },
    confidence: { type: "number" },
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          score: { type: "number" },
          maxScore: { type: "number" },
          reason: { type: "string" }
        },
        required: ["name", "score", "maxScore", "reason"]
      }
    },
    warnings: { type: "array", items: { type: "string" } },
    annotations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          fileName: { type: "string" },
          page: { type: "number", nullable: true },
          status: { type: "string", enum: ["correct", "incorrect", "uncertain"] },
          excerpt: { type: "string" },
          comment: { type: "string" }
        },
        required: ["fileName", "status", "excerpt", "comment"]
      }
    }
  },
  required: ["suggestedScore", "feedback", "confidence", "criteria", "warnings", "annotations"]
};

export async function createAndProcessAiGradingJob({
  assignmentId,
  studentId,
  requester
}: {
  assignmentId: string;
  studentId: string;
  requester: AuthenticatedUser;
}) {
  await assertCanGradeAssignment(requester.id, assignmentId, studentId);
  const job = await getOrCreateActiveJob(assignmentId, studentId, requester.id);

  if (job.status !== "completed") {
    try {
      await processAiGradingJob(job.id);
    } catch {
      // The job row keeps the user-facing failure reason. Return the job so the
      // client can show that reason instead of losing it behind a generic 500.
    }
  }

  const processedJob = await getAiGradingJobForUser(job.id, requester);
  if (!processedJob) {
    throw httpError(500, "The AI grading job could not be loaded.");
  }

  return {
    jobId: processedJob.id,
    status: processedJob.status,
    error_message: processedJob.error_message
  };
}

export async function getAiGradingJobForUser(
  jobId: string,
  requester: AuthenticatedUser
) {
  const result = await getPool().query<AiGradingJobRow>(
    `
      SELECT id, assignment_id, student_id, requested_by, status, attempts,
             max_attempts, result, error_message, model, created_at, started_at,
             completed_at, updated_at
      FROM public.ai_grading_jobs
      WHERE id = $1
      LIMIT 1
    `,
    [jobId]
  );
  const job = result.rows[0];
  if (!job) return null;

  await assertCanGradeAssignment(requester.id, job.assignment_id, job.student_id);

  return {
    id: job.id,
    status: job.status,
    result: job.result,
    error_message: job.error_message,
    model: job.model,
    attempts: job.attempts,
    created_at: job.created_at,
    started_at: job.started_at,
    completed_at: job.completed_at,
    updated_at: job.updated_at
  };
}

async function processAiGradingJob(jobId: string) {
  const client = await getPool().connect();
  try {
    const claimed = await client.query<AiGradingJobRow>(
      `
        UPDATE public.ai_grading_jobs
        SET status = 'processing',
            attempts = attempts + 1,
            started_at = COALESCE(started_at, now()),
            error_message = NULL,
            updated_at = now()
        WHERE id = $1
          AND status IN ('queued', 'processing', 'failed')
          AND attempts < max_attempts
        RETURNING id, assignment_id, student_id, requested_by, status, attempts,
                  max_attempts, result, error_message, model, created_at,
                  started_at, completed_at, updated_at
      `,
      [jobId]
    );
    const job = claimed.rows[0];
    if (!job) return;
    void broadcastTableChanges("ai_grading_jobs", "UPDATE", [job]);

    try {
      const result = await gradeJob(job);
      const completed = await client.query<AiGradingJobRow>(
        `
          UPDATE public.ai_grading_jobs
          SET status = 'completed',
              result = $2::jsonb,
              model = $3,
              completed_at = now(),
              error_message = NULL,
              updated_at = now()
          WHERE id = $1
          RETURNING id, assignment_id, student_id, requested_by, status, attempts,
                    max_attempts, result, error_message, model, created_at,
                    started_at, completed_at, updated_at
        `,
        [job.id, JSON.stringify(result), result.model]
      );
      void broadcastTableChanges("ai_grading_jobs", "UPDATE", completed.rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI grading failed.";
      const failed = await client.query<AiGradingJobRow>(
        `
          UPDATE public.ai_grading_jobs
          SET status = 'failed',
              error_message = $2,
              updated_at = now()
          WHERE id = $1
          RETURNING id, assignment_id, student_id, requested_by, status, attempts,
                    max_attempts, result, error_message, model, created_at,
                    started_at, completed_at, updated_at
        `,
        [job.id, message]
      );
      void broadcastTableChanges("ai_grading_jobs", "UPDATE", failed.rows);
      throw error;
    }
  } finally {
    client.release();
  }
}

async function gradeJob(job: AiGradingJobRow) {
  const [assignment, submission, markingGuide] = await Promise.all([
    getAssignment(job.assignment_id),
    getSubmission(job.assignment_id, job.student_id),
    getMarkingGuide(job.assignment_id)
  ]);

  if (!assignment) throw httpError(404, "Assignment not found.");
  if (!submission) {
    throw httpError(404, "The student has not submitted this assignment.");
  }

  const rubric = parseGuideResource(assignment.rubric);
  const guide = parseGuideResource(markingGuide?.marking_guide);
  if (!rubric.text && rubric.files.length === 0 && !guide.text && guide.files.length === 0) {
    throw httpError(400, "Add a grading rubric or AI marking guide before using AI grading.");
  }

  const submissionText = cleanText(submission.submission_text, "", 40000);
  const submissionFiles = normalizeFiles(submission.files);
  if (!submissionText && submissionFiles.length === 0) {
    throw httpError(400, "This submission has no readable text or attached files.");
  }

  const submissionTextSources: SubmissionTextSource[] = submissionText
    ? [{ fileName: "Submission text", text: submissionText }]
    : [];
  const fileParts = await loadFileParts([
    ...rubric.files.map(file => ({ file, label: "Lecturer rubric file" })),
    ...guide.files.map(file => ({ file, label: "AI marking guide file" })),
    ...submissionFiles.map(file => ({ file, label: "Student submission file", captureText: true }))
  ], submissionTextSources);

  const maxScore = cleanNumber(assignment.max_score ?? 100, 1, 100000);
  const promptParts: Array<Record<string, unknown>> = [
    {
      text: [
        "You are an assessment assistant for a college lecturer.",
        "Grade the student's submitted work strictly against the lecturer's rubric, marking guide, answer key, and instructions.",
        "Return a suggested grade only. The lecturer will review and decide the final grade.",
        "The suggestedScore and all criterion scores must be within their stated maximum values.",
        "The suggestedScore must equal the sum of all criterion scores.",
        "Write one concise feedback paragraph below 120 words.",
        "For every readable sentence in the student's work that you can see, return one annotation.",
        "Do not skip sentences that you reviewed, even when the sentence is correct or ordinary.",
        "Each annotation excerpt must be copied verbatim from the student's work.",
        "Use status correct, incorrect, or uncertain. Do not invent quotations or page numbers.",
        "",
        `Assessment type: ${cleanText(assignment.assessment_type, "individual_assignment", 100)}`,
        `Assessment title: ${cleanText(assignment.title, "Assessment", 300)}`,
        `Assessment instructions: ${cleanText(assignment.description, "No additional instructions.", 12000)}`,
        `Maximum score: ${maxScore}`,
        guide.text
          ? `AI marking guide / answer key: ${guide.text}`
          : guide.files.length > 0
            ? "AI marking guide / answer key is supplied as attached file(s)."
            : "No additional AI marking guide was provided.",
        rubric.text
          ? `Rubric text: ${rubric.text}`
          : rubric.files.length > 0
            ? "Rubric is supplied as attached file(s)."
            : "No rubric was provided for this assessment type.",
        submissionText
          ? `Student submission text: ${submissionText}`
          : "Student work is supplied as attached file(s)."
      ].join("\n")
    },
    ...fileParts
  ];

  const parsed = await callGemini(promptParts);
  const criteria = normalizeCriteria(parsed.criteria, maxScore);
  const criteriaScoreTotal = criteria.reduce((total, item) => total + item.score, 0);
  const suggestedScore = criteria.length > 0
    ? cleanNumber(criteriaScoreTotal, 0, maxScore)
    : cleanNumber(parsed.suggestedScore, 0, maxScore);
  const annotations = expandAnnotationsToSubmissionSentences(
    normalizeAnnotations(parsed.annotations),
    submissionTextSources
  );
  const criteriaMaxTotal = criteria.reduce((total, item) => total + item.maxScore, 0);

  return {
    suggestedScore,
    maxScore,
    feedback: cleanText(parsed.feedback, "No feedback was generated.", 1800),
    confidence: Math.round(cleanNumber(parsed.confidence, 0, 100)),
    criteria,
    warnings: [
      ...normalizeWarnings(parsed.warnings),
      ...(criteria.length > 0 && Math.abs(criteriaMaxTotal - maxScore) > 0.01
        ? [`Rubric sections total ${criteriaMaxTotal} marks, but the assessment maximum is ${maxScore}. Lecturer review is required.`]
        : [])
    ].slice(0, 5),
    annotations,
    model: getConfig().geminiModel
  };
}

async function assertCanGradeAssignment(
  requesterId: string,
  assignmentId: string,
  studentId: string
) {
  const [profileResult, assignmentResult, submissionResult] = await Promise.all([
    getPool().query<UserProfileRow>(
      `SELECT role, is_active FROM public.user_profiles WHERE id = $1 LIMIT 1`,
      [requesterId]
    ),
    getPool().query<AssignmentRow>(
      `SELECT id, course_id, assessment_type, title, description, max_score, rubric
       FROM public.assignments WHERE id = $1 LIMIT 1`,
      [assignmentId]
    ),
    getPool().query(
      `SELECT id FROM public.assignment_submissions
       WHERE assignment_id = $1 AND student_id = $2 LIMIT 1`,
      [assignmentId, studentId]
    )
  ]);

  const profile = profileResult.rows[0];
  if (!profile || !["lecturer", "admin"].includes(profile.role) || profile.is_active === false) {
    throw httpError(403, "Lecturer access is required.");
  }

  const assignment = assignmentResult.rows[0];
  if (!assignment) throw httpError(404, "Assignment not found.");
  if (submissionResult.rowCount === 0) {
    throw httpError(404, "The student has not submitted this assignment.");
  }

  if (profile.role === "admin") return;

  const instructor = await getPool().query(
    `SELECT user_id FROM public.course_instructors
     WHERE course_id = $1 AND user_id = $2 LIMIT 1`,
    [assignment.course_id, requesterId]
  );
  if (instructor.rowCount === 0) {
    throw httpError(403, "You are not an instructor for this course.");
  }
}

async function getOrCreateActiveJob(
  assignmentId: string,
  studentId: string,
  requestedBy: string
) {
  const active = await findActiveJob(assignmentId, studentId);
  if (active) return active;

  try {
    const inserted = await getPool().query<AiGradingJobRow>(
      `
        INSERT INTO public.ai_grading_jobs (assignment_id, student_id, requested_by)
        VALUES ($1, $2, $3)
        RETURNING id, assignment_id, student_id, requested_by, status, attempts,
                  max_attempts, result, error_message, model, created_at,
                  started_at, completed_at, updated_at
      `,
      [assignmentId, studentId, requestedBy]
    );
    void broadcastTableChanges("ai_grading_jobs", "INSERT", inserted.rows);
    return inserted.rows[0];
  } catch (error) {
    if (isUniqueViolation(error)) {
      const duplicated = await findActiveJob(assignmentId, studentId);
      if (duplicated) return duplicated;
    }
    throw error;
  }
}

async function findActiveJob(assignmentId: string, studentId: string) {
  const result = await getPool().query<AiGradingJobRow>(
    `
      SELECT id, assignment_id, student_id, requested_by, status, attempts,
             max_attempts, result, error_message, model, created_at, started_at,
             completed_at, updated_at
      FROM public.ai_grading_jobs
      WHERE assignment_id = $1
        AND student_id = $2
        AND status IN ('queued', 'processing')
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [assignmentId, studentId]
  );
  return result.rows[0] || null;
}

async function getAssignment(assignmentId: string) {
  const result = await getPool().query<AssignmentRow>(
    `SELECT id, course_id, assessment_type, title, description, max_score, rubric
     FROM public.assignments WHERE id = $1 LIMIT 1`,
    [assignmentId]
  );
  return result.rows[0] || null;
}

async function getSubmission(assignmentId: string, studentId: string) {
  const result = await getPool().query<SubmissionRow>(
    `SELECT id, student_id, submission_text, files
     FROM public.assignment_submissions
     WHERE assignment_id = $1 AND student_id = $2
     LIMIT 1`,
    [assignmentId, studentId]
  );
  return result.rows[0] || null;
}

async function getMarkingGuide(assignmentId: string) {
  const result = await getPool().query<MarkingGuideRow>(
    `SELECT marking_guide FROM public.assignment_marking_guides
     WHERE assignment_id = $1 LIMIT 1`,
    [assignmentId]
  );
  return result.rows[0] || null;
}

async function callGemini(parts: Array<Record<string, unknown>>): Promise<GeminiGradeResponse> {
  const config = getConfig();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": config.geminiApiKey
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: attempt === 0 ? 16384 : 8192,
            responseMimeType: "application/json",
            responseSchema: gradingSchema
          }
        })
      }
    );
    const payload = await response.json();
    if (response.ok) return parseGeminiJson(payload);
    if ((response.status === 429 || response.status >= 500) && attempt === 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      continue;
    }
    throw httpError(502, payload?.error?.message || "Gemini could not grade the submission.");
  }

  throw httpError(502, "Gemini could not grade the submission.");
}

function parseGeminiJson(payload: unknown): GeminiGradeResponse {
  const text = getCandidateText(payload);
  if (!text) throw new Error("Gemini returned an empty grading response.");
  const parsed = JSON.parse(text) as GeminiGradeResponse;
  if (!Number.isFinite(Number(parsed.suggestedScore))) {
    throw new Error("Gemini returned incomplete grading data.");
  }
  return parsed;
}

function getCandidateText(payload: unknown) {
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates;
  return candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("")
    .trim() || "";
}

async function loadFileParts(
  files: Array<{ file: StoredFile; label: string; captureText?: boolean }>,
  submissionTextSources: SubmissionTextSource[]
) {
  const parts: Array<Record<string, unknown>> = [];
  let totalBytes = 0;
  let totalChars = 0;

  for (const item of files.slice(0, MAX_FILES)) {
    const loaded = await loadStoredFile(item.file);
    totalBytes += loaded.bytes.byteLength;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw httpError(400, "The grading files exceed the 14 MB combined limit.");
    }

    const mimeType = inferMimeType(item.file.name, item.file.type || loaded.contentType);
    if (mimeType.startsWith("text/") || textMimeTypes.has(mimeType)) {
      const remaining = MAX_EXTRACTED_CHARS - totalChars;
      const text = new TextDecoder().decode(loaded.bytes).trim().slice(0, remaining);
      totalChars += text.length;
      if (item.captureText && text) {
        submissionTextSources.push({ fileName: item.file.name, text });
      }
      parts.push({ text: `${item.label}: ${item.file.name}\n${text || "[No readable text found]"}` });
      continue;
    }

    if (mimeType === docxMimeType) {
      const remaining = MAX_EXTRACTED_CHARS - totalChars;
      const extracted = await mammoth.extractRawText({ buffer: Buffer.from(loaded.bytes) });
      const text = extracted.value.trim().slice(0, remaining);
      totalChars += text.length;
      if (item.captureText && text) {
        submissionTextSources.push({ fileName: item.file.name, text });
      }
      parts.push({ text: `${item.label}: ${item.file.name}\n${text || "[No readable text found]"}` });
      continue;
    }

    if (supportedInlineMimeTypes.has(mimeType)) {
      parts.push({ text: `${item.label}: ${item.file.name}` });
      parts.push({
        inlineData: {
          mimeType,
          data: Buffer.from(loaded.bytes).toString("base64")
        }
      });
      continue;
    }

    throw httpError(400, `"${item.file.name}" is not a supported AI grading file type on Azure yet.`);
  }

  return parts;
}

async function loadStoredFile(file: StoredFile) {
  if (/^https?:\/\//i.test(file.path)) {
    const response = await fetch(file.path);
    if (!response.ok) throw httpError(400, `Could not download "${file.name}".`);
    const contentLength = Number(response.headers.get("content-length") || file.size || 0);
    if (contentLength > MAX_FILE_BYTES) {
      throw httpError(400, `"${file.name}" is larger than the 8 MB AI grading limit.`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_FILE_BYTES) {
      throw httpError(400, `"${file.name}" is larger than the 8 MB AI grading limit.`);
    }
    return {
      bytes,
      contentType: response.headers.get("content-type") || ""
    };
  }

  const config = getConfig();
  const credential = new StorageSharedKeyCredential(
    config.azureStorageAccountName,
    config.azureStorageAccountKey
  );
  const blobService = new BlobServiceClient(
    `https://${config.azureStorageAccountName}.blob.core.windows.net`,
    credential
  );
  const blob = blobService
    .getContainerClient(file.bucket || config.azureStorageContainer)
    .getBlockBlobClient(file.path.replace(/^\/+/, ""));
  const properties = await blob.getProperties();
  if ((properties.contentLength || 0) > MAX_FILE_BYTES) {
    throw httpError(400, `"${file.name}" is larger than the 8 MB AI grading limit.`);
  }
  const buffer = await blob.downloadToBuffer();
  return {
    bytes: new Uint8Array(buffer),
    contentType: properties.contentType || ""
  };
}

function parseGuideResource(value: unknown) {
  const guide = cleanText(value, "", 50000);
  if (!guide) return { text: "", files: [] as StoredFile[] };

  try {
    const parsed = JSON.parse(guide);
    if (Array.isArray(parsed)) {
      return { text: "", files: normalizeFiles(parsed) };
    }
  } catch {
    // Plain text guide.
  }

  return { text: guide, files: [] as StoredFile[] };
}

function normalizeFiles(value: unknown): StoredFile[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((file) => {
      const record = asRecord(file);
      return {
        bucket: cleanText(record.bucket, "", 120) || undefined,
        name: cleanText(record.name, "Attached file", 240),
        path: cleanText(record.path || record.url, "", 1800),
        type: cleanText(record.type, "", 160),
        size: Number(record.size) || undefined
      };
    })
    .filter(file => file.path)
    .slice(0, MAX_FILES);
}

function normalizeCriteria(criteria: GeminiGradeResponse["criteria"], maxScore: number) {
  if (!Array.isArray(criteria)) return [];
  return criteria.slice(0, 20).map((criterion) => {
    const criterionMax = cleanNumber(criterion?.maxScore, 0, maxScore);
    return {
      name: cleanText(criterion?.name, "Criterion", 160),
      score: cleanNumber(criterion?.score, 0, criterionMax),
      maxScore: criterionMax,
      reason: cleanText(criterion?.reason, "", 360)
    };
  });
}

function normalizeAnnotations(annotations: GeminiAnnotation[] | undefined) {
  if (!Array.isArray(annotations)) return [];
  return annotations
    .slice(0, MAX_SENTENCE_ANNOTATIONS)
    .map((annotation) => {
      const rawStatus = String(annotation?.status);
      const status = ["correct", "incorrect", "uncertain"].includes(rawStatus)
        ? rawStatus
        : "uncertain";
      const page = Number(annotation?.page);
      return {
        fileName: cleanText(annotation?.fileName, "Submission text", 260),
        page: Number.isInteger(page) && page > 0 ? page : null,
        status,
        excerpt: cleanText(annotation?.excerpt, "", 900),
        comment: cleanText(annotation?.comment, "", 500)
      };
    })
    .filter(annotation => annotation.excerpt);
}

function normalizeWarnings(warnings: unknown[] | undefined) {
  if (!Array.isArray(warnings)) return [];
  return warnings
    .slice(0, 4)
    .map(warning => cleanText(warning, "", 240))
    .filter(Boolean);
}

function expandAnnotationsToSubmissionSentences(
  annotations: ReturnType<typeof normalizeAnnotations>,
  textSources: SubmissionTextSource[]
) {
  const existing = new Set(annotations.map(annotation => annotation.excerpt.toLowerCase()));
  const expanded = [...annotations];

  for (const source of textSources) {
    for (const sentence of splitSentences(source.text)) {
      if (expanded.length >= MAX_SENTENCE_ANNOTATIONS) return expanded;
      const key = sentence.toLowerCase();
      if (existing.has(key)) continue;
      existing.add(key);
      expanded.push({
        fileName: source.fileName,
        page: null,
        status: "uncertain",
        excerpt: sentence,
        comment: "Reviewed by AI."
      });
    }
  }

  return expanded;
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。！？])\s+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0 && sentence.length <= 900)
    .slice(0, MAX_SENTENCE_ANNOTATIONS);
}

function inferMimeType(name: string, configuredType = "") {
  const normalized = configuredType.split(";")[0].trim().toLowerCase();
  if (normalized && normalized !== "application/octet-stream") return normalized;
  const extension = name.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    csv: "text/csv",
    html: "text/html",
    htm: "text/html",
    json: "application/json",
    md: "text/markdown",
    pdf: "application/pdf",
    txt: "text/plain",
    xml: "application/xml",
    docx: docxMimeType,
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp"
  };
  return mimeTypes[extension || ""] || "application/octet-stream";
}

function cleanText(value: unknown, fallback = "", maxLength = 1000) {
  return String(value ?? fallback).trim().slice(0, maxLength);
}

function cleanNumber(value: unknown, minimum: number, maximum: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;
  return Math.min(maximum, Math.max(minimum, numeric));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function httpError(status: number, message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}
