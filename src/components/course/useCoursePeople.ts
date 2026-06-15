import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
} from "react";
import {
  getCourseMemberIds,
  invalidateCourseCache,
} from "@/data/courseRepository";
import {
  getProfilesByIds,
  invalidateProfileCache,
} from "@/data/profileRepository";
import { supabase } from "@/lib/supabase";
import { confirmAction } from "@/lib/confirm";
import type { CoursePerson } from "./coursePageTypes";

export function useCoursePeople(courseId: string) {
  const [people, setPeople] = useState<CoursePerson[]>([]);
  const [availableStudents, setAvailableStudents] = useState<CoursePerson[]>([]);
  const [addStudentSearchQuery, setAddStudentSearchQuery] = useState("");

  const fetchPeople = useCallback(async () => {
    try {
      const { instructorIds, studentIds } =
        await getCourseMemberIds(courseId);
      const userIds = [...instructorIds, ...studentIds];

      if (userIds.length === 0) {
        setPeople([]);
        return;
      }

      setPeople(await getProfilesByIds(userIds));
    } catch (error) {
      console.error("Error fetching people:", error);
    }
  }, [courseId]);

  const fetchAvailableStudents = useCallback(async () => {
    try {
      setAddStudentSearchQuery("");
      const { studentIds: enrolledIds } = await getCourseMemberIds(courseId);
      let query = supabase
        .from("user_profiles")
        .select(
          "id, email, full_name, role, program_or_department, avatar_url, bio, created_at, updated_at, is_active, last_login_at, cover_url, faculty, programme",
        )
        .eq("role", "student");

      if (enrolledIds.length > 0) {
        query = query.not("id", "in", `(${enrolledIds.join(",")})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAvailableStudents(data || []);
    } catch (error) {
      console.error("Error fetching available students:", error);
    }
  }, [courseId]);

  const addStudent = async (studentId: string) => {
    const { error } = await supabase.from("course_enrollments").insert({
      course_id: courseId,
      student_id: studentId,
    });
    if (error) throw error;
    invalidateCourseCache({ courseId, userId: studentId });
    invalidateProfileCache();
    await fetchPeople();
  };

  const removeStudent = async (
    event: MouseEvent,
    studentId: string,
  ) => {
    event.stopPropagation();
    if (
      !(await confirmAction({
        title: "Remove student?",
        description: "The student will lose access to this course.",
        confirmLabel: "Remove",
        destructive: true,
      }))
    ) return false;

    const { error } = await supabase
      .from("course_enrollments")
      .delete()
      .match({ course_id: courseId, student_id: studentId });
    if (error) throw error;
    invalidateCourseCache({ courseId, userId: studentId });
    await fetchPeople();
    return true;
  };

  useEffect(() => {
    void fetchPeople();
  }, [fetchPeople]);

  return {
    addStudent,
    addStudentSearchQuery,
    availableStudents,
    fetchAvailableStudents,
    people,
    removeStudent,
    setAddStudentSearchQuery,
  };
}
