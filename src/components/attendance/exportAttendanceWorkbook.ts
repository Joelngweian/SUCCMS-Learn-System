import type { SheetData } from "write-excel-file/browser";
import {
  formatClassDate,
  formatSessionSlotLabel,
  formatTime,
  getRecordStatus,
  receivesAttendanceCredit,
  STATUS_OPTIONS,
  type AttendanceRecord,
  type AttendanceSession,
  type CourseStudent,
} from "./attendanceTypes";

type ExportAttendanceWorkbookOptions = {
  courseCode?: string;
  courseName?: string;
  courseId: string;
  reportType?: string;
  fileSuffix?: string;
  students: CourseStudent[];
  records: AttendanceRecord[];
  sessions: AttendanceSession[];
};

const HEADER_CELL = {
  fontWeight: "bold" as const,
  backgroundColor: "#eef2ff",
  borderColor: "#c7d2fe",
  borderStyle: "thin" as const,
  wrap: true,
};

const INFO_CELL = {
  fontWeight: "bold" as const,
  backgroundColor: "#f8fafc",
};

const ATTENDED_CELL = {
  align: "center" as const,
  fontWeight: "bold" as const,
  color: "#047857",
  backgroundColor: "#ecfdf5",
};

const MISSED_CELL = {
  align: "center" as const,
  fontWeight: "bold" as const,
  color: "#b91c1c",
  backgroundColor: "#fef2f2",
};

const STATUS_LABELS = new Map(
  STATUS_OPTIONS.map((option) => [option.value, option.label]),
);

const sanitizeSheetText = (value: string | null | undefined) => {
  const text = (value || "").trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};

const safeFilePart = (value: string | null | undefined, fallback: string) => {
  const cleaned = (value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return cleaned || fallback;
};

const toDateCell = (date: string) => new Date(`${date}T00:00:00`);

const isAttendedStatus = (status: string | null) =>
  status === "present" || status === "late";

export async function exportAttendanceWorkbook({
  courseCode,
  courseName,
  courseId,
  reportType = "Attendance Summary",
  fileSuffix = "attendance",
  students,
  records,
  sessions,
}: ExportAttendanceWorkbookOptions) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");

  const courseLabel = [courseCode, courseName].filter(Boolean).join(" - ");
  const exportDate = new Date();
  const sortedSessions = [...sessions].sort((left, right) => {
    const dateSort = left.class_date.localeCompare(right.class_date);
    if (dateSort !== 0) return dateSort;
    const slotSort = (left.slot_no || 1) - (right.slot_no || 1);
    if (slotSort !== 0) return slotSort;
    return left.starts_at.localeCompare(right.starts_at);
  });
  const legacyClassDates = Array.from(
    new Set([
      ...records.map((record) => record.class_date),
    ]),
  ).sort((left, right) => left.localeCompare(right));
  const sessionsByDate = new Map<string, AttendanceSession[]>();
  sortedSessions.forEach((session) => {
    const current = sessionsByDate.get(session.class_date) || [];
    current.push(session);
    sessionsByDate.set(session.class_date, current);
  });
  const attendanceColumns =
    sortedSessions.length > 0
      ? sortedSessions.map((session) => ({
          key: `session:${session.id}`,
          label: `${formatClassDate(session.class_date)} ${formatSessionSlotLabel(session)}`,
        }))
      : legacyClassDates.map((date) => ({
          key: `date:${date}`,
          label: formatClassDate(date),
        }));
  const sessionById = new Map(
    sortedSessions.map((session) => [session.id, session]),
  );
  const recordsByStudentAndColumn = new Map<string, AttendanceRecord>();

  records.forEach((record) => {
    const dateSessions = sessionsByDate.get(record.class_date) || [];
    const matchedSession =
      record.session_id != null
        ? sessionById.get(record.session_id)
        : dateSessions.length === 1
          ? dateSessions[0]
          : null;
    const columnKey = matchedSession
      ? `session:${matchedSession.id}`
      : `date:${record.class_date}`;

    recordsByStudentAndColumn.set(`${record.student_id}:${columnKey}`, record);
  });

  const summaryHeader = [
    "No.",
    "Student Name",
    "User ID",
    "Attended Slots",
    "Missed Slots",
    "Total Slots",
    "Attendance Rate",
    ...attendanceColumns.map((column) => column.label),
  ].map((value) => ({ value, ...HEADER_CELL }));

  const summaryRows = students.map((student, index) => {
    const studentRecords = attendanceColumns.map((column) =>
      recordsByStudentAndColumn.get(`${student.id}:${column.key}`),
    );
    const statuses = studentRecords.map((record) =>
      record ? getRecordStatus(record) : null,
    );
    const attended = statuses.filter(isAttendedStatus).length;
    const totalSlots = attendanceColumns.length;
    const missed = totalSlots - attended;
    const attendanceRate =
      totalSlots > 0 ? Math.round((attended / totalSlots) * 100) / 100 : 0;

    return [
      index + 1,
      sanitizeSheetText(student.full_name || "Unknown Student"),
      sanitizeSheetText(student.id),
      attended,
      missed,
      totalSlots,
      {
        value: attendanceRate,
        type: Number,
        format: "0%",
      },
      ...statuses.map((status) =>
        isAttendedStatus(status)
          ? { value: "✓", ...ATTENDED_CELL }
          : { value: "✗", ...MISSED_CELL },
      ),
    ];
  });

  const summaryData: SheetData = [
    [{ value: "Report Type", ...INFO_CELL }, sanitizeSheetText(reportType)],
    [{ value: "Course", ...INFO_CELL }, sanitizeSheetText(courseLabel || courseId)],
    [{ value: "Exported At", ...INFO_CELL }, exportDate],
    [{ value: "Students", ...INFO_CELL }, students.length],
    [{ value: "Attendance Slots", ...INFO_CELL }, attendanceColumns.length],
    [],
    summaryHeader,
    ...summaryRows,
  ];

  const recordHeader = [
    "Class Date",
    "Slot",
    "Student Name",
    "User ID",
    "Status",
    "Credited",
    "Check-In Method",
    "Check-In At",
    "Marked At",
    "Marked By",
  ].map((value) => ({ value, ...HEADER_CELL }));

  const studentNameById = new Map(
    students.map((student) => [
      student.id,
      sanitizeSheetText(student.full_name || "Unknown Student"),
    ]),
  );
  const recordRows = [...records]
    .sort((left, right) => {
      const dateSort = left.class_date.localeCompare(right.class_date);
      if (dateSort !== 0) return dateSort;
      const leftSession = left.session_id
        ? sessionById.get(left.session_id)
        : null;
      const rightSession = right.session_id
        ? sessionById.get(right.session_id)
        : null;
      const slotSort =
        (leftSession?.slot_no || 1) - (rightSession?.slot_no || 1);
      if (slotSort !== 0) return slotSort;
      return (studentNameById.get(left.student_id) || "").localeCompare(
        studentNameById.get(right.student_id) || "",
      );
    })
    .map((record) => {
      const status = getRecordStatus(record);
      const recordSession = record.session_id
        ? sessionById.get(record.session_id)
        : null;
      return [
        toDateCell(record.class_date),
        sanitizeSheetText(
          recordSession ? formatSessionSlotLabel(recordSession) : "",
        ),
        studentNameById.get(record.student_id) || sanitizeSheetText(record.student_id),
        sanitizeSheetText(record.student_id),
        sanitizeSheetText(STATUS_LABELS.get(status) || status),
        receivesAttendanceCredit(status) ? "Yes" : "No",
        sanitizeSheetText(record.check_in_method || "manual"),
        record.check_in_at ? formatTime(record.check_in_at) : "",
        record.marked_at ? new Date(record.marked_at) : "",
        sanitizeSheetText(record.marked_by || ""),
      ];
    });

  const recordsData: SheetData = [recordHeader, ...recordRows];
  const fileDate = exportDate.toISOString().slice(0, 10);
  const fileName = `${safeFilePart(courseCode || courseName, "course")}-${safeFilePart(fileSuffix, "attendance")}-${fileDate}.xlsx`;

  await writeExcelFile(
    [
      {
        sheet: "Summary",
        data: summaryData,
        columns: [
          { width: 6 },
          { width: 28 },
          { width: 38 },
          { width: 14 },
          { width: 12 },
          { width: 12 },
          { width: 16 },
          ...attendanceColumns.map(() => ({ width: 18 })),
        ],
        stickyRowsCount: 7,
        stickyColumnsCount: 3,
      },
      {
        sheet: "Records",
        data: recordsData,
        columns: [
          { width: 14 },
          { width: 12 },
          { width: 28 },
          { width: 38 },
          { width: 14 },
          { width: 10 },
          { width: 16 },
          { width: 14 },
          { width: 20 },
          { width: 38 },
        ],
        stickyRowsCount: 1,
      },
    ],
    {
      fontFamily: "Calibri",
      fontSize: 11,
    },
  ).toFile(fileName);
}
