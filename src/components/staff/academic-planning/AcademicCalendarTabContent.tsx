import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  Info,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { Alert, AlertDescription } from "../../ui/alert";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { useStaffAcademicPlanningContext } from "./useStaffAcademicPlanningContext";

export function AcademicCalendarTabContent() {
  const {
    academicCalendarPreview,
    academicCalendarStatusClassName,
    calendarTerms,
    formatDateLabel,
    handleAcademicCalendarFileChange,
    handleConfirmAcademicCalendarImport,
    isAcademicCalendarExpired,
    isImportingAcademicCalendar,
    isParsingAcademicCalendar,
    latestCalendarTerm,
    nextAcademicCalendarYearLabel,
    resolveAcademicTermStatus,
    setAcademicCalendarPreview,
  } = useStaffAcademicPlanningContext();

  const [selectedTermCode, setSelectedTermCode] = useState<string | null>(null);
  const selectedTerm = calendarTerms.find(term => term.code === selectedTermCode) ?? null;

  return (
    <>
      <Card id="upload-academic-calendar" className="scroll-mt-24">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <h2 className="text-xl font-semibold">Academic Calendar</h2>

            <div className="flex flex-wrap items-center gap-2">
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
                  "inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 " +
                  (isParsingAcademicCalendar || isImportingAcademicCalendar ? "pointer-events-none opacity-50" : "")
                }
              >
                {isParsingAcademicCalendar ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Upload Calendar PDF
              </Label>
            </div>
          </div>

          {isAcademicCalendarExpired && latestCalendarTerm ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                The latest academic term ({latestCalendarTerm.code}) has ended. Upload the{" "}
                {nextAcademicCalendarYearLabel(latestCalendarTerm)} academic calendar before opening new semester planning.
              </AlertDescription>
            </Alert>
          ) : null}

          {academicCalendarPreview ? (
            <div className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">Preview before import</p>
                  <p className="text-sm text-muted-foreground">{academicCalendarPreview.fileName}</p>
                </div>
                <Badge variant="secondary">{academicCalendarPreview.terms.length} semesters detected</Badge>
              </div>

              {academicCalendarPreview.warnings.length > 0 ? (
                <Alert>
                  <AlertDescription>{academicCalendarPreview.warnings.join(" ")}</AlertDescription>
                </Alert>
              ) : null}

              <div className="overflow-hidden rounded-lg border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Semester</TableHead>
                      <TableHead>Teaching Period</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {academicCalendarPreview.terms.map(term => (
                      <TableRow key={term.code}>
                        <TableCell>
                          <p className="font-semibold">{term.code}</p>
                          <p className="text-xs text-muted-foreground">{term.name}</p>
                        </TableCell>
                        <TableCell>
                          {formatDateLabel(term.teachingStartsAt)} - {formatDateLabel(term.teachingEndsAt)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            className={academicCalendarStatusClassName[term.status]}
                            status={term.status}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
          ) : null}

          <div className="space-y-3">
            <h3 className="font-semibold">Current Academic Terms</h3>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Semester</TableHead>
                    <TableHead>Teaching Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calendarTerms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-28 text-center text-muted-foreground">
                        No academic terms are set up yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    calendarTerms.map(term => {
                      const termStatus = resolveAcademicTermStatus(term);
                      return (
                        <TableRow key={term.id}>
                          <TableCell>
                            <Badge className="border-blue-300 bg-white text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200" variant="outline">
                              {term.code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDateLabel(term.teaching_starts_at || term.starts_at)} -{" "}
                            {formatDateLabel(term.teaching_ends_at || term.ends_at)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              className={academicCalendarStatusClassName[termStatus]}
                              status={termStatus}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => setSelectedTermCode(term.code)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedTerm)} onOpenChange={open => !open && setSelectedTermCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTerm?.code || "Academic term"}</DialogTitle>
            <DialogDescription>{selectedTerm?.name || "Academic calendar term details."}</DialogDescription>
          </DialogHeader>
          {selectedTerm ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Teaching Period</p>
                <p className="font-medium">
                  {formatDateLabel(selectedTerm.teaching_starts_at || selectedTerm.starts_at)} -{" "}
                  {formatDateLabel(selectedTerm.teaching_ends_at || selectedTerm.ends_at)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Status</p>
                <StatusBadge
                  className={academicCalendarStatusClassName[resolveAcademicTermStatus(selectedTerm)]}
                  status={resolveAcademicTermStatus(selectedTerm)}
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusBadge({
  className,
  status,
}: {
  className: string;
  status: string;
}) {
  return (
    <Badge className={`gap-1.5 ${className}`} variant="secondary">
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClassName(status)}`} />
      {status}
    </Badge>
  );
}

function statusDotClassName(status: string) {
  if (status === "active") return "bg-green-500";
  if (status === "planned") return "bg-blue-500";
  return "bg-slate-500";
}
