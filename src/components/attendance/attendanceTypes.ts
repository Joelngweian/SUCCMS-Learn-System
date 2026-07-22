import type { Database } from "@/lib/database.types";

export type AttendanceRecord =
  Database["public"]["Tables"]["attendance"]["Row"];
export type AttendanceClassMeeting =
  Database["public"]["Tables"]["attendance_class_meetings"]["Row"];
export type AttendanceSession =
  Database["public"]["Tables"]["attendance_sessions"]["Row"];

export type CourseStudent = {
  id: string;
  email?: string | null;
  full_name: string | null;
  username?: string | null;
  avatar_url: string | null;
  role: string | null;
};

export type AttendanceStatus = "present" | "late" | "absent" | "excused";
export type AttendanceFilter = "all" | "unmarked" | AttendanceStatus;

export const STATUS_OPTIONS: Array<{
  value: AttendanceStatus;
  label: string;
}> = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
];

export const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "border-green-200 bg-green-50 text-green-700",
  late: "border-amber-200 bg-amber-50 text-amber-700",
  absent: "border-red-200 bg-red-50 text-red-700",
  excused: "border-blue-200 bg-blue-50 text-blue-700",
};

export const formatClassDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatSessionSlotLabel = (session: AttendanceSession) =>
  session.slot_label || `Hour ${session.slot_no || 1}`;

export const getSessionScheduledEnd = (session: AttendanceSession) => {
  const startsAt = new Date(session.starts_at).getTime();
  const endsAt = new Date(session.ends_at).getTime();
  const oneHourEnd = startsAt + 60 * 60_000;

  if (Number.isFinite(endsAt) && endsAt - startsAt >= 45 * 60_000) {
    return new Date(endsAt);
  }

  return new Date(oneHourEnd);
};

export const getSessionCheckInStart = (session: AttendanceSession) =>
  session.opened_at || session.starts_at;

export const getSessionCheckInEnd = (session: AttendanceSession) => {
  const checkInStart = new Date(getSessionCheckInStart(session)).getTime();
  const checkInWindowMinutes = session.check_in_window_minutes || 15;

  return new Date(checkInStart + checkInWindowMinutes * 60_000);
};

export const getSessionTimingState = (
  session: AttendanceSession,
  now = Date.now(),
) => {
  if (session.status === "closed") return "closed";

  const scheduledStart = new Date(session.starts_at).getTime();
  const checkInStart = new Date(getSessionCheckInStart(session)).getTime();
  const checkInEnd = getSessionCheckInEnd(session).getTime();

  if (!session.opened_at && scheduledStart > now) return "upcoming";
  if (checkInStart <= now && checkInEnd > now) return "open";
  if (checkInEnd <= now) return "expired";

  return "upcoming";
};

export const formatSessionWindow = (session: AttendanceSession) =>
  `${formatTime(session.starts_at)} - ${formatTime(
    getSessionScheduledEnd(session).toISOString(),
  )}`;

export const getRecordStatus = (
  record: AttendanceRecord
): AttendanceStatus => {
  if (
    record.status === "present" ||
    record.status === "late" ||
    record.status === "absent" ||
    record.status === "excused"
  ) {
    return record.status;
  }

  return record.marked_present ? "present" : "absent";
};

export const receivesAttendanceCredit = (status: AttendanceStatus) =>
  status !== "absent";

export interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  excused: number;
  unmarked: number;
}

export interface SessionSummary {
  date: string;
  slots: number;
  present: number;
  absent: number;
  total: number;
  startsAt: string | null;
  checkInWindowMinutes: number | null;
  sessions: AttendanceSession[];
}

export interface StudentAttendanceSummary {
  present: number;
  late: number;
  absent: number;
  excused: number;
  rate: number | null;
}
