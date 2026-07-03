import { useState, type Dispatch, type SetStateAction } from "react";
import { notify } from "@/lib/notify";
import {
  assignStudentStudyPlan,
  unassignStudentStudyPlan,
  type StudyPlanVersion,
} from "@/data/academicPlanningRepository";

type UseStudentStudyPlanAssignmentHandlersArgs = {
  refreshStudentAssignments: () => Promise<void>;
  selectedStudentAssignmentVersion: StudyPlanVersion | null | undefined;
  selectedStudentAssignmentVersionId: string;
  selectedStudentIds: string[];
  setSelectedStudentIds: Dispatch<SetStateAction<string[]>>;
};

export const useStudentStudyPlanAssignmentHandlers = ({
  refreshStudentAssignments,
  selectedStudentAssignmentVersion,
  selectedStudentAssignmentVersionId,
  selectedStudentIds,
  setSelectedStudentIds,
}: UseStudentStudyPlanAssignmentHandlersArgs) => {
  const [isAssigningStudents, setIsAssigningStudents] = useState(false);

  const handleAssignStudents = async (studentIds = selectedStudentIds) => {
    if (!selectedStudentAssignmentVersionId || studentIds.length === 0) {
      notify.info("Select a study plan version and at least one student first.");
      return;
    }

    setIsAssigningStudents(true);
    try {
      for (const studentId of studentIds) {
        await assignStudentStudyPlan({
          studentId,
          studyPlanVersionId: selectedStudentAssignmentVersionId,
        });
      }
      notify.success(
        `Assigned ${studentIds.length} student${studentIds.length === 1 ? "" : "s"} to ${
          selectedStudentAssignmentVersion?.version_code || "the selected study plan"
        }.`,
      );
      setSelectedStudentIds([]);
      await refreshStudentAssignments();
    } catch (error) {
      notify.error(error, "Failed to assign student study plan.");
    } finally {
      setIsAssigningStudents(false);
    }
  };

  const handleUnassignStudents = async (studentIds = selectedStudentIds) => {
    if (studentIds.length === 0) {
      notify.info("Select at least one student first.");
      return;
    }

    setIsAssigningStudents(true);
    try {
      for (const studentId of studentIds) {
        await unassignStudentStudyPlan(studentId);
      }
      notify.success(
        `Removed study plan assignment for ${studentIds.length} student${
          studentIds.length === 1 ? "" : "s"
        }.`,
      );
      setSelectedStudentIds([]);
      await refreshStudentAssignments();
    } catch (error) {
      notify.error(error, "Failed to remove student study plan assignment.");
    } finally {
      setIsAssigningStudents(false);
    }
  };

  return {
    handleAssignStudents,
    handleUnassignStudents,
    isAssigningStudents,
  };
};
