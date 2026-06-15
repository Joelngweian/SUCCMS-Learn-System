import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { getReportReasonLabel } from "@/lib/reporting";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportedItem } from "./AdminDashboardTypes";

interface AdminModerationPanelProps {
  filteredReports: ReportedItem[];
  paginatedReports: ReportedItem[];
  filterStatus: string;
  filterSeverity: string;
  currentPage: number;
  totalPages: number;
  reportsPerPage: number;
  moderatingReportId: string | null;
  onFilterStatusChange: (value: string) => void;
  onFilterSeverityChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onViewDetails: (report: ReportedItem) => void;
  onRemoveStory: (report: ReportedItem) => void;
  onSuspendUser: (report: ReportedItem) => void;
  onResolveReport: (report: ReportedItem) => void;
  onRestoreUser: (report: ReportedItem) => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "high":
      return "border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300";
    case "medium":
      return "border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-300";
    case "low":
      return "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
};

const getTypeColor = (type: string) =>
  type === "story"
    ? "border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-900 dark:bg-purple-950/60 dark:text-purple-300"
    : "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-300";

export function AdminModerationPanel({
  filteredReports,
  paginatedReports,
  filterStatus,
  filterSeverity,
  currentPage,
  totalPages,
  reportsPerPage,
  moderatingReportId,
  onFilterStatusChange,
  onFilterSeverityChange,
  onPageChange,
  onViewDetails,
  onRemoveStory,
  onSuspendUser,
  onResolveReport,
  onRestoreUser,
}: AdminModerationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reported Content & Users</CardTitle>
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={onFilterStatusChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterSeverity}
              onValueChange={onFilterSeverityChange}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-green-600" />
            <p>No reports matching the selected filters</p>
          </div>
        ) : (
          <>
            {paginatedReports.map((report) => (
              <div
                key={report.id}
                className={`rounded-lg border p-4 text-foreground ${
                  report.status === "resolved" ? "bg-muted/30" : "bg-card"
                }`}
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={report.reportedUserAvatar || undefined}
                        alt={report.reportedUser}
                      />
                      <AvatarFallback>
                        {report.reportedUser
                          .split(" ")
                          .map((name) => name[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                          {report.reportedUser}
                        </span>
                        <Badge className={getTypeColor(report.type)}>
                          {report.type}
                        </Badge>
                        <Badge className={getSeverityColor(report.severity)}>
                          {report.severity}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        <span>Reported by {report.reportedBy}</span>
                        <span aria-hidden="true">|</span>
                        <span>{new Date(report.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    className="w-fit whitespace-nowrap"
                    variant={
                      report.status === "resolved" ? "secondary" : "default"
                    }
                  >
                    {report.status === "pending" ? (
                      <>
                        <Clock className="mr-1 h-3 w-3" /> Pending
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Resolved
                      </>
                    )}
                  </Badge>
                </div>

                <div className="mt-3 space-y-3 sm:ml-[52px]">
                  <div className="rounded-md border bg-muted/40 px-3 py-2">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Reason:</span>{" "}
                      {getReportReasonLabel(report.reason)}
                    </p>
                    {report.details && (
                      <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">
                        {report.details}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => onViewDetails(report)}
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>

                    {report.status === "pending" && (
                      <>
                        {report.type === "story" && report.storyId && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove Story
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Remove Story
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove the reported
                                  story. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onRemoveStory(report)}
                                  disabled={
                                    moderatingReportId === report.id
                                  }
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {report.reportedUserActive && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex items-center gap-2"
                              >
                                <UserX className="h-4 w-4" />
                                Suspend User
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Suspend User
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will suspend {report.reportedUser}'s
                                  account and resolve this report.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onSuspendUser(report)}
                                  disabled={
                                    moderatingReportId === report.id
                                  }
                                >
                                  Suspend
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onResolveReport(report)}
                          disabled={moderatingReportId === report.id}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark Resolved
                        </Button>
                      </>
                    )}

                    {!report.reportedUserActive && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                          >
                            <UserCheck className="h-4 w-4" />
                            Restore User
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore User</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will reactivate {report.reportedUser}'s
                              account and allow the user to sign in again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onRestoreUser(report)}
                              disabled={moderatingReportId === report.id}
                            >
                              Restore
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredReports.length > reportsPerPage && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * reportsPerPage + 1}-
                  {Math.min(
                    currentPage * reportsPerPage,
                    filteredReports.length
                  )}{" "}
                  of {filteredReports.length} reports
                </p>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1
                  ).map((page) => (
                    <Button
                      key={page}
                      type="button"
                      variant={currentPage === page ? "default" : "ghost"}
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => onPageChange(page)}
                      aria-label={`Show report page ${page}`}
                    >
                      {page}
                    </Button>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      onPageChange(Math.min(totalPages, currentPage + 1))
                    }
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
