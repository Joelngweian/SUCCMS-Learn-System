import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { AIRecommendations } from "./AIRecommendations";
import { Stories } from "./Stories";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadLecturerDashboardRawData,
  type LecturerAssignmentRow as AssignmentRow,
  type LecturerEnrollmentRow as EnrollmentRow,
  type LecturerMaterialRow as MaterialRow,
  type LecturerProfileSummary as ProfileSummary,
  type LecturerSubmissionRow as SubmissionRow,
} from "@/data/lecturerDashboardRepository";
import {
  BookOpen,
  Users,
  FileText,
  MessageSquare,
  Clock,
  TrendingUp,
  AlertCircle,
  Calendar,
  BarChart3,
  Eye,
  Loader2,
  ChevronRight,
} from "lucide-react";

interface LecturerCourse {
  id: string;
  code: string;
  name: string;
  semester: string;
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

interface PendingTask {
  id: string;
  assignmentId: string;
  courseId: string;
  title: string;
  course: string;
  count: number;
  dueDate: string;
  priority: "high" | "medium" | "low";
  timeEstimate: string;
}

interface RecentActivity {
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

interface UpcomingDeadline {
  id: string;
  courseId: string;
  course: string;
  title: string;
  dueDate: string;
  submissionCount: number;
  enrolledStudents: number;
}

const getCourseCode = (course?: {
  course_code?: string | null;
  code?: string | null;
} | null) => course?.course_code || course?.code || "N/A";

const percentageToGrade = (percentage: number | null) => {
  if (percentage == null) return null;
  if (percentage >= 80) return "A";
  if (percentage >= 75) return "A-";
  if (percentage >= 70) return "B+";
  if (percentage >= 65) return "B";
  if (percentage >= 60) return "B-";
  if (percentage >= 55) return "C+";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function LecturerDashboard() {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [myCourses, setMyCourses] = useState<LecturerCourse[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingGrades: 0,
    forumPostsToday: 0,
    averageEngagement: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setLoadError("");

    try {
      const {
        assignmentRows,
        courseRows,
        enrollmentRows,
        forumPostsToday,
        materialRows,
        profileRows,
        submissionRows,
      } = await loadLecturerDashboardRawData(userId);

      if (courseRows.length === 0) {
        setMyCourses([]);
        setPendingTasks([]);
        setRecentActivity([]);
        setUpcomingDeadlines([]);
        setStats({
          totalStudents: 0,
          pendingGrades: 0,
          forumPostsToday: 0,
          averageEngagement: 0,
        });
        return;
      }

      const profilesById = new Map(profileRows.map((row) => [row.id, row]));
      const courseById = new Map(courseRows.map((course) => [course.id, course]));
      const assignmentById = new Map(
        assignmentRows.map((assignment) => [assignment.id, assignment])
      );

      const enrollmentsByCourse = new Map<string, EnrollmentRow[]>();
      enrollmentRows.forEach((enrollment) => {
        const current = enrollmentsByCourse.get(enrollment.course_id) || [];
        current.push(enrollment);
        enrollmentsByCourse.set(enrollment.course_id, current);
      });

      const assignmentsByCourse = new Map<string, AssignmentRow[]>();
      assignmentRows.forEach((assignment) => {
        const current = assignmentsByCourse.get(assignment.course_id) || [];
        current.push(assignment);
        assignmentsByCourse.set(assignment.course_id, current);
      });

      const submissionsByAssignment = new Map<string, SubmissionRow[]>();
      submissionRows.forEach((submission) => {
        const current = submissionsByAssignment.get(submission.assignment_id) || [];
        current.push(submission);
        submissionsByAssignment.set(submission.assignment_id, current);
      });

      const materialsByCourse = new Map<string, number>();
      materialRows.forEach((material: MaterialRow) => {
        materialsByCourse.set(
          material.course_id,
          (materialsByCourse.get(material.course_id) || 0) + 1
        );
      });

      const courses: LecturerCourse[] = courseRows.map((course) => {
        const courseEnrollments = enrollmentsByCourse.get(course.id) || [];
        const courseAssignments = assignmentsByCourse.get(course.id) || [];
        const courseSubmissions = courseAssignments.flatMap(
          (assignment) => submissionsByAssignment.get(assignment.id) || []
        );
        const expectedSubmissions = courseEnrollments.length * courseAssignments.length;
        const uniqueSubmitters = new Set(
          courseSubmissions.map((submission) => submission.student_id)
        ).size;
        const ungradedCount = courseSubmissions.filter(
          (submission) => submission.grade == null
        ).length;
        const gradedPercentages = courseSubmissions
          .filter((submission) => submission.grade != null)
          .map((submission) => {
            const assignment = assignmentById.get(submission.assignment_id);
            return (
              (Number(submission.grade) / (Number(assignment?.max_score) || 100)) *
              100
            );
          });
        const averagePercentage =
          gradedPercentages.length > 0
            ? gradedPercentages.reduce((sum: number, value: number) => sum + value, 0) /
              gradedPercentages.length
            : null;

        return {
          id: course.id,
          code: getCourseCode(course),
          name: course.name,
          semester: course.semester || "No semester set",
          enrolledStudents: courseEnrollments.length,
          totalStudents: Number(course.max_capacity ?? course.max_students ?? 0),
          assignmentCount: courseAssignments.length,
          materialCount: materialsByCourse.get(course.id) || 0,
          completionRate:
            expectedSubmissions > 0
              ? Math.round((courseSubmissions.length / expectedSubmissions) * 100)
              : 0,
          pendingGrades: ungradedCount,
          recentActivity:
            courseSubmissions.length > 0
              ? `${courseSubmissions.length} submissions`
              : "No submissions",
          averageGrade: percentageToGrade(averagePercentage),
          engagement:
            courseEnrollments.length > 0
              ? Math.round((uniqueSubmitters / courseEnrollments.length) * 100)
              : 0,
        };
      });

      const tasks: PendingTask[] = assignmentRows
        .map((assignment) => {
          const submissions = submissionsByAssignment.get(assignment.id) || [];
          const ungraded = submissions.filter(
            (submission) => submission.grade == null
          ).length;
          if (ungraded === 0) return null;

          const dueDate = new Date(assignment.due_date);
          const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
          const course = courseById.get(assignment.course_id);

          return {
            id: assignment.id,
            assignmentId: assignment.id,
            courseId: assignment.course_id,
            title: `Grade ${assignment.title}`,
            course: getCourseCode(course),
            count: ungraded,
            dueDate: assignment.due_date,
            priority:
              daysUntilDue <= 1 || ungraded >= 10
                ? "high"
                : daysUntilDue <= 4 || ungraded >= 5
                  ? "medium"
                  : "low",
            timeEstimate: `${Math.max(15, ungraded * 5)} min`,
          } as PendingTask;
        })
        .filter(Boolean)
        .sort(
          (a: PendingTask, b: PendingTask) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );

      const activity: RecentActivity[] = submissionRows.slice(0, 8).map((submission) => {
        const assignment = assignmentById.get(submission.assignment_id);
        const course = assignment
          ? courseById.get(assignment.course_id)
          : undefined;
        const student = profilesById.get(submission.student_id);

        return {
          id: submission.id,
          student: student?.full_name || "Student",
          avatarUrl: student?.avatar_url,
          action: "submitted",
          item: assignment?.title || "Assignment",
          course: getCourseCode(course),
          time: formatDateTime(submission.submitted_at),
          needsGrading: submission.grade == null,
          grade: submission.grade,
        };
      });

      const deadlines: UpcomingDeadline[] = assignmentRows
        .filter((assignment) => new Date(assignment.due_date) >= new Date())
        .sort(
          (a, b) =>
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        )
        .slice(0, 5)
        .map((assignment) => {
          const course = courseById.get(assignment.course_id);
          return {
            id: assignment.id,
            courseId: assignment.course_id,
            course: `${getCourseCode(course)} - ${course?.name || "Course"}`,
            title: assignment.title,
            dueDate: assignment.due_date,
            submissionCount: (submissionsByAssignment.get(assignment.id) || []).length,
            enrolledStudents: (enrollmentsByCourse.get(assignment.course_id) || []).length,
          };
        });

      const uniqueStudents = new Set(
        enrollmentRows.map((enrollment) => enrollment.student_id)
      ).size;
      const averageEngagement =
        courses.length > 0
          ? Math.round(
              courses.reduce((sum, course) => sum + course.engagement, 0) /
                courses.length
            )
          : 0;

      setMyCourses(courses);
      setPendingTasks(tasks);
      setRecentActivity(activity);
      setUpcomingDeadlines(deadlines);
      setStats({
        totalStudents: uniqueStudents,
        pendingGrades: submissionRows.filter(
          (submission) => submission.grade == null
        ).length,
        forumPostsToday,
        averageEngagement,
      });
    } catch (error: unknown) {
      console.error("Failed to load lecturer dashboard:", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load dashboard data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) void loadDashboardData();
  }, [loadDashboardData, userId]);

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

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 85) return "text-green-600";
    if (engagement >= 70) return "text-blue-600";
    if (engagement >= 55) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1>Welcome, {profile?.full_name || "Lecturer"}</h1>
          <p className="text-muted-foreground">
            Manage your courses and track student progress
          </p>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {loadError}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <Stories
            currentUserName={profile?.full_name || "Your Story"}
            currentUserInitials={(profile?.full_name || "YS")
              .split(" ")
              .map((part) => part[0])
              .join("")}
            currentUserAvatar={profile?.avatar_url}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Courses</p>
                <p className="text-2xl font-semibold">{myCourses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-semibold">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Grades</p>
                <p className="text-2xl font-semibold">{stats.pendingGrades}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Forum Posts</p>
                <p className="text-2xl font-semibold">{stats.forumPostsToday}</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Engagement</p>
                <p className="text-2xl font-semibold">{stats.averageEngagement}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Courses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {myCourses.length > 0 ? (
                myCourses.map((course) => (
                  <div key={course.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{course.code}</Badge>
                          <h4>{course.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {course.semester}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-medium">
                          {course.enrolledStudents}
                          {course.totalStudents > 0 ? `/${course.totalStudents}` : ""} students
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge className="text-xs">
                            Avg: {course.averageGrade || "Not graded"}
                          </Badge>
                          <span className={`text-xs ${getEngagementColor(course.engagement)}`}>
                            {course.engagement}% engaged
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Assignment Submission Rate</span>
                        <span>{course.completionRate}%</span>
                      </div>
                      <Progress value={course.completionRate} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{course.assignmentCount} assignments</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{course.materialCount} materials</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {course.pendingGrades > 0 && (
                          <Badge variant="destructive">
                            {course.pendingGrades} to grade
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {course.recentActivity}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/courses?courseId=${course.id}`)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Course
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/assignments")}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Grade Assignments
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/analytics?course=${course.code}`)}
                      >
                        <BarChart3 className="h-3 w-3 mr-1" />
                        Analytics
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    You have not added any courses yet.
                  </p>
                  <Button className="mt-4" onClick={() => navigate("/courses")}>
                    Open Course Catalog
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <AIRecommendations
            userRole="lecturer"
            currentCourses={myCourses.map((course) => course.code)}
            performanceData={{
              courses: myCourses,
              overview: stats,
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Pending Grading
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingTasks.length > 0 ? (
                pendingTasks.map((task) => (
                  <div key={task.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-muted-foreground">{task.course}</p>
                        </div>
                      </div>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-4">
                        <span>{task.count} submissions</span>
                        <span className="text-muted-foreground">
                          Est. {task.timeEstimate}
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() =>
                        navigate(
                          `/courses?courseId=${task.courseId}&assignmentId=${task.assignmentId}`
                        )
                      }
                    >
                      Start Grading
                    </Button>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No submissions are waiting for grading.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.map((deadline) => (
                  <button
                    type="button"
                    key={deadline.id}
                    onClick={() =>
                      navigate(
                        `/courses?courseId=${deadline.courseId}&assignmentId=${deadline.id}`
                      )
                    }
                    className="w-full space-y-2 rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-medium">{deadline.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {deadline.course}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-orange-600">
                      Due {formatDateTime(deadline.dueDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {deadline.submissionCount}/{deadline.enrolledStudents} submitted
                    </p>
                  </button>
                ))
              ) : (
                <p className="py-5 text-center text-sm text-muted-foreground">
                  No upcoming assignment deadlines.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Student Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.avatarUrl} />
                      <AvatarFallback>
                        {activity.student
                          .split(" ")
                          .map((name) => name[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.student}</span>{" "}
                        <span className="text-muted-foreground">{activity.action}</span>{" "}
                        <span>{activity.item}</span>
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          {activity.course} · {activity.time}
                        </p>
                        {activity.grade != null ? (
                          <Badge variant="secondary" className="text-xs">
                            {activity.grade}
                          </Badge>
                        ) : activity.needsGrading ? (
                          <Badge variant="destructive" className="text-xs">
                            Needs grading
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-5 text-center text-sm text-muted-foreground">
                  No student submissions yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
