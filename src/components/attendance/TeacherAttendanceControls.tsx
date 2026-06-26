import {
  CalendarCog,
  Copy,
  Download,
  Loader2,
  Play,
  RotateCcw,
  Square,
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
  formatTime,
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
  isManagingSession: boolean;
  isExportingAttendance: boolean;
  isExportingAttendanceSummary: boolean;
  canExportAttendance: boolean;
  canExportAttendanceSummary: boolean;
  missingSlotCount: number;
  canAddMissingSlots: boolean;
  onSelectedDateChange: (value: string) => void;
  onClassHoursChange: (value: string) => void;
  onClassStartTimeChange: (value: string) => void;
  onSessionDurationChange: (value: string) => void;
  onSelectedSessionChange: (value: string) => void;
  onExportAttendance: () => void;
  onExportAttendanceSummary: () => void;
  onAddMissingSlots: () => void;
  onCopyCode: () => void;
  onCloseSession: () => void;
  onCorrectDate: () => void;
  onStartSession: () => void;
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
  isManagingSession,
  isExportingAttendance,
  isExportingAttendanceSummary,
  canExportAttendance,
  canExportAttendanceSummary,
  missingSlotCount,
  canAddMissingSlots,
  onSelectedDateChange,
  onClassHoursChange,
  onClassStartTimeChange,
  onSessionDurationChange,
  onSelectedSessionChange,
  onExportAttendance,
  onExportAttendanceSummary,
  onAddMissingSlots,
  onCopyCode,
  onCloseSession,
  onCorrectDate,
  onStartSession,
}: TeacherAttendanceControlsProps) {
  const hasSessionsForDate = sessionsForDate.length > 0;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Class Attendance</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Create one check-in slot per class hour, then review each hour
              separately.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 self-start">
            <Button
              type="button"
              variant="outline"
              onClick={onExportAttendance}
              disabled={!canExportAttendance || isExportingAttendance}
            >
              {isExportingAttendance ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export Current Class
            </Button>
            <Button
              type="button"
              variant="outline"
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

        {hasSessionsForDate && (
          <div className="border-t pt-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {sessionsForDate.map((session) => (
                  <button
                    type="button"
                    key={session.id}
                    onClick={() => onSelectedSessionChange(session.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selectedSessionId === session.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <span className="block font-medium">
                      {formatSessionSlotLabel(session)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatSessionWindow(session)}
                    </span>
                  </button>
                ))}
              </div>

              {missingSlotCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
      </div>

      <div className="mt-4 border-t pt-4">
        {hasSessionsForDate ? (
          <div className="space-y-4">
            {selectedSession && (
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/10 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
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
              <Badge
                variant="outline"
                className={
                  sessionIsOpen
                    ? "border-green-200 bg-green-50 text-green-700"
                    : sessionIsUpcoming
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-gray-50 text-gray-700"
                }
              >
                {sessionIsOpen
                  ? `Open until ${formatTime(selectedSession.ends_at)}`
                  : sessionIsUpcoming
                    ? `Opens at ${formatTime(selectedSession.starts_at)}`
                  : sessionHasExpired
                    ? "Expired"
                    : "Closed"}
              </Badge>
            </div>
            {sessionIsOpen ? (
              <Button
                type="button"
                variant="outline"
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
              <div className="flex flex-wrap gap-2">
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
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Reopen with New Code
                </Button>
              </div>
            )}
          </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
