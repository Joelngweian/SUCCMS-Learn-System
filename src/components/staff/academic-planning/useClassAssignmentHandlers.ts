import { useState, type Dispatch, type SetStateAction } from "react";
import { notify } from "@/lib/notify";
import {
  assignCourseOfferingToLecturer,
  type LecturerOption,
} from "@/data/academicPlanningRepository";
import { lecturerLabel } from "./academicPlanningUtils";
import type { AssignmentListItem } from "./useAcademicPlanningViews";

type UseClassAssignmentHandlersArgs = {
  bulkLecturerId: string;
  lecturerById: Map<string, LecturerOption>;
  refreshAssignmentWorkbench: () => Promise<void>;
  selectedAssignmentItems: AssignmentListItem[];
  selectedAssignmentTerm?: { id: string } | null;
  setAssignmentRowLecturers: Dispatch<SetStateAction<Record<string, string>>>;
  setBulkLecturerId: Dispatch<SetStateAction<string>>;
  setSelectedAssignmentKeys: Dispatch<SetStateAction<string[]>>;
};

export const useClassAssignmentHandlers = ({
  bulkLecturerId,
  lecturerById,
  refreshAssignmentWorkbench,
  selectedAssignmentItems,
  selectedAssignmentTerm,
  setAssignmentRowLecturers,
  setBulkLecturerId,
  setSelectedAssignmentKeys,
}: UseClassAssignmentHandlersArgs) => {
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssignCourse = async (
    item: AssignmentListItem,
    lecturerId: string,
  ) => {
    if (!selectedAssignmentTerm?.id || !item.courseId || !lecturerId) {
      notify.info("This semester needs an academic term before lecturer assignments can be saved.");
      return;
    }
    setIsAssigning(true);
    try {
      await assignCourseOfferingToLecturer({
        courseId: item.courseId,
        lecturerId,
        termId: selectedAssignmentTerm.id,
      });
      notify.success(`${item.courseCode} assigned to ${lecturerLabel(lecturerById.get(lecturerId))}.`);
      await refreshAssignmentWorkbench();
    } catch (error) {
      notify.error(error, "Failed to assign course to lecturer.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedAssignmentTerm?.id || !bulkLecturerId || selectedAssignmentItems.length === 0) {
      notify.info("This semester needs an academic term before lecturer assignments can be saved.");
      return;
    }
    setIsAssigning(true);
    try {
      let assignedCount = 0;
      for (const item of selectedAssignmentItems) {
        if (!item.courseId) continue;
        await assignCourseOfferingToLecturer({
          courseId: item.courseId,
          lecturerId: bulkLecturerId,
          termId: selectedAssignmentTerm.id,
        });
        assignedCount += 1;
      }
      notify.success(`Assigned ${assignedCount} course${assignedCount === 1 ? "" : "s"} to ${lecturerLabel(lecturerById.get(bulkLecturerId))}.`);
      setBulkLecturerId("");
      setSelectedAssignmentKeys([]);
      setAssignmentRowLecturers({});
      await refreshAssignmentWorkbench();
    } catch (error) {
      notify.error(error, "Failed to bulk assign courses.");
    } finally {
      setIsAssigning(false);
    }
  };

  return {
    handleAssignCourse,
    handleBulkAssign,
    isAssigning,
  };
};
