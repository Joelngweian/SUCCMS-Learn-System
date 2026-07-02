import { useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Sparkles,
  Users,
} from "lucide-react";
import { AIRecommendations } from "../AIRecommendations";
import { CampusFeed } from "@/components/campus-feed";
import { OnlineActivity } from "../SocialWidgets";
import { Stories } from "../Stories";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Progress } from "../ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";

export interface LecturerDashboardCourse {
  id: string;
  code: string;
  name: string;
  semester: string;
  enrollmentKey: string | null;
  enrolledStudents: number;
  totalStudents: number;
  assignmentCount: number;
  materialCount: number;
  completionRate: number;
  pendingGrades: number;
  recentActivity: string;
  averageGrade: string | null;
  engagement: number;
}

export interface LecturerRecentActivity {
  id: string;
  student: string;
  avatarUrl?: string;
  action: string;
  item: string;
  course: string;
  time: string;
  needsGrading: boolean;
  grade: number | null;
}

export interface LecturerUpcomingDeadline {
  id: string;
  courseId: string;
  course: string;
  title: string;
  dueDate: string;
  submissionCount: number;
  enrolledStudents: number;
}

interface LecturerDashboardViewProps {
  courses: LecturerDashboardCourse[];
  loadError: string;
  onNavigate: (path: string) => void;
  profile: {
    avatarUrl?: string | null;
    fullName?: string | null;
  };
  recentActivity: LecturerRecentActivity[];
  stats: {
    totalStudents: number;
    pendingGrades: number;
    forumPostsToday: number;
    averageEngagement: number;
  };
  upcomingDeadlines: LecturerUpcomingDeadline[];
}

function LecturerStatsGrid({
  courses,
  stats,
  upcomingDeadlines,
}: Pick<
  LecturerDashboardViewProps,
  "courses" | "stats" | "upcomingDeadlines"
>) {
  const dueThisWeek = upcomingDeadlines.filter(deadline => {
    const timeUntilDue = new Date(deadline.dueDate).getTime() - Date.now();
    return timeUntilDue >= 0 && timeUntilDue <= 7 * 86400000;
  }).length;
  const items = [
    {
      label: "Active Courses",
      value: courses.length,
      icon: <BookOpen className="h-6 w-6 text-blue-600" />,
      iconClassName: "bg-blue-100",
    },
    {
      label: "Total Students",
      value: stats.totalStudents,
      icon: <Users className="h-6 w-6 text-emerald-600" />,
      iconClassName: "bg-emerald-100",
    },
    {
      label: "Pending Grades",
      value: stats.pendingGrades,
      icon: <FileText className="h-6 w-6 text-orange-600" />,
      iconClassName: "bg-orange-100",
    },
    {
      label: "Due This Week",
      value: dueThisWeek,
      icon: <Calendar className="h-6 w-6 text-purple-600" />,
      iconClassName: "bg-purple-100",
    },
    {
      label: "Submission Rate",
      value: `${stats.averageEngagement}%`,
      icon: <BarChart3 className="h-6 w-6 text-rose-600" />,
      iconClassName: "bg-rose-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {items.map((item, index) => (
        <Card
          key={item.label}
          className={`shadow-sm ${
            index === items.length - 1 ? "col-span-2 md:col-span-1" : ""
          }`}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${item.iconClassName}`}>
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="min-h-7 text-[11px] leading-tight text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-xl font-semibold sm:text-2xl">
                  {item.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CourseDetailsDialog({
  course,
  onClose,
  onNavigate,
}: {
  course: LecturerDashboardCourse | null;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const navigateFromDialog = (path: string) => {
    onClose();
    onNavigate(path);
  };

  return (
    <Dialog open={course !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {course && (
          <>
            <DialogHeader className="pr-10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{course.code}</Badge>
                  {course.pendingGrades > 0 && (
                    <Badge variant="destructive">
                      {course.pendingGrades} to grade
                    </Badge>
                  )}
                </div>
                <div className="shrink-0 rounded-lg border bg-muted/30 px-3 py-1.5 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Enrollment Key
                  </p>
                  <p className="font-mono text-sm font-semibold tracking-wider">
                    {course.enrollmentKey || "NOT SET"}
                  </p>
                </div>
              </div>
              <DialogTitle className="text-2xl">{course.name}</DialogTitle>
              <DialogDescription>{course.semester}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Students</p>
                <p className="mt-1 text-xl font-semibold">
                  {course.enrolledStudents}
                  {course.totalStudents > 0 ? `/${course.totalStudents}` : ""}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Average Grade</p>
                <p className="mt-1 text-xl font-semibold">
                  {course.averageGrade || "Not graded"}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Engagement</p>
                <p className="mt-1 text-xl font-semibold">
                  {course.engagement}%
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Pending Grades</p>
                <p className="mt-1 text-xl font-semibold">
                  {course.pendingGrades}
                </p>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Assignment Submission Rate</p>
                  <p className="text-xs text-muted-foreground">
                    Submission progress across this course
                  </p>
                </div>
                <p className="text-lg font-semibold">
                  {course.completionRate}%
                </p>
              </div>
              <Progress value={course.completionRate} className="h-2" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border p-4">
                <div className="rounded-lg bg-orange-100 p-2">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {course.assignmentCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Assignments</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border p-4">
                <div className="rounded-lg bg-blue-100 p-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {course.materialCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Materials</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border p-4">
                <div className="rounded-lg bg-emerald-100 p-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {course.recentActivity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recent Activity
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigateFromDialog(`/courses?courseId=${course.id}`)
                }
              >
                <Eye className="h-4 w-4" />
                View Course
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigateFromDialog("/assignments")}
                >
                  <FileText className="h-4 w-4" />
                  Grade Assignments
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    navigateFromDialog(`/analytics?course=${course.code}`)
                  }
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LecturerRightRail({
  courses,
  onNavigate,
  recentActivity,
  stats,
  upcomingDeadlines,
}: Pick<
  LecturerDashboardViewProps,
  | "courses"
  | "onNavigate"
  | "recentActivity"
  | "stats"
  | "upcomingDeadlines"
>) {
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] =
    useState<LecturerDashboardCourse | null>(null);

  return (
    <>
      <aside className="space-y-4 2xl:sticky 2xl:top-24 2xl:max-h-[calc(100vh-7rem)] 2xl:self-start 2xl:overflow-y-auto 2xl:pr-1">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Teaching Panel
        </h2>
      </div>

        <Collapsible open={coursesOpen} onOpenChange={setCoursesOpen}>
          <Card className="overflow-hidden shadow-sm">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
              >
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">My Courses</p>
                  <p className="text-xs text-muted-foreground">
                    {courses.length} active course
                    {courses.length === 1 ? "" : "s"}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    coursesOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 border-t px-4 pb-4 pt-3">
                {courses.length > 0 ? (
                  <>
                    {courses.map(course => (
                      <div
                        key={course.id}
                        className="rounded-xl border bg-card p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Badge
                              variant="outline"
                              className="mb-1.5 text-[10px]"
                            >
                              {course.code}
                            </Badge>
                            <p className="line-clamp-2 text-sm font-medium">
                              {course.name}
                            </p>
                          </div>
                          {course.pendingGrades > 0 && (
                            <Badge
                              variant="destructive"
                              className="shrink-0 text-[10px]"
                            >
                              {course.pendingGrades} to grade
                            </Badge>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>
                            {course.enrolledStudents}
                            {course.totalStudents > 0
                              ? `/${course.totalStudents}`
                              : ""}{" "}
                            students
                          </span>
                          <span>{course.completionRate}% submitted</span>
                        </div>
                        <Progress
                          value={course.completionRate}
                          className="mt-1.5 h-1.5"
                        />

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => setSelectedCourse(course)}
                        >
                          View Details
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => onNavigate("/courses")}
                    >
                      Manage all courses
                    </Button>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <BookOpen className="mx-auto h-7 w-7 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No courses are assigned yet.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => onNavigate("/courses")}
                    >
                      Open Courses
                    </Button>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

      <AIRecommendations
        compact
        userRole="lecturer"
        currentCourses={courses.map(course => course.code)}
        performanceData={{
          courses,
          overview: stats,
        }}
      />

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingDeadlines.length > 0 ? (
            upcomingDeadlines.slice(0, 4).map(deadline => (
              <button
                type="button"
                key={deadline.id}
                onClick={() =>
                  onNavigate(
                    `/courses?courseId=${deadline.courseId}&assignmentId=${deadline.id}`,
                  )
                }
                className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {deadline.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {deadline.course}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-orange-600">
                    {new Date(deadline.dueDate).toLocaleDateString()}
                  </span>
                  <span className="text-muted-foreground">
                    {deadline.submissionCount}/{deadline.enrolledStudents}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No upcoming deadlines.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Recent Student Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.slice(0, 5).map(activity => (
              <div key={activity.id} className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activity.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {activity.student
                      .split(" ")
                      .map(name => name[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">
                    <span className="font-medium">{activity.student}</span>{" "}
                    <span className="text-muted-foreground">
                      {activity.action}
                    </span>{" "}
                    {activity.item}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] text-muted-foreground">
                      {activity.course} · {activity.time}
                    </p>
                    {activity.needsGrading && (
                      <Badge variant="destructive" className="text-[10px]">
                        Grade
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No student submissions yet.
            </p>
          )}
        </CardContent>
      </Card>

        <OnlineActivity userRole="lecturer" />
      </aside>

      <CourseDetailsDialog
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        onNavigate={onNavigate}
      />
    </>
  );
}

export function LecturerDashboardView({
  courses,
  loadError,
  onNavigate,
  profile,
  recentActivity,
  stats,
  upcomingDeadlines,
}: LecturerDashboardViewProps) {
  const firstName = profile.fullName?.split(" ")[0] || "Lecturer";
  const [isTeachingPanelOpen, setIsTeachingPanelOpen] = useState(false);
  const teachingPanel = (
    <LecturerRightRail
      courses={courses}
      onNavigate={onNavigate}
      recentActivity={recentActivity}
      stats={stats}
      upcomingDeadlines={upcomingDeadlines}
    />
  );

  return (
    <div className="grid animate-in grid-cols-1 items-start gap-8 fade-in duration-500 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {firstName}!
            </h1>
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Your courses and campus activity are ready.
            </p>
          </div>
          <Sheet
            open={isTeachingPanelOpen}
            onOpenChange={setIsTeachingPanelOpen}
          >
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="2xl:hidden"
              >
                <Sparkles className="h-4 w-4 text-purple-500" />
                Teaching Panel
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-hidden p-0">
              <SheetTitle className="sr-only">Teaching Panel</SheetTitle>
              <SheetDescription className="sr-only">
                Course shortcuts, grading queue and teaching insights.
              </SheetDescription>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {teachingPanel}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {loadError && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {loadError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border bg-card px-3 py-3 shadow-sm sm:px-6 sm:pb-0 sm:pt-5">
          <Stories
            currentUserName={profile.fullName || "Your Story"}
            currentUserInitials={(profile.fullName || "YS")
              .split(" ")
              .map(part => part[0])
              .join("")}
            currentUserAvatar={profile.avatarUrl || undefined}
            currentUserRole="lecturer"
          />
        </div>

        <LecturerStatsGrid
          courses={courses}
          stats={stats}
          upcomingDeadlines={upcomingDeadlines}
        />

        <main className="min-w-0">
          <CampusFeed />
        </main>
      </div>

      <div className="hidden 2xl:block">{teachingPanel}</div>
    </div>
  );
}
