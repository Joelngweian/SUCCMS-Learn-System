import { useEffect, useMemo, useState } from "react";
import {
  getRecordStatus,
  type AttendanceFilter,
  type AttendanceRecord,
  type AttendanceSession,
  type AttendanceStatus,
  type CourseStudent,
} from "./attendanceTypes";

export const ATTENDANCE_ROSTER_PAGE_SIZE = 25;

type UseAttendanceRosterStateArgs = {
  isLecturer: boolean;
  onClearMessages: () => void;
  records: AttendanceRecord[];
  selectedDate: string;
  selectedSession: AttendanceSession | null;
  sortedStudents: CourseStudent[];
};

export const useAttendanceRosterState = ({
  isLecturer,
  onClearMessages,
  records,
  selectedDate,
  selectedSession,
  sortedStudents,
}: UseAttendanceRosterStateArgs) => {
  const [draft, setDraft] = useState<Record<string, AttendanceStatus | null>>(
    {},
  );
  const [dirtyStudentIds, setDirtyStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<AttendanceFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isLecturer) return;

    const recordsForDate = new Map(
      records
        .filter((record) =>
          selectedSession
            ? record.session_id === selectedSession.id
            : record.class_date === selectedDate && record.session_id == null,
        )
        .map((record) => [record.student_id, getRecordStatus(record)]),
    );

    setDraft(
      Object.fromEntries(
        sortedStudents.map((student) => [
          student.id,
          recordsForDate.get(student.id) || null,
        ]),
      ),
    );
    setDirtyStudentIds(new Set());
    onClearMessages();
  }, [
    isLecturer,
    onClearMessages,
    records,
    selectedDate,
    selectedSession,
    sortedStudents,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDate, statusFilter]);

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
          .filter((record) =>
            selectedSession
              ? record.session_id === selectedSession.id
              : record.class_date === selectedDate && record.session_id == null,
          )
          .map((record) => [record.student_id, record]),
      ),
    [records, selectedDate, selectedSession],
  );

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
    Math.ceil(filteredStudents.length / ATTENDANCE_ROSTER_PAGE_SIZE),
  );
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ATTENDANCE_ROSTER_PAGE_SIZE,
    currentPage * ATTENDANCE_ROSTER_PAGE_SIZE,
  );

  const updateStatus = (studentId: string, value: AttendanceStatus) => {
    setDraft((current) => ({ ...current, [studentId]: value }));
    setDirtyStudentIds((current) => new Set(current).add(studentId));
    onClearMessages();
  };

  const setStatuses = (
    predicate: (studentId: string) => boolean,
    status: AttendanceStatus,
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
    onClearMessages();
  };

  return {
    currentPage,
    dirtyStudentIds,
    draft,
    filteredStudents,
    pageSize: ATTENDANCE_ROSTER_PAGE_SIZE,
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
  };
};
