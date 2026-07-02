import {
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Loader2,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  UserRoundCheck,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../ui/accordion";
import { Alert, AlertDescription } from "../../ui/alert";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Checkbox } from "../../ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "../../ui/table";
import { useStaffAcademicPlanningContext } from "./AcademicPlanningContext";

type StudentAssignmentStatusFilter = "unassigned" | "assigned" | "all";
type AssignmentStatusFilter = "need" | "assigned" | "all";

export function StudentStudyPlansTabContent() {
  const {
    ALL_FILTER_VALUE,
    ASSIGNMENT_COURSES_PAGE_SIZE,
    STUDENT_ASSIGNMENT_PAGE_SIZE,
    activeSegmentClassName,
    academicCalendarStatusClassName,
    assignmentStatusLabel,
    studentAssignmentStatusLabel,
    versions,
    selectedVersionId,
    setSelectedVersionId,
    selectedVersion,
    versionProgrammeFilter,
    setVersionProgrammeFilter,
    versionProgrammeOptions,
    versionIntakeFilter,
    setVersionIntakeFilter,
    versionIntakeOptions,
    versionLevelFilter,
    setVersionLevelFilter,
    versionLevelOptions,
    filteredVersions,
    versionLabel,
    studyPlanImportPreview,
    setStudyPlanImportPreview,
    isParsingStudyPlan,
    isImportingStudyPlan,
    isStudyPlanPreviewDialogOpen,
    setIsStudyPlanPreviewDialogOpen,
    handleStudyPlanFileChange,
    handleConfirmStudyPlanImport,
    importTermSummary,
    importPreviewCoursesByTerm,
    versionCourses,
    versionCourseTermOptions,
    versionCourseTermFilter,
    setVersionCourseTermFilter,
    filteredVersionCourses,
    versionCourseGroups,
    courseForm,
    setCourseForm,
    isSavingCourse,
    handleAddCourse,
    handleDeleteCourse,
    academicCalendarPreview,
    setAcademicCalendarPreview,
    isParsingAcademicCalendar,
    isImportingAcademicCalendar,
    showClosedAcademicTerms,
    setShowClosedAcademicTerms,
    handleAcademicCalendarFileChange,
    handleConfirmAcademicCalendarImport,
    calendarTerms,
    visibleCalendarTerms,
    isAcademicCalendarExpired,
    latestCalendarTerm,
    nextAcademicCalendarYearLabel,
    formatDateLabel,
    resolveAcademicTermStatus,
    students,
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
    versionById,
    assignmentSummary,
    assignmentTermOptions,
    selectedAssignmentTermOption,
    selectedAssignmentTerm,
    assignmentForm,
    setAssignmentForm,
    assignmentProgrammeFilter,
    setAssignmentProgrammeFilter,
    assignmentProgrammeOptions,
    assignmentStatusFilter,
    setAssignmentStatusFilter,
    assignmentSearchTerm,
    setAssignmentSearchTerm,
    selectedAssignmentKeys,
    visibleSelectionState,
    toggleVisibleAssignmentSelection,
    bulkLecturerId,
    setBulkLecturerId,
    lecturers,
    isAssigning,
    handleBulkAssign,
    isParsingAssignmentImport,
    handleAssignmentImportFileChange,
    isLoadingAssignments,
    filteredAssignmentItems,
    groupedAssignmentItems,
    assignmentPageStartIndex,
    assignmentPage,
    assignmentPageCount,
    setAssignmentPage,
    setAssignmentKeySelected,
    assignmentRowLecturers,
    setAssignmentRowLecturers,
    handleAssignCourse,
    assignmentImportPreview,
    setAssignmentImportPreview,
    isApplyingAssignmentImport,
    handleApplyAssignmentImport,
    courseTemplateLabel,
    lecturerLabel,
    setTemplateHelpType,
    templateHelpType,
 } = useStaffAcademicPlanningContext();

  return (
    <>
            <Card id="assign-student-track" className="scroll-mt-24">
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserRoundCheck className="h-5 w-5 text-primary" />
                      Student Study Plan Assignment
                    </CardTitle>
                    <CardDescription>
                      AARO assigns the exact programme, intake and track, such as CS 2026B B1, before students browse courses.
                    </CardDescription>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Need</p>
                      <p className="font-bold text-orange-600">{studentAssignmentSummary.need}</p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Assigned</p>
                      <p className="font-bold text-green-600">{studentAssignmentSummary.assigned}</p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Students</p>
                      <p className="font-bold">{studentAssignmentSummary.total}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1 md:col-span-2">
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
                  <div className="space-y-1">
                    <Label>Programme</Label>
                    <Select value={studentAssignmentProgrammeFilter} onValueChange={setStudentAssignmentProgrammeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All programmes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_FILTER_VALUE}>All programmes</SelectItem>
                        {studentProgrammeOptions.map(programme => (
                          <SelectItem key={programme} value={programme}>{programme}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <Label>Status</Label>
                    <div className="grid min-w-0 grid-cols-[1.45fr_1fr_0.75fr] rounded-lg bg-muted p-1">
                      {(Object.keys(studentAssignmentStatusLabel) as StudentAssignmentStatusFilter[]).map(status => (
                        <Button
                          key={status}
                          type="button"
                          variant={studentAssignmentStatusFilter === status ? "default" : "ghost"}
                          size="sm"
                          className={`h-8 min-w-0 whitespace-nowrap px-1.5 text-[11px] ${studentAssignmentStatusFilter === status ? activeSegmentClassName : ""}`}
                          onClick={() => setStudentAssignmentStatusFilter(status)}
                        >
                          {studentAssignmentStatusLabel[status]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div className="space-y-1">
                    <Label>Find student</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={studentAssignmentSearchTerm}
                        onChange={event => setStudentAssignmentSearchTerm(event.target.value)}
                        placeholder="Student name, email, ID or assigned version"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
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
                        "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground lg:w-auto " +
                        (isParsingStudentAssignmentImport || isApplyingStudentAssignmentImport ? "pointer-events-none opacity-50" : "")
                      }
                    >
                      {isParsingStudentAssignmentImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                      Import Student Excel
                    </Label>
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      onClick={() => void handleAssignStudents()}
                      disabled={isAssigningStudents || selectedStudentIds.length === 0 || !selectedStudentAssignmentVersionId}
                    >
                      {isAssigningStudents ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserRoundCheck className="mr-2 h-4 w-4" />}
                      Assign selected
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-300 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100 hover:text-red-800 disabled:border-border disabled:bg-muted disabled:text-muted-foreground dark:border-red-700/70 dark:bg-red-950/40 dark:text-red-200 dark:hover:border-red-500 dark:hover:bg-red-900/40 dark:hover:text-red-100 dark:disabled:border-border dark:disabled:bg-muted/20 dark:disabled:text-muted-foreground"
                      onClick={() => void handleUnassignStudents()}
                      disabled={isAssigningStudents || selectedStudentIds.length === 0}
                    >
                      Unassign selected
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-fit justify-start px-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={() => setTemplateHelpType("student-assignment")}
                  >
                    <Info className="mr-1 h-3.5 w-3.5" />
                    View template
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Students</CardTitle>
                <CardDescription>
                  Showing {studentAssignmentRows.length} matching student{studentAssignmentRows.length === 1 ? "" : "s"}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {studentAssignmentRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    No students match the current filters.
                  </div>
                ) : (
                  <>
                    {paginatedStudentAssignmentRows.map(row => (
                      <div key={row.student.id} className="rounded-lg border p-3">
                        <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                          <Checkbox
                            checked={selectedStudentIds.includes(row.student.id)}
                            onCheckedChange={checked => setStudentSelected(row.student.id, checked)}
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{row.student.full_name}</span>
                              <Badge variant="outline">{row.student.programme || "No programme"}</Badge>
                              {row.assignedVersion ? (
                                <Badge variant="secondary">{versionLabel(row.assignedVersion)}</Badge>
                              ) : (
                                <Badge variant="outline">Need assignment</Badge>
                              )}
                            </div>
                            <p className="truncate text-sm text-muted-foreground">
                              {row.student.email || row.student.id}
                            </p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-60">
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
                              className="border-red-300 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100 hover:text-red-800 disabled:border-border disabled:bg-muted disabled:text-muted-foreground dark:border-red-700/70 dark:bg-red-950/40 dark:text-red-200 dark:hover:border-red-500 dark:hover:bg-red-900/40 dark:hover:text-red-100 dark:disabled:border-border dark:disabled:bg-muted/20 dark:disabled:text-muted-foreground"
                              disabled={isAssigningStudents || !row.assignment}
                              onClick={() => void handleUnassignStudents([row.student.id])}
                            >
                              Unassign
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {studentAssignmentRows.length > STUDENT_ASSIGNMENT_PAGE_SIZE ? (
                      <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          Showing {studentAssignmentPageStartIndex + 1}-{Math.min(studentAssignmentPageStartIndex + STUDENT_ASSIGNMENT_PAGE_SIZE, studentAssignmentRows.length)} of {studentAssignmentRows.length} students
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
                          <span className="min-w-24 text-center">Page {studentAssignmentPage} of {studentAssignmentPageCount}</span>
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
                  </>
                )}
              </CardContent>
            </Card>

            <Dialog open={Boolean(studentAssignmentImportPreview)} onOpenChange={open => !open && setStudentAssignmentImportPreview(null)}>
              <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Preview Student Study Plan Import</DialogTitle>
                  <DialogDescription>
                    Review student-to-study-plan rows before applying them.
                  </DialogDescription>
                </DialogHeader>
                {studentAssignmentImportPreview && (
                  <div className="space-y-4">
                    {studentAssignmentImportPreview.warnings.length > 0 && (
                      <Alert>
                        <AlertDescription>
                          {studentAssignmentImportPreview.warnings.join(" ")}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground">File</p>
                        <p className="truncate font-medium">{studentAssignmentImportPreview.fileName}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground">Ready</p>
                        <p className="font-bold text-green-600">{studentAssignmentImportPreview.rows.filter(row => row.status === "ready").length}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground">Needs review</p>
                        <p className="font-bold text-orange-600">{studentAssignmentImportPreview.rows.filter(row => row.status !== "ready").length}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {studentAssignmentImportPreview.rows.map(row => (
                        <div key={`${row.rowNumber}-${row.studentIdentifier}`} className="rounded-lg border p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">Row {row.rowNumber}</Badge>
                                <Badge variant="secondary">{row.studentIdentifier || "No student"}</Badge>
                                {row.programmeKey && <Badge variant="outline">{row.programmeKey}</Badge>}
                                {row.trackCode && <Badge variant="outline">{row.trackCode}</Badge>}
                              </div>
                              <p className="font-medium">
                                {row.student?.full_name || "Unknown student"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {row.studyPlanVersion ? versionLabel(row.studyPlanVersion) : row.studyPlanVersionCode || "No study plan version"}
                              </p>
                            </div>
                            <Badge variant={row.status === "ready" ? "default" : row.status === "already-assigned" ? "secondary" : "destructive"}>
                              {row.message}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setStudentAssignmentImportPreview(null)} disabled={isApplyingStudentAssignmentImport}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleApplyStudentAssignmentImport()}
                    disabled={isApplyingStudentAssignmentImport || !studentAssignmentImportPreview?.rows.some(row => row.status === "ready")}
                  >
                    {isApplyingStudentAssignmentImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Apply ready rows
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
    </>
  );
}
