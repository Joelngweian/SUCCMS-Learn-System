import {
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  Search,
  UploadCloud,
  UserRoundCheck,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../ui/accordion";
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
import type { AssignmentListItem } from "./useAcademicPlanningViews";
import { useStaffAcademicPlanningContext } from "./useStaffAcademicPlanningContext";

type AssignmentStatusFilter = "need" | "assigned" | "all";

export function ClassAssignmentTabContent() {
  const {
    ALL_FILTER_VALUE,
    ASSIGNMENT_COURSES_PAGE_SIZE,
    assignmentStatusLabel,
    assignmentSummary,
    assignmentTermOptions,
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
  } = useStaffAcademicPlanningContext();

  const pageEnd = Math.min(
    assignmentPageStartIndex + ASSIGNMENT_COURSES_PAGE_SIZE,
    filteredAssignmentItems.length,
  );

  return (
    <>
      <Card id="assign-lecturer" className="scroll-mt-24">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Course Assign</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm sm:min-w-72">
              <SummaryTile label="Need Assign" value={assignmentSummary.need} tone="orange" />
              <SummaryTile label="Assigned" value={assignmentSummary.assigned} tone="green" />
              <SummaryTile label="Planned" value={assignmentSummary.planned} />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(220px,1.2fr)]">
            <div className="space-y-1">
              <Label>Programme</Label>
              <Select value={assignmentProgrammeFilter} onValueChange={setAssignmentProgrammeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All programmes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All programmes</SelectItem>
                  {assignmentProgrammeOptions.map(programme => (
                    <SelectItem key={programme} value={programme}>
                      {programme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Semester</Label>
              <Select value={assignmentForm.termCode} onValueChange={value => setAssignmentForm({ termCode: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {assignmentTermOptions.map(term => (
                    <SelectItem key={term.code} value={term.code}>
                      {term.label}
                      {!term.academicTerm ? " (term setup needed)" : ""}
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

            <div className="min-w-0 space-y-1">
              <Label>Status</Label>
              <Select
                value={assignmentStatusFilter}
                onValueChange={value => setAssignmentStatusFilter(value as AssignmentStatusFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                {(Object.keys(assignmentStatusLabel) as AssignmentStatusFilter[]).map(status => (
                  <SelectItem key={status} value={status}>
                    {status === "need" ? "Need Assign" : assignmentStatusLabel[status]}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Find course</Label>
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

          <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-900/60 dark:bg-blue-950/20 lg:flex-row lg:items-center lg:justify-between">
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

            <div className="grid gap-2 sm:grid-cols-[minmax(180px,260px)_auto_auto_auto]">
              <Select value={bulkLecturerId} onValueChange={setBulkLecturerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lecturer" />
                </SelectTrigger>
                <SelectContent>
                  {lecturers.map(lecturer => (
                    <SelectItem key={lecturer.id} value={lecturer.id}>
                      {lecturer.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={() => void handleBulkAssign()}
                disabled={isAssigning || selectedAssignmentItems.length === 0 || !bulkLecturerId || !selectedAssignmentTerm?.id}
              >
                {isAssigning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserRoundCheck className="mr-2 h-4 w-4" />
                )}
                Assign
              </Button>

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
                  "inline-flex h-10 cursor-pointer items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground " +
                  (isParsingAssignmentImport || isApplyingAssignmentImport || !selectedAssignmentTerm?.id
                    ? "pointer-events-none opacity-50"
                    : "")
                }
              >
                {isParsingAssignmentImport ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Import Excel
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => setTemplateHelpType("lecturer-assignment")}
              >
                <Info className="mr-1 h-3.5 w-3.5" />
                View template
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {isLoadingAssignments ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-lg border">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : !selectedAssignmentTerm ? (
              <EmptyState>Select a semester to start assigning lecturers.</EmptyState>
            ) : filteredAssignmentItems.length === 0 ? (
              <EmptyState>No courses match the current filters.</EmptyState>
            ) : (
              <>
                <Accordion
                  type="multiple"
                  defaultValue={groupedAssignmentItems.map(group => group.group)}
                  className="space-y-3"
                >
                  {groupedAssignmentItems.map(group => (
                    <ProgrammeAssignmentGroup
                      key={group.group}
                      group={group.group}
                      items={group.items}
                      selectedAssignmentKeys={selectedAssignmentKeys}
                      setAssignmentKeySelected={setAssignmentKeySelected}
                      assignmentRowLecturers={assignmentRowLecturers}
                      setAssignmentRowLecturers={setAssignmentRowLecturers}
                      lecturers={lecturers}
                      lecturerById={lecturerById}
                      lecturerLabel={lecturerLabel}
                      isAssigning={isAssigning}
                      selectedAssignmentTermId={selectedAssignmentTerm?.id || ""}
                      handleAssignCourse={handleAssignCourse}
                    />
                  ))}
                </Accordion>

                {filteredAssignmentItems.length > ASSIGNMENT_COURSES_PAGE_SIZE ? (
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Showing {assignmentPageStartIndex + 1}-{pageEnd} of {filteredAssignmentItems.length} courses
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
                      <span className="min-w-24 text-center">
                        Page {assignmentPage} of {assignmentPageCount}
                      </span>
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
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(assignmentImportPreview)} onOpenChange={open => !open && setAssignmentImportPreview(null)}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
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
                  <AlertDescription>{assignmentImportPreview.warnings.join(" ")}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <SummaryTile label="File" value={assignmentImportPreview.fileName} truncate />
                <SummaryTile
                  label="Ready"
                  value={assignmentImportPreview.rows.filter(row => row.status === "ready").length}
                  tone="green"
                />
                <SummaryTile
                  label="Needs review"
                  value={assignmentImportPreview.rows.filter(row => row.status !== "ready").length}
                  tone="orange"
                />
              </div>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Row</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Lecturer</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignmentImportPreview.rows.map(row => (
                      <TableRow key={`${row.rowNumber}-${row.courseCode}-${row.lecturerEmail}`}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{row.semesterCode || "-"}</TableCell>
                        <TableCell>
                          <p className="font-medium">{row.course ? courseTemplateLabel(row.course) : row.courseCode || "Unknown course"}</p>
                          <p className="text-xs text-muted-foreground">{row.courseCode || "-"}</p>
                        </TableCell>
                        <TableCell>{row.lecturer?.full_name || row.lecturerEmail || "Unknown lecturer"}</TableCell>
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
              onClick={() => setAssignmentImportPreview(null)}
              disabled={isApplyingAssignmentImport}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleApplyAssignmentImport()}
              disabled={isApplyingAssignmentImport || !assignmentImportPreview?.rows.some(row => row.status === "ready")}
            >
              {isApplyingAssignmentImport ? (
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

function ProgrammeAssignmentGroup({
  assignmentRowLecturers,
  group,
  handleAssignCourse,
  isAssigning,
  items,
  lecturerById,
  lecturerLabel,
  lecturers,
  selectedAssignmentKeys,
  selectedAssignmentTermId,
  setAssignmentKeySelected,
  setAssignmentRowLecturers,
}: {
  assignmentRowLecturers: Record<string, string>;
  group: string;
  handleAssignCourse: (item: AssignmentListItem, lecturerId: string) => Promise<void>;
  isAssigning: boolean;
  items: AssignmentListItem[];
  lecturerById: ReturnType<typeof useStaffAcademicPlanningContext>["lecturerById"];
  lecturerLabel: ReturnType<typeof useStaffAcademicPlanningContext>["lecturerLabel"];
  lecturers: ReturnType<typeof useStaffAcademicPlanningContext>["lecturers"];
  selectedAssignmentKeys: string[];
  selectedAssignmentTermId: string;
  setAssignmentKeySelected: ReturnType<typeof useStaffAcademicPlanningContext>["setAssignmentKeySelected"];
  setAssignmentRowLecturers: ReturnType<typeof useStaffAcademicPlanningContext>["setAssignmentRowLecturers"];
}) {
  const assignedCount = items.filter(item => item.assignments.length > 0).length;
  const needCount = items.filter(item => item.assignable && item.assignments.length === 0).length;

  return (
    <AccordionItem value={group} className="overflow-hidden rounded-lg border">
      <AccordionTrigger className="px-4 hover:no-underline [&>svg]:hidden">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-left">
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{group}</span>
            <Badge variant="secondary">{items.length} courses</Badge>
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-200">
              {needCount} need
            </Badge>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-200">
              {assignedCount} assigned
            </Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10" />
                <TableHead>Code</TableHead>
                <TableHead>Course Name</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Lecturer</TableHead>
                <TableHead>Assign Lecturer</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => {
                const rowLecturerId = assignmentRowLecturers[item.key] || item.assignedLecturerIds[0] || "";
                const assignedNames = item.assignments
                  .map(assignment => lecturerLabel(lecturerById.get(assignment.owner_id || "")))
                  .filter(Boolean);

                return (
                  <TableRow key={item.key}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAssignmentKeys.includes(item.key)}
                        disabled={!item.assignable}
                        onCheckedChange={checked => setAssignmentKeySelected(item.key, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.courseCode}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-60 max-w-md">
                        <p className="font-medium">{item.courseName}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.categories.slice(0, 2).map(category => (
                            <Badge key={category} variant="secondary" className="font-normal">
                              {category}
                            </Badge>
                          ))}
                          {item.issue ? <Badge variant="destructive">{item.issue}</Badge> : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.creditHours ?? "-"}</TableCell>
                    <TableCell>
                      {assignedNames.length > 0 ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-200">
                          Assigned
                        </Badge>
                      ) : (
                        <Badge
                          className={
                            item.assignable
                              ? "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-200"
                              : ""
                          }
                          variant={item.assignable ? "default" : "destructive"}
                        >
                          {item.assignable ? "Need Assign" : "Not assignable"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignedNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignedNames.map(name => (
                            <Badge key={name} variant="outline">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={rowLecturerId}
                        onValueChange={value => setAssignmentRowLecturers(current => ({ ...current, [item.key]: value }))}
                        disabled={!item.assignable || lecturers.length === 0 || !selectedAssignmentTermId}
                      >
                        <SelectTrigger className="min-w-52">
                          <SelectValue placeholder="Select lecturer" />
                        </SelectTrigger>
                        <SelectContent>
                          {lecturers.map(lecturer => (
                            <SelectItem key={lecturer.id} value={lecturer.id}>
                              {lecturer.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!item.assignable || !rowLecturerId || isAssigning || !selectedAssignmentTermId}
                        onClick={() => void handleAssignCourse(item, rowLecturerId)}
                      >
                        {isAssigning ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UserRoundCheck className="mr-2 h-4 w-4" />
                        )}
                        {item.assignments.length > 0 ? "Change" : "Assign"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      {children}
    </div>
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
