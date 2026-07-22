import {
  CheckCircle2,
  Info,
  Loader2,
  Search,
  UploadCloud,
  UserRoundCheck,
} from "lucide-react";
import { Alert, AlertDescription } from "../../ui/alert";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { Checkbox } from "../../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { useStaffAcademicPlanningContext } from "./useStaffAcademicPlanningContext";

type StudentAssignmentStatusFilter = "unassigned" | "assigned" | "all";

export function StudentStudyPlansTabContent() {
  const {
    ALL_FILTER_VALUE,
    STUDENT_ASSIGNMENT_PAGE_SIZE,
    studentAssignmentStatusLabel,
    studentAssignmentSummary,
    studentAssignmentVersionOptions,
    selectedStudentAssignmentVersionId,
    setSelectedStudentAssignmentVersionId,
    selectedStudentAssignmentVersion,
    studentAssignmentProgrammeFilter,
    setStudentAssignmentProgrammeFilter,
    studentProgrammeOptions,
    studentAssignmentStatusFilter,
    setStudentAssignmentStatusFilter,
    studentAssignmentSearchTerm,
    setStudentAssignmentSearchTerm,
    isParsingStudentAssignmentImport,
    handleStudentAssignmentImportFileChange,
    selectedStudentIds,
    visibleStudentIds,
    visibleStudentSelectionState,
    toggleVisibleStudentSelection,
    isAssigningStudents,
    handleAssignStudents,
    handleUnassignStudents,
    paginatedStudentAssignmentRows,
    studentAssignmentRows,
    studentAssignmentPageStartIndex,
    studentAssignmentPage,
    studentAssignmentPageCount,
    setStudentAssignmentPage,
    setStudentSelected,
    studentAssignmentImportPreview,
    setStudentAssignmentImportPreview,
    isApplyingStudentAssignmentImport,
    handleApplyStudentAssignmentImport,
    versionLabel,
    setTemplateHelpType,
  } = useStaffAcademicPlanningContext();

  const pageEnd = Math.min(
    studentAssignmentPageStartIndex + STUDENT_ASSIGNMENT_PAGE_SIZE,
    studentAssignmentRows.length,
  );

  return (
    <>
      <Card id="assign-student-track" className="scroll-mt-24">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Student Study Plans</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm sm:min-w-72">
              <SummaryTile label="Need Assign" value={studentAssignmentSummary.need} tone="orange" />
              <SummaryTile label="Assigned" value={studentAssignmentSummary.assigned} tone="green" />
              <SummaryTile label="Students" value={studentAssignmentSummary.total} />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(220px,1.2fr)]">
            <div className="space-y-1">
              <Label>Programme</Label>
              <Select value={studentAssignmentProgrammeFilter} onValueChange={setStudentAssignmentProgrammeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All programmes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All programmes</SelectItem>
                  {studentProgrammeOptions.map(programme => (
                    <SelectItem key={programme} value={programme}>
                      {programme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Study Plan Version</Label>
              <Select
                value={selectedStudentAssignmentVersionId}
                onValueChange={setSelectedStudentAssignmentVersionId}
                disabled={studentAssignmentVersionOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select study plan version" />
                </SelectTrigger>
                <SelectContent>
                  {studentAssignmentVersionOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No study plan versions match this programme.
                    </div>
                  ) : (
                    studentAssignmentVersionOptions.map(version => (
                      <SelectItem key={version.id} value={version.id}>
                        {versionLabel(version)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-1">
              <Label>Status</Label>
              <Select
                value={studentAssignmentStatusFilter}
                onValueChange={value => setStudentAssignmentStatusFilter(value as StudentAssignmentStatusFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                {(Object.keys(studentAssignmentStatusLabel) as StudentAssignmentStatusFilter[]).map(status => (
                  <SelectItem key={status} value={status}>
                    {status === "unassigned" ? "Need Assign" : studentAssignmentStatusLabel[status]}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Find student</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={studentAssignmentSearchTerm}
                  onChange={event => setStudentAssignmentSearchTerm(event.target.value)}
                  placeholder="Name, email or version"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                <Checkbox
                  checked={visibleStudentSelectionState}
                  disabled={visibleStudentIds.length === 0}
                  onCheckedChange={toggleVisibleStudentSelection}
                />
                <span className="text-sm">Select visible</span>
              </div>
              <Badge variant="secondary">{selectedStudentIds.length} selected</Badge>
              {selectedStudentAssignmentVersion ? (
                <Badge variant="outline">Assign to {versionLabel(selectedStudentAssignmentVersion)}</Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => void handleAssignStudents()}
                disabled={isAssigningStudents || selectedStudentIds.length === 0 || !selectedStudentAssignmentVersionId}
              >
                {isAssigningStudents ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserRoundCheck className="mr-2 h-4 w-4" />
                )}
                Assign
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50 hover:text-red-800 disabled:border-border disabled:text-muted-foreground dark:border-red-700/70 dark:text-red-200 dark:hover:border-red-500 dark:hover:bg-red-900/40 dark:hover:text-red-100 dark:disabled:border-border dark:disabled:text-muted-foreground"
                onClick={() => void handleUnassignStudents()}
                disabled={isAssigningStudents || selectedStudentIds.length === 0}
              >
                Unassign
              </Button>

              <Input
                id="staff-student-study-plan-import"
                accept=".xlsx,.xlsm"
                className="sr-only"
                disabled={isParsingStudentAssignmentImport || isApplyingStudentAssignmentImport}
                onChange={event => void handleStudentAssignmentImportFileChange(event)}
                type="file"
              />
              <Label
                htmlFor="staff-student-study-plan-import"
                className={
                  "inline-flex h-10 cursor-pointer items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground " +
                  (isParsingStudentAssignmentImport || isApplyingStudentAssignmentImport
                    ? "pointer-events-none opacity-50"
                    : "")
                }
              >
                {isParsingStudentAssignmentImport ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Import Student Excel
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => setTemplateHelpType("student-assignment")}
              >
                <Info className="mr-1 h-3.5 w-3.5" />
                View template
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-10" />
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Assigned Study Plan</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentAssignmentRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                      No students match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStudentAssignmentRows.map(row => (
                    <TableRow key={row.student.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudentIds.includes(row.student.id)}
                          onCheckedChange={checked => setStudentSelected(row.student.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{row.student.full_name}</TableCell>
                      <TableCell>
                        <div className="max-w-72 space-y-0.5">
                          <p className="truncate">{row.student.email || "No email"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{row.student.programme}</TableCell>
                      <TableCell>
                        {row.assignedVersion ? (
                          <Badge variant="secondary">{versionLabel(row.assignedVersion)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{row.assignedVersion?.track_code || "-"}</TableCell>
                      <TableCell>
                        {row.assignedVersion ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-200">
                            Assigned
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-200">
                            Need Assign
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant={row.assignedVersion ? "outline" : "default"}
                            size="sm"
                            disabled={isAssigningStudents || !selectedStudentAssignmentVersionId}
                            onClick={() => void handleAssignStudents([row.student.id])}
                          >
                            {row.assignedVersion ? "Reassign" : "Assign"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50 hover:text-red-800 disabled:border-border disabled:text-muted-foreground dark:border-red-700/70 dark:text-red-200 dark:hover:border-red-500 dark:hover:bg-red-900/40 dark:hover:text-red-100 dark:disabled:border-border dark:disabled:text-muted-foreground"
                            disabled={isAssigningStudents || !row.assignment}
                            onClick={() => void handleUnassignStudents([row.student.id])}
                          >
                            Unassign
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {studentAssignmentRows.length > STUDENT_ASSIGNMENT_PAGE_SIZE ? (
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {studentAssignmentPageStartIndex + 1}-{pageEnd} of {studentAssignmentRows.length} students
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={studentAssignmentPage <= 1}
                  onClick={() => setStudentAssignmentPage(current => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <span className="min-w-24 text-center">
                  Page {studentAssignmentPage} of {studentAssignmentPageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={studentAssignmentPage >= studentAssignmentPageCount}
                  onClick={() => setStudentAssignmentPage(current => Math.min(studentAssignmentPageCount, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(studentAssignmentImportPreview)}
        onOpenChange={open => !open && setStudentAssignmentImportPreview(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Student Study Plan Import</DialogTitle>
            <DialogDescription>Review student-to-study-plan rows before applying them.</DialogDescription>
          </DialogHeader>
          {studentAssignmentImportPreview && (
            <div className="space-y-4">
              {studentAssignmentImportPreview.warnings.length > 0 && (
                <Alert>
                  <AlertDescription>{studentAssignmentImportPreview.warnings.join(" ")}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <SummaryTile label="File" value={studentAssignmentImportPreview.fileName} truncate />
                <SummaryTile
                  label="Ready"
                  value={studentAssignmentImportPreview.rows.filter(row => row.status === "ready").length}
                  tone="green"
                />
                <SummaryTile
                  label="Needs review"
                  value={studentAssignmentImportPreview.rows.filter(row => row.status !== "ready").length}
                  tone="orange"
                />
              </div>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Row</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Programme</TableHead>
                      <TableHead>Study Plan</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentAssignmentImportPreview.rows.map(row => (
                      <TableRow key={`${row.rowNumber}-${row.studentIdentifier}`}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>
                          <p className="font-medium">{row.student?.full_name || "Unknown student"}</p>
                          <p className="text-xs text-muted-foreground">{row.studentIdentifier || "-"}</p>
                        </TableCell>
                        <TableCell>{row.programmeKey || "-"}</TableCell>
                        <TableCell>
                          {row.studyPlanVersion ? versionLabel(row.studyPlanVersion) : row.studyPlanVersionCode || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.status === "ready" ? "default" : row.status === "already-assigned" ? "secondary" : "destructive"}>
                            {row.message}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStudentAssignmentImportPreview(null)}
              disabled={isApplyingStudentAssignmentImport}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleApplyStudentAssignmentImport()}
              disabled={
                isApplyingStudentAssignmentImport ||
                !studentAssignmentImportPreview?.rows.some(row => row.status === "ready")
              }
            >
              {isApplyingStudentAssignmentImport ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Apply ready rows
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SummaryTile({
  label,
  tone,
  truncate,
  value,
}: {
  label: string;
  tone?: "green" | "orange";
  truncate?: boolean;
  value: number | string;
}) {
  const valueClass =
    tone === "green" ? "text-green-600" : tone === "orange" ? "text-orange-600" : "";

  return (
    <div className="min-w-0 rounded-lg border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-bold ${valueClass} ${truncate ? "truncate text-sm" : ""}`}>{value}</p>
    </div>
  );
}
