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
import { useStaffAcademicPlanningContext } from "./useStaffAcademicPlanningContext";

type StudentAssignmentStatusFilter = "unassigned" | "assigned" | "all";
type AssignmentStatusFilter = "need" | "assigned" | "all";

export function ClassAssignmentTabContent() {
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
    selectedAssignmentItems,
    visibleSelectionState,
    visibleAssignableKeys,
    toggleVisibleAssignmentSelection,
    bulkLecturerId,
    setBulkLecturerId,
    lecturers,
    lecturerById,
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
            <Card id="assign-lecturer" className="scroll-mt-24">
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserRoundCheck className="h-5 w-5 text-primary" />
                      Class Assignment
                    </CardTitle>
                    <CardDescription>
                      Assign lecturers to courses planned for the selected semester. The default view only shows courses that still need a lecturer.
                    </CardDescription>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Need</p>
                      <p className="font-bold text-orange-600">{assignmentSummary.need}</p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Assigned</p>
                      <p className="font-bold text-green-600">{assignmentSummary.assigned}</p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Planned</p>
                      <p className="font-bold">{assignmentSummary.planned}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Semester</Label>
                    <Select value={assignmentForm.termCode} onValueChange={value => setAssignmentForm({ termCode: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignmentTermOptions.map(term => (
                          <SelectItem key={term.code} value={term.code}>
                            {term.label}{!term.academicTerm ? " (term setup needed)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignmentForm.termCode && !selectedAssignmentTerm?.id ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Academic term setup is needed before lecturer assignments can be saved.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label>Programme</Label>
                    <Select value={assignmentProgrammeFilter} onValueChange={setAssignmentProgrammeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All programmes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_FILTER_VALUE}>All programmes</SelectItem>
                        {assignmentProgrammeOptions.map(programme => (
                          <SelectItem key={programme} value={programme}>{programme}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <Label>Status</Label>
                    <div className="grid min-w-0 grid-cols-[1.45fr_1fr_0.75fr] rounded-lg bg-muted p-1">
                      {(Object.keys(assignmentStatusLabel) as AssignmentStatusFilter[]).map(status => (
                        <Button
                          key={status}
                          type="button"
                          variant={assignmentStatusFilter === status ? "default" : "ghost"}
                          size="sm"
                          className={`h-8 min-w-0 whitespace-nowrap px-1.5 text-[11px] ${assignmentStatusFilter === status ? activeSegmentClassName : ""}`}
                          onClick={() => setAssignmentStatusFilter(status)}
                        >
                          {assignmentStatusLabel[status]}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Find in list</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={assignmentSearchTerm}
                        onChange={event => setAssignmentSearchTerm(event.target.value)}
                        placeholder="Course code, name or programme"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                      <Checkbox
                        checked={visibleSelectionState}
                        disabled={visibleAssignableKeys.length === 0}
                        onCheckedChange={toggleVisibleAssignmentSelection}
                      />
                      <span className="text-sm">Select visible</span>
                    </div>
                    <Badge variant="secondary">{selectedAssignmentItems.length} selected</Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(180px,240px)_auto_auto]">
                    <Select value={bulkLecturerId} onValueChange={setBulkLecturerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Bulk lecturer" />
                      </SelectTrigger>
                      <SelectContent>
                        {lecturers.map(lecturer => (
                          <SelectItem key={lecturer.id} value={lecturer.id}>{lecturer.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      onClick={() => void handleBulkAssign()}
                      disabled={isAssigning || selectedAssignmentItems.length === 0 || !bulkLecturerId || !selectedAssignmentTerm?.id}
                    >
                      {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserRoundCheck className="mr-2 h-4 w-4" />}
                      Assign selected
                    </Button>

                    <div>
                      <Input
                        id="staff-assignment-import-upload"
                        accept=".xlsx,.xlsm"
                        className="sr-only"
                        disabled={isParsingAssignmentImport || isApplyingAssignmentImport || !selectedAssignmentTerm?.id}
                        onChange={event => void handleAssignmentImportFileChange(event)}
                        type="file"
                      />
                      <Label
                        htmlFor="staff-assignment-import-upload"
                        className={
                          "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground " +
                          (isParsingAssignmentImport || isApplyingAssignmentImport || !selectedAssignmentTerm?.id ? "pointer-events-none opacity-50" : "")
                        }
                      >
                        {isParsingAssignmentImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Import Excel
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-fit justify-start px-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={() => setTemplateHelpType("lecturer-assignment")}
                  >
                    <Info className="mr-1 h-3.5 w-3.5" />
                    View template
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{assignmentStatusFilter === "assigned" ? "Assigned Courses" : assignmentStatusFilter === "all" ? "Course Assignment List" : "Courses Needing Lecturer Assignment"}</CardTitle>
                <CardDescription>
                  Courses are grouped by programme and come from the active study plans for {assignmentForm.termCode || "the selected semester"}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAssignments ? (
                  <div className="flex min-h-[220px] items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                ) : !selectedAssignmentTerm ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    Select a semester to start assigning lecturers.
                  </div>
                ) : filteredAssignmentItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    No courses match the current filters.
                  </div>
                ) : (
                  <>
                    <Accordion type="multiple" defaultValue={groupedAssignmentItems.map(group => group.group)} className="space-y-3">
                    {groupedAssignmentItems.map(group => {
                      const assignedCount = group.items.filter(item => item.assignments.length > 0).length;
                      const needCount = group.items.filter(item => item.assignable && item.assignments.length === 0).length;
                      return (
                        <AccordionItem key={group.group} value={group.group} className="rounded-lg border px-3">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex flex-wrap items-center gap-2 text-left">
                              <span className="font-semibold">{group.group}</span>
                              <Badge variant="secondary">{group.items.length} courses</Badge>
                              <Badge variant={needCount > 0 ? "outline" : "secondary"}>{needCount} need</Badge>
                              <Badge variant="outline">{assignedCount} assigned</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2 pb-3">
                            {group.items.map(item => {
                              const rowLecturerId = assignmentRowLecturers[item.key] || item.assignedLecturerIds[0] || "";
                              const assignedNames = item.assignments
                                .map(assignment => lecturerLabel(lecturerById.get(assignment.owner_id || "")))
                                .filter(Boolean);

                              return (
                                <div key={item.key} className="rounded-lg border bg-background p-3">
                                  <div className="grid gap-3 lg:grid-cols-[auto_1fr_minmax(220px,280px)_auto] lg:items-center">
                                    <Checkbox
                                      checked={selectedAssignmentKeys.includes(item.key)}
                                      disabled={!item.assignable}
                                      onCheckedChange={checked => setAssignmentKeySelected(item.key, checked)}
                                    />
                                    <div className="min-w-0 space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">{item.courseCode}</Badge>
                                        {item.creditHours !== null && <Badge variant="secondary">{item.creditHours} credits</Badge>}
                                        {item.categories.slice(0, 2).map(category => (
                                          <Badge key={category} variant="outline">{category}</Badge>
                                        ))}
                                        {item.issue && <Badge variant="destructive">{item.issue}</Badge>}
                                      </div>
                                      <p className="truncate font-medium">{item.courseName}</p>
                                      <p className="text-xs text-muted-foreground">{item.programmeLabel}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex min-h-6 flex-wrap items-center gap-1">
                                        {assignedNames.length > 0 ? (
                                          assignedNames.map(name => <Badge key={name} variant="secondary">{name}</Badge>)
                                        ) : (
                                          <Badge variant={item.assignable ? "outline" : "destructive"}>
                                            {item.assignable ? "Needs lecturer" : "Not assignable"}
                                          </Badge>
                                        )}
                                      </div>
                                      <Select
                                        value={rowLecturerId}
                                        onValueChange={value => setAssignmentRowLecturers(current => ({ ...current, [item.key]: value }))}
                                        disabled={!item.assignable || lecturers.length === 0 || !selectedAssignmentTerm?.id}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select lecturer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {lecturers.map(lecturer => (
                                            <SelectItem key={lecturer.id} value={lecturer.id}>{lecturer.full_name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                                      <Button
                                        type="button"
                                        variant="default"
                                        disabled={!item.assignable || !rowLecturerId || isAssigning || !selectedAssignmentTerm?.id}
                                        onClick={() => void handleAssignCourse(item, rowLecturerId)}
                                      >
                                        {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserRoundCheck className="mr-2 h-4 w-4" />}
                                        {item.assignments.length > 0 ? "Change Assign" : "Assign"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                    </Accordion>
                    {filteredAssignmentItems.length > ASSIGNMENT_COURSES_PAGE_SIZE ? (
                      <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          Showing {assignmentPageStartIndex + 1}-{Math.min(assignmentPageStartIndex + ASSIGNMENT_COURSES_PAGE_SIZE, filteredAssignmentItems.length)} of {filteredAssignmentItems.length} courses
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={assignmentPage <= 1}
                            onClick={() => setAssignmentPage(current => Math.max(1, current - 1))}
                          >
                            Previous
                          </Button>
                          <span className="min-w-24 text-center">Page {assignmentPage} of {assignmentPageCount}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={assignmentPage >= assignmentPageCount}
                            onClick={() => setAssignmentPage(current => Math.min(assignmentPageCount, current + 1))}
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
            <Dialog open={Boolean(assignmentImportPreview)} onOpenChange={open => !open && setAssignmentImportPreview(null)}>
              <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Preview Lecturer Assignment Import</DialogTitle>
                  <DialogDescription>
                    Review the Excel rows before applying them to {assignmentForm.termCode || "the selected semester"}.
                  </DialogDescription>
                </DialogHeader>
                {assignmentImportPreview && (
                  <div className="space-y-4">
                    {assignmentImportPreview.warnings.length > 0 && (
                      <Alert>
                        <AlertDescription>
                          {assignmentImportPreview.warnings.join(" ")}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground">File</p>
                        <p className="truncate font-medium">{assignmentImportPreview.fileName}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground">Ready</p>
                        <p className="font-bold text-green-600">{assignmentImportPreview.rows.filter(row => row.status === "ready").length}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground">Needs review</p>
                        <p className="font-bold text-orange-600">{assignmentImportPreview.rows.filter(row => row.status !== "ready").length}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {assignmentImportPreview.rows.map(row => (
                        <div key={`${row.rowNumber}-${row.courseCode}-${row.lecturerEmail}`} className="rounded-lg border p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">Row {row.rowNumber}</Badge>
                                <Badge variant="secondary">{row.semesterCode || "No semester"}</Badge>
                                <Badge variant="outline">{row.courseCode || "No course"}</Badge>
                              </div>
                              <p className="font-medium">{row.course ? courseTemplateLabel(row.course) : row.courseCode || "Unknown course"}</p>
                              <p className="text-sm text-muted-foreground">{row.lecturer?.full_name || row.lecturerEmail || "Unknown lecturer"}</p>
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
                  <Button type="button" variant="outline" onClick={() => setAssignmentImportPreview(null)} disabled={isApplyingAssignmentImport}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleApplyAssignmentImport()}
                    disabled={isApplyingAssignmentImport || !assignmentImportPreview?.rows.some(row => row.status === "ready")}
                  >
                    {isApplyingAssignmentImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Apply ready rows
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
    </>
  );
}
