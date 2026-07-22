import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Search,
  UserX,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
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
  formatTime,
  STATUS_OPTIONS,
  type AttendanceFilter,
  type AttendanceRecord,
  type AttendanceStatus,
  type CourseStudent,
} from "./attendanceTypes";

const STATUS_BADGE_CLASS_NAMES: Record<AttendanceStatus, string> = {
  present:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/35 dark:text-green-300",
  late:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300",
  absent:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-300",
  excused:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-300",
};

const STATUS_BUTTON_CLASS_NAMES: Record<
  AttendanceStatus,
  { idle: string; selected: string }
> = {
  present: {
    idle:
      "text-foreground hover:border-green-200 hover:bg-green-50 hover:text-green-700 dark:hover:border-green-900/60 dark:hover:bg-green-950/35 dark:hover:text-green-300",
    selected:
      "border-green-300 bg-green-50 text-green-700 hover:bg-green-50 dark:border-green-900/60 dark:bg-green-950/35 dark:text-green-300",
  },
  late: {
    idle:
      "text-foreground hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:hover:border-amber-900/60 dark:hover:bg-amber-950/35 dark:hover:text-amber-300",
    selected:
      "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300",
  },
  absent: {
    idle:
      "text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:border-red-900/60 dark:hover:bg-red-950/35",
    selected:
      "border-red-300 bg-red-50 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-300",
  },
  excused: {
    idle:
      "text-blue-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-300 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/35",
    selected:
      "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-300",
  },
};

const getStatusButtonClassName = (
  value: AttendanceStatus,
  isSelected: boolean,
) =>
  [
    "h-8 justify-center gap-1 overflow-hidden rounded-md border px-1.5 text-[11px] font-medium shadow-none xl:text-xs",
    isSelected
      ? STATUS_BUTTON_CLASS_NAMES[value].selected
      : STATUS_BUTTON_CLASS_NAMES[value].idle,
  ].join(" ");

const getStudentIdentifier = (student: CourseStudent) => {
  const emailPrefix = student.email?.split("@")[0]?.trim();
  return emailPrefix ? emailPrefix.toUpperCase() : "—";
};

const getStatusLabel = (status: AttendanceStatus | null) =>
  status
    ? STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
    : "Not checked in";

interface TeacherAttendanceRosterProps {
  students: CourseStudent[];
  filteredStudents: CourseStudent[];
  paginatedStudents: CourseStudent[];
  draft: Record<string, AttendanceStatus | null>;
  selectedRecordsByStudent: Map<string, AttendanceRecord>;
  searchQuery: string;
  statusFilter: AttendanceFilter;
  unmarkedCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  dirtyCount: number;
  isSaving: boolean;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: AttendanceFilter) => void;
  onMarkAllPresent: () => void;
  onMarkRemainingAbsent: () => void;
  onSave: () => void;
  onStatusChange: (studentId: string, value: AttendanceStatus) => void;
  onPageChange: (page: number) => void;
}

export function TeacherAttendanceRoster({
  students,
  filteredStudents,
  paginatedStudents,
  draft,
  selectedRecordsByStudent,
  searchQuery,
  statusFilter,
  unmarkedCount,
  currentPage,
  totalPages,
  pageSize,
  dirtyCount,
  isSaving,
  onSearchQueryChange,
  onStatusFilterChange,
  onMarkAllPresent,
  onMarkRemainingAbsent,
  onSave,
  onStatusChange,
  onPageChange,
}: TeacherAttendanceRosterProps) {
  const renderStatusButton = (
    studentId: string,
    option: (typeof STATUS_OPTIONS)[number],
    status: AttendanceStatus | null,
  ) => {
    const isSelected = status === option.value;

    return (
      <Button
        key={option.value}
        type="button"
        size="sm"
        variant="outline"
        className={getStatusButtonClassName(option.value, isSelected)}
        disabled={isSaving}
        onClick={() => onStatusChange(studentId, option.value)}
      >
      <span className="truncate">{option.label}</span>
      {isSelected && <Check className="h-3 w-3 shrink-0" />}
      </Button>
    );
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/10 p-3 sm:p-4">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            placeholder="Search students..."
            className="h-9 pl-9"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            onStatusFilterChange(value as AttendanceFilter)
          }
        >
          <SelectTrigger className="h-9 w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Students</SelectItem>
            <SelectItem value="unmarked">
              Not Checked In ({unmarkedCount})
            </SelectItem>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none"
          onClick={onMarkAllPresent}
          disabled={students.length === 0 || isSaving}
        >
          <Check className="mr-2 h-4 w-4" />
          All Present
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none"
          onClick={onMarkRemainingAbsent}
          disabled={unmarkedCount === 0 || isSaving}
        >
          <UserX className="mr-2 h-4 w-4" />
          Remaining Absent
        </Button>
        <Button
          type="button"
          size="sm"
          className="hidden sm:inline-flex sm:flex-none"
          onClick={onSave}
          disabled={dirtyCount === 0 || isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {students.length === 0 ? (
        <div className="py-14 text-center">
          <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
          <p className="font-medium">No students enrolled</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add students in the People tab before taking attendance.
          </p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="py-14 text-center">
          <Search className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
          <p className="font-medium">No matching students</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another name or attendance filter.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[32px_minmax(130px,1fr)_88px_110px_minmax(220px,260px)] items-center gap-2 border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground lg:grid">
            <span>#</span>
            <span>Student</span>
            <span>Student ID</span>
            <span>Current Status</span>
            <span>Mark Attendance</span>
          </div>
          <div className="space-y-2 p-3 lg:space-y-0 lg:divide-y lg:p-0">
            {paginatedStudents.map((student, index) => {
              const status = draft[student.id] ?? null;
              const record = selectedRecordsByStudent.get(student.id);
              const rowNumber = (currentPage - 1) * pageSize + index + 1;
              const studentIdentifier = getStudentIdentifier(student);
              const statusLabel = getStatusLabel(status);
              const secondaryText =
                student.email ||
                (record?.check_in_method === "code" && record.check_in_at
                  ? `Self check-in at ${formatTime(record.check_in_at)}`
                  : studentIdentifier);

              return (
                <div key={student.id}>
                  <div className="rounded-lg border bg-muted/10 p-3 lg:hidden">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={student.avatar_url || undefined} />
                        <AvatarFallback>
                          {(student.full_name || "S").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {student.full_name || "Unknown Student"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {studentIdentifier} · {statusLabel}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      {STATUS_OPTIONS.map((option) =>
                        renderStatusButton(student.id, option, status),
                      )}
                    </div>
                  </div>

                  <div className="hidden grid-cols-[32px_minmax(130px,1fr)_88px_110px_minmax(220px,260px)] items-center gap-2 px-4 py-3 lg:grid">
                    <span className="text-sm text-muted-foreground">
                      {rowNumber}
                    </span>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={student.avatar_url || undefined} />
                        <AvatarFallback>
                          {(student.full_name || "S").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {student.full_name || "Unknown Student"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {secondaryText}
                        </p>
                      </div>
                    </div>

                    <span className="truncate text-sm text-muted-foreground">
                      {studentIdentifier}
                    </span>

                    <span
                      className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${
                        status
                          ? STATUS_BADGE_CLASS_NAMES[status]
                          : "border-border bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      {statusLabel}
                    </span>

                    <div className="grid min-w-0 grid-cols-4 gap-1.5">
                      {STATUS_OPTIONS.map((option) =>
                        renderStatusButton(student.id, option, status),
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {dirtyCount > 0 && (
            <div className="sticky bottom-3 z-20 px-3 pb-3 sm:hidden">
              <Button
                type="button"
                className="w-full shadow-lg"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save {dirtyCount} Change{dirtyCount === 1 ? "" : "s"}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filteredStudents.length)} of{" "}
              {filteredStudents.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="min-w-20 text-center text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
