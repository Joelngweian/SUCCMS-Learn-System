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

export function StudyPlansTabContent() {
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
            <Card id="upload-study-plan" className="scroll-mt-24">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                      Upload Study Plan
                    </CardTitle>

                  </div>

                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-dashed p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Select one or more Excel files</p>
                      <p className="text-sm text-muted-foreground">
                        Use multiple files only when they belong to the same programme and intake, such as BoSE A1/A2 variants.
                      </p>
                    </div>
                    {isParsingStudyPlan && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      id="staff-study-plan-upload"
                      accept=".xlsx,.xlsm"
                      className="sr-only"
                      disabled={isParsingStudyPlan || isImportingStudyPlan}
                      multiple
                      onChange={event => void handleStudyPlanFileChange(event)}
                      type="file"
                    />
                    <Label
                      htmlFor="staff-study-plan-upload"
                      className={
                        "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground sm:w-auto " +
                        (isParsingStudyPlan || isImportingStudyPlan ? "pointer-events-none opacity-50" : "")
                      }
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Choose Excel Files
                    </Label>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 justify-start px-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      onClick={() => setTemplateHelpType("study-plan")}
                    >
                      <Info className="mr-1 h-3.5 w-3.5" />
                      View template guide
                    </Button>
                  </div>
                </div>

                {studyPlanImportPreview && (
                  <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">Preview before import</p>
                        <p className="text-sm text-muted-foreground">
                          {studyPlanImportPreview.sourceLabel}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{studyPlanImportPreview.programmeKey}</Badge>
                        <Badge variant="outline">{studyPlanImportPreview.level}</Badge>
                        <Badge variant="secondary">
                          {studyPlanImportPreview.intakeYear}{studyPlanImportPreview.intakeSemester}
                        </Badge>
                      </div>
                    </div>

                    {studyPlanImportPreview.warnings.length > 0 && (
                      <Alert>
                        <AlertDescription>
                          {studyPlanImportPreview.warnings.join(" ")}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Files</p>
                        <p className="text-lg font-bold">{studyPlanImportPreview.fileNames.length}</p>
                      </div>

                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Semesters detected</p>
                        <p className="text-lg font-bold">{importTermSummary.length}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {importTermSummary.map(term => (
                        <Badge key={term.termCode} variant="outline">
                          {term.termCode}: {term.count}
                        </Badge>
                      ))}
                    </div>

                    <div className="rounded-lg border bg-background">
                      <div className="flex flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold">Quick Preview</p>
                          <p className="text-xs text-muted-foreground">
                            First 8 rows are shown here. Open the full preview to review every semester and course before importing.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => setIsStudyPlanPreviewDialogOpen(true)}
                        >
                          Preview All Courses
                        </Button>
                      </div>
                      <div className="overflow-hidden">
                        <div className="grid grid-cols-[80px_1fr_90px] gap-2 border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
                          <span>Semester</span>
                          <span>Course</span>
                          <span>Credits</span>
                        </div>
                        {studyPlanImportPreview.courses.slice(0, 8).map(course => (
                          <div
                            key={course.termCode + "-" + course.planCourseKey + "-" + course.position}
                            className="grid grid-cols-[80px_1fr_90px] gap-2 border-b px-3 py-2 text-sm last:border-b-0"
                          >
                            <span className="font-medium">{course.termCode}</span>
                            <span className="min-w-0 truncate">
                              {course.courseCode || "No code"} - {course.courseName}
                            </span>
                            <span>{course.creditHours || "-"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Dialog
                      open={isStudyPlanPreviewDialogOpen}
                      onOpenChange={setIsStudyPlanPreviewDialogOpen}
                    >
                      <DialogContent className="flex h-[calc(100dvh-1.5rem)] max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-3 overflow-hidden p-5 sm:max-w-[calc(100vw-2rem)] xl:max-w-[1320px]">
                        <DialogHeader className="pr-10">
                          <DialogTitle>Study Plan Full Preview</DialogTitle>
                          <DialogDescription>
                            Review all parsed courses for {studyPlanImportPreview.programmeKey} {studyPlanImportPreview.intakeYear}{studyPlanImportPreview.intakeSemester} before confirming import.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border bg-muted/30 p-2.5">
                              <p className="text-xs text-muted-foreground">Total courses</p>
                              <p className="text-lg font-bold">{studyPlanImportPreview.courses.length}</p>
                            </div>
                            <div className="rounded-lg border bg-muted/30 p-2.5">
                              <p className="text-xs text-muted-foreground">Semesters</p>
                              <p className="text-lg font-bold">{importPreviewCoursesByTerm.length}</p>
                            </div>
                            <div className="rounded-lg border bg-muted/30 p-2.5">
                              <p className="text-xs text-muted-foreground">Files</p>
                              <p className="truncate text-lg font-bold">{studyPlanImportPreview.fileNames.length}</p>
                            </div>
                          </div>

                          <div className="grid gap-3 xl:grid-cols-2">
                            {importPreviewCoursesByTerm.map(term => (
                              <section key={term.termCode} className="overflow-hidden rounded-lg border bg-background">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-blue-600 text-white hover:bg-blue-600">{term.termCode}</Badge>
                                    <span className="text-sm font-medium">{term.courses.length} course(s)</span>
                                  </div>
                                </div>
                                <div className="overflow-x-auto">
                                  <div className="min-w-[560px]">
                                    <div className="grid grid-cols-[44px_104px_minmax(180px,1fr)_120px_64px] gap-2 border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
                                      <span>No.</span>
                                      <span>Code</span>
                                      <span>Course Name</span>
                                      <span>Category</span>
                                      <span>Credits</span>
                                    </div>
                                    {term.courses.map(course => (
                                      <div
                                        key={term.termCode + "-full-" + course.planCourseKey + "-" + course.position}
                                        className="grid grid-cols-[44px_104px_minmax(180px,1fr)_120px_64px] gap-2 border-b px-3 py-1.5 text-sm last:border-b-0"
                                      >
                                        <span className="text-muted-foreground">{course.position}</span>
                                        <span className="min-w-0 break-all font-medium">{course.courseCode || "No code"}</span>
                                        <span className="min-w-0 break-words">{course.courseName}</span>
                                        <span className="min-w-0 break-words text-muted-foreground">{course.category || "-"}</span>
                                        <span>{course.creditHours || "-"}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </section>
                            ))}
                          </div>
                        </div>

                        <DialogFooter className="border-t pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsStudyPlanPreviewDialogOpen(false)}
                          >
                            Close
                          </Button>
                          <Button
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => void handleConfirmStudyPlanImport()}
                            disabled={isImportingStudyPlan || studyPlanImportPreview.courses.length === 0}
                          >
                            {isImportingStudyPlan ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <UploadCloud className="mr-2 h-4 w-4" />
                            )}
                            Confirm Import All
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setStudyPlanImportPreview(null)}
                        disabled={isImportingStudyPlan}
                      >
                        Clear Preview
                      </Button>
                      <Button
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() => void handleConfirmStudyPlanImport()}
                        disabled={isImportingStudyPlan || studyPlanImportPreview.courses.length === 0}
                      >
                        {isImportingStudyPlan ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UploadCloud className="mr-2 h-4 w-4" />
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
                <CardTitle>Add Course to Selected Study Plan</CardTitle>

              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-6">
                <div className="space-y-1 md:col-span-1">
                  <Label>Semester</Label>
                  <Input
                    value={courseForm.termCode}
                    onChange={event => setCourseForm(current => ({ ...current, termCode: event.target.value }))}
                    placeholder="2026B"
                  />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <Label>Course Code</Label>
                  <Input
                    value={courseForm.courseCode}
                    onChange={event => setCourseForm(current => ({ ...current, courseCode: event.target.value }))}
                    placeholder="CSIS2033"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Course Name</Label>
                  <Input
                    value={courseForm.courseName}
                    onChange={event => setCourseForm(current => ({ ...current, courseName: event.target.value }))}
                    placeholder="Course name"
                  />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <Label>Category</Label>
                  <Input
                    value={courseForm.category}
                    onChange={event => setCourseForm(current => ({ ...current, category: event.target.value }))}
                    placeholder="Core"
                  />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <Label>Credits</Label>
                  <Input
                    value={courseForm.creditHours}
                    onChange={event => setCourseForm(current => ({ ...current, creditHours: event.target.value }))}
                    inputMode="numeric"
                  />
                </div>
                <div className="md:col-span-6">
                  <Button onClick={() => void handleAddCourse()} disabled={!selectedVersionId || !courseForm.courseName.trim() || isSavingCourse}>
                    {isSavingCourse ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Add Course
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Courses in This Version</CardTitle>

                  </div>
                  <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[920px] xl:grid-cols-5">
                    <div className="space-y-1 sm:col-span-2 xl:col-span-1">
                      <Label>Version</Label>
                      <Select
                        value={selectedVersionId}
                        onValueChange={setSelectedVersionId}
                        disabled={filteredVersions.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select version" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredVersions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              No study plan versions match these filters.
                            </div>
                          ) : (
                            filteredVersions.map(version => (
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
                      <Select value={versionProgrammeFilter} onValueChange={setVersionProgrammeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Programme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_FILTER_VALUE}>All programmes</SelectItem>
                          {versionProgrammeOptions.map(programme => (
                            <SelectItem key={programme} value={programme}>{programme}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Intake</Label>
                      <Select value={versionIntakeFilter} onValueChange={setVersionIntakeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Intake" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_FILTER_VALUE}>All intakes</SelectItem>
                          {versionIntakeOptions.map(intake => (
                            <SelectItem key={intake} value={intake}>{intake}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Level</Label>
                      <Select value={versionLevelFilter} onValueChange={setVersionLevelFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_FILTER_VALUE}>All levels</SelectItem>
                          {versionLevelOptions.map(level => (
                            <SelectItem key={level} value={level}>{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Semester</Label>
                      <Select
                        value={versionCourseTermFilter}
                        onValueChange={setVersionCourseTermFilter}
                        disabled={versionCourseTermOptions.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Filter semester" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_FILTER_VALUE}>All semesters</SelectItem>
                          {versionCourseTermOptions.map(termCode => (
                            <SelectItem key={termCode} value={termCode}>
                              {termCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {versionCourses.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    No courses in this version yet.
                  </div>
                ) : filteredVersionCourses.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    No courses match this semester filter.
                  </div>
                ) : (
                  <>
                    <Accordion
                      key={`${selectedVersionId}-${versionCourseTermFilter}`}
                      type="multiple"
                      defaultValue={versionCourseGroups.map(group => group.termCode)}
                      className="space-y-3"
                    >
                      {versionCourseGroups.map(group => (
                        <AccordionItem
                          key={group.termCode}
                          value={group.termCode}
                          className="overflow-hidden rounded-xl border bg-card"
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex w-full flex-col gap-2 pr-3 text-left sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-blue-600 text-white hover:bg-blue-600 dark:bg-blue-500">
                                  {group.termCode}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {group.courses.length} course{group.courses.length === 1 ? "" : "s"}
                                </span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-0 pb-0">
                            <Table className="min-w-[760px]">
                              <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                  <TableHead className="w-14 text-center">No.</TableHead>
                                  <TableHead className="min-w-[280px]">Course Name</TableHead>
                                  <TableHead className="min-w-[140px]">Code</TableHead>
                                  <TableHead className="min-w-[160px]">Category</TableHead>
                                  <TableHead className="w-20 text-center">Credit</TableHead>
                                  <TableHead className="w-16 text-right">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.courses.map((course, index) => {
                                  const courseCode = course.course_code?.trim() || "";
                                  const isChoiceCourse =
                                    courseCode.includes("/") || course.course_name.includes("/");

                                  return (
                                    <TableRow key={course.id}>
                                      <TableCell className="text-center text-muted-foreground">
                                        {course.position || index + 1}
                                      </TableCell>
                                      <TableCell className="max-w-[420px] whitespace-normal font-medium leading-relaxed">
                                        <div className="flex flex-col gap-1">
                                          <span>{course.course_name}</span>
                                          {isChoiceCourse ? (
                                            <Badge variant="outline" className="w-fit border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                                              Student chooses one
                                            </Badge>
                                          ) : null}
                                        </div>
                                      </TableCell>
                                      <TableCell className="whitespace-normal font-medium leading-relaxed">
                                        <span className="whitespace-pre-line">
                                          {courseCode ? courseCode.replace(/\//g, "/\n") : "-"}
                                        </span>
                                      </TableCell>
                                      <TableCell className="whitespace-normal text-muted-foreground">
                                        {course.category || "-"}
                                      </TableCell>
                                      <TableCell className="text-center font-medium">
                                        {course.credit_hours ?? "-"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                          onClick={() => void handleDeleteCourse(course.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Remove course</span>
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                              <TableFooter>
                                <TableRow>
                                  <TableCell colSpan={4} className="text-right font-semibold">
                                    Total credit:
                                  </TableCell>
                                  <TableCell className="text-center text-base font-bold">
                                    {group.totalCredits}
                                  </TableCell>
                                  <TableCell />
                                </TableRow>
                              </TableFooter>
                            </Table>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </>
                )}
              </CardContent>
            </Card>
    </>
  );
}
