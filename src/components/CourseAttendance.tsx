import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import {
  AttendanceSummaryCards,
  RecentClasses,
} from "./attendance/AttendanceSummaryPanels";
import { StudentAttendanceView } from "./attendance/StudentAttendanceView";
import { TeacherAttendanceControls } from "./attendance/TeacherAttendanceControls";
import { TeacherAttendanceRoster } from "./attendance/TeacherAttendanceRoster";
import { TeacherAttendanceDialogs } from "./attendance/TeacherAttendanceDialogs";
import {
  formatClassDate,
  getRecordStatus,
  receivesAttendanceCredit,
  type AttendanceFilter,
  type AttendanceRecord,
  type AttendanceSession,
  type AttendanceStatus,
  type CourseStudent,
} from "./attendance/attendanceTypes";

type CourseAttendanceProps = {
  courseId: string;
  userId: string | null;
  isLecturer: boolean;
  students: CourseStudent[];
};

const PAGE_SIZE = 25;

const ATTENDANCE_SELECT =
  "id, course_id, student_id, class_date, marked_present, marked_at, marked_by, session_id, status, check_in_at, check_in_method";

const ATTENDANCE_SESSION_SELECT =
  "id, course_id, class_date, check_in_code, status, starts_at, ends_at, closed_at, created_by, created_at, updated_at";

const getLocalDateValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const generateCheckInCode = () => {
  const characters = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => characters[value % characters.length]).join(
    ""
  );
};

export function CourseAttendance({
  courseId,
  userId,
  isLecturer,
  students,
}: CourseAttendanceProps) {
  const today = getLocalDateValue();
  const [selectedDate, setSelectedDate] = useState(today);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [draft, setDraft] = useState<
    Record<string, AttendanceStatus | null>
  >({});
  const [dirtyStudentIds, setDirtyStudentIds] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<AttendanceFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionDuration, setSessionDuration] = useState("15");
  const [checkInCode, setCheckInCode] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isManagingSession, setIsManagingSession] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [startConfirmationOpen, setStartConfirmationOpen] = useState(false);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [correctedDate, setCorrectedDate] = useState(today);
  const [isCorrectingDate, setIsCorrectingDate] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const sortedStudents = useMemo(
    () =>
      [...students]
        .filter((student) => student.role === "student")
        .sort((a, b) =>
          (a.full_name || "").localeCompare(b.full_name || "")
        ),
    [students]
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => session.class_date === selectedDate) || null,
    [selectedDate, sessions]
  );

  const sessionIsOpen =
    selectedSession?.status === "open" &&
    new Date(selectedSession.ends_at).getTime() > clock;

  const sessionHasExpired =
    selectedSession?.status === "open" &&
    new Date(selectedSession.ends_at).getTime() <= clock;
  const canOpenCheckIn = selectedDate === today;

  const fetchAttendance = useCallback(async (showLoading = true) => {
    if (!courseId || (!isLecturer && !userId)) return;

    if (showLoading) setIsLoading(true);
    setErrorMessage("");

    let attendanceQuery = supabase
      .from("attendance")
      .select(ATTENDANCE_SELECT)
      .eq("course_id", courseId)
      .order("class_date", { ascending: false });

    if (!isLecturer && userId) {
      attendanceQuery = attendanceQuery.eq("student_id", userId);
    }

    const attendanceResult = await attendanceQuery;
    const sessionResult = isLecturer
      ? await supabase
          .from("attendance_sessions")
          .select(ATTENDANCE_SESSION_SELECT)
          .eq("course_id", courseId)
          .order("class_date", { ascending: false })
      : { data: [] as AttendanceSession[], error: null };

    if (attendanceResult.error) {
      setErrorMessage(
        `Unable to load attendance: ${attendanceResult.error.message}`
      );
      setRecords([]);
    } else {
      setRecords(attendanceResult.data || []);
    }

    if (sessionResult.error) {
      setErrorMessage(
        `Unable to load check-in sessions: ${sessionResult.error.message}`
      );
      setSessions([]);
    } else {
      setSessions(sessionResult.data || []);
    }

    if (showLoading) setIsLoading(false);
  }, [courseId, isLecturer, userId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    if (!isLecturer) return;

    const channel = supabase
      .channel(`course-attendance-${courseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `course_id=eq.${courseId}`,
        },
        () => {
          fetchAttendance(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId, fetchAttendance, isLecturer]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLecturer) return;

    const recordsForDate = new Map(
      records
        .filter((record) => record.class_date === selectedDate)
        .map((record) => [record.student_id, getRecordStatus(record)])
    );

    setDraft(
      Object.fromEntries(
        sortedStudents.map((student) => [
          student.id,
          recordsForDate.get(student.id) || null,
        ])
      )
    );
    setDirtyStudentIds(new Set());
    setErrorMessage("");
  }, [isLecturer, records, selectedDate, sortedStudents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedDate]);

  const selectedSummary = useMemo(() => {
    const values = sortedStudents.map((student) => draft[student.id] ?? null);

    return {
      present: values.filter((value) => value === "present").length,
      late: values.filter((value) => value === "late").length,
      absent: values.filter((value) => value === "absent").length,
      excused: values.filter((value) => value === "excused").length,
      unmarked: values.filter((value) => value == null).length,
    };
  }, [draft, sortedStudents]);

  const selectedRecordsByStudent = useMemo(
    () =>
      new Map(
        records
          .filter((record) => record.class_date === selectedDate)
          .map((record) => [record.student_id, record])
      ),
    [records, selectedDate]
  );

  const sessionSummaries = useMemo(() => {
    const grouped = new Map<
      string,
      { date: string; present: number; absent: number; total: number }
    >();

    records.forEach((record) => {
      const summary = grouped.get(record.class_date) || {
        date: record.class_date,
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
  }, [records]);

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

  const filteredStudents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sortedStudents.filter((student) => {
      const status = draft[student.id] ?? null;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        (student.full_name || "").toLowerCase().includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "unmarked"
          ? status == null
          : status === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [draft, searchQuery, sortedStudents, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / PAGE_SIZE)
  );
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const updateStatus = (
    studentId: string,
    value: AttendanceStatus
  ) => {
    setDraft((current) => ({ ...current, [studentId]: value }));
    setDirtyStudentIds((current) => new Set(current).add(studentId));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const setStatuses = (
    predicate: (studentId: string) => boolean,
    status: AttendanceStatus
  ) => {
    const affectedIds = sortedStudents
      .filter((student) => predicate(student.id))
      .map((student) => student.id);

    setDraft((current) => ({
      ...current,
      ...Object.fromEntries(affectedIds.map((id) => [id, status])),
    }));
    setDirtyStudentIds((current) => {
      const next = new Set(current);
      affectedIds.forEach((id) => next.add(id));
      return next;
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const startCheckInSession = async () => {
    if (!userId || !canOpenCheckIn) return;

    setIsManagingSession(true);
    setErrorMessage("");
    setSuccessMessage("");

    const startsAt = new Date();
    const endsAt = new Date(
      startsAt.getTime() + Number(sessionDuration) * 60_000
    );
    const sessionData = {
      check_in_code: generateCheckInCode(),
      status: "open",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      closed_at: null,
      created_by: userId,
      updated_at: startsAt.toISOString(),
    };

    const result = selectedSession
      ? await supabase
          .from("attendance_sessions")
          .update(sessionData)
          .eq("id", selectedSession.id)
      : await supabase.from("attendance_sessions").insert({
          ...sessionData,
          course_id: courseId,
          class_date: selectedDate,
        });

    if (result.error) {
      setErrorMessage(`Failed to start check-in: ${result.error.message}`);
    } else {
      setSuccessMessage(
        `Student check-in is open for ${sessionDuration} minutes.`
      );
      setStatusFilter("unmarked");
      setClock(Date.now());
      await fetchAttendance(false);
    }

    setIsManagingSession(false);
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
    } else {
      setSuccessMessage(
        "Student check-in closed. Review the remaining students below."
      );
      setStatusFilter("unmarked");
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

  const deleteClassRecord = async () => {
    if (!selectedSession || sessionIsOpen) return;

    setIsDeletingClass(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase.rpc("delete_attendance_class", {
      p_session_id: selectedSession.id,
    });
    const result = data as
      | { success?: boolean; message?: string }
      | null;

    if (error) {
      setErrorMessage(`Failed to delete class record: ${error.message}`);
    } else if (!result?.success) {
      setErrorMessage(result?.message || "Failed to delete class record.");
    } else {
      setDeleteConfirmationOpen(false);
      setSelectedDate(today);
      setSuccessMessage(result.message || "Class attendance record deleted.");
      await fetchAttendance(false);
    }

    setIsDeletingClass(false);
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

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const existingRecords = new Map(
      records
        .filter((record) => record.class_date === selectedDate)
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
          class_date: selectedDate,
          marked_present: receivesAttendanceCredit(status),
          marked_by: userId,
          marked_at: new Date().toISOString(),
          session_id: selectedSession?.id || existingRecord?.session_id || null,
          status,
          check_in_at: existingRecord?.check_in_at || null,
          check_in_method: existingRecord?.check_in_method || "manual",
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    const { error } = await supabase
      .from("attendance")
      .upsert(attendanceRows, {
        onConflict: "course_id,student_id,class_date",
      });

    if (error) {
      setErrorMessage(`Failed to save attendance: ${error.message}`);
    } else {
      setSuccessMessage(
        `Attendance saved for ${formatClassDate(selectedDate)}.`
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
          sessionDuration={sessionDuration}
          selectedSession={selectedSession}
          sessionIsOpen={sessionIsOpen}
          sessionHasExpired={sessionHasExpired}
          canOpenCheckIn={canOpenCheckIn}
          isManagingSession={isManagingSession}
          onSelectedDateChange={(value) => {
            setSelectedDate(value);
            setSuccessMessage("");
          }}
          onSessionDurationChange={setSessionDuration}
          onCopyCode={copyCheckInCode}
          onCloseSession={() => void closeCheckInSession()}
          onCorrectDate={openDateCorrection}
          onDeleteClass={() => setDeleteConfirmationOpen(true)}
          onStartSession={() => setStartConfirmationOpen(true)}
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
          pageSize={PAGE_SIZE}
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
      </div>

      <RecentClasses
        sessions={sessionSummaries}
        selectedDate={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          setSuccessMessage("");
        }}
      />
      </div>

      <TeacherAttendanceDialogs
        selectedDate={selectedDate}
        today={today}
        sessionDuration={sessionDuration}
        selectedSession={selectedSession}
        startOpen={startConfirmationOpen}
        correctionOpen={correctionDialogOpen}
        deleteOpen={deleteConfirmationOpen}
        correctedDate={correctedDate}
        errorMessage={errorMessage}
        isCorrectingDate={isCorrectingDate}
        isDeletingClass={isDeletingClass}
        onStartOpenChange={setStartConfirmationOpen}
        onCorrectionOpenChange={setCorrectionDialogOpen}
        onDeleteOpenChange={setDeleteConfirmationOpen}
        onCorrectedDateChange={(value) => {
          setCorrectedDate(value);
          setErrorMessage("");
        }}
        onConfirmStart={() => {
          setStartConfirmationOpen(false);
          void startCheckInSession();
        }}
        onCorrectDate={() => void correctClassDate()}
        onDeleteClass={() => void deleteClassRecord()}
      />
    </>
  );
}
