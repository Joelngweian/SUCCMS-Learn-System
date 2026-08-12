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
import { azureApiFetch, isAzureAuthEnabled } from "@/lib/azureApi";
import { uploadFileToAzureBlob } from "@/lib/azureStorage";
import {
  ASSIGNMENT_SUBMISSIONS_BUCKET,
  removeSubmissionFiles,
} from "@/lib/submissionStorage";
import {
  getAssignmentMaxScore,
  getRubricGradeItems,
  normalizeCourseAssignment,
  normalizeCourseSubmission,
  type AiGradeDetails,
  type CourseAssignment,
  type CourseResourceFile,
  type CourseSubmission,
  type RubricGradeItem,
  type SubmissionFile,
} from "./coursePageTypes";
import {
  getCourseContentStoragePath,
  getErrorMessage,
  removeCourseContentPaths,
} from "./courseStorage";
import {
  AI_GRADING_FALLBACK_POLL_MS,
  AI_GRADING_POLL_TIMEOUT_MS,
  AI_GRADING_WORKER_RETRY_MS,
  clampWholeScore,
  createRubricGrades,
  getAzureAiGradingJob,
  getFunctionErrorMessage,
  getRubricGradeTotal,
  normalizeAiGradeDetails,
  requestAzureAiGrading,
  shouldUseAzureAiGrading,
  type AiGradeRequestResponse,
  type AiGradeResponse,
  type AiGradingJobBroadcastRow,
} from "./courseAiGrading";
import {
  getBroadcastNewRecord,
  subscribeToPrivateBroadcast,
} from "@/lib/realtime";
import {
  ASSESSMENT_RESOURCE_BLOCKED_EXTENSIONS,
  SUBMISSION_FILE_BLOCKED_EXTENSIONS,
  describeBlockedExtensions,
  getBlockedFileNames,
} from "./courseUploadFormats";
import type { AssessmentDraft } from "@/lib/assessmentTypes";
import { usesAiMarkingGuideFile } from "@/lib/assessmentTypes";
import type { Database, Json } from "@/lib/database.types";

const COURSE_CONTENT_BUCKET = "course_content";
const MAX_ASSIGNMENT_FILE_SIZE = 8 * 1024 * 1024;
type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];
type SubmissionRow = Database["public"]["Tables"]["assignment_submissions"]["Row"];

const emptyAssignmentDraft: AssessmentDraft = {
  assessment_type: "",
  title: "",
  description: "",
  rubric: "",
  marking_guide: "",
  points: "",
  due_date: "",
};

const ASSIGNMENT_SELECT =
  "id, course_id, assessment_type, title, description, created_by, due_date, max_score, created_at, updated_at, attachments, rubric";

const SUBMISSION_SELECT =
  "id, assignment_id, student_id, submission_file_url, submission_text, submitted_at, is_late, grade, feedback, files, rubric_grades";

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
  const [rubricGrades, setRubricGrades] = useState<RubricGradeItem[]>([]);
  const [showNewAssignmentDialog, setShowNewAssignmentDialog] = useState(false);
  const [newAssign, setNewAssign] = useState(emptyAssignmentDraft);
  const [newAssignFiles, setNewAssignFiles] = useState<CourseResourceFile[]>([]);
  const [newRubricFiles, setNewRubricFiles] = useState<CourseResourceFile[]>([]);
  const [newMarkingGuideFiles, setNewMarkingGuideFiles] = useState<
    CourseResourceFile[]
  >([]);
  const assignmentDraftPathsRef = useRef(new Set<string>());

  const loadAzureCourseSubmissions = useCallback(async () => {
    const data = await azureApiFetch<SubmissionRow[]>(
      `/api/course/${courseId}/submissions`,
    );
    return data.map(normalizeCourseSubmission);
  }, [courseId]);

  const fetchAssignments = useCallback(async () => {
    if (isAzureAuthEnabled()) {
      try {
        const [data, submissions] = await Promise.all([
          azureApiFetch<AssignmentRow[]>(
          `/api/course/${courseId}/assignments`,
          ),
          loadAzureCourseSubmissions(),
        ]);
        setAssignments(data.map(normalizeCourseAssignment));
        if (isLecturer) {
          setAllSubmissions(submissions);
        } else {
          setMySubmissions(submissions);
        }
      } catch (error) {
        console.error("Failed to load assignments:", error);
        return;
      }
      return;
    }

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
  }, [courseId, isLecturer, loadAzureCourseSubmissions, userId]);

  const fetchSubmissionsForAssignment = useCallback(
    async (assignmentId: string) => {
      if (isAzureAuthEnabled()) {
        try {
          const submissions = await loadAzureCourseSubmissions();
          setAllSubmissions(
            submissions.filter(item => item.assignment_id === assignmentId),
          );
        } catch (error) {
          console.error("Failed to load assignment submissions:", error);
        }
        return;
      }

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
    [loadAzureCourseSubmissions],
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

    if (isAzureAuthEnabled()) {
      const submission = mySubmissions.find(
        item => item.assignment_id === selectedAssignment.id,
      );
      if (submission) {
        setSubmissionFiles(submission.files || []);
      }
      return;
    }

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
    mySubmissions,
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
    const savedRubricGrades = getRubricGradeItems(
      submission?.rubric_grades,
    );
    setRubricGrades(savedRubricGrades);
    if (submission?.grade == null && savedRubricGrades.length > 0) {
      setCurrentGrade(String(getRubricGradeTotal(savedRubricGrades)));
    }

    if (!selectedAssignment) return;
    if (isAzureAuthEnabled()) return;

    let active = true;
    void supabase
      .from("ai_grading_jobs")
      .select("result")
      .eq("assignment_id", selectedAssignment.id)
      .eq("student_id", gradingStudentId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error || !data?.result) return;
        const result = data.result as unknown as AiGradeResponse;
        const normalizedDetails = normalizeAiGradeDetails(result);
        setAiGradeDetails(normalizedDetails);

        if (submission?.grade == null) {
          const maxScore = getAssignmentMaxScore(selectedAssignment);
          const generatedRubricGrades = createRubricGrades(
            normalizedDetails,
            maxScore,
          );
          if (savedRubricGrades.length === 0) {
            setRubricGrades(generatedRubricGrades);
          }
          const suggestedScore = generatedRubricGrades.length > 0
            ? getRubricGradeTotal(generatedRubricGrades)
            : Number(result.suggestedScore);
          if (Number.isFinite(suggestedScore)) {
            setCurrentGrade(
              Math.min(
                maxScore,
                Math.max(0, Math.round(suggestedScore)),
              ).toString(),
            );
          }
          setCurrentFeedback(
            result.feedback || "No written feedback was generated.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [allSubmissions, gradingStudentId, selectedAssignment]);

  useEffect(() => {
    if (rubricGrades.length === 0) return;
    setCurrentGrade(String(getRubricGradeTotal(rubricGrades)));
  }, [rubricGrades]);

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
    if (
      !newAssign.assessment_type
      || !newAssign.title.trim()
      || !newAssign.due_date
      || !userId
    ) return;

    const usesMarkingGuide = usesAiMarkingGuideFile(newAssign.assessment_type);
    const rubricFiles = usesMarkingGuide ? [] : newRubricFiles;
    const markingGuideFiles = usesMarkingGuide ? newMarkingGuideFiles : [];
    const assignmentPayload = {
      course_id: courseId,
      assessment_type: newAssign.assessment_type,
      title: newAssign.title.trim(),
      description: newAssign.description,
      rubric: rubricFiles.length > 0 ? JSON.stringify(rubricFiles) : null,
      max_score: newAssign.points ? parseInt(newAssign.points, 10) : null,
      due_date: new Date(newAssign.due_date).toISOString(),
      attachments: newAssignFiles,
      created_by: userId,
    };
    const markingGuide = markingGuideFiles.length > 0
      ? JSON.stringify(markingGuideFiles)
      : newAssign.marking_guide.trim();

    if (isAzureAuthEnabled()) {
      try {
        await azureApiFetch<{ id: string }>("/api/course/assignments", {
          method: "POST",
          body: JSON.stringify({
            courseId: assignmentPayload.course_id,
            assessmentType: assignmentPayload.assessment_type,
            title: assignmentPayload.title,
            description: assignmentPayload.description,
            rubric: assignmentPayload.rubric,
            maxScore: assignmentPayload.max_score,
            dueDate: assignmentPayload.due_date,
            attachments: assignmentPayload.attachments,
            markingGuide,
          }),
        });
      } catch (error) {
        console.error("Error creating assignment:", error);
        notify.error(error, "Failed to create assessment.");
        return;
      }
    } else {
      const { data: createdAssignment, error } = await supabase
        .from("assignments")
        .insert(assignmentPayload)
        .select("id")
        .single();

      if (error) {
        console.error("Error creating assignment:", error);
        notify.error(error, "Failed to create assessment.");
        return;
      }

      if (markingGuide && createdAssignment?.id) {
        const { error: guideError } = await supabase
          .from("assignment_marking_guides")
          .upsert({
            assignment_id: createdAssignment.id,
            marking_guide: markingGuide,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          });

        if (guideError) {
          console.error("Error saving marking guide:", guideError);
          notify.error(guideError, "Assessment created, but marking guide was not saved.");
        }
      }
    }

    const keptFiles = [
      ...newAssignFiles,
      ...rubricFiles,
      ...markingGuideFiles,
    ];
    const keptPaths = new Set(
      keptFiles.map(file => getCourseContentStoragePath(file) || file.path),
    );
    const abandonedPaths = [...assignmentDraftPathsRef.current].filter(
      path => !keptPaths.has(path),
    );
    if (abandonedPaths.length > 0) {
      void removeCourseContentPaths(abandonedPaths);
    }

    assignmentDraftPathsRef.current.clear();
    setShowNewAssignmentDialog(false);
    setNewAssign(emptyAssignmentDraft);
    setNewAssignFiles([]);
    setNewRubricFiles([]);
    setNewMarkingGuideFiles([]);
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
    setNewMarkingGuideFiles([]);

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
        title: "Delete assessment?",
        description:
          "This assessment and its student submissions will be permanently deleted.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) return;
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId);
    if (error) {
      notify.error(error, "Failed to delete assessment.");
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
    if (isAzureAuthEnabled()) {
      try {
        const savedSubmission = await azureApiFetch<SubmissionRow>(
          `/api/assignments/${selectedAssignment.id}/submission`,
          {
            method: "POST",
            body: JSON.stringify({ files: submissionFiles }),
          },
        );
        const submission = normalizeCourseSubmission(savedSubmission);
        setMySubmissions(current => [
          ...current.filter(
            item => item.assignment_id !== selectedAssignment.id,
          ),
          submission,
        ]);
      } catch (error) {
        notify.error(error, "Failed to turn in assignment.");
      }
      return;
    }

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
        rubric_grades: [],
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
    if (isAzureAuthEnabled()) {
      try {
        await azureApiFetch<{ deleted: boolean }>(
          `/api/assignments/${selectedAssignment.id}/submission`,
          { method: "DELETE" },
        );
      } catch (error) {
        notify.error(error, "Failed to undo submission.");
        return;
      }
      setMySubmissions(current =>
        current.filter(
          item => item.assignment_id !== selectedAssignment.id,
        ),
      );
      setSubmissionFiles([]);
      return;
    }

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
    if (isAzureAuthEnabled()) {
      if (!existingSubmission) {
        notify.warning("This student has not submitted the assignment yet.");
        return;
      }

      try {
        await azureApiFetch<SubmissionRow>(
          `/api/assignment-submissions/${existingSubmission.id}/grade`,
          {
            method: "PATCH",
            body: JSON.stringify({
              grade: Math.round(numericGrade),
              feedback: currentFeedback,
              rubricGrades,
            }),
          },
        );
      } catch (error) {
        notify.error(error, "Failed to save grade.");
        return;
      }

      notify.success("Grade saved.");
      await fetchSubmissionsForAssignment(selectedAssignment.id);
      return;
    }

    const gradeData = {
      grade: Math.round(numericGrade),
      feedback: currentFeedback,
      rubric_grades: rubricGrades as unknown as Json,
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

    setAiGradingError("");
    setAiGradeDetails(null);
    setIsAiGrading(true);
    try {
      const useAzureAiGrading = shouldUseAzureAiGrading();
      let requestData: AiGradeRequestResponse | null = null;

      if (useAzureAiGrading) {
        requestData = await requestAzureAiGrading(
          selectedAssignment.id,
          gradingStudentId,
        );
      } else {
        const { data, error: requestError } =
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
        requestData = data;
      }
      if (requestData?.error) throw new Error(requestData.error);
      if (!requestData?.jobId) {
        throw new Error("The AI grading service did not return a job ID.");
      }
      if (requestData.status === "failed") {
        throw new Error(
          requestData.error_message || "AI grading failed. Please try again.",
        );
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
      const stopAiGradingBroadcast = useAzureAiGrading
        ? () => undefined
        : subscribeToPrivateBroadcast({
            topic: `user:${userId}:ai-grading`,
            onMessage: message => {
              const row = getBroadcastNewRecord<AiGradingJobBroadcastRow>(message);
              if (row?.id === requestData.jobId) signalJobCheck();
            },
          });

      try {
        while (Date.now() - pollingStartedAt < AI_GRADING_POLL_TIMEOUT_MS) {
          const job = useAzureAiGrading
            ? await getAzureAiGradingJob(requestData.jobId)
            : await supabase
                .from("ai_grading_jobs")
                .select("status, result, error_message")
                .eq("id", requestData.jobId)
                .maybeSingle()
                .then(({ data, error }) => {
                  if (error) throw error;
                  return data;
                });

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
            if (useAzureAiGrading) {
              void requestAzureAiGrading(selectedAssignment.id, gradingStudentId);
            } else {
              void supabase.functions.invoke<AiGradeRequestResponse>(
                "ai-grading-request",
                {
                  body: {
                    assignmentId: selectedAssignment.id,
                    studentId: gradingStudentId,
                  },
                },
              );
            }
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
      const normalizedDetails = normalizeAiGradeDetails(data);
      const generatedRubricGrades = createRubricGrades(
        normalizedDetails,
        maxScore,
      );
      const suggestedScore = generatedRubricGrades.length > 0
        ? getRubricGradeTotal(generatedRubricGrades)
        : Number(data?.suggestedScore);
      if (!Number.isFinite(suggestedScore)) {
        throw new Error("The AI grading service returned an invalid score.");
      }

      setRubricGrades(generatedRubricGrades);
      setCurrentGrade(
        Math.min(
          maxScore,
          Math.max(0, Math.round(suggestedScore)),
        ).toString(),
      );
      setCurrentFeedback(
        data?.feedback || "No written feedback was generated.",
      );
      setAiGradeDetails(normalizedDetails);
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
    blockedExtensions: readonly string[],
  ): Promise<CourseResourceFile[]> => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return [];
    const blockedFileNames = getBlockedFileNames(
      files,
      blockedExtensions,
    );
    if (blockedFileNames.length > 0) {
      notify.error(
        `These file formats are not allowed: ${describeBlockedExtensions(blockedExtensions)}. Blocked: ${blockedFileNames.join(", ")}.`,
      );
      return [];
    }
    if (files.some(file => file.size > MAX_ASSIGNMENT_FILE_SIZE)) {
      notify.error("Each assignment file must be 8 MB or smaller.");
      return [];
    }

    setIsAssignmentUploading(true);
    const uploadedFiles: CourseResourceFile[] = [];
    const uploadedPaths: string[] = [];

    try {
      for (const file of files) {
        if (isAzureAuthEnabled()) {
          const domain = bucket === ASSIGNMENT_SUBMISSIONS_BUCKET
            ? "assignment-submissions"
            : "course-content";
          const uploadedFile = await uploadFileToAzureBlob(domain, file);
          uploadedPaths.push(uploadedFile.path);
          uploadedFiles.push(uploadedFile);
          continue;
        }

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
      if (uploadedPaths.length > 0 && !isAzureAuthEnabled()) {
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
      ASSESSMENT_RESOURCE_BLOCKED_EXTENSIONS,
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
      SUBMISSION_FILE_BLOCKED_EXTENSIONS,
    );
    if (uploadedFiles.length > 0) {
      setSubmissionFiles(current => [...current, ...uploadedFiles]);
    }
  };

  const setRubricGradeAdjustment = (
    index: number,
    nextAdjustment: number,
  ) => {
    setRubricGrades(current => {
      return current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const adjustment = clampWholeScore(
          nextAdjustment,
          -item.aiScore,
          item.maxScore - item.aiScore,
        );
        return {
          ...item,
          adjustment,
          finalScore: item.aiScore + adjustment,
        };
      });
    });
  };

  const resetRubricGradeAdjustments = () => {
    setRubricGrades(current =>
      current.map(item => ({
        ...item,
        adjustment: 0,
        finalScore: item.aiScore,
      })),
    );
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
    newMarkingGuideFiles,
    newRubricFiles,
    resetRubricGradeAdjustments,
    rubricGrades,
    saveGrade,
    selectAssignment,
    selectedAssignment,
    setCurrentFeedback,
    setCurrentGrade,
    setGradingStudentId,
    setNewAssign,
    setNewAssignFiles,
    setNewMarkingGuideFiles,
    setNewRubricFiles,
    setRubricGradeAdjustment,
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
