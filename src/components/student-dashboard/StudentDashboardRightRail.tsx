import {
  Children,
  isValidElement,
  useState,
  type ReactNode,
} from "react";
import {
  Bell,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { StudyInsight } from "../StudentStudyInsights";
import { OnlineActivity } from "../SocialWidgets";
import { StudyGroupsDashboard } from "../StudyGroupsDashboard";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

type CourseActivity = {
  courseCode: string;
  courseName: string;
  lastAccessed: Date;
  progress: number;
};

type Recommendation = {
  id: string;
  title: string;
  type: string;
  url: string;
  source?: string;
  reason?: string;
};

type StudentCourse = {
  id: string;
  code: string;
  name: string;
  progress: number;
  pendingAssignments: number;
  grade: string | null;
};

type DashboardAssignment = {
  id: string;
  courseId: string;
  courseCode: string;
  title: string;
  dueDate: string;
};

type DashboardAnnouncement = {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
};

function PanelCard({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <CardContent className="px-4 pb-4 pt-3">{children}</CardContent>
    </Card>
  );
}

function ExpandableRailCard({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden shadow-sm">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
          >
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {description}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="border-t px-4 pb-4 pt-3">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function OrderedRailCards({ children }: { children: ReactNode }) {
  return Children.toArray(children)
    .filter(isValidElement<{ children: ReactNode; order: number }>)
    .sort((left, right) => left.props.order - right.props.order)
    .map(item => item.props.children);
}

function RailOrderItem({
  children,
}: {
  children: ReactNode;
  order: number;
}) {
  return children;
}

const getInsightTone = (insight: StudyInsight) => {
  if (insight.severity === "critical") return "bg-red-500";
  if (insight.severity === "warning") return "bg-amber-500";
  return "bg-emerald-500";
};

export function StudentDashboardRightRail({
  announcements,
  courses,
  formatRelativeDate,
  isLoadingAi,
  isLoadingInsights,
  motivation,
  onBrowseCourses,
  onOpenAssignment,
  onOpenCourse,
  recentCourses,
  studyInsights,
  studyMaterials,
  upcomingAssignments,
}: {
  announcements: DashboardAnnouncement[];
  courses: StudentCourse[];
  formatRelativeDate: (value: string) => string;
  isLoadingAi: boolean;
  isLoadingInsights: boolean;
  motivation: Recommendation[];
  onBrowseCourses: () => void;
  onOpenAssignment: (courseId: string, assignmentId: string) => void;
  onOpenCourse: (courseId: string) => void;
  recentCourses: CourseActivity[];
  studyInsights: StudyInsight[];
  studyMaterials: Recommendation[];
  upcomingAssignments: DashboardAssignment[];
}) {
  return (
    <aside className="space-y-4 2xl:sticky 2xl:top-24 2xl:max-h-[calc(100vh-7rem)] 2xl:self-start 2xl:overflow-y-auto 2xl:pr-1">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Your Study Panel
        </h2>
      </div>

      <OrderedRailCards>
      <RailOrderItem order={4}>
      <ExpandableRailCard
        title="AI Study Insights"
        description="Strengths, risks and next actions"
        icon={<Sparkles className="h-4 w-4" />}
      >
        {isLoadingInsights ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
          </div>
        ) : studyInsights.length > 0 ? (
          <div className="space-y-3">
            {studyInsights.slice(0, 2).map(insight => (
              <div key={insight.id} className="rounded-lg bg-muted/45 p-3">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${getInsightTone(insight)}`}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold">{insight.title}</p>
                      {insight.courseCode && (
                        <Badge variant="outline" className="text-[10px]">
                          {insight.courseCode}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {insight.description}
                    </p>
                    {insight.actionPlan.length > 0 && (
                      <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                        <span aria-hidden="true">• </span>
                        {insight.actionPlan[0]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Insights appear after grades, submissions, or attendance data is
            available.
          </p>
        )}
      </ExpandableRailCard>
      </RailOrderItem>

      <RailOrderItem order={6}>
      <PanelCard
        title="Upcoming Assignments"
        description={`${upcomingAssignments.length} assignment${
          upcomingAssignments.length === 1 ? "" : "s"
        } ahead`}
        icon={<FileText className="h-4 w-4" />}
      >
        {upcomingAssignments.length > 0 ? (
          <div className="space-y-1">
            {upcomingAssignments.slice(0, 3).map(assignment => (
              <button
                type="button"
                key={assignment.id}
                onClick={() =>
                  onOpenAssignment(assignment.courseId, assignment.id)
                }
                className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
              >
                <div className="mt-0.5 rounded-md bg-orange-100 p-1.5 text-orange-700">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {assignment.title}
                  </p>
                  <p className="mt-0.5 text-xs text-orange-600">
                    {assignment.courseCode} ·{" "}
                    {formatRelativeDate(assignment.dueDate)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No upcoming assignments.
          </p>
        )}
      </PanelCard>
      </RailOrderItem>

      <RailOrderItem order={1}>
      <PanelCard
        title="Jump Back In"
        description="Continue your recent courses"
        icon={<Clock className="h-4 w-4" />}
      >
        {recentCourses.length > 0 ? (
          <div className="space-y-2">
            {recentCourses.slice(0, 2).map(course => (
              <button
                type="button"
                key={course.courseCode}
                onClick={onBrowseCourses}
                className="w-full rounded-lg bg-muted/45 p-3 text-left transition-colors hover:bg-muted"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {course.courseName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Last opened {course.lastAccessed.toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {course.courseCode}
                  </Badge>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Enrol in a course to get started.
          </p>
        )}
      </PanelCard>
      </RailOrderItem>

      <RailOrderItem order={3}>
      <ExpandableRailCard
        title="Smart Study Picks"
        description="AI-selected learning resources"
        icon={<BrainCircuit className="h-4 w-4" />}
      >
        {isLoadingAi ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
          </div>
        ) : studyMaterials.length > 0 ? (
          <div className="space-y-2">
            {studyMaterials.slice(0, 4).map(resource => (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/40"
              >
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">
                    {resource.title}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {resource.source || "Learning resource"}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No study recommendations are available yet.
          </p>
        )}
      </ExpandableRailCard>
      </RailOrderItem>

      <RailOrderItem order={5}>
      <ExpandableRailCard
        title="My Courses"
        description={`${courses.length} active enrolment${courses.length === 1 ? "" : "s"}`}
        icon={<BookOpen className="h-4 w-4" />}
      >
        {courses.length > 0 ? (
          <div className="space-y-1">
            {courses.slice(0, 3).map(course => (
              <button
                type="button"
                key={course.id}
                onClick={() => onOpenCourse(course.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                  {course.code.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{course.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {course.progress}% complete · {course.pendingAssignments}{" "}
                    pending
                  </p>
                </div>
              </button>
            ))}
            {courses.length > 3 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 w-full"
                onClick={onBrowseCourses}
              >
                View all courses
              </Button>
            )}
          </div>
        ) : (
          <div className="py-3 text-center">
            <p className="text-sm text-muted-foreground">
              You are not enrolled in a course yet.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={onBrowseCourses}
            >
              Browse courses
            </Button>
          </div>
        )}
      </ExpandableRailCard>
      </RailOrderItem>

      <RailOrderItem order={2}>
      <Card className="overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm dark:border-amber-900/60 dark:from-amber-950/45 dark:to-orange-950/35">
        {motivation.length > 0 ? (
          <a
            href={motivation[0].url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-3 p-4 transition-colors hover:bg-amber-100/40 dark:hover:bg-amber-900/25"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200">
                <GraduationCap className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Motivation Zone
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground dark:text-amber-50">
                {motivation[0].title}
              </p>
            </div>
            <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
          </a>
        ) : (
          <div className="flex items-center gap-3 p-4">
            <GraduationCap className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            <div>
              <p className="text-sm font-semibold dark:text-amber-50">Motivation Zone</p>
              <p className="text-xs text-muted-foreground dark:text-amber-200/80">
                Your next study boost will appear here.
              </p>
            </div>
          </div>
        )}
      </Card>
      </RailOrderItem>

      <RailOrderItem order={7}>
      <PanelCard
        title="Announcements"
        description={`${announcements.length} current notice${
          announcements.length === 1 ? "" : "s"
        }`}
        icon={<Bell className="h-4 w-4" />}
      >
        {announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.slice(0, 2).map(announcement => (
              <div
                key={announcement.id}
                className="border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-medium">
                    {announcement.title}
                  </p>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {announcement.priority}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {announcement.content}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(announcement.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No active announcements.
          </p>
        )}
      </PanelCard>
      </RailOrderItem>

      <RailOrderItem order={8}>
      <OnlineActivity userRole="student" />
      </RailOrderItem>
      <RailOrderItem order={9}>
      <StudyGroupsDashboard />
      </RailOrderItem>
      </OrderedRailCards>
    </aside>
  );
}
