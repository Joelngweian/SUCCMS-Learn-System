import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleX,
  ClipboardCheck,
  Clock3,
  Loader2,
  LogIn,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import {
  formatClassDate,
  formatTime,
  getRecordStatus,
  STATUS_OPTIONS,
  STATUS_STYLES,
  type AttendanceRecord,
  type StudentAttendanceSummary,
} from "./attendanceTypes";

interface StudentAttendanceViewProps {
  records: AttendanceRecord[];
  summary: StudentAttendanceSummary;
  checkInCode: string;
  onCheckInCodeChange: (value: string) => void;
  onCheckIn: () => void;
  isCheckingIn: boolean;
  errorMessage: string;
  successMessage: string;
}

export function StudentAttendanceView({
  records,
  summary,
  checkInCode,
  onCheckInCodeChange,
  onCheckIn,
  isCheckingIn,
  errorMessage,
  successMessage,
}: StudentAttendanceViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">My Attendance</h2>
        <p className="text-sm text-muted-foreground">
          Check in during class and review your attendance record.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <LogIn className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Class Check-In</h3>
            <p className="text-sm text-muted-foreground">
              Enter the six-character code shown by your lecturer.
            </p>
          </div>
        </div>
        <div className="flex max-w-md flex-col gap-2 sm:flex-row">
          <Input
            value={checkInCode}
            maxLength={6}
            placeholder="Enter code"
            aria-label="Attendance check-in code"
            className="uppercase"
            onChange={(event) =>
              onCheckInCodeChange(
                event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase()
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") onCheckIn();
            }}
          />
          <Button
            type="button"
            onClick={onCheckIn}
            disabled={isCheckingIn || checkInCode.length !== 6}
          >
            {isCheckingIn ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Check In
          </Button>
        </div>
      </div>

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-blue-50 p-2 text-blue-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
              <p className="text-xl font-semibold">
                {summary.rate == null ? "--" : `${summary.rate}%`}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-green-50 p-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Present</p>
              <p className="text-xl font-semibold">{summary.present}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-amber-50 p-2 text-amber-600">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Late</p>
              <p className="text-xl font-semibold">{summary.late}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-red-50 p-2 text-red-600">
              <CircleX className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Absent</p>
              <p className="text-xl font-semibold">{summary.absent}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {records.length === 0 ? (
        <div className="rounded-lg border bg-muted/10 py-14 text-center">
          <CalendarDays className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
          <p className="font-medium">No attendance recorded yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your attendance history will appear here after class.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="grid grid-cols-[1fr_auto] border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
            <span>Class Date</span>
            <span>Status</span>
          </div>
          <div className="divide-y">
            {records.map((record) => {
              const status = getRecordStatus(record);
              return (
                <div
                  key={record.id}
                  className="grid grid-cols-[1fr_auto] items-center px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {formatClassDate(record.class_date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.check_in_at
                        ? `Checked in at ${formatTime(record.check_in_at)}`
                        : `Recorded ${new Date(
                            record.marked_at
                          ).toLocaleDateString("en-MY")}`}
                    </p>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLES[status]}>
                    {STATUS_OPTIONS.find((option) => option.value === status)
                      ?.label || status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
