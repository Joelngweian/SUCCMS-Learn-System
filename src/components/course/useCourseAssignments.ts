import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { supabase } from "@/lib/supabase";
import { confirmAction } from "@/lib/confirm";
import { notify } from "@/lib/notify";
import {
  ASSIGNMENT_SUBMISSIONS_BUCKET,
  removeSubmissionFiles,
} from "@/lib/submissionStorage";
import {
  getAssignmentMaxScore,
  normalizeCourseAssignment,
  normalizeCourseSubmission,
  type AiGradeDetails,
  type CourseAssignment,
  type CourseResourceFile,
  type CourseSubmission,
  type SubmissionFile,
} from "./coursePageTypes";
import {
  getCourseContentStoragePath,
  getErrorMessage,
  removeCourseContentPaths,
} from "./courseStorage";
import {
  getBroadcastNewRecord,
  subscribeToPrivateBroadcast,
} from "@/lib/realtime";

type AiGradeResponse = {
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
};

type AiGradeRequestResponse = {
  error?: string;
  jobId?: string;
  status?: "queued" | "processing" | "completed" | "failed";
};

const AI_GRADING_POLL_TIMEOUT_MS = 10 * 60 * 1000;
const AI_GRADING_WORKER_RETRY_MS = 60 * 1000;
const AI_GRADING_FALLBACK_POLL_MS = 20 * 1000;
const COURSE_CONTENT_BUCKET = "course_content";
const MAX_ASSIGNMENT_FILE_SIZE = 8 * 1024 * 1024;

type AiGradingJobBroadcastRow = {
  id: string;
  status?: AiGradeRequestResponse["status"];
};

const getFunctionErrorMessage = async (
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

const emptyAssignmentDraft = {
  title: "",
  description: "",
  rubric: "",
  points: "",
  due_date: "",
};

const ASSIGNMENT_SELECT =
  "id, course_id, title, description, created_by, due_date, max_score, created_at, updated_at, attachments, rubric";

const SUBMISSION_SELECT =
  "id, assignment_id, student_id, submission_file_url, submission_text, submitted_at, is_late, grade, feedback, files";

export function useCourseAssignments({
  courseId,
  isLecturer,
  userId,
}: {
  courseId: string;
  isLecturer: boolean;
  userId?: string | null;
}) {
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [mySubmissions, setMySubmissions] = useState<CourseSubmission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<CourseSubmission[]>([]);
  const [selectedAssignment, setSelectedAssignment] =
    useState<CourseAssignment | null>(null);
  const [submissionFiles, setSubmissionFiles] = useState<SubmissionFile[]>([]);
  const [gradingStudentId, setGradingStudentId] = useState<string | null>(null);
  const [currentGrade, setCurrentGrade] = useState("");
  const [currentFeedback, setCurrentFeedback] = useState("");
  const [isAssignmentUploading, setIsAssignmentUploading] = useState(false);
  const [isAiGrading, setIsAiGrading] = useState(false);
  const [aiGradingError, setAiGradingError] = useState("");
  const [aiGradeDetails, setAiGradeDetails] =
    useState<AiGradeDetails | null>(null);
  const [showNewAssignmentDialog, setShowNewAssignmentDialog] = useState(false);
  const [newAssign, setNewAssign] = useState(emptyAssignmentDraft);
  const [newAssignFiles, setNewAssignFiles] = useState<CourseResourceFile[]>([]);
  const [newRubricFiles, setNewRubricFiles] = useState<CourseResourceFile[]>([]);
  const assignmentDraftPathsRef = useRef(new Set<string>());

  const fetchAssignments = useCallback(async () => {
    const { data, error } = await supabase
      .from("assignments")
      .select(ASSIGNMENT_SELECT)
      .eq("course_id", courseId)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Failed to load assignments:", error);
      return;
    }
    setAssignments((data || []).map(normalizeCourseAssignment));

    if (!isLecturer && userId) {
      const { data: submissions, error: submissionError } = await supabase
        .from("assignment_submissions")
        .select(SUBMISSION_SELECT)
        .eq("student_id", userId);
      if (submissionError) {
        console.error("Failed to load submissions:", submissionError);
        return;
      }
      setMySubmissions((submissions || []).map(normalizeCourseSubmission));
    }
  }, [courseId, isLecturer, userId]);

  const fetchSubmissionsForAssignment = useCallback(
    async (assignmentId: string) => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select(SUBMISSION_SELECT)
        .eq("assignment_id", assignmentId);
      if (error) {
        console.error("Failed to load assignment submissions:", error);
        return;
      }
      setAllSubmissions((data || []).map(normalizeCourseSubmission));
    },
    [],
  );

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    if (!selectedAssignment) return;

    if (isLecturer) {
      void fetchSubmissionsForAssignment(selectedAssignment.id);
      setGradingStudentId(null);
      return;
    }
    if (!userId) return;

    let active = true;
    void supabase
      .from("assignment_submissions")
      .select(SUBMISSION_SELECT)
      .eq("assignment_id", selectedAssignment.id)
      .eq("student_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        const submission = normalizeCourseSubmission(data);
        setMySubmissions(current => [
          ...current.filter(
            item => item.assignment_id !== selectedAssignment.id,
          ),
          submission,
        ]);
        setSubmissionFiles(submission.files || []);
      });

    return () => {
      active = false;
    };
  }, [
    fetchSubmissionsForAssignment,
    isLecturer,
    selectedAssignment,
    userId,
  ]);

  useEffect(() => {
    if (!gradingStudentId) return;
    const submission = allSubmissions.find(
      item => item.student_id === gradingStudentId,
    );
    setCurrentGrade(
      submission?.grade != null ? String(submission.grade) : "",
    );
    setCurrentFeedback(submission?.feedback || "");
    setAiGradingError("");
    setAiGradeDetails(null);
  }, [allSubmissions, gradingStudentId]);

  const selectAssignment = useCallback(
    (
      assignment: CourseAssignment,
      files: SubmissionFile[] = [],
    ) => {
      setSelectedAssignment(assignment);
      setSubmissionFiles(files);
    },
    [],
  );

  const createAssignment = async () => {
    if (!newAssign.title || !newAssign.due_date || !userId) return;

    const { error } = await supabase.from("assignments").insert({
      course_id: courseId,
      title: newAssign.title,
      description: newAssign.description,
      rubric:
        newRubricFiles.length > 0 ? JSON.stringify(newRubricFiles) : null,
      max_score: newAssign.points ? parseInt(newAssign.points, 10) : null,
      due_date: new Date(newAssign.due_date).toISOString(),
      attachments: newAssignFiles,
      created_by: userId,
    });

    if (error) {
      console.error("Error creating assignment:", error);
      notify.error(error, "Failed to create assignment.");
      return;
    }

    assignmentDraftPathsRef.current.clear();
    setShowNewAssignmentDialog(false);
    setNewAssign(emptyAssignmentDraft);
    setNewAssignFiles([]);
    setNewRubricFiles([]);
    await fetchAssignments();
  };

  const setAssignmentDialogOpen = (open: boolean) => {
    if (!open && isAssignmentUploading) return;

    setShowNewAssignmentDialog(open);
    if (open) return;

    const abandonedPaths = [...assignmentDraftPathsRef.current];
    assignmentDraftPathsRef.current.clear();
    setNewAssign(emptyAssignmentDraft);
    setNewAssignFiles([]);
    setNewRubricFiles([]);

    if (abandonedPaths.length > 0) {
      void removeCourseContentPaths(abandonedPaths).then(error => {
        if (!error) return;
        abandonedPaths.forEach(path => assignmentDraftPathsRef.current.add(path));
        console.warn("Failed to remove abandoned assignment files:", error);
      });
    }
  };

  useEffect(() => {
    const draftPaths = assignmentDraftPathsRef.current;
    return () => {
      const abandonedPaths = [...draftPaths];
      draftPaths.clear();
      if (abandonedPaths.length > 0) {
        void removeCourseContentPaths(abandonedPaths);
      }
    };
  }, [courseId]);

  const deleteAssignment = async (assignmentId: string) => {
    if (
      !(await confirmAction({
        title: "Delete assignment?",
        description:
          "This assignment and its student submissions will be permanently deleted.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) return;
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId);
    if (error) {
      notify.error(error, "Failed to delete assignment.");
      return;
    }
    await fetchAssignments();
  };

  const turnIn = async () => {
    if (!selectedAssignment || !userId) return;

    const submissionData = {
      assignment_id: selectedAssignment.id,
      student_id: userId,
      files: submissionFiles,
      submitted_at: new Date().toISOString(),
    };
    const existing = mySubmissions.find(
      item => item.assignment_id === selectedAssignment.id,
    );
    const result = existing
      ? await supabase
          .from("assignment_submissions")
          .update(submissionData)
          .eq("id", existing.id)
      : await supabase.from("assignment_submissions").insert(submissionData);

    if (result.error) {
      notify.error(result.error, "Failed to turn in assignment.");
      return;
    }

    setMySubmissions(current => [
      ...current.filter(
        item => item.assignment_id !== selectedAssignment.id,
      ),
      {
        ...submissionData,
        id: existing?.id || "temp-id",
        submission_file_url: null,
        submission_text: null,
        is_late: null,
        grade: null,
        feedback: null,
      },
    ]);
  };

  const undoTurnIn = async () => {
    if (!selectedAssignment || !userId) return;
    const existingSubmission = mySubmissions.find(
      item =>
        item.assignment_id === selectedAssignment.id
        && item.student_id === userId,
    );
    const { error } = await supabase
      .from("assignment_submissions")
      .delete()
      .eq("assignment_id", selectedAssignment.id)
      .eq("student_id", userId);

    if (error) {
      notify.error(error, "Failed to undo submission.");
      return;
    }
    try {
      await removeSubmissionFiles(existingSubmission?.files);
    } catch (cleanupError) {
      console.warn("Submission deleted but file cleanup failed:", cleanupError);
    }
    setMySubmissions(current =>
      current.filter(
        item => item.assignment_id !== selectedAssignment.id,
      ),
    );
    setSubmissionFiles([]);
  };

  const saveGrade = async () => {
    if (!gradingStudentId || !selectedAssignment) return;
    const maxScore = getAssignmentMaxScore(selectedAssignment);
    const numericGrade = Number(currentGrade);

    if (
      !Number.isFinite(numericGrade) ||
      numericGrade < 0 ||
      numericGrade > maxScore
    ) {
      notify.warning(`Enter a grade between 0 and ${maxScore}.`);
      return;
    }

    const existingSubmission = allSubmissions.find(
      item => item.student_id === gradingStudentId,
    );
    const gradeData = {
      grade: Math.round(numericGrade),
      feedback: currentFeedback,
    };
    const result = existingSubmission
      ? await supabase
          .from("assignment_submissions")
          .update(gradeData)
          .eq("id", existingSubmission.id)
      : await supabase.from("assignment_submissions").insert({
          assignment_id: selectedAssignment.id,
          student_id: gradingStudentId,
          ...gradeData,
          submitted_at: new Date().toISOString(),
        });

    if (result.error) {
      notify.error(result.error, "Failed to save grade.");
      return;
    }

    notify.success("Grade saved.");
    await fetchSubmissionsForAssignment(selectedAssignment.id);
  };

  const aiAutoGrade = async () => {
    if (!selectedAssignment || !gradingStudentId || !userId) return;
    const submission = allSubmissions.find(
      item => item.student_id === gradingStudentId,
    );
    if (!submission) {
      notify.warning("This student has not submitted the assignment yet.");
      return;
    }
    if (!selectedAssignment.rubric) {
      notify.warning("Add a grading rubric before using AI grading.");
      return;
    }

    setAiGradingError("");
    setAiGradeDetails(null);
    setIsAiGrading(true);
    try {
      const { data: requestData, error: requestError } =
        await supabase.functions.invoke<AiGradeRequestResponse>(
          "ai-grading-request",
          {
            body: {
              assignmentId: selectedAssignment.id,
              studentId: gradingStudentId,
            },
          },
        );

      if (requestError) {
        throw new Error(
          await getFunctionErrorMessage(
            requestError,
            "The AI grading service could not be reached.",
          ),
        );
      }
      if (requestData?.error) throw new Error(requestData.error);
      if (!requestData?.jobId) {
        throw new Error("The AI grading service did not return a job ID.");
      }

      notify.info("AI grading started. You can continue using the course page.");

      let data: AiGradeResponse | null = null;
      const pollingStartedAt = Date.now();
      let nextWorkerRetryAt = pollingStartedAt + AI_GRADING_WORKER_RETRY_MS;
      let signalPending = false;
      let signalResolver: (() => void) | null = null;
      let signalTimer: number | null = null;
      const signalJobCheck = () => {
        if (signalResolver) {
          signalResolver();
          return;
        }
        signalPending = true;
      };
      const waitForRealtimeOrFallback = (milliseconds: number) => {
        if (signalPending) {
          signalPending = false;
          return Promise.resolve();
        }

        return new Promise<void>(resolve => {
          const finish = () => {
            if (signalTimer !== null) window.clearTimeout(signalTimer);
            signalTimer = null;
            signalResolver = null;
            signalPending = false;
            resolve();
          };
          signalResolver = finish;
          signalTimer = window.setTimeout(finish, milliseconds);
        });
      };
      const stopAiGradingBroadcast = subscribeToPrivateBroadcast({
        topic: `user:${userId}:ai-grading`,
        onMessage: message => {
          const row = getBroadcastNewRecord<AiGradingJobBroadcastRow>(message);
          if (row?.id === requestData.jobId) signalJobCheck();
        },
      });

      try {
        while (Date.now() - pollingStartedAt < AI_GRADING_POLL_TIMEOUT_MS) {
          const { data: job, error: jobError } = await supabase
            .from("ai_grading_jobs")
            .select("status, result, error_message")
            .eq("id", requestData.jobId)
            .maybeSingle();

          if (jobError) throw jobError;

          if (job?.status === "completed") {
            data = job.result as unknown as AiGradeResponse;
            break;
          }

          if (job?.status === "failed") {
            throw new Error(
              job.error_message || "AI grading failed. Please try again.",
            );
          }

          // Re-kick the pull-based worker at most once per minute. The queue's
          // visibility timeout prevents another worker from grading the same
          // message while an active worker still owns it.
          const now = Date.now();
          if (now >= nextWorkerRetryAt) {
            void supabase.functions.invoke<AiGradeRequestResponse>(
              "ai-grading-request",
              {
                body: {
                  assignmentId: selectedAssignment.id,
                  studentId: gradingStudentId,
                },
              },
            );
            nextWorkerRetryAt = now + AI_GRADING_WORKER_RETRY_MS;
          }

          const elapsedMs = Date.now() - pollingStartedAt;
          const remainingMs = AI_GRADING_POLL_TIMEOUT_MS - elapsedMs;
          if (remainingMs <= 0) break;
          const fallbackDelay = document.visibilityState === "hidden"
            ? 30000
            : AI_GRADING_FALLBACK_POLL_MS;
          await waitForRealtimeOrFallback(
            Math.min(fallbackDelay, remainingMs),
          );
        }
      } finally {
        stopAiGradingBroadcast();
        if (signalTimer !== null) window.clearTimeout(signalTimer);
        signalResolver = null;
      }

      if (!data) {
        throw new Error(
          "AI grading is still queued after 10 minutes. Please try again later.",
        );
      }

      const maxScore = getAssignmentMaxScore(selectedAssignment);
      const suggestedScore = Number(data?.suggestedScore);
      if (!Number.isFinite(suggestedScore)) {
        throw new Error("The AI grading service returned an invalid score.");
      }

      const criteria = Array.isArray(data?.criteria)
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
      const confidence = Number(data?.confidence);

      setCurrentGrade(
        Math.min(
          maxScore,
          Math.max(0, Math.round(suggestedScore)),
        ).toString(),
      );
      setCurrentFeedback(
        data?.feedback || "No written feedback was generated.",
      );
      setAiGradeDetails({
        confidence: Number.isFinite(confidence)
          ? Math.round(confidence)
          : null,
        criteria,
        warnings: Array.isArray(data?.warnings)
          ? data.warnings.filter(Boolean).map(String)
          : [],
      });
    } catch (error) {
      const message = getErrorMessage(
        error,
        "AI grading failed. Please try again.",
      );
      setAiGradingError(
        message.toLowerCase().includes("high demand")
          ? "Gemini is currently busy. No grade was changed. Please try again in a moment."
          : message,
      );
    } finally {
      setIsAiGrading(false);
    }
  };

  const uploadFiles = async (
    event: ChangeEvent<HTMLInputElement>,
    bucket: string,
    getFilePath: (file: File) => string,
  ): Promise<CourseResourceFile[]> => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return [];
    if (files.some(file => file.size > MAX_ASSIGNMENT_FILE_SIZE)) {
      notify.error("Each assignment file must be 8 MB or smaller.");
      return [];
    }

    setIsAssignmentUploading(true);
    const uploadedFiles: CourseResourceFile[] = [];
    const uploadedPaths: string[] = [];

    try {
      for (const file of files) {
        const filePath = getFilePath(file);
        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);
        if (error) throw error;

        uploadedPaths.push(filePath);
        uploadedFiles.push({
          bucket,
          name: file.name,
          path: filePath,
          size: file.size,
          type: file.type,
        });
      }
      return uploadedFiles;
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(bucket).remove(uploadedPaths);
      }
      notify.error(error, "Failed to upload file.");
      return [];
    } finally {
      setIsAssignmentUploading(false);
    }
  };

  const uploadAssignmentResourceFiles = async (
    event: ChangeEvent<HTMLInputElement>,
    setList: Dispatch<SetStateAction<CourseResourceFile[]>>,
  ) => {
    if (!userId) {
      event.target.value = "";
      notify.error("Please sign in before uploading assignment files.");
      return;
    }

    const uploadedFiles = await uploadFiles(
      event,
      COURSE_CONTENT_BUCKET,
      file => {
        const safeName = file.name.replace(/[^\w.-]+/g, "_");
        return courseId + "/assignments/drafts/" + userId + "/"
          + crypto.randomUUID() + "_" + safeName;
      },
    );
    uploadedFiles.forEach(file => assignmentDraftPathsRef.current.add(
      getCourseContentStoragePath(file) || file.path,
    ));
    if (uploadedFiles.length > 0) {
      setList(current => [...current, ...uploadedFiles]);
    }
  };

  const uploadSubmissionFiles = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (!selectedAssignment || !userId) {
      event.target.value = "";
      notify.error("Select an assignment before uploading a submission.");
      return;
    }

    const uploadedFiles = await uploadFiles(
      event,
      ASSIGNMENT_SUBMISSIONS_BUCKET,
      file => {
        const safeName = file.name.replace(/[^\w.-]+/g, "_");
        return userId + "/" + selectedAssignment.id + "/"
          + crypto.randomUUID() + "_" + safeName;
      },
    );
    if (uploadedFiles.length > 0) {
      setSubmissionFiles(current => [...current, ...uploadedFiles]);
    }
  };

  return {
    aiAutoGrade,
    aiGradeDetails,
    aiGradingError,
    allSubmissions,
    assignments,
    createAssignment,
    currentFeedback,
    currentGrade,
    deleteAssignment,
    gradingStudentId,
    isAiGrading,
    isAssignmentUploading,
    mySubmissions,
    newAssign,
    newAssignFiles,
    newRubricFiles,
    saveGrade,
    selectAssignment,
    selectedAssignment,
    setCurrentFeedback,
    setCurrentGrade,
    setGradingStudentId,
    setNewAssign,
    setNewAssignFiles,
    setNewRubricFiles,
    setSelectedAssignment,
    setShowNewAssignmentDialog: setAssignmentDialogOpen,
    setSubmissionFiles,
    showNewAssignmentDialog,
    submissionFiles,
    turnIn,
    undoTurnIn,
    uploadAssignmentResourceFiles,
    uploadSubmissionFiles,
  };
}
