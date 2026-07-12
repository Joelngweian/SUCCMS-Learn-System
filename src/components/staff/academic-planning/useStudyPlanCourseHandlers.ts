import { useState, type Dispatch, type SetStateAction } from "react";
import { notify } from "@/lib/notify";
import {
  addStudyPlanCourse,
  deleteStudyPlanCourse,
  type DbStudyPlanCourse,
} from "@/data/academicPlanningRepository";

export const emptyCourseForm = {
  category: "",
  courseCode: "",
  courseName: "",
  creditHours: "3",
  isPlaceholder: "false",
  termCode: "2026B",
};

export type StudyPlanCourseForm = typeof emptyCourseForm;

type UseStudyPlanCourseHandlersArgs = {
  courseForm: StudyPlanCourseForm;
  loadVersionCourses: (versionId: string) => Promise<void>;
  selectedVersionId: string;
  setCourseForm: Dispatch<SetStateAction<StudyPlanCourseForm>>;
  versionCourses: DbStudyPlanCourse[];
};

export const useStudyPlanCourseHandlers = ({
  courseForm,
  loadVersionCourses,
  selectedVersionId,
  setCourseForm,
  versionCourses,
}: UseStudyPlanCourseHandlersArgs) => {
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  const handleAddCourse = async () => {
    if (!selectedVersionId || !courseForm.courseName.trim()) return false;
    const nextPosition =
      versionCourses
        .filter(course => course.term_code === courseForm.termCode)
        .reduce(
          (maxPosition, course) =>
            Math.max(maxPosition, Number(course.position) || 0),
          0,
        ) + 1;

    setIsSavingCourse(true);
    try {
      await addStudyPlanCourse({
        category: courseForm.category,
        courseCode: courseForm.courseCode,
        courseName: courseForm.courseName,
        creditHours: courseForm.creditHours ? Number(courseForm.creditHours) : null,
        isPlaceholder: courseForm.isPlaceholder === "true",
        position: nextPosition,
        studyPlanVersionId: selectedVersionId,
        termCode: courseForm.termCode,
      });
      notify.success("Study plan course added.");
      setCourseForm(current => ({ ...emptyCourseForm, termCode: current.termCode }));
      await loadVersionCourses(selectedVersionId);
      return true;
    } catch (error) {
      notify.error(error, "Failed to add study plan course.");
      return false;
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await deleteStudyPlanCourse(courseId);
      notify.success("Study plan course removed.");
      await loadVersionCourses(selectedVersionId);
    } catch (error) {
      notify.error(error, "Failed to remove study plan course.");
    }
  };

  return {
    handleAddCourse,
    handleDeleteCourse,
    isSavingCourse,
  };
};
