import {
  CalendarCog,
  CheckCircle2,
  Copy,
  Download,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Square,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  formatSessionSlotLabel,
  formatSessionWindow,
  formatClassDate,
  formatTime,
  getSessionCheckInEnd,
  getSessionScheduledEnd,
  getSessionTimingState,
  type AttendanceSession,
} from "./attendanceTypes";

interface TeacherAttendanceControlsProps {
  selectedDate: string;
  today: string;
  classHours: string;
  classStartTime: string;
  sessionDuration: string;
  sessionsForDate: AttendanceSession[];
  selectedSessionId: string | null;
  selectedSession: AttendanceSession | null;
  sessionIsOpen: boolean;
  sessionIsUpcoming: boolean;
  sessionHasExpired: boolean;
  canOpenCheckIn: boolean;
  showClassCompletionNotice: boolean;
  reviewCompletedClass: boolean;
  isManagingSession: boolean;
  isExportingAttendanceSummary: boolean;
  canExportAttendanceSummary: boolean;
  missingSlotCount: number;
  canAddMissingSlots: boolean;
  unmarkedCount: number;
  studentCount: number;
  onSelectedDateChange: (value: string) => void;
  onClassHoursChange: (value: string) => void;
  onClassStartTimeChange: (value: string) => void;
  onSessionDurationChange: (value: string) => void;
  onSelectedSessionChange: (value: string) => void;
  onExportAttendanceSummary: () => void;
  onAddMissingSlots: () => void;
  onCopyCode: () => void;
  onCloseSession: () => void;
  onCorrectDate: () => void;
  onStartSession: () => void;
  onExitCompletedReview: () => void;
}

export function TeacherAttendanceControls({
  selectedDate,
  today,
  classHours,
  classStartTime,
  sessionDuration,
  sessionsForDate,
  selectedSessionId,
  selectedSession,
  sessionIsOpen,
  sessionIsUpcoming,
  sessionHasExpired,
  canOpenCheckIn,
  showClassCompletionNotice,
  reviewCompletedClass,
  isManagingSession,
  isExportingAttendanceSummary,
  canExportAttendanceSummary,
  missingSlotCount,
  canAddMissingSlots,
  unmarkedCount,
  studentCount,
  onSelectedDateChange,
  onClassHoursChange,
  onClassStartTimeChange,
  onSessionDurationChange,
  onSelectedSessionChange,
  onExportAttendanceSummary,
  onAddMissingSlots,
  onCopyCode,
  onCloseSession,
  onCorrectDate,
  onStartSession,
  onExitCompletedReview,
}: TeacherAttendanceControlsProps) {
  const hasSessionsForDate = sessionsForDate.length > 0;
  const now = Date.now();
  const selectedSessionIsClosed = selectedSession?.status === "closed";
  const selectedSessionIsCompleted =
    Boolean(selectedSessionIsClosed) && studentCount > 0 && unmarkedCount === 0;
  const selectedSessionNeedsReview =
    Boolean(selectedSessionIsClosed) && unmarkedCount > 0;
  const selectedSessionCanComplete =
    Boolean(selectedSession) &&
    !selectedSessionIsClosed &&
    studentCount > 0 &&
    unmarkedCount === 0;
  const completedSlotCount = sessionsForDate.filter(
    (session) => session.status === "closed",
  ).length;
  const classIsCompleted =
    hasSessionsForDate &&
    missingSlotCount === 0 &&
    completedSlotCount === sessionsForDate.length;
  const hideCompletedClassDetails = classIsCompleted && !reviewCompletedClass;
  const formatCompactSessionWindow = (session: AttendanceSession) => {
    const formatCompactTime = (date: string) =>
      new Date(date).toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

    return `${formatCompactTime(session.starts_at)}–${formatCompactTime(
      getSessionScheduledEnd(session).toISOString(),
    )}`;
  };

  const getSessionState = (session: AttendanceSession) => {
    if (session.status === "closed") {
      return {
        label: "Completed",
        className:
          "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300",
      };
    }

    const timingState = getSessionTimingState(session, now);

    if (timingState === "upcoming") {
      return {
        label: "Upcoming",
        className:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
      };
    }

    if (timingState === "expired") {
      return {
        label: "Needs finalize",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
      };
    }

    return {
      label: "Open",
      className:
        "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300",
    };
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold sm:text-lg">
              Class Setup
            </h2>
            <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
              Create hourly check-in slots and review each class hour.
            </p>
          </div>
          <div className="grid w-full gap-2">
            <Button
              type="button"
              variant="outline"
              className="justify-center whitespace-nowrap"
              onClick={onExportAttendanceSummary}
              disabled={
                !canExportAttendanceSummary || isExportingAttendanceSummary
              }
            >
              {isExportingAttendanceSummary ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export Summary
            </Button>
          </div>
        </div>

        {classIsCompleted && showClassCompletionNotice && !reviewCompletedClass && (
          <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/35 dark:text-green-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Class Attendance Completed</p>
              <p className="text-xs">
                All {completedSlotCount} hour slot
                {completedSlotCount === 1 ? "" : "s"} for{" "}
                {formatClassDate(selectedDate)} are completed and saved in
                Recent Classes. Select it from Recent Classes if you need to review it.
              </p>
            </div>
          </div>
        )}

        {reviewCompletedClass && (
          <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-200 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Reviewing Completed Attendance</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 border-blue-200 bg-white text-blue-700 hover:bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200 dark:hover:bg-blue-950/40 sm:w-auto"
              onClick={onExitCompletedReview}
            >
              Exit Review
            </Button>
          </div>
        )}

        {hasSessionsForDate && !hideCompletedClassDetails && (
          <div className="order-3 border-t pt-4">
            <p className="mb-2 text-sm font-medium">Hourly Check-In Slots</p>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                {sessionsForDate.map((session) => {
                  const state = getSessionState(session);

                  return (
                    <button
                      type="button"
                      key={session.id}
                      onClick={() => onSelectedSessionChange(session.id)}
                      className={`min-w-0 rounded-md border px-2 py-2 text-center text-xs transition-colors ${
                        selectedSessionId === session.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-blue-100 bg-blue-50/40 text-blue-700 hover:bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300"
                      }`}
                      title={`${formatSessionSlotLabel(session)} · ${
                        state.label
                      } · ${formatSessionWindow(session)}`}
                    >
                      <span className="block truncate font-semibold">
                        {formatCompactSessionWindow(session)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {missingSlotCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center"
                  onClick={onAddMissingSlots}
                  disabled={!canAddMissingSlots || isManagingSession}
                >
                  {isManagingSession ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Add {missingSlotCount} Missing Hour Slot
                  {missingSlotCount === 1 ? "" : "s"}
                </Button>
              )}
            </div>
          </div>
        )}

        {hasSessionsForDate && selectedSession && !hideCompletedClassDetails && (
          <div className="order-4 space-y-3">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/10 p-3">
              <div className="flex flex-wrap items-center gap-3">
              {selectedSessionIsCompleted ? (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Reviewing Saved Slot
                  </p>
                  <p className="text-base font-semibold">
                    {formatSessionSlotLabel(selectedSession)} completed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Original code:{" "}
                    <span className="font-mono tracking-[0.12em]">
                      {selectedSession.check_in_code}
                    </span>
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {formatSessionSlotLabel(selectedSession)} Code
                    </p>
                    <p className="font-mono text-2xl font-semibold tracking-[0.2em]">
                      {selectedSession.check_in_code}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    title="Copy check-in code"
                    onClick={onCopyCode}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Badge
                variant="outline"
                className={
                  selectedSessionIsCompleted
                    ? "border-green-200 bg-green-50 text-green-700"
                    : sessionIsOpen
                    ? "border-green-200 bg-green-50 text-green-700"
                    : sessionIsUpcoming
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-gray-50 text-gray-700"
                }
              >
                {selectedSessionIsCompleted
                  ? "Saved in Recent Classes"
                  : sessionIsOpen
                  ? `Open until ${formatTime(getSessionCheckInEnd(selectedSession).toISOString())}`
                  : sessionIsUpcoming
                    ? `Opens at ${formatTime(selectedSession.starts_at)}`
                    : sessionHasExpired
                      ? "Expired"
                  : "Closed"}
              </Badge>
            </div>
            {selectedSessionCanComplete ? (
              <Button
                type="button"
                className="w-full justify-center"
                onClick={onCloseSession}
                disabled={isManagingSession}
              >
                {isManagingSession ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Complete Slot
              </Button>
            ) : sessionIsOpen ? (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                onClick={onCloseSession}
                disabled={isManagingSession}
              >
                {isManagingSession ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Square className="mr-2 h-4 w-4" />
                )}
                Close & Mark Missing Absent
              </Button>
            ) : sessionHasExpired ? (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                onClick={onCloseSession}
                disabled={isManagingSession}
              >
                {isManagingSession ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Square className="mr-2 h-4 w-4" />
                )}
                Finalize Slot
              </Button>
            ) : (
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCorrectDate}
                  disabled={isManagingSession}
                >
                  <CalendarCog className="mr-2 h-4 w-4" />
                  Correct Date
                </Button>
                <Button
                  type="button"
                  onClick={onStartSession}
                  disabled={isManagingSession || !canOpenCheckIn}
                >
                  {isManagingSession ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : sessionIsUpcoming ? (
                    <Play className="mr-2 h-4 w-4" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  {sessionIsUpcoming ? "Open Check-In Now" : "Reopen with New Code"}
              </Button>
            </div>
            )}
            </div>

            {selectedSessionIsCompleted ? (
              <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/35 dark:text-green-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Attendance Completed</p>
                  <p className="text-xs">
                    {formatSessionSlotLabel(selectedSession)} is closed, all
                    students have a status, and this class is saved in Recent
                    Classes.
                  </p>
                </div>
              </div>
            ) : selectedSessionCanComplete ? (
              <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/35 dark:text-green-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Ready to Complete</p>
                  <p className="text-xs">
                    All students already have a status for this hour. Click
                    Complete Slot to close it and save it as a completed record
                    in Recent Classes.
                  </p>
                </div>
              </div>
            ) : selectedSessionNeedsReview ? (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Attendance Needs Review</p>
                  <p className="text-xs">
                    This hour is closed, but {unmarkedCount} student
                    {unmarkedCount === 1 ? "" : "s"} still need
                    an attendance status before it is complete.
                  </p>
                </div>
              </div>
            ) : sessionHasExpired ? (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Check-in Window Ended</p>
                  <p className="text-xs">
                    Click Finalize Slot to close this hour, mark remaining
                    students absent, and save it to Recent Classes.
                  </p>
                </div>
              </div>
            ) : sessionIsOpen || sessionIsUpcoming ? (
              <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-200">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">
                    {sessionIsOpen ? "Attendance In Progress" : "Attendance Scheduled"}
                  </p>
                  <p className="text-xs">
                    This hour is not completed yet. Close or finalize it after
                    check-in to finish the attendance record.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="order-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <div className="w-full">
            <label
              htmlFor="attendance-date"
              className="mb-1 block text-xs font-medium"
            >
              Class Date
            </label>
            <Input
              id="attendance-date"
              type="date"
              value={selectedDate}
              max={today}
              onChange={(event) =>
                onSelectedDateChange(event.target.value)
              }
            />
          </div>
          <div className="w-full">
            <label
              htmlFor="attendance-start-time"
              className="mb-1 block text-xs font-medium"
            >
              Start Time
            </label>
            <Input
              id="attendance-start-time"
              type="time"
              value={classStartTime}
              disabled={hasSessionsForDate}
              onChange={(event) =>
                onClassStartTimeChange(event.target.value)
              }
            />
          </div>
          <div className="w-full">
            <label className="mb-1 block text-xs font-medium">
              Class Hours
            </label>
            <Select
              value={classHours}
              onValueChange={onClassHoursChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="2">2 hours</SelectItem>
                <SelectItem value="3">3 hours</SelectItem>
                <SelectItem value="4">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full">
            <label className="mb-1 block text-xs font-medium">
              Check-In Window
            </label>
            <Select
              value={sessionDuration}
              onValueChange={onSessionDurationChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!hasSessionsForDate && (
          <div className="order-3 flex flex-col gap-3 border-t pt-4">
            <div>
              <p className="text-sm font-medium">
                No check-in slots for this date
              </p>
              <p className="text-xs text-muted-foreground">
                {canOpenCheckIn
                  ? `Creating this class makes ${classHours} hourly check-in slot${
                      classHours === "1" ? "" : "s"
                    }.`
                  : "Student check-in slots can only be created for today's class."}
              </p>
            </div>
            <Button
              type="button"
              className="w-full justify-center whitespace-nowrap"
              onClick={onStartSession}
              disabled={isManagingSession || !canOpenCheckIn}
            >
              {isManagingSession ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Create Hourly Check-In Slots
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
