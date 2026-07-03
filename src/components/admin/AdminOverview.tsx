import {
  Ban,
  CheckCircle2,
  FileText,
  Flag,
  Megaphone,
  Users,
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserCheck } from "lucide-react";
import type { AdminStats, ReportedItem } from "./AdminDashboardTypes";

const STAT_ITEMS = [
  { key: "totalUsers", label: "Total Users", icon: Users, color: "text-blue-600" },
  { key: "activeReports", label: "Active Reports", icon: Flag, color: "text-red-600" },
  { key: "resolvedToday", label: "Resolved Today", icon: CheckCircle2, color: "text-green-600" },
  { key: "suspendedUsers", label: "Suspended", icon: Ban, color: "text-orange-600" },
  { key: "totalStories", label: "Total Stories", icon: FileText, color: "text-purple-600" },
  { key: "announcements", label: "Active Announcements", icon: Megaphone, color: "text-green-600" },
] as const;

export function AdminStatsOverview({ stats }: { stats: AdminStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {STAT_ITEMS.map(item => {
        const Icon = item.icon;
        return (
          <Card key={item.key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${item.color}`} />
                <div>
                  <p className="text-2xl">{stats[item.key]}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-green-100 text-green-800";
  }
};

type AdminReportDetailsDialogProps = {
  report: ReportedItem | null;
  moderatingReportId: string | null;
  onClose: () => void;
  onRestoreUser: (report: ReportedItem) => void;
};

export function AdminReportDetailsDialog({
  report,
  moderatingReportId,
  onClose,
  onRestoreUser,
}: AdminReportDetailsDialogProps) {
  return (
    <Dialog
      open={Boolean(report)}
      onOpenChange={open => {
        if (!open && !moderatingReportId) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Details</DialogTitle>
          <DialogDescription>
            Review the submitted information before taking moderation action.
          </DialogDescription>
        </DialogHeader>
        {report && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Avatar
                className="h-11 w-11 shrink-0"
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  minHeight: 44,
                  maxWidth: 44,
                  maxHeight: 44,
                  overflow: "hidden",
                  borderRadius: "9999px",
                }}
              >
                <AvatarImage
                  src={report.reportedUserAvatar || undefined}
                  alt={report.reportedUser}
                  className="h-full w-full object-cover"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "cover",
                  }}
                />
                <AvatarFallback>
                  {report.reportedUser
                    .split(" ")
                    .map((name: string) => name[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{report.reportedUser}</p>
                <p className="text-sm text-muted-foreground">
                  Reported by {report.reportedBy}
                </p>
              </div>
              <Badge className={getSeverityColor(report.severity)}>
                {report.severity}
              </Badge>
              <Badge variant={report.reportedUserActive ? "secondary" : "destructive"}>
                {report.reportedUserActive ? "Active" : "Suspended"}
              </Badge>
            </div>

            <div className="space-y-2 rounded-lg bg-muted/40 p-3">
              <p className="text-sm">
                <strong>Type:</strong> {report.type}
              </p>
              <p className="text-sm">
                <strong>Reason:</strong> {getReportReasonLabel(report.reason)}
              </p>
              <p className="text-sm">
                <strong>Submitted:</strong>{" "}
                {new Date(report.timestamp).toLocaleString()}
              </p>
              {report.details && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {report.details}
                </p>
              )}
            </div>

            {report.storyImageUrl && (
              <a
                href={report.storyImageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block overflow-hidden rounded-md border"
              >
                <img
                  src={report.storyImageUrl}
                  alt="Reported story"
                  className="block object-cover"
                  style={{ width: 240, height: 150, maxWidth: "100%" }}
                />
              </a>
            )}

            {!report.reportedUserActive && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <UserCheck className="mr-2 h-4 w-4" />
                    Restore User Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restore User</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reactivate {report.reportedUser}'s account and allow
                      the user to sign in again.
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
        )}
      </DialogContent>
    </Dialog>
  );
}
