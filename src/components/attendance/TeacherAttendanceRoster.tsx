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
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-col gap-2 border-b bg-muted/10 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              placeholder="Search students..."
              className="h-9 pl-9"
              onChange={(event) =>
                onSearchQueryChange(event.target.value)
              }
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
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
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
            onClick={onMarkRemainingAbsent}
            disabled={unmarkedCount === 0 || isSaving}
          >
            <UserX className="mr-2 h-4 w-4" />
            Remaining Absent
          </Button>
          <Button
            type="button"
            size="sm"
            className="hidden sm:inline-flex"
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
          <div className="hidden grid-cols-[minmax(0,1fr)_180px] border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground sm:grid">
            <span>Student</span>
            <span>Attendance Status</span>
          </div>
          <div className="space-y-2 p-3 sm:space-y-0 sm:divide-y sm:p-0">
            {paginatedStudents.map((student) => {
              const status = draft[student.id] ?? null;
              const record = selectedRecordsByStudent.get(student.id);
              const statusLabel =
                record?.check_in_method === "code" && record.check_in_at
                  ? `Self check-in at ${formatTime(record.check_in_at)}`
                  : status
                    ? STATUS_OPTIONS.find(
                        (option) => option.value === status
                      )?.label
                    : "Not checked in";

              return (
                <div key={student.id}>
                  <div className="rounded-lg border bg-muted/10 p-3 sm:hidden">
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
                          {statusLabel}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      {STATUS_OPTIONS.map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          size="sm"
                          variant={
                            status === option.value ? "default" : "outline"
                          }
                          className="h-8 px-1 text-[11px]"
                          disabled={isSaving}
                          onClick={() =>
                            onStatusChange(student.id, option.value)
                          }
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="hidden flex-col gap-3 px-4 py-3 sm:flex sm:flex-row sm:items-center sm:justify-between">
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
                          {statusLabel}
                        </p>
                      </div>
                    </div>

                    <Select
                      value={status || undefined}
                      onValueChange={(value) =>
                        onStatusChange(
                          student.id,
                          value as AttendanceStatus
                        )
                      }
                    >
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Set status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                onClick={() =>
                  onPageChange(Math.max(1, currentPage - 1))
                }
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
