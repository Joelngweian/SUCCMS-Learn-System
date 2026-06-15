import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { supabase } from "@/lib/supabase";
import { confirmAction } from "@/lib/confirm";
import { notify } from "@/lib/notify";
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
import { getErrorMessage } from "./courseStorage";

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

  const fetchAssignments = useCallback(async () => {
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
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
        .select("*")
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
        .select("*")
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
      .select("*")
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

    setShowNewAssignmentDialog(false);
    setNewAssign(emptyAssignmentDraft);
    setNewAssignFiles([]);
    setNewRubricFiles([]);
    await fetchAssignments();
  };

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
    const { error } = await supabase
      .from("assignment_submissions")
      .delete()
      .eq("assignment_id", selectedAssignment.id)
      .eq("student_id", userId);

    if (error) {
      notify.error(error, "Failed to undo submission.");
      return;
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
    if (!selectedAssignment || !gradingStudentId) return;
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
      const { data, error } =
        await supabase.functions.invoke<AiGradeResponse>(
          "ai-grade-assignment",
          {
            body: {
              assignmentId: selectedAssignment.id,
              studentId: gradingStudentId,
            },
          },
        );

      if (error) {
        throw new Error(
          await getFunctionErrorMessage(
            error,
            "The AI grading service could not be reached.",
          ),
        );
      }
      if (data?.error) throw new Error(data.error);

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

  const uploadAssignmentFile = async <
    T extends { name: string; path: string },
  >(
    event: ChangeEvent<HTMLInputElement>,
    setList: Dispatch<SetStateAction<T[]>>,
    currentList: T[],
  ) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0];
    const filePath = `${courseId}/assignments/${crypto.randomUUID()}_${file.name}`;
    setIsAssignmentUploading(true);
    const { error } = await supabase.storage
      .from("course_content")
      .upload(filePath, file);
    setIsAssignmentUploading(false);
    event.target.value = "";

    if (error) {
      notify.error(error, "Failed to upload file.");
      return;
    }

    const { data } = supabase.storage
      .from("course_content")
      .getPublicUrl(filePath);
    setList([
      ...currentList,
      { name: file.name, path: data.publicUrl } as T,
    ]);
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
    setShowNewAssignmentDialog,
    setSubmissionFiles,
    showNewAssignmentDialog,
    submissionFiles,
    turnIn,
    undoTurnIn,
    uploadAssignmentFile,
  };
}
