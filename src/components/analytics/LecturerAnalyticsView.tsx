import { lazy, Suspense } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  FileText,
  MessageSquare,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clampPercent,
  type AnalyticsPeriod,
  type AnalyticsTotals,
  type AssignmentMetric,
  type CourseMetric,
  type RiskStudent,
  type TeachingInsight,
  type TrendPoint,
} from "./lecturerAnalyticsTypes";

const AnalyticsProgressChart = lazy(
  () => import("./AnalyticsProgressChart"),
);
const AnalyticsEngagementChart = lazy(
  () => import("./AnalyticsEngagementChart"),
);

type LecturerAnalyticsViewProps = {
  courseFilter: string;
  period: AnalyticsPeriod;
  courseMetrics: CourseMetric[];
  visibleCourses: CourseMetric[];
  visibleAssignments: AssignmentMetric[];
  visibleRiskStudents: RiskStudent[];
  weeklyTrend: TrendPoint[];
  teachingInsights: TeachingInsight[];
  totals: AnalyticsTotals;
  isLoading: boolean;
  loadError: string;
  onCourseFilterChange: (value: string) => void;
  onPeriodChange: (value: AnalyticsPeriod) => void;
};

const getRiskBadge = (risk: string) => {
  switch (risk) {
    case "High":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900";
    case "Medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-900";
    default:
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900";
  }
};

const ChartFallback = ({ height }: { height: string }) => (
  <div
    className={`${height} flex items-center justify-center text-sm text-muted-foreground`}
  >
    Loading chart...
  </div>
);

export function LecturerAnalyticsView({
  courseFilter,
  period,
  courseMetrics,
  visibleCourses,
  visibleAssignments,
  visibleRiskStudents,
  weeklyTrend,
  teachingInsights,
  totals,
  isLoading,
  loadError,
  onCourseFilterChange,
  onPeriodChange,
}: LecturerAnalyticsViewProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:gap-3 sm:text-3xl">
            <BarChart3 className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
            Learning Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Track student progress, engagement, grading workload, and course
            risk signals.
          </p>
          {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Select value={courseFilter} onValueChange={onCourseFilterChange}>
            <SelectTrigger className="h-10 w-full bg-background sm:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courseMetrics.map(course => (
                <SelectItem key={course.id} value={course.code}>
                  {course.code} - {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={period}
            onValueChange={value => onPeriodChange(value as AnalyticsPeriod)}
          >
            <SelectTrigger className="h-10 w-full bg-background sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6-weeks">Last 6 weeks</SelectItem>
              <SelectItem value="semester">This semester</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          icon={Users}
          label="Students"
          value={totals.students.toString()}
          helper={`${visibleCourses.length} active course${visibleCourses.length > 1 ? "s" : ""}`}
          tone="blue"
        />
        <MetricCard
          icon={TrendingUp}
          label="Avg. Engagement"
          value={`${totals.engagement}%`}
          helper="Learning activity index"
          tone="green"
        />
        <MetricCard
          icon={Target}
          label="Completion"
          value={`${totals.completion}%`}
          helper="Course progress average"
          tone="purple"
        />
        <MetricCard
          icon={FileText}
          label="Pending Grades"
          value={totals.pendingGrades.toString()}
          helper="Needs lecturer action"
          tone="orange"
        />
        <MetricCard
          icon={AlertTriangle}
          label="At Risk"
          value={totals.riskStudents.toString()}
          helper="Students to review"
          tone="red"
          className="col-span-2 md:col-span-1"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Progress Trend
            </CardTitle>
            <CardDescription>
              Engagement, submissions, and score movement across the selected
              period.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <Suspense fallback={<ChartFallback height="h-[220px] sm:h-[300px]" />}>
              <AnalyticsProgressChart data={weeklyTrend} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-purple-600" />
              Teaching Insights
            </CardTitle>
            <CardDescription>
              Suggested actions based on current course signals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
            {teachingInsights.map(insight => {
              const Icon = insight.icon;

              return (
                <div key={insight.title} className="rounded-xl border p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${insight.bg}`}>
                      <Icon className={`h-4 w-4 ${insight.tone}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{insight.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {insight.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Course Comparison
            </CardTitle>
            <CardDescription>
              Compare course completion, engagement, and assessment readiness.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:space-y-5 sm:p-6 sm:pt-0">
            {visibleCourses.length === 0 ? (
              <EmptyState
                message={
                  isLoading
                    ? "Loading course analytics..."
                    : "No course data available."
                }
              />
            ) : (
              visibleCourses.map(course => (
                <div key={course.id} className="rounded-xl border p-3 sm:p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{course.code}</Badge>
                        <p className="font-semibold">{course.name}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {course.students} students enrolled
                      </p>
                    </div>
                    <Badge
                      className={
                        course.riskStudents >= 6
                          ? getRiskBadge("High")
                          : getRiskBadge("Low")
                      }
                    >
                      {course.riskStudents} risk signal
                      {course.riskStudents === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                    <ProgressMetric
                      label="Completion"
                      value={course.completion}
                    />
                    <ProgressMetric
                      label="Engagement"
                      value={course.engagement}
                    />
                    <ProgressMetric
                      label="Submission Rate"
                      value={course.submissionRate}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              At-Risk Students
            </CardTitle>
            <CardDescription>
              Students who may need follow-up before the next assessment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
            {visibleRiskStudents.length === 0 ? (
              <EmptyState
                message={
                  isLoading
                    ? "Loading student risk signals..."
                    : "No risk signals for this course."
                }
              />
            ) : (
              visibleRiskStudents.map(student => (
                <div
                  key={`${student.courseId}-${student.id}`}
                  className="rounded-xl border p-3 sm:p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.course}
                      </p>
                    </div>
                    <Badge className={getRiskBadge(student.risk)}>
                      {student.risk}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {student.reason}
                  </p>
                  <div className="mt-4">
                    <ProgressMetric
                      label="Current score"
                      value={student.score}
                      compact
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Engagement Mix
            </CardTitle>
            <CardDescription>
              Forum activity and engagement by course.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <Suspense fallback={<ChartFallback height="h-[220px] sm:h-[260px]" />}>
              <AnalyticsEngagementChart data={visibleCourses} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-orange-600" />
              Assignment Analytics
            </CardTitle>
            <CardDescription>
              Submission status and grading workload by assignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
            {visibleAssignments.length === 0 ? (
              <EmptyState
                message={
                  isLoading
                    ? "Loading assignment analytics..."
                    : "No assignments in the selected period."
                }
              />
            ) : (
              visibleAssignments.map(assignment => {
                const submittedPercent =
                  assignment.total > 0
                    ? clampPercent(
                        (assignment.submitted / assignment.total) * 100,
                      )
                    : 0;

                return (
                  <div key={assignment.id} className="rounded-xl border p-3 sm:p-4">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{assignment.course}</Badge>
                          <p className="font-medium">{assignment.title}</p>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {assignment.submitted}/{assignment.total} submitted
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {assignment.average == null
                            ? "Avg N/A"
                            : `Avg ${assignment.average}%`}
                        </Badge>
                        {assignment.ungraded > 0 && (
                          <Badge variant="destructive">
                            {assignment.ungraded} ungraded
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ProgressMetric
                      label="Submission progress"
                      value={submittedPercent}
                      compact
                    />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type MetricCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "purple" | "orange" | "red";
};

const toneClass = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  green: "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",
  purple:
    "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400",
  orange:
    "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400",
  red: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
};

const MetricCard = ({
  icon: Icon,
  className = "",
  label,
  value,
  helper,
  tone,
}: MetricCardProps) => (
  <Card className={`shadow-sm ${className}`}>
    <CardContent className="p-3 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={`rounded-xl p-2.5 sm:p-3 ${toneClass[tone]}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
          <p className="mt-1 text-xl font-semibold sm:text-2xl">{value}</p>
          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground sm:text-xs">
            {helper}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

type ProgressMetricProps = {
  label: string;
  value: number;
  compact?: boolean;
};

const ProgressMetric = ({
  label,
  value,
  compact = false,
}: ProgressMetricProps) => (
  <div className={compact ? "space-y-2" : "space-y-3"}>
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}%</span>
    </div>
    <Progress value={value} className={compact ? "h-2" : "h-2.5"} />
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
    {message}
  </div>
);
