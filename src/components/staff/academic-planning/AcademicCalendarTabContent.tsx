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

export function AcademicCalendarTabContent() {
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
            <Card id="upload-academic-calendar" className="scroll-mt-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Upload Academic Calendar
                </CardTitle>
                <CardDescription>
                  Upload the official school academic calendar PDF to update semester dates used by course recommendations and class assignment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-dashed p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Select academic calendar PDF</p>
                      <p className="text-sm text-muted-foreground">
                        The parser reads the standard SUC calendar format and detects Sem A, Sem B and Sem C.
                      </p>
                    </div>
                    {isParsingAcademicCalendar && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  </div>
                  <div className="mt-4">
                    <Input
                      id="staff-academic-calendar-upload"
                      accept=".pdf,application/pdf"
                      className="sr-only"
                      disabled={isParsingAcademicCalendar || isImportingAcademicCalendar}
                      onChange={event => void handleAcademicCalendarFileChange(event)}
                      type="file"
                    />
                    <Label
                      htmlFor="staff-academic-calendar-upload"
                      className={
                        "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground sm:w-auto " +
                        (isParsingAcademicCalendar || isImportingAcademicCalendar ? "pointer-events-none opacity-50" : "")
                      }
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Choose PDF
                    </Label>
                  </div>
                </div>

                {academicCalendarPreview && (
                  <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">Preview before import</p>
                        <p className="text-sm text-muted-foreground">{academicCalendarPreview.fileName}</p>
                      </div>
                      <Badge variant="secondary">{academicCalendarPreview.terms.length} semesters detected</Badge>
                    </div>

                    {academicCalendarPreview.warnings.length > 0 && (
                      <Alert>
                        <AlertDescription>
                          {academicCalendarPreview.warnings.join(" ")}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="overflow-x-auto rounded-lg border bg-background">
                      <div className="min-w-[520px]">
                        <div className="grid grid-cols-[120px_1fr_110px] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                          <span>Semester</span>
                          <span>Teaching</span>
                          <span>Status</span>
                        </div>
                        {academicCalendarPreview.terms.map(term => (
                          <div
                            key={term.code}
                            className="grid grid-cols-[120px_1fr_110px] gap-3 border-b px-3 py-3 text-sm last:border-b-0"
                          >
                            <div>
                              <p className="font-semibold">{term.code}</p>
                              <p className="text-xs text-muted-foreground">{term.name}</p>
                            </div>
                            <span>{formatDateLabel(term.teachingStartsAt)} - {formatDateLabel(term.teachingEndsAt)}</span>
                            <span>
                              <Badge className={academicCalendarStatusClassName[term.status]} variant="secondary">
                                {term.status}
                              </Badge>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAcademicCalendarPreview(null)}
                        disabled={isImportingAcademicCalendar}
                      >
                        Clear Preview
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleConfirmAcademicCalendarImport()}
                        disabled={isImportingAcademicCalendar || academicCalendarPreview.terms.length === 0}
                      >
                        {isImportingAcademicCalendar ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Confirm Import
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Academic Terms</CardTitle>
                    <CardDescription>
                      Existing semester dates currently available to the system.
                    </CardDescription>
                  </div>
                  {calendarTerms.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClosedAcademicTerms(current => !current)}
                    >
                      {showClosedAcademicTerms ? "Hide closed terms" : "Show closed terms"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isAcademicCalendarExpired && latestCalendarTerm && (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      The latest academic term ({latestCalendarTerm.code}) has ended. Upload the {nextAcademicCalendarYearLabel(latestCalendarTerm)} academic calendar before opening new semester planning.
                    </AlertDescription>
                  </Alert>
                )}

                {calendarTerms.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    No academic terms are set up yet.
                  </div>
                ) : visibleCalendarTerms.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    Closed terms are hidden. Upload the next academic calendar or show closed terms to review history.
                  </div>
                ) : (
                  visibleCalendarTerms.map(term => {
                    const termStatus = resolveAcademicTermStatus(term);
                    return (
                      <div key={term.id} className="grid gap-3 rounded-lg border p-3 text-sm lg:grid-cols-[120px_1fr_120px] lg:items-center">
                        <div>
                          <p className="font-semibold">{term.code}</p>
                          <p className="text-xs text-muted-foreground">{term.name}</p>
                        </div>
                        <p className="text-muted-foreground">
                          Teaching: {formatDateLabel(term.teaching_starts_at || term.starts_at)} - {formatDateLabel(term.teaching_ends_at || term.ends_at)}
                        </p>
                        <Badge className={academicCalendarStatusClassName[termStatus]} variant="secondary">
                          {termStatus}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
    </>
  );
}
