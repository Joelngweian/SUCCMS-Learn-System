import {
  CalendarCog,
  Copy,
  Loader2,
  Play,
  RotateCcw,
  Square,
  Trash2,
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
import { formatTime, type AttendanceSession } from "./attendanceTypes";

interface TeacherAttendanceControlsProps {
  selectedDate: string;
  today: string;
  sessionDuration: string;
  selectedSession: AttendanceSession | null;
  sessionIsOpen: boolean;
  sessionHasExpired: boolean;
  canOpenCheckIn: boolean;
  isManagingSession: boolean;
  onSelectedDateChange: (value: string) => void;
  onSessionDurationChange: (value: string) => void;
  onCopyCode: () => void;
  onCloseSession: () => void;
  onCorrectDate: () => void;
  onDeleteClass: () => void;
  onStartSession: () => void;
}

export function TeacherAttendanceControls({
  selectedDate,
  today,
  sessionDuration,
  selectedSession,
  sessionIsOpen,
  sessionHasExpired,
  canOpenCheckIn,
  isManagingSession,
  onSelectedDateChange,
  onSessionDurationChange,
  onCopyCode,
  onCloseSession,
  onCorrectDate,
  onDeleteClass,
  onStartSession,
}: TeacherAttendanceControlsProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Class Attendance</h2>
          <p className="text-sm text-muted-foreground">
            Open student check-in, then review only those who did not respond.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-48">
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
              disabled={selectedSession != null}
              title={
                selectedSession
                  ? "Use Correct Date to change a saved class date."
                  : undefined
              }
              onChange={(event) =>
                onSelectedDateChange(event.target.value)
              }
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="mb-1 block text-xs font-medium">
              Check-In Time
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
        {selectedSession ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Student Check-In Code
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
                    : "border-gray-200 bg-gray-50 text-gray-700"
                }
              >
                {sessionIsOpen
                  ? `Open until ${formatTime(selectedSession.ends_at)}`
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
                Close Check-In
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
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={onDeleteClass}
                  disabled={isManagingSession}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Class
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
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">
                No check-in session for this date
              </p>
              <p className="text-xs text-muted-foreground">
                {canOpenCheckIn
                  ? "Starting a session creates a new six-character code."
                  : "Student check-in can only be opened for today's class."}
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
              Start Student Check-In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
