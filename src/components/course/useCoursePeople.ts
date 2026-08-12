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
import { invalidateProfileCache } from "@/data/profileRepository";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { confirmAction } from "@/lib/confirm";
import type { CoursePerson } from "./coursePageTypes";

type CourseMemberRow =
  Database["public"]["Functions"]["get_course_members"]["Returns"][number];
type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

const mapCourseMemberToPerson = (member: CourseMemberRow): CoursePerson => ({
  id: member.id,
  email: member.email,
  full_name: member.full_name,
  username: null,
  role: member.role,
  program_or_department: null,
  avatar_url: member.avatar_url,
  bio: null,
  created_at: member.joined_at,
  updated_at: member.joined_at,
  is_active: true,
  cover_url: null,
  faculty: member.faculty,
  programme: member.programme,
});

const mapUserProfileToPerson = (profile: UserProfileRow): CoursePerson => ({
  id: profile.id,
  email: profile.email,
  full_name: profile.full_name,
  username: profile.username,
  role: profile.role,
  program_or_department: profile.program_or_department,
  avatar_url: profile.avatar_url,
  bio: profile.bio,
  created_at: profile.created_at,
  updated_at: profile.updated_at,
  is_active: profile.is_active,
  cover_url: profile.cover_url,
  faculty: profile.faculty,
  programme: profile.programme,
});

const USER_PROFILE_SELECT =
  "id, email, full_name, username, role, program_or_department, avatar_url, bio, created_at, updated_at, is_active, cover_url, faculty, programme";

export function useCoursePeople(courseId: string, ownerUserId?: string | null) {
  const [people, setPeople] = useState<CoursePerson[]>([]);
  const [availableStudents, setAvailableStudents] = useState<CoursePerson[]>([]);
  const [addStudentSearchQuery, setAddStudentSearchQuery] = useState("");

  const addOwnerFallback = useCallback(async (members: CoursePerson[]) => {
    if (!ownerUserId || members.some(person => person.id === ownerUserId)) {
      return members;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select(USER_PROFILE_SELECT)
      .eq("id", ownerUserId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.warn("Course owner profile fallback failed:", error);
      return members;
    }

    return [mapUserProfileToPerson(data), ...members];
  }, [ownerUserId]);

  const fetchPeople = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_course_members", {
        target_course_id: courseId,
      });

      if (error) throw error;
      const members = (data || []).map(mapCourseMemberToPerson);
      setPeople(await addOwnerFallback(members));
    } catch (error) {
      console.error("Error fetching people:", error);
    }
  }, [addOwnerFallback, courseId]);

  const fetchAvailableStudents = useCallback(async () => {
    try {
      setAddStudentSearchQuery("");
      const { studentIds: enrolledIds } = await getCourseMemberIds(courseId);
      let query = supabase
        .from("user_profiles")
        .select(USER_PROFILE_SELECT)
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
