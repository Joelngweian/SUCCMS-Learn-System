import type {
  AttendanceRecord,
  AttendanceSummary,
  CourseStudent,
  SessionSummary,
} from "./attendanceTypes";
import { formatClassDate, formatTime, getRecordStatus } from "./attendanceTypes";
import { CalendarDays, Check, ChevronRight, Download, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

interface AttendanceSummaryCardsProps {
  summary: AttendanceSummary;
}

export function AttendanceSummaryCards({
  summary,
}: AttendanceSummaryCardsProps) {
  const cards = [
    {
      label: "Present",
      value: summary.present,
      className:
        "border-green-200 bg-green-50/70 text-green-700 dark:border-green-900/60 dark:bg-green-950/35 dark:text-green-300",
      valueClassName: "text-green-800 dark:text-green-200",
    },
    {
      label: "Late",
      value: summary.late,
      className:
        "border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300",
      valueClassName: "text-amber-800 dark:text-amber-200",
    },
    {
      label: "Absent",
      value: summary.absent,
      className:
        "border-red-200 bg-red-50/70 text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-300",
      valueClassName: "text-red-800 dark:text-red-200",
    },
    {
      label: "Excused",
      value: summary.excused,
      className:
        "border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-300",
      valueClassName: "text-blue-800 dark:text-blue-200",
    },
    {
      label: "Not Checked In",
      value: summary.unmarked,
      className:
        "border-slate-200 bg-muted/30 text-muted-foreground dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
      valueClassName: "dark:text-slate-100",
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`border-b border-r p-3 last:border-r-0 sm:p-4 lg:border-b-0 ${card.className}`}
        >
          <p className="text-xs">{card.label}</p>
          <p
            className={`mt-1 text-lg font-semibold sm:text-xl ${card.valueClassName}`}
          >
            {card.value}
          </p>
        </div>
      ))}
      </div>
    </div>
  );
}

interface RecentClassesProps {
  sessions: SessionSummary[];
  selectedDate: string;
  onSelect: (date: string) => void;
  students?: CourseStudent[];
  records?: AttendanceRecord[];
  onExportAttendance?: (session: SessionSummary) => void;
  canExportAttendance?: boolean;
  isExportingAttendance?: boolean;
}

const getTodayDateKey = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const formatRecentClassTitle = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-MY", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const formatRecentClassMeta = (session: SessionSummary) => {
  const startTime = session.startsAt ? formatTime(session.startsAt) : "No time";
  const hours = `${session.slots} hour${session.slots === 1 ? "" : "s"}`;
  const window = `${session.checkInWindowMinutes || 15} min window`;
  return `${startTime} · ${hours} · ${window}`;
};

const getStudentDisplayId = (student: CourseStudent) =>
  student.email?.split("@")[0]?.toUpperCase() || student.username || "-";

const getStatusBadgeClassName = (status: string) => {
  if (status === "present") {
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/35 dark:text-green-300";
  }
  if (status === "late") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300";
  }
  if (status === "absent") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-300";
  }
  if (status === "excused") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-300";
  }
  return "border-slate-200 bg-muted/40 text-muted-foreground";
};

const formatStatusLabel = (status: string) =>
  status === "unmarked"
    ? "Not checked in"
    : status.charAt(0).toUpperCase() + status.slice(1);

export function RecentClassesDialogButton({
  sessions,
  selectedDate,
  onSelect,
}: RecentClassesProps) {
  const selectedSession = sessions.find(
    (session) => session.date === selectedDate,
  );

  return (
    <div className="xl:hidden">
      {sessions.length === 0 ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-start gap-2 text-muted-foreground"
          disabled
        >
          <CalendarDays className="h-4 w-4" />
          No recent classes
        </Button>
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-between gap-3 px-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">Recent Classes</span>
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {selectedSession
                  ? formatClassDate(selectedSession.date)
                  : `${sessions.length} saved`}
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-4 sm:p-6">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle>Recent Classes</DialogTitle>
              <DialogDescription>
                Select a saved class date to review or edit attendance.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {sessions.slice(0, 12).map((session) => (
                <DialogClose asChild key={session.date}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selectedDate === session.date
                        ? "border-primary bg-primary/5"
                        : "bg-card hover:bg-muted/40"
                    }`}
                    onClick={() => onSelect(session.date)}
                  >
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        selectedDate === session.date
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {formatClassDate(session.date)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {session.slots} slot
                        {session.slots === 1 ? "" : "s"} ·{" "}
                        {session.present} credited · {session.absent} absent
                      </span>
                    </span>
                  </button>
                </DialogClose>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
export function RecentClasses({
  sessions,
  selectedDate,
  onSelect,
  students = [],
  records = [],
  onExportAttendance,
  canExportAttendance = false,
  isExportingAttendance = false,
}: RecentClassesProps) {
  const [detailsSession, setDetailsSession] = useState<SessionSummary | null>(
    null,
  );
  const today = getTodayDateKey();
  const recordsByStudentAndSession = useMemo(() => {
    const lookup = new Map<string, AttendanceRecord>();

    records.forEach((record) => {
      if (record.student_id && record.session_id) {
        lookup.set(`${record.student_id}:${record.session_id}`, record);
      }
    });

    return lookup;
  }, [records]);

  return (
    <aside className="rounded-xl border bg-card p-4 shadow-sm xl:sticky xl:top-4 xl:self-start">
      <div>
        <h3 className="text-sm font-semibold">Recent Classes</h3>
        <p className="text-xs text-muted-foreground">
          Select a date to review or edit it.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="mt-3 rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
          No saved class sessions yet.
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border">
          {sessions.slice(0, 8).map((session) => (
            <button
              type="button"
              key={session.date}
              onClick={() => {
                onSelect(session.date);
                setDetailsSession(session);
              }}
              className={`flex w-full items-center justify-between gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-b-0 ${
                selectedDate === session.date
                  ? "bg-primary/5"
                  : "bg-card hover:bg-muted/30"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-primary">
                  {formatRecentClassTitle(session.date)}
                  {session.date === today ? " (Today)" : ""}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {formatRecentClassMeta(session)}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(detailsSession)}
        onOpenChange={(open) => {
          if (!open) setDetailsSession(null);
        }}
      >
        <DialogContent
          hideCloseButton
          className="h-[92vh] w-[98vw] !max-w-[98vw] overflow-hidden p-0 sm:!max-w-[1500px]"
        >
          <DialogHeader className="border-b px-4 py-4 text-left sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <DialogTitle>
                  {detailsSession
                    ? formatRecentClassTitle(detailsSession.date)
                    : "Recent Class"}
                </DialogTitle>
                <DialogDescription>
                  {detailsSession ? formatRecentClassMeta(detailsSession) : ""}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {detailsSession && onExportAttendance && (
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-center whitespace-nowrap"
                    onClick={() => onExportAttendance(detailsSession)}
                    disabled={!canExportAttendance || isExportingAttendance}
                  >
                    {isExportingAttendance ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Export Current Class
                  </Button>
                )}
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          {detailsSession && (
            <div className="h-[calc(92vh-92px)] overflow-y-auto p-4 sm:p-6">
              {students.length === 0 ? (
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                  No students enrolled.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border bg-card">
                  <div className="h-full max-h-[calc(92vh-150px)] overflow-auto">
                    <table className="w-full table-fixed text-sm">
                      <colgroup>
                        <col className="w-12" />
                        <col className="w-[30%]" />
                        <col className="w-[18%]" />
                        {detailsSession.sessions.map((slot) => (
                          <col key={slot.id} />
                        ))}
                      </colgroup>
                      <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="px-3 py-2 text-left font-medium">
                            No.
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Student
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Student ID
                          </th>
                          {detailsSession.sessions.map((slot) => (
                            <th
                              key={slot.id}
                              className="px-3 py-2 text-left font-medium"
                            >
                              {slot.slot_label || `Hour ${slot.slot_no || 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, index) => (
                          <tr
                            key={student.id}
                            className="border-b last:border-b-0 hover:bg-muted/20"
                          >
                            <td className="px-3 py-3 text-muted-foreground">
                              {index + 1}
                            </td>
                            <td className="px-3 py-3">
                              <p className="truncate font-medium">
                                {student.full_name ||
                                  student.username ||
                                  "Student"}
                              </p>
                              {student.email && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {student.email}
                                </p>
                              )}
                            </td>
                            <td className="truncate px-3 py-3 text-muted-foreground">
                              {getStudentDisplayId(student)}
                            </td>
                            {detailsSession.sessions.map((slot) => {
                              const record = recordsByStudentAndSession.get(
                                `${student.id}:${slot.id}`,
                              );
                              const status = record
                                ? getRecordStatus(record)
                                : "unmarked";

                              return (
                                <td key={slot.id} className="px-3 py-3">
                                  <span
                                    className={`inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-xs leading-tight ${getStatusBadgeClassName(
                                      status,
                                    )}`}
                                  >
                                    {formatStatusLabel(status)}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </aside>
  );
}
