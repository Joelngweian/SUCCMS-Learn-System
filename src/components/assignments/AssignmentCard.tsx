import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import {
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  FileText,
} from "lucide-react";
import type {
  AssignmentCardType,
  AssignmentListItem,
} from "./assignmentTypes";
import { getAssessmentTypeLabel } from "@/lib/assessmentTypes";

interface AssignmentCardProps {
  item: AssignmentListItem;
  type: AssignmentCardType;
  onOpen: (courseId: string, assignmentId: string) => void;
}

export function AssignmentCard({
  item,
  type,
  onOpen,
}: AssignmentCardProps) {
  const isLate = type === "pastDue";
  const dueDate = new Date(item.due_date);
  const dateString = dueDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const dueSoonLimit = new Date();
  dueSoonLimit.setDate(dueSoonLimit.getDate() + 2);
  const isCrucial =
    (type === "upcoming" || type === "needsGrading") &&
    dueDate <= dueSoonLimit;
  const maxScore = item.max_score || item.points || 100;
  const courseCode =
    item.courses.course_code || item.courses.code || "N/A";

  return (
    <Card
      className={`group cursor-pointer border-0 bg-card ring-1 ring-border transition-all hover:shadow-md ${
        isCrucial
          ? "bg-orange-50/30 ring-orange-200 dark:bg-orange-900/10 dark:ring-orange-900/50"
          : ""
      }`}
      onClick={() => onOpen(item.course_id, item.id)}
    >
      <CardContent className="flex items-center gap-6 p-6">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
            type === "completed" || type === "graded"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : type === "pastDue" || type === "needsGrading"
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          }`}
        >
          {type === "completed" || type === "graded" ? (
            <CheckCircle className="h-6 w-6" />
          ) : (
            <FileText className="h-6 w-6" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between">
            <div>
              <Badge
                variant="secondary"
                className="mb-1.5 text-[10px] font-medium"
              >
                {getAssessmentTypeLabel(item.assessment_type)}
              </Badge>
              <h4 className="truncate text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                {item.title}
              </h4>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="max-w-[180px] truncate sm:max-w-[260px]">
                  {item.courses.name || "Unknown Course"}
                </span>
                <Badge
                  variant="outline"
                  className="text-xs font-normal text-muted-foreground"
                >
                  {courseCode}
                </Badge>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {item.submission?.grade != null && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 font-bold text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100"
                >
                  {item.submission.grade} / {maxScore}
                </Badge>
              )}
              {isCrucial && (
                <Badge
                  variant="destructive"
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Due Soon
                </Badge>
              )}
              {item.metrics && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Subs: {item.metrics.totalSubmissions}
                  </Badge>
                  {item.metrics.ungradedCount > 0 && (
                    <Badge className="border-none bg-yellow-100 text-xs text-yellow-800 hover:bg-yellow-200">
                      Ungraded: {item.metrics.ungradedCount}
                    </Badge>
                  )}
                  {item.metrics.totalSubmissions === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Awaiting submissions
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 text-sm font-medium">
            <span
              className={`flex items-center gap-1.5 ${
                isLate
                  ? "text-red-700 dark:text-red-300"
                  : isCrucial
                    ? "text-orange-700 dark:text-orange-300"
                    : "text-muted-foreground"
              }`}
            >
              <Calendar className="h-4 w-4" />
              {type === "completed" && item.submission?.submitted_at
                ? `Submitted ${new Date(item.submission.submitted_at).toLocaleDateString()}`
                : `Due ${dateString}`}
            </span>
            <span className="text-muted-foreground">| {maxScore} Points</span>
          </div>
        </div>
        <ChevronRight className="ml-1 h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
      </CardContent>
    </Card>
  );
}
