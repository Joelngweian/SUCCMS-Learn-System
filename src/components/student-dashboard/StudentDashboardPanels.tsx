import type { ReactNode } from "react";
import {
  Bell,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Music,
  PlayCircle,
  TrendingUp,
  Youtube,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Progress } from "../ui/progress";

interface CourseActivity {
  courseCode: string;
  courseName: string;
  lastAccessed: Date;
  progress: number;
}

interface Recommendation {
  id: string;
  title: string;
  type: string;
  url: string;
  source?: string;
}

interface StudentCourse {
  id: string;
  code: string;
  name: string;
  lecturer: string;
  progress: number;
  assignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  status: string;
  grade: string | null;
  credits: number;
  nextAssignment?: {
    id: string;
    title: string;
    dueDate: string;
  };
}

interface DashboardAssignment {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  title: string;
  dueDate: string;
}

interface DashboardAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  attachments: Array<{
    name: string;
    path: string;
    url: string;
    type: string;
    size: number;
  }>;
  createdAt: string;
  isRead: boolean;
}

const getResourceIcon = (type: string) => {
  switch (type) {
    case "video":
      return <Youtube className="h-4 w-4" />;
    case "music":
      return <Music className="h-4 w-4" />;
    case "article":
      return <BookOpen className="h-4 w-4" />;
    default:
      return <PlayCircle className="h-4 w-4" />;
  }
};

const getResourceColor = (type: string) => {
  switch (type) {
    case "video":
      return "bg-red-100 text-red-600";
    case "music":
      return "bg-purple-100 text-purple-600";
    case "article":
      return "bg-blue-100 text-blue-600";
    default:
      return "bg-amber-100 text-amber-600";
  }
};

interface StudentFocusPanelsProps {
  recentCourses: CourseActivity[];
  studyMaterials: Recommendation[];
  motivation: Recommendation[];
  isLoading: boolean;
  onOpenCourses: () => void;
}

export function StudentFocusPanels({
  recentCourses,
  studyMaterials,
  motivation,
  isLoading,
  onOpenCourses,
}: StudentFocusPanelsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="col-span-1 border-l-4 border-l-blue-500 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-blue-500" />
            Jump Back In
          </CardTitle>
          <CardDescription>Pick up where you left off</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentCourses.length > 0 ? (
            recentCourses.map((course) => (
              <button
                type="button"
                key={course.courseCode}
                onClick={onOpenCourses}
                className="group w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">
                      {course.courseName}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      Last active: {course.lastAccessed.toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {course.courseCode}
                  </Badge>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </button>
            ))
          ) : (
            <p className="p-3 text-center text-sm text-muted-foreground">
              Enrol in a course to get started.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-1 border-l-4 border-l-purple-500 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BrainCircuit className="h-5 w-5 text-purple-500" />
            Smart Study Picks
          </CardTitle>
          <CardDescription>Curated external resources for you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex min-h-[120px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            </div>
          ) : (
            <>
              {studyMaterials.map((item) => (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  key={item.id}
                  className="group flex items-start gap-3 rounded-lg border border-transparent p-3 transition-colors hover:border-purple-100 hover:bg-purple-50 dark:hover:bg-purple-900/10"
                >
                  <div
                    className={`shrink-0 rounded-md p-2 ${getResourceColor(item.type)}`}
                  >
                    {getResourceIcon(item.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-tight underline-offset-2 group-hover:underline group-hover:decoration-purple-400">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.source}
                    </p>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              ))}
              {studyMaterials.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">
                  No specific recommendations found for your current courses.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-1 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/30 to-transparent shadow-sm transition-shadow hover:shadow-md dark:from-amber-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-amber-500" />
            Motivation Zone
          </CardTitle>
          <CardDescription>Productivity boosters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {motivation.map((item) => (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              key={item.id}
              className="group flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-white/60 dark:hover:bg-black/20"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getResourceColor(item.type)}`}
              >
                {getResourceIcon(item.type)}
              </div>
              <div className="flex-1">
                <p className="line-clamp-1 text-sm font-semibold group-hover:text-amber-700">
                  {item.title}
                </p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {item.source}
                </p>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          ))}
          <div className="mt-4 rounded-lg border bg-white/50 p-3 text-center text-xs italic text-muted-foreground dark:bg-black/20">
            "Focus is not about saying yes. It's about saying no to the hundred
            other good ideas."
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StudentStatsGridProps {
  enrolledCount: number;
  pendingAssignments: number;
  gpa: number | null;
  credits: number;
  unreadAlerts: number;
}

export function StudentStatsGrid({
  enrolledCount,
  pendingAssignments,
  gpa,
  credits,
  unreadAlerts,
}: StudentStatsGridProps) {
  const items: Array<{
    label: string;
    value: ReactNode;
    icon: ReactNode;
    iconClassName: string;
  }> = [
    {
      label: "Enrolled",
      value: enrolledCount,
      icon: <BookOpen className="h-6 w-6 text-blue-600" />,
      iconClassName: "bg-blue-100",
    },
    {
      label: "Pending",
      value: pendingAssignments,
      icon: <FileText className="h-6 w-6 text-orange-600" />,
      iconClassName: "bg-orange-100",
    },
    {
      label: "GPA",
      value: gpa == null ? "--" : gpa.toFixed(2),
      icon: <TrendingUp className="h-6 w-6 text-green-600" />,
      iconClassName: "bg-green-100",
    },
    {
      label: "Credits",
      value: credits,
      icon: <GraduationCap className="h-6 w-6 text-purple-600" />,
      iconClassName: "bg-purple-100",
    },
    {
      label: "Unread Alerts",
      value: unreadAlerts,
      icon: <Bell className="h-6 w-6 text-red-600" />,
      iconClassName: "bg-red-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-2 ${item.iconClassName}`}>
                {item.icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-semibold">{item.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface StudentCoursesCardProps {
  courses: StudentCourse[];
  onOpenCourse: (courseId: string) => void;
  onBrowseCourses: () => void;
  formatRelativeDate: (value: string) => string;
}

export function StudentCoursesCard({
  courses,
  onOpenCourse,
  onBrowseCourses,
  formatRelativeDate,
}: StudentCoursesCardProps) {
  const getGradeColor = (grade: string | null) => {
    if (!grade) return "text-gray-600 bg-gray-50";
    if (grade.startsWith("A")) return "text-green-600 bg-green-50";
    if (grade.startsWith("B")) return "text-blue-600 bg-blue-50";
    if (grade.startsWith("C")) return "text-yellow-600 bg-yellow-50";
    return "text-gray-600 bg-gray-50";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "open":
        return "bg-green-100 text-green-800";
      case "unavailable":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Courses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {courses.length > 0 ? (
          courses.map((course) => (
            <button
              type="button"
              key={course.id}
              onClick={() => onOpenCourse(course.id)}
              className="w-full space-y-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{course.code}</Badge>
                    <h4 className="font-medium">{course.name}</h4>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Lecturer: {course.lecturer}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getGradeColor(course.grade)}>
                    {course.grade || "Not graded"}
                  </Badge>
                  <Badge className={getStatusColor(course.status)}>
                    {course.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {course.completedAssignments}/{course.assignments}{" "}
                    assignments submitted
                  </span>
                  <span>{course.progress}%</span>
                </div>
                <Progress value={course.progress} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>{course.credits} credits</span>
                  <span>{course.pendingAssignments} pending</span>
                  {course.nextAssignment && (
                    <span>
                      Next: {course.nextAssignment.title} -{" "}
                      {formatRelativeDate(course.nextAssignment.dueDate)}
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          ))
        ) : (
          <div className="py-10 text-center">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              You have not enrolled in any courses yet.
            </p>
            <Button className="mt-4" onClick={onBrowseCourses}>
              Browse Courses
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface UpcomingAssignmentsCardProps {
  assignments: DashboardAssignment[];
  onOpenAssignment: (courseId: string, assignmentId: string) => void;
  formatRelativeDate: (value: string) => string;
}

export function UpcomingAssignmentsCard({
  assignments,
  onOpenAssignment,
  formatRelativeDate,
}: UpcomingAssignmentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Upcoming Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.length > 0 ? (
          assignments.map((assignment) => (
            <button
              type="button"
              key={assignment.id}
              onClick={() =>
                onOpenAssignment(assignment.courseId, assignment.id)
              }
              className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{assignment.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {assignment.courseCode} - {assignment.courseName}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              <p className="mt-2 text-xs text-orange-600">
                {formatRelativeDate(assignment.dueDate)}
              </p>
            </button>
          ))
        ) : (
          <p className="py-5 text-center text-sm text-muted-foreground">
            No upcoming assignments.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface AnnouncementsCardProps {
  announcements: DashboardAnnouncement[];
}

export function AnnouncementsCard({
  announcements,
}: AnnouncementsCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="space-y-2 border-b pb-4 last:border-0 last:pb-0"
            >
              {announcement.attachments.map((attachment) =>
                attachment.type.startsWith("image/") ? (
                  <a
                    key={attachment.path}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block overflow-hidden rounded-md border"
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="block object-cover"
                      style={{ width: 180, height: 110, maxWidth: "100%" }}
                    />
                  </a>
                ) : (
                  <a
                    key={attachment.path}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{attachment.name}</span>
                  </a>
                )
              )}
              <div className="flex items-center justify-between gap-2">
                <Badge className={getPriorityColor(announcement.priority)}>
                  {announcement.priority}
                </Badge>
                {!announcement.isRead && (
                  <span
                    className="h-2 w-2 rounded-full bg-blue-600"
                    title="Unread"
                  />
                )}
              </div>
              <h4 className="text-sm font-medium">{announcement.title}</h4>
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {announcement.content}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(announcement.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        ) : (
          <p className="py-5 text-center text-sm text-muted-foreground">
            No active announcements.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
