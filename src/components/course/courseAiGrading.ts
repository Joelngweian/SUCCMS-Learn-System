import {
  type AiGradeDetails,
  type AiGradingAnnotation,
  type RubricGradeItem,
} from "./coursePageTypes";
import { getErrorMessage } from "./courseStorage";

export type AiGradeResponse = {
  error?: string;
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
  annotations?: Array<{
    fileName?: string;
    page?: number | null;
    status?: string;
    excerpt?: string;
    comment?: string;
  }>;
};

export type AiGradeRequestResponse = {
  error?: string;
  jobId?: string;
  status?: "queued" | "processing" | "completed" | "failed";
};

export type AiGradingJobBroadcastRow = {
  id: string;
  status?: AiGradeRequestResponse["status"];
};

export const AI_GRADING_POLL_TIMEOUT_MS = 10 * 60 * 1000;
export const AI_GRADING_WORKER_RETRY_MS = 60 * 1000;
export const AI_GRADING_FALLBACK_POLL_MS = 20 * 1000;

export const clampWholeScore = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Math.round(value)));

export const normalizeAiGradeDetails = (
  data: AiGradeResponse | null | undefined,
): AiGradeDetails | null => {
  if (!data) return null;

  const criteria = Array.isArray(data.criteria)
    ? data.criteria
        .filter(criterion => criterion?.name)
        .map(criterion => {
          const score = Number(criterion.score);
          const criterionMax = Number(criterion.maxScore);
          return {
            name: String(criterion.name),
            score: Number.isFinite(score) ? score : 0,
            maxScore: Number.isFinite(criterionMax) ? criterionMax : 0,
            reason: criterion.reason ? String(criterion.reason) : "",
          };
        })
    : [];
  const annotations: AiGradingAnnotation[] = Array.isArray(data.annotations)
    ? data.annotations
        .map(annotation => {
          const status = ["correct", "incorrect", "uncertain"].includes(
            annotation?.status || "",
          )
            ? annotation.status as AiGradingAnnotation["status"]
            : "uncertain";
          const page = Number(annotation?.page);
          return {
            fileName: String(annotation?.fileName || "Submission text"),
            page: Number.isInteger(page) && page > 0 ? page : null,
            status,
            excerpt: String(annotation?.excerpt || "").trim(),
            comment: String(annotation?.comment || "").trim(),
          };
        })
        .filter(annotation => annotation.excerpt)
    : [];
  const confidence = Number(data.confidence);

  return {
    confidence: Number.isFinite(confidence) ? Math.round(confidence) : null,
    criteria,
    warnings: Array.isArray(data.warnings)
      ? data.warnings.filter(Boolean).map(String)
      : [],
    annotations,
  };
};

export const getFunctionErrorMessage = async (
  error: unknown,
  fallback: string,
) => {
  try {
    const response =
      error && typeof error === "object" && "context" in error
        ? (error as { context?: { clone?: () => Response } }).context
        : undefined;
    if (response && typeof response.clone === "function") {
      const payload: unknown = await response.clone().json();
      if (
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof payload.error === "string" &&
        payload.error.trim()
      ) {
        return payload.error;
      }
    }
  } catch {
    // Use the invoke error when the response body is unavailable.
  }

  return getErrorMessage(error, fallback);
};

export const createRubricGrades = (
  details: AiGradeDetails | null,
  assignmentMaxScore: number,
): RubricGradeItem[] => {
  if (!details?.criteria.length) return [];

  const rawTotal = details.criteria.reduce(
    (total, criterion) => total + Math.max(0, Number(criterion.maxScore) || 0),
    0,
  );
  let allocatedMax = 0;

  return details.criteria.map((criterion, index) => {
    const rawMax = Math.max(0, Number(criterion.maxScore) || 0);
    const isLast = index === details.criteria.length - 1;
    const maxScore = rawTotal > 0
      ? isLast
        ? Math.max(0, assignmentMaxScore - allocatedMax)
        : clampWholeScore(
            rawMax / rawTotal * assignmentMaxScore,
            0,
            assignmentMaxScore - allocatedMax,
          )
      : 0;
    allocatedMax += maxScore;
    const rawScore = Math.max(0, Number(criterion.score) || 0);
    const aiScore = rawMax > 0
      ? clampWholeScore(rawScore / rawMax * maxScore, 0, maxScore)
      : 0;

    return {
      name: criterion.name,
      aiScore,
      adjustment: 0,
      finalScore: aiScore,
      maxScore,
      reason: criterion.reason,
    };
  });
};

export const getRubricGradeTotal = (items: RubricGradeItem[]) =>
  items.reduce((total, item) => total + item.finalScore, 0);
