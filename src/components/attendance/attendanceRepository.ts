import { supabase } from "@/lib/supabase";
import type {
  AttendanceRecord,
  AttendanceSession,
} from "./attendanceTypes";

export const ATTENDANCE_SELECT =
  "id, course_id, student_id, class_date, marked_present, marked_at, marked_by, class_meeting_id, session_id, status, check_in_at, check_in_method";

export const ATTENDANCE_SESSION_SELECT =
  "id, course_id, class_meeting_id, class_date, slot_no, slot_label, check_in_code, status, starts_at, ends_at, check_in_window_minutes, opened_at, closed_at, created_by, created_at, updated_at";

const EXPORT_PAGE_SIZE = 1000;

type RepositoryResult<T> = {
  data: T;
  error: { message: string } | null;
};

export const listCourseAttendanceRecords = async ({
  courseId,
  isLecturer,
  userId,
}: {
  courseId: string;
  isLecturer: boolean;
  userId: string | null;
}): Promise<RepositoryResult<AttendanceRecord[]>> => {
  let attendanceQuery = supabase
    .from("attendance")
    .select(ATTENDANCE_SELECT)
    .eq("course_id", courseId)
    .order("class_date", { ascending: false });

  if (!isLecturer && userId) {
    attendanceQuery = attendanceQuery.eq("student_id", userId);
  }

  const { data, error } = await attendanceQuery;
  return {
    data: (data || []) as AttendanceRecord[],
    error,
  };
};

export const listCourseAttendanceSessions = async (
  courseId: string,
  isLecturer: boolean,
): Promise<RepositoryResult<AttendanceSession[]>> => {
  if (!isLecturer) return { data: [], error: null };

  const { data, error } = await supabase
    .from("attendance_sessions")
    .select(ATTENDANCE_SESSION_SELECT)
    .eq("course_id", courseId)
    .order("class_date", { ascending: false })
    .order("slot_no", { ascending: true });

  return {
    data: (data || []) as AttendanceSession[],
    error,
  };
};

export const fetchAllCourseAttendanceRecords = async (courseId: string) => {
  const allRecords: AttendanceRecord[] = [];

  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("attendance")
      .select(ATTENDANCE_SELECT)
      .eq("course_id", courseId)
      .order("class_date", { ascending: true })
      .range(from, from + EXPORT_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const page = (data || []) as AttendanceRecord[];
    allRecords.push(...page);

    if (page.length < EXPORT_PAGE_SIZE) break;
  }

  return allRecords;
};

export const fetchAllCourseAttendanceSessions = async (courseId: string) => {
  const allSessions: AttendanceSession[] = [];

  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("attendance_sessions")
      .select(ATTENDANCE_SESSION_SELECT)
      .eq("course_id", courseId)
      .order("class_date", { ascending: true })
      .order("slot_no", { ascending: true })
      .range(from, from + EXPORT_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const page = (data || []) as AttendanceSession[];
    allSessions.push(...page);

    if (page.length < EXPORT_PAGE_SIZE) break;
  }

  return allSessions;
};
