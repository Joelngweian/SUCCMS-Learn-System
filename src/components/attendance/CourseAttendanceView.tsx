import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { subscribeToPrivateBroadcast } from "@/lib/realtime";
import { Loader2 } from "lucide-react";
import {
  AttendanceSummaryCards,
  RecentClasses,
  RecentClassesDialogButton,
} from "./AttendanceSummaryPanels";
import { StudentAttendanceView } from "./StudentAttendanceView";
import { TeacherAttendanceControls } from "./TeacherAttendanceControls";
import { TeacherAttendanceRoster } from "./TeacherAttendanceRoster";
import { TeacherAttendanceDialogs } from "./TeacherAttendanceDialogs";
import { exportAttendanceWorkbook } from "./exportAttendanceWorkbook";
import {
  ATTENDANCE_SESSION_SELECT,
  fetchAllCourseAttendanceRecords,
  fetchAllCourseAttendanceSessions,
  listCourseAttendanceRecords,
  listCourseAttendanceSessions,
} from "./attendanceRepository";
import {
  generateCheckInCode,
  getLocalDateValue,
  getLocalTimeValue,
} from "./attendanceSessionUtils";
import { useAttendanceSessionSelection } from "./useAttendanceSessionSelection";
import {
  formatClassDate,
  formatSessionSlotLabel,
  getSessionTimingState,
  getRecordStatus,
  receivesAttendanceCredit,
  type AttendanceRecord,
  type AttendanceSession,
  type CourseStudent,
} from "./attendanceTypes";
import { useAttendanceRosterState } from "./useAttendanceRosterState";

type CourseAttendanceProps = {
  courseId: string;
  courseCode?: string;
  courseName?: string;
  userId: string | null;
  isLecturer: boolean;
  students: CourseStudent[];
};

export function CourseAttendance({
  courseId,
  courseCode,
  courseName,
  userId,
  isLecturer,
  students,
}: CourseAttendanceProps) {
  const today = getLocalDateValue();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [classHours, setClassHours] = useState("3");
  const [classStartTime, setClassStartTime] = useState(getLocalTimeValue);
  const [sessionDuration, setSessionDuration] = useState("15");
  const [checkInCode, setCheckInCode] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingAttendance, setIsExportingAttendance] = useState(false);
  const [isExportingAttendanceSummary, setIsExportingAttendanceSummary] =
    useState(false);
  const [isManagingSession, setIsManagingSession] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [startConfirmationOpen, setStartConfirmationOpen] = useState(false);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [correctedDate, setCorrectedDate] = useState(today);
  const [isCorrectingDate, setIsCorrectingDate] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [completionNoticeDate, setCompletionNoticeDate] = useState<string | null>(null);
  const [reviewingCompletedDate, setReviewingCompletedDate] = useState<string | null>(null);

  const clearAttendanceMessages = useCallback(() => {
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  const sortedStudents = useMemo(
    () =>
      [...students]
        .filter((student) => student.role === "student")
        .sort((a, b) =>
          (a.full_name || "").localeCompare(b.full_name || "")
        ),
    [students]
  );

  const {
    missingSlotNumbers,
    selectedSession,
    sessionsForSelectedDate,
  } = useAttendanceSessionSelection({
    classHours,
    clock,
    isLecturer,
    selectedDate,
    selectedSessionId,
    sessions,
    setSelectedSessionId,
  });

  const selectedSessionTiming = selectedSession
    ? getSessionTimingState(selectedSession, clock)
    : "closed";
  const sessionIsOpen = selectedSessionTiming === "open";
  const sessionIsUpcoming = selectedSessionTiming === "upcoming";
  const sessionHasExpired = selectedSessionTiming === "expired";
  const canOpenCheckIn = selectedDate === today;
  const completedSlotCountForSelectedDate = sessionsForSelectedDate.filter(
    (session) => session.status === "closed",
  ).length;
  const selectedDateClassIsCompleted =
    isLecturer &&
    sessionsForSelectedDate.length > 0 &&
    missingSlotNumbers.length === 0 &&
    completedSlotCountForSelectedDate === sessionsForSelectedDate.length;
  const reviewCompletedClass =
    selectedDateClassIsCompleted && reviewingCompletedDate === selectedDate;
  const showClassCompletionNotice =
    selectedDateClassIsCompleted &&
    completionNoticeDate === selectedDate &&
    !reviewCompletedClass;
  const shouldShowAttendanceRoster =
    !selectedDateClassIsCompleted || reviewCompletedClass;

  const fetchAttendance = useCallback(async (showLoading = true) => {
    if (!courseId || (!isLecturer && !userId)) return;

    if (showLoading) setIsLoading(true);
    setErrorMessage("");

    const [attendanceResult, sessionResult] = await Promise.all([
      listCourseAttendanceRecords({ courseId, isLecturer, userId }),
      listCourseAttendanceSessions(courseId, isLecturer),
    ]);

    if (attendanceResult.error) {
      setErrorMessage(
        `Unable to load attendance: ${attendanceResult.error.message}`
      );
      setRecords([]);
    } else {
      setRecords(attendanceResult.data);
    }

    if (sessionResult.error) {
      setErrorMessage(
        `Unable to load check-in sessions: ${sessionResult.error.message}`
      );
      setSessions([]);
    } else {
      setSessions(sessionResult.data);
    }

    if (showLoading) setIsLoading(false);
  }, [courseId, isLecturer, userId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    if (!successMessage) return;

    const timer = window.setTimeout(() => setSuccessMessage(""), 5000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!selectedDateClassIsCompleted) {
      setCompletionNoticeDate((current) =>
        current === selectedDate ? null : current,
      );
      return;
    }

    setCompletionNoticeDate(selectedDate);
    const timer = window.setTimeout(() => {
      setCompletionNoticeDate((current) =>
        current === selectedDate ? null : current,
      );
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [selectedDate, selectedDateClassIsCompleted]);

  useEffect(() => {
    if (!isLecturer) return;

    return subscribeToPrivateBroadcast({
      topic: `course:${courseId}:attendance`,
      onMessage: () => void fetchAttendance(false),
    });
  }, [courseId, fetchAttendance, isLecturer]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const {
    currentPage,
    dirtyStudentIds,
    draft,
    filteredStudents,
    pageSize,
    paginatedStudents,
    searchQuery,
    selectedRecordsByStudent,
    selectedSummary,
    setCurrentPage,
    setSearchQuery,
    setStatuses,
    setStatusFilter,
    statusFilter,
    totalPages,
    updateStatus,
  } = useAttendanceRosterState({
    isLecturer,
    onClearMessages: clearAttendanceMessages,
    records,
    selectedDate,
    selectedSession,
    sortedStudents,
  });

  const sessionSummaries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        date: string;
        slots: number;
        present: number;
        absent: number;
        total: number;
      }
    >();

    sessions.forEach((session) => {
      const summary = grouped.get(session.class_date) || {
        date: session.class_date,
        slots: 0,
        present: 0,
        absent: 0,
        total: 0,
      };

      summary.slots += 1;
      grouped.set(session.class_date, summary);
    });

    records.forEach((record) => {
      const summary = grouped.get(record.class_date) || {
        date: record.class_date,
        slots: 0,
        present: 0,
        absent: 0,
        total: 0,
      };

      const status = getRecordStatus(record);
      summary.total += 1;
      if (receivesAttendanceCredit(status)) summary.present += 1;
      else summary.absent += 1;
      grouped.set(record.class_date, summary);
    });

    return Array.from(grouped.values()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }, [records, sessions]);

  const studentSummary = useMemo(() => {
    const statuses = records.map(getRecordStatus);
    const present = statuses.filter((status) => status === "present").length;
    const late = statuses.filter((status) => status === "late").length;
    const absent = statuses.filter((status) => status === "absent").length;
    const excused = statuses.filter((status) => status === "excused").length;
    const credited = present + late + excused;

    return {
      present,
      late,
      absent,
      excused,
      rate:
        records.length > 0
          ? Math.round((credited / records.length) * 100)
          : null,
    };
  }, [records]);

  const startCheckInSession = async () => {
    if (!userId || !canOpenCheckIn) return;

    setIsManagingSession(true);
    setErrorMessage("");
    setSuccessMessage("");

    const now = new Date();
    const checkInWindowMinutes = Number(sessionDuration);

    if (selectedSession) {
      const openedAt = now.toISOString();
      const { error } = await supabase
        .from("attendance_sessions")
        .update({
          check_in_code: generateCheckInCode(),
          status: "open",
          opened_at: openedAt,
          check_in_window_minutes: checkInWindowMinutes,
          closed_at: null,
          updated_at: openedAt,
        })
        .eq("id", selectedSession.id);

      if (error) {
        setErrorMessage(`Failed to start check-in: ${error.message}`);
      } else {
        setSuccessMessage(
          `${formatSessionSlotLabel(selectedSession)} check-in is open now for ${sessionDuration} minutes. The scheduled hour time was not changed.`
        );
        setStatusFilter("unmarked");
        setClock(Date.now());
        await fetchAttendance(false);
      }

      setIsManagingSession(false);
      return;
    }

    const classDurationHours = Number(classHours);
    const classStartsAt = new Date(`${selectedDate}T${classStartTime}:00`);
    const classEndsAt = new Date(
      classStartsAt.getTime() + classDurationHours * 60 * 60_000
    );

    const { data: meeting, error: meetingError } = await supabase
      .from("attendance_class_meetings")
      .insert({
        course_id: courseId,
        class_date: selectedDate,
        starts_at: classStartsAt.toISOString(),
        ends_at: classEndsAt.toISOString(),
        slot_minutes: 60,
        total_slots: classDurationHours,
        created_by: userId,
      })
      .select("id")
      .single();

    if (meetingError || !meeting) {
      setErrorMessage(
        `Failed to create class meeting: ${
          meetingError?.message || "No meeting was returned."
        }`
      );
      setIsManagingSession(false);
      return;
    }

    const hourlySessions = Array.from(
      { length: classDurationHours },
      (_, index) => {
        const slotStart = new Date(
          classStartsAt.getTime() + index * 60 * 60_000
        );
        const slotEnd = new Date(
          slotStart.getTime() + 60 * 60_000
        );

        return {
          course_id: courseId,
          class_meeting_id: meeting.id,
          class_date: selectedDate,
          slot_no: index + 1,
          slot_label: `Hour ${index + 1}`,
          check_in_code: generateCheckInCode(),
          status: "open",
          starts_at: slotStart.toISOString(),
          ends_at: slotEnd.toISOString(),
          check_in_window_minutes: checkInWindowMinutes,
          closed_at: null,
          created_by: userId,
          updated_at: now.toISOString(),
        };
      }
    );

    const { data, error } = await supabase
      .from("attendance_sessions")
      .insert(hourlySessions)
      .select(ATTENDANCE_SESSION_SELECT);

    if (error) {
      await supabase
        .from("attendance_class_meetings")
        .delete()
        .eq("id", meeting.id);
      setErrorMessage(`Failed to start check-in: ${error.message}`);
    } else {
      const createdSessions = (data || []) as AttendanceSession[];
      setSuccessMessage(
        `Created ${classDurationHours} hourly check-in slot${
          classDurationHours === 1 ? "" : "s"
        }. Select each hour to show its code.`
      );
      setSelectedSessionId(createdSessions[0]?.id || null);
      setStatusFilter("unmarked");
      setClock(Date.now());
      await fetchAttendance(false);
    }

    setIsManagingSession(false);
  };

  const addMissingHourlySlots = async () => {
    if (
      !userId ||
      !canOpenCheckIn ||
      sessionsForSelectedDate.length === 0 ||
      missingSlotNumbers.length === 0
    ) {
      return;
    }

    setIsManagingSession(true);
    setErrorMessage("");
    setSuccessMessage("");

    const sortedSessions = [...sessionsForSelectedDate].sort((left, right) => {
      const slotSort = (left.slot_no || 1) - (right.slot_no || 1);
      if (slotSort !== 0) return slotSort;
      return left.starts_at.localeCompare(right.starts_at);
    });
    const firstSession = sortedSessions[0];
    const firstSlotNo = firstSession.slot_no || 1;
    const classStartsAt = new Date(
      new Date(firstSession.starts_at).getTime() -
        (firstSlotNo - 1) * 60 * 60_000,
    );
    const checkInWindowMinutes =
      Number(sessionDuration) ||
      firstSession.check_in_window_minutes ||
      15;
    const targetSlots = Number(classHours);
    const now = new Date();

    const newSessions = missingSlotNumbers.map((slotNo) => {
      const slotStart = new Date(
        classStartsAt.getTime() + (slotNo - 1) * 60 * 60_000,
      );
      const slotEnd = new Date(
        slotStart.getTime() + 60 * 60_000,
      );

      return {
        course_id: courseId,
        class_meeting_id: firstSession.class_meeting_id,
        class_date: selectedDate,
        slot_no: slotNo,
        slot_label: `Hour ${slotNo}`,
        check_in_code: generateCheckInCode(),
        status: "open",
        starts_at: slotStart.toISOString(),
        ends_at: slotEnd.toISOString(),
        check_in_window_minutes: checkInWindowMinutes,
        closed_at: null,
        created_by: userId,
        updated_at: now.toISOString(),
      };
    });

    const { data, error } = await supabase
      .from("attendance_sessions")
      .insert(newSessions)
      .select(ATTENDANCE_SESSION_SELECT);

    if (error) {
      setErrorMessage(`Failed to add hourly slots: ${error.message}`);
      setIsManagingSession(false);
      return;
    }

    if (firstSession.class_meeting_id) {
      const classEndsAt = new Date(
        classStartsAt.getTime() + targetSlots * 60 * 60_000,
      );
      const { error: meetingError } = await supabase
        .from("attendance_class_meetings")
        .update({
          starts_at: classStartsAt.toISOString(),
          ends_at: classEndsAt.toISOString(),
          total_slots: targetSlots,
          updated_at: now.toISOString(),
        })
        .eq("id", firstSession.class_meeting_id);

      if (meetingError) {
        setErrorMessage(
          `Hourly slots were added, but the class summary could not be updated: ${meetingError.message}`,
        );
      }
    }

    const createdSessions = (data || []) as AttendanceSession[];
    setSelectedSessionId(createdSessions[0]?.id || selectedSession?.id || null);
    setSuccessMessage(
      `Added ${createdSessions.length} missing hourly slot${
        createdSessions.length === 1 ? "" : "s"
      }.`,
    );
    await fetchAttendance(false);
    setIsManagingSession(false);
  };

  const markMissingStudentsAbsentForSession = async (
    session: AttendanceSession,
    markedAt: string
  ) => {
    if (!userId) return { count: 0, error: null as Error | null };

    const existingStudentIds = new Set(
      records
        .filter((record) => record.session_id === session.id)
        .map((record) => record.student_id)
    );
    const absentRows = sortedStudents
      .filter((student) => !existingStudentIds.has(student.id))
      .map((student) => ({
        course_id: courseId,
        student_id: student.id,
        class_date: session.class_date,
        marked_present: false,
        marked_at: markedAt,
        marked_by: userId,
        class_meeting_id: session.class_meeting_id,
        session_id: session.id,
        status: "absent",
        check_in_at: null,
        check_in_method: "manual",
      }));

    if (absentRows.length === 0) {
      return { count: 0, error: null };
    }

    const { error } = await supabase.from("attendance").upsert(absentRows, {
      onConflict: "session_id,student_id",
    });

    return {
      count: absentRows.length,
      error: error ? new Error(error.message) : null,
    };
  };

  const closeCheckInSession = async () => {
    if (!selectedSession) return;

    setIsManagingSession(true);
    setErrorMessage("");
    setSuccessMessage("");

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("attendance_sessions")
      .update({
        status: "closed",
        closed_at: now,
        updated_at: now,
      })
      .eq("id", selectedSession.id);

    if (error) {
      setErrorMessage(`Failed to close check-in: ${error.message}`);
      setIsManagingSession(false);
      return;
    }

    const absentResult = await markMissingStudentsAbsentForSession(
      selectedSession,
      now
    );

    if (absentResult.error) {
      setErrorMessage(
        `Check-in closed, but failed to mark absentees: ${absentResult.error.message}`
      );
    } else {
      setSuccessMessage(
        `${formatSessionSlotLabel(
          selectedSession
        )} completed and saved in Recent Classes. ${absentResult.count} missing student${
          absentResult.count === 1 ? "" : "s"
        } marked absent for this hour.`
      );
      setStatusFilter("all");
      await fetchAttendance(false);
    }

    setIsManagingSession(false);
  };

  const openDateCorrection = () => {
    if (!selectedSession || sessionIsOpen) return;
    setCorrectedDate(selectedSession.class_date);
    setCorrectionDialogOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const correctClassDate = async () => {
    if (!selectedSession || correctedDate === selectedSession.class_date) return;

    setIsCorrectingDate(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase.rpc(
      "correct_attendance_session_date",
      {
        p_session_id: selectedSession.id,
        p_new_date: correctedDate,
      }
    );
    const result = data as
      | { success?: boolean; message?: string; class_date?: string }
      | null;

    if (error) {
      setErrorMessage(`Failed to correct class date: ${error.message}`);
    } else if (!result?.success) {
      setErrorMessage(result?.message || "Failed to correct class date.");
    } else {
      setCorrectionDialogOpen(false);
      setSelectedDate(result.class_date || correctedDate);
      setSuccessMessage(result.message || "Class date corrected successfully.");
      await fetchAttendance(false);
    }

    setIsCorrectingDate(false);
  };

  const copyCheckInCode = async () => {
    if (!selectedSession) return;

    try {
      await navigator.clipboard.writeText(selectedSession.check_in_code);
      setSuccessMessage("Check-in code copied.");
    } catch {
      setErrorMessage("Unable to copy the check-in code.");
    }
  };

  const handleSaveAttendance = async () => {
    if (!userId || dirtyStudentIds.size === 0) return;
    if (!selectedSession) {
      setErrorMessage("Create or select an hourly check-in slot before saving attendance.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const existingRecords = new Map(
      records
        .filter((record) => record.session_id === selectedSession.id)
        .map((record) => [record.student_id, record])
    );

    const attendanceRows = Array.from(dirtyStudentIds)
      .map((studentId) => {
        const status = draft[studentId];
        if (!status) return null;

        const existingRecord = existingRecords.get(studentId);
        return {
          course_id: courseId,
          student_id: studentId,
          class_date: selectedSession.class_date,
          marked_present: receivesAttendanceCredit(status),
          marked_by: userId,
          marked_at: new Date().toISOString(),
          class_meeting_id: selectedSession.class_meeting_id,
          session_id: selectedSession.id,
          status,
          check_in_at: existingRecord?.check_in_at || null,
          check_in_method: existingRecord?.check_in_method || "manual",
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    const { error } = await supabase
      .from("attendance")
      .upsert(attendanceRows, {
        onConflict: "session_id,student_id",
      });

    if (error) {
      setErrorMessage(`Failed to save attendance: ${error.message}`);
    } else {
      const slotIsComplete =
        selectedSession.status === "closed" &&
        sortedStudents.every((student) => draft[student.id] != null);
      setSuccessMessage(
        slotIsComplete
          ? `${formatSessionSlotLabel(
              selectedSession
            )} completed and saved in Recent Classes.`
          : `Attendance saved for ${formatClassDate(
              selectedSession.class_date
            )} ${formatSessionSlotLabel(selectedSession)}.`
      );
      await fetchAttendance(false);
    }

    setIsSaving(false);
  };

  const handleStudentCheckIn = async () => {
    if (!userId || checkInCode.trim().length === 0) return;

    setIsCheckingIn(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase.rpc("check_in_attendance", {
      p_course_id: courseId,
      p_code: checkInCode.trim().toUpperCase(),
    });

    const result = data as
      | { success?: boolean; message?: string }
      | null;

    if (error) {
      setErrorMessage(`Check-in failed: ${error.message}`);
    } else if (!result?.success) {
      setErrorMessage(result?.message || "Check-in failed.");
    } else {
      setSuccessMessage(result.message || "Check-in successful.");
      setCheckInCode("");
      await fetchAttendance(false);
    }

    setIsCheckingIn(false);
  };

  const handleExportAttendance = async () => {
    if (!isLecturer || sortedStudents.length === 0) return;

    setIsExportingAttendance(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const currentSessionIds = new Set(
        (selectedSession ? [selectedSession] : sessionsForSelectedDate).map(
          (session) => session.id,
        ),
      );
      const currentRecords = records.filter((record) =>
        selectedSession
          ? record.session_id === selectedSession.id
          : currentSessionIds.size > 0
            ? record.session_id != null && currentSessionIds.has(record.session_id)
            : record.class_date === selectedDate && record.session_id == null,
      );
      const currentSessions = selectedSession
        ? [selectedSession]
        : sessionsForSelectedDate;

      await exportAttendanceWorkbook({
        courseCode,
        courseName,
        courseId,
        reportType: selectedSession
          ? `Current Class - ${formatClassDate(
              selectedSession.class_date,
            )} ${formatSessionSlotLabel(selectedSession)}`
          : `Current Class - ${formatClassDate(selectedDate)}`,
        fileSuffix: selectedSession
          ? `attendance-${selectedSession.class_date}-${formatSessionSlotLabel(
              selectedSession,
            )}`
          : `attendance-${selectedDate}`,
        students: sortedStudents,
        records: currentRecords,
        sessions: currentSessions,
      });
      setSuccessMessage("Attendance Excel file exported.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Failed to export attendance: ${error.message}`
          : "Failed to export attendance.",
      );
    } finally {
      setIsExportingAttendance(false);
    }
  };

  const handleExportAttendanceSummary = async () => {
    if (!isLecturer || sortedStudents.length === 0) return;

    setIsExportingAttendanceSummary(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const [allRecords, allSessions] = await Promise.all([
        fetchAllCourseAttendanceRecords(courseId),
        fetchAllCourseAttendanceSessions(courseId),
      ]);

      await exportAttendanceWorkbook({
        courseCode,
        courseName,
        courseId,
        reportType: "Full Course Attendance Summary",
        fileSuffix: "attendance-summary",
        students: sortedStudents,
        records: allRecords,
        sessions: allSessions,
      });
      setSuccessMessage("Attendance summary Excel file exported.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Failed to export attendance summary: ${error.message}`
          : "Failed to export attendance summary.",
      );
    } finally {
      setIsExportingAttendanceSummary(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-lg border bg-muted/10">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isLecturer) {
    return (
      <StudentAttendanceView
        records={records}
        summary={studentSummary}
        checkInCode={checkInCode}
        onCheckInCodeChange={(value) => {
          setCheckInCode(value);
          setErrorMessage("");
          setSuccessMessage("");
        }}
        onCheckIn={handleStudentCheckIn}
        isCheckingIn={isCheckingIn}
        errorMessage={errorMessage}
        successMessage={successMessage}
      />
    );
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-5">
        <AttendanceSummaryCards summary={selectedSummary} />

        <TeacherAttendanceControls
          selectedDate={selectedDate}
          today={today}
          classHours={classHours}
          classStartTime={classStartTime}
          sessionDuration={sessionDuration}
          sessionsForDate={sessionsForSelectedDate}
          selectedSessionId={selectedSession?.id || null}
          selectedSession={selectedSession}
          sessionIsOpen={sessionIsOpen}
          sessionIsUpcoming={sessionIsUpcoming}
          sessionHasExpired={sessionHasExpired}
          canOpenCheckIn={canOpenCheckIn}
          showClassCompletionNotice={showClassCompletionNotice}
          reviewCompletedClass={reviewCompletedClass}
          isManagingSession={isManagingSession}
          isExportingAttendance={isExportingAttendance}
          isExportingAttendanceSummary={isExportingAttendanceSummary}
          canExportAttendance={sessionsForSelectedDate.length > 0}
          canExportAttendanceSummary={sessions.length > 0}
          missingSlotCount={missingSlotNumbers.length}
          canAddMissingSlots={canOpenCheckIn && missingSlotNumbers.length > 0}
          unmarkedCount={selectedSummary.unmarked}
          studentCount={sortedStudents.length}
          onSelectedDateChange={(value) => {
            setSelectedDate(value);
            setSelectedSessionId(null);
            setReviewingCompletedDate(null);
            setSuccessMessage("");
          }}
          onClassHoursChange={setClassHours}
          onClassStartTimeChange={setClassStartTime}
          onSessionDurationChange={setSessionDuration}
          onSelectedSessionChange={(value) => {
            setSelectedSessionId(value);
            setSuccessMessage("");
          }}
          onExportAttendance={() => void handleExportAttendance()}
          onExportAttendanceSummary={() =>
            void handleExportAttendanceSummary()
          }
          onAddMissingSlots={() => void addMissingHourlySlots()}
          onCopyCode={copyCheckInCode}
          onCloseSession={() => void closeCheckInSession()}
          onCorrectDate={openDateCorrection}
          onStartSession={() => setStartConfirmationOpen(true)}
          onExitCompletedReview={() => {
            setReviewingCompletedDate(null);
            setSelectedSessionId(null);
            setSuccessMessage("");
          }}
        />

        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <RecentClassesDialogButton
          sessions={sessionSummaries}
          selectedDate={selectedDate}
          onSelect={(date) => {
            setSelectedDate(date);
            setSelectedSessionId(null);
            setReviewingCompletedDate(date);
            setSuccessMessage("");
          }}
        />

        {shouldShowAttendanceRoster && (
          <TeacherAttendanceRoster
          students={sortedStudents}
          filteredStudents={filteredStudents}
          paginatedStudents={paginatedStudents}
          draft={draft}
          selectedRecordsByStudent={selectedRecordsByStudent}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          unmarkedCount={selectedSummary.unmarked}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          dirtyCount={dirtyStudentIds.size}
          isSaving={isSaving}
          onSearchQueryChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
          onMarkAllPresent={() => setStatuses(() => true, "present")}
          onMarkRemainingAbsent={() =>
            setStatuses(
              (studentId) => draft[studentId] == null,
              "absent"
            )
          }
          onSave={() => void handleSaveAttendance()}
          onStatusChange={updateStatus}
          onPageChange={setCurrentPage}
        />
        )}
      </div>

      <div className="hidden xl:block">
        <RecentClasses
          sessions={sessionSummaries}
          selectedDate={selectedDate}
          onSelect={(date) => {
            setSelectedDate(date);
            setSelectedSessionId(null);
            setReviewingCompletedDate(date);
            setSuccessMessage("");
          }}
        />
      </div>
      </div>

      <TeacherAttendanceDialogs
        selectedDate={selectedDate}
        today={today}
        classHours={classHours}
        sessionDuration={sessionDuration}
        selectedSession={selectedSession}
        startOpen={startConfirmationOpen}
        correctionOpen={correctionDialogOpen}
        correctedDate={correctedDate}
        errorMessage={errorMessage}
        isCorrectingDate={isCorrectingDate}
        onStartOpenChange={setStartConfirmationOpen}
        onCorrectionOpenChange={setCorrectionDialogOpen}
        onCorrectedDateChange={(value) => {
          setCorrectedDate(value);
          setErrorMessage("");
        }}
        onConfirmStart={() => {
          setStartConfirmationOpen(false);
          void startCheckInSession();
        }}
        onCorrectDate={() => void correctClassDate()}
      />
    </>
  );
}
