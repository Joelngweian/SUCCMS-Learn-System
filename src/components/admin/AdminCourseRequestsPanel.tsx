import { useState } from "react";
import { BookOpen, CheckCircle2, Clock, XCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { CourseCreationRequest } from "./AdminDashboardTypes";

interface AdminCourseRequestsPanelProps {
  requests: CourseCreationRequest[];
  reviewingId: string | null;
  onApprove: (request: CourseCreationRequest, notes: string) => void;
  onReject: (request: CourseCreationRequest, notes: string) => void;
}

const getStatusBadge = (status: CourseCreationRequest["status"]) => {
  switch (status) {
    case "approved":
      return {
        icon: CheckCircle2,
        className:
          "border-green-200 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300",
      };
    case "rejected":
      return {
        icon: XCircle,
        className:
          "border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300",
      };
    default:
      return {
        icon: Clock,
        className:
          "border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-300",
      };
  }
};

export function AdminCourseRequestsPanel({
  requests,
  reviewingId,
  onApprove,
  onReject,
}: AdminCourseRequestsPanelProps) {
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const setNotes = (requestId: string, value: string) => {
    setNotesById((current) => ({ ...current, [requestId]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Creation Requests
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Review lecturer requests before adding courses to the catalog.
            </p>
          </div>
          <Badge variant="secondary">
            {requests.filter((request) => request.status === "pending").length} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
            <BookOpen className="mx-auto mb-2 h-10 w-10" />
            <p>No course creation requests yet.</p>
          </div>
        ) : (
          requests.map((request) => {
            const StatusIcon = getStatusBadge(request.status).icon;
            const statusClassName = getStatusBadge(request.status).className;
            const notes = notesById[request.id] || "";
            const isPending = request.status === "pending";
            const isReviewing = reviewingId === request.id;

            return (
              <div key={request.id} className="rounded-lg border bg-card p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{request.subjectCode}</Badge>
                      <Badge className={statusClassName}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {request.status}
                      </Badge>
                    </div>
                    <h3 className="truncate text-lg font-semibold">
                      {request.subjectName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Requested by {request.requesterName}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Faculty</p>
                    <p className="mt-1 text-sm">
                      {request.faculty || "Not specified"}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Programme</p>
                    <p className="mt-1 text-sm">
                      {request.programme || "Not specified"}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Credits</p>
                    <p className="mt-1 text-sm">
                      {request.credits ?? "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-md border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                    {request.reason}
                  </p>
                </div>

                {request.adminNotes && (
                  <div className="mt-3 rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Admin Notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                      {request.adminNotes}
                    </p>
                  </div>
                )}

                {isPending && (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(request.id, event.target.value)}
                      placeholder="Optional admin notes..."
                      className="min-h-20"
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" disabled={isReviewing}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Course Request</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will mark the request as rejected. The course
                              will not be added to the catalog.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onReject(request, notes)}
                              disabled={isReviewing}
                            >
                              Reject
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button disabled={isReviewing}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve Course Request</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will create {request.subjectCode} in the
                              official course catalog.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onApprove(request, notes)}
                              disabled={isReviewing}
                            >
                              Approve
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
