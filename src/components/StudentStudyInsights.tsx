import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Lightbulb,
  Loader2,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

export type StudyInsightType =
  | "performance"
  | "attendance"
  | "assignment"
  | "strength"
  | "weakness";

export type StudyInsightSeverity =
  | "positive"
  | "info"
  | "warning"
  | "critical";

export interface StudyInsight {
  id: string;
  type: StudyInsightType;
  severity: StudyInsightSeverity;
  title: string;
  description: string;
  confidence: number;
  courseCode?: string;
  actionPlan: string[];
}

type StudentStudyInsightsProps = {
  insights: StudyInsight[];
  isLoading: boolean;
};

const INSIGHT_STYLE: Record<
  StudyInsightSeverity,
  { border: string; icon: string; badge: string }
> = {
  positive: {
    border: "border-green-200 bg-green-50/50",
    icon: "bg-green-100 text-green-700",
    badge: "border-green-200 bg-green-50 text-green-700",
  },
  info: {
    border: "border-blue-200 bg-blue-50/50",
    icon: "bg-blue-100 text-blue-700",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
  },
  warning: {
    border: "border-amber-200 bg-amber-50/50",
    icon: "bg-amber-100 text-amber-700",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
  },
  critical: {
    border: "border-red-200 bg-red-50/50",
    icon: "bg-red-100 text-red-700",
    badge: "border-red-200 bg-red-50 text-red-700",
  },
};

const getInsightIcon = (insight: StudyInsight) => {
  if (insight.type === "attendance") return Users;
  if (insight.type === "assignment") return ClipboardList;
  if (insight.type === "strength") return CheckCircle2;
  if (insight.type === "weakness") return Target;
  if (insight.severity === "positive") return TrendingUp;
  if (insight.severity === "critical") return AlertTriangle;
  return TrendingDown;
};

function InsightCard({
  insight,
  onViewActionPlan,
}: {
  insight: StudyInsight;
  onViewActionPlan: (insight: StudyInsight) => void;
}) {
  const Icon = getInsightIcon(insight);
  const style = INSIGHT_STYLE[insight.severity];

  return (
    <div className={`rounded-lg border p-4 ${style.border}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-md p-2 ${style.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold">{insight.title}</h4>
                {insight.courseCode && (
                  <Badge variant="outline" className="text-[10px]">
                    {insight.courseCode}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {insight.description}
              </p>
            </div>
            <Badge variant="outline" className={`shrink-0 ${style.badge}`}>
              {insight.confidence}% confidence
            </Badge>
          </div>
          {insight.actionPlan.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => onViewActionPlan(insight)}
            >
              <Lightbulb className="mr-2 h-3.5 w-3.5" />
              Action Plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function StudentStudyInsights({
  insights,
  isLoading,
}: StudentStudyInsightsProps) {
  const [showAll, setShowAll] = useState(false);
  const [insightPage, setInsightPage] = useState(0);
  const [selectedActionPlan, setSelectedActionPlan] =
    useState<StudyInsight | null>(null);
  const visibleInsights = insights.slice(0, 3);

  const openAllInsights = () => {
    setInsightPage(0);
    setShowAll(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Study Insights
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Based on your grades, attendance and assignment activity.
            </p>
          </div>
          {insights.length > 3 && (
            <Button type="button" variant="outline" onClick={openAllInsights}>
              View All Insights
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex min-h-36 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            </div>
          ) : visibleInsights.length > 0 ? (
            visibleInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onViewActionPlan={setSelectedActionPlan}
              />
            ))
          ) : (
            <div className="rounded-lg border bg-muted/20 py-10 text-center">
              <Brain className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-medium">Not enough learning data yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Insights will appear after grades, submissions or attendance
                records are available.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>All Study Insights</DialogTitle>
            <DialogDescription>
              Insight {insightPage + 1} of {insights.length}
            </DialogDescription>
          </DialogHeader>

          {insights[insightPage] && (
            <InsightCard
              insight={insights[insightPage]}
              onViewActionPlan={setSelectedActionPlan}
            />
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={insightPage === 0}
              onClick={() => setInsightPage((page) => Math.max(0, page - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {insightPage + 1} / {insights.length}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={insightPage >= insights.length - 1}
              onClick={() =>
                setInsightPage((page) =>
                  Math.min(insights.length - 1, page + 1)
                )
              }
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedActionPlan != null}
        onOpenChange={(open) => {
          if (!open) setSelectedActionPlan(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Action Plan</DialogTitle>
            <DialogDescription>
              {selectedActionPlan?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selectedActionPlan?.actionPlan.map((step, index) => (
              <div
                key={`${selectedActionPlan.id}-${index}`}
                className="flex gap-3 rounded-lg border p-3"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <p className="text-sm leading-5">{step}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

