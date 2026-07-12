import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CourseAssignmentDetailDialog } from "./CourseAssignmentDetailDialog";
import { CourseAssignmentsTab } from "./CourseAssignmentsTab";
import { CreateAssessmentDialog } from "./CourseDialogs";
import { useCourseAssignments } from "./useCourseAssignments";
import { useCoursePeople } from "./useCoursePeople";

export function CourseAssignmentsSection({
  assignmentId,
  courseId,
  isLecturer,
}: {
  assignmentId: string | null;
  courseId: string;
  isLecturer: boolean;
}) {
  const { user } = useAuth();
  const assignments = useCourseAssignments({
    courseId,
    isLecturer,
    userId: user?.id,
  });
  const { people } = useCoursePeople(courseId);
  const {
    assignments: assignmentItems,
    selectAssignment,
  } = assignments;

  useEffect(() => {
    if (!assignmentId || assignmentItems.length === 0) return;
    const target = assignmentItems.find(
      (assignment) => assignment.id === assignmentId,
    );
    if (target) selectAssignment(target);
  }, [
    assignmentId,
    assignmentItems,
    selectAssignment,
  ]);

  return (
    <>
      <CourseAssignmentsTab
        isLecturer={isLecturer}
        assignments={assignmentItems}
        mySubmissions={assignments.mySubmissions}
        onCreateAssessment={() => assignments.setShowNewAssignmentDialog(true)}
        onDeleteAssignment={assignments.deleteAssignment}
        onSelectAssignment={selectAssignment}
      />

      <CreateAssessmentDialog
        open={assignments.showNewAssignmentDialog}
        assignment={assignments.newAssign}
        rubricFiles={assignments.newRubricFiles}
        markingGuideFiles={assignments.newMarkingGuideFiles}
        materialFiles={assignments.newAssignFiles}
        isUploading={assignments.isAssignmentUploading}
        onOpenChange={assignments.setShowNewAssignmentDialog}
        onAssignmentChange={assignments.setNewAssign}
        onRubricUpload={(event) =>
          void assignments.uploadAssignmentResourceFiles(
            event,
            assignments.setNewRubricFiles,
          )
        }
        onMarkingGuideUpload={(event) =>
          void assignments.uploadAssignmentResourceFiles(
            event,
            assignments.setNewMarkingGuideFiles,
          )
        }
        onMaterialUpload={(event) =>
          void assignments.uploadAssignmentResourceFiles(
            event,
            assignments.setNewAssignFiles,
          )
        }
        onCreate={() => void assignments.createAssignment()}
      />

      <CourseAssignmentDetailDialog
        assignment={assignments.selectedAssignment}
        isLecturer={isLecturer}
        gradingStudentId={assignments.gradingStudentId}
        people={people}
        allSubmissions={assignments.allSubmissions}
        mySubmissions={assignments.mySubmissions}
        submissionFiles={assignments.submissionFiles}
        isUploading={assignments.isAssignmentUploading}
        isAiGrading={assignments.isAiGrading}
        aiGradingError={assignments.aiGradingError}
        aiGradeDetails={assignments.aiGradeDetails}
        rubricGrades={assignments.rubricGrades}
        currentGrade={assignments.currentGrade}
        currentFeedback={assignments.currentFeedback}
        onClose={() => assignments.setSelectedAssignment(null)}
        onGradingStudentChange={assignments.setGradingStudentId}
        onSubmissionFilesChange={assignments.setSubmissionFiles}
        onUploadSubmissionFile={(event) =>
          void assignments.uploadSubmissionFiles(event)
        }
        onTurnIn={() => void assignments.turnIn()}
        onUndoTurnIn={() => void assignments.undoTurnIn()}
        onAiGrade={() => void assignments.aiAutoGrade()}
        onRubricAdjustmentChange={assignments.setRubricGradeAdjustment}
        onResetRubricAdjustments={assignments.resetRubricGradeAdjustments}
        onGradeChange={assignments.setCurrentGrade}
        onFeedbackChange={assignments.setCurrentFeedback}
        onSaveGrade={() => void assignments.saveGrade()}
      />
    </>
  );
}
