import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
  LecturerDashboardView,
  type LecturerDashboardCourse,
  type LecturerRecentActivity,
  type LecturerUpcomingDeadline,
} from "./lecturer-dashboard/LecturerDashboardView";

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
  const [myCourses, setMyCourses] = useState<LecturerDashboardCourse[]>([]);
  const [recentActivity, setRecentActivity] = useState<
    LecturerRecentActivity[]
  >([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<
    LecturerUpcomingDeadline[]
  >([]);
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

      const profilesById = new Map(
        profileRows.map((row: ProfileSummary) => [row.id, row]),
      );
      const courseById = new Map(
        courseRows.map(course => [course.id, course]),
      );
      const assignmentById = new Map(
        assignmentRows.map(assignment => [assignment.id, assignment]),
      );

      const enrollmentsByCourse = new Map<string, EnrollmentRow[]>();
      enrollmentRows.forEach(enrollment => {
        const current = enrollmentsByCourse.get(enrollment.course_id) || [];
        current.push(enrollment);
        enrollmentsByCourse.set(enrollment.course_id, current);
      });

      const assignmentsByCourse = new Map<string, AssignmentRow[]>();
      assignmentRows.forEach(assignment => {
        const current = assignmentsByCourse.get(assignment.course_id) || [];
        current.push(assignment);
        assignmentsByCourse.set(assignment.course_id, current);
      });

      const submissionsByAssignment = new Map<string, SubmissionRow[]>();
      submissionRows.forEach(submission => {
        const current =
          submissionsByAssignment.get(submission.assignment_id) || [];
        current.push(submission);
        submissionsByAssignment.set(submission.assignment_id, current);
      });

      const materialsByCourse = new Map<string, number>();
      materialRows.forEach((material: MaterialRow) => {
        materialsByCourse.set(
          material.course_id,
          (materialsByCourse.get(material.course_id) || 0) + 1,
        );
      });

      const courses: LecturerDashboardCourse[] = courseRows.map(course => {
        const courseEnrollments =
          enrollmentsByCourse.get(course.id) || [];
        const courseAssignments =
          assignmentsByCourse.get(course.id) || [];
        const courseSubmissions = courseAssignments.flatMap(
          assignment => submissionsByAssignment.get(assignment.id) || [],
        );
        const expectedSubmissions =
          courseEnrollments.length * courseAssignments.length;
        const uniqueSubmitters = new Set(
          courseSubmissions.map(submission => submission.student_id),
        ).size;
        const ungradedCount = courseSubmissions.filter(
          submission => submission.grade == null,
        ).length;
        const gradedPercentages = courseSubmissions
          .filter(submission => submission.grade != null)
          .map(submission => {
            const assignment = assignmentById.get(
              submission.assignment_id,
            );
            return (
              (Number(submission.grade)
                / (Number(assignment?.max_score) || 100))
              * 100
            );
          });
        const averagePercentage =
          gradedPercentages.length > 0
            ? gradedPercentages.reduce(
                (sum: number, value: number) => sum + value,
                0,
              ) / gradedPercentages.length
            : null;

        return {
          id: course.id,
          code: getCourseCode(course),
          name: course.name,
          semester: course.semester || "No semester set",
          enrollmentKey: course.enrollment_key,
          enrolledStudents: courseEnrollments.length,
          totalStudents: Number(
            course.max_capacity ?? course.max_students ?? 0,
          ),
          assignmentCount: courseAssignments.length,
          materialCount: materialsByCourse.get(course.id) || 0,
          completionRate:
            expectedSubmissions > 0
              ? Math.round(
                  (courseSubmissions.length / expectedSubmissions) * 100,
                )
              : 0,
          pendingGrades: ungradedCount,
          recentActivity:
            courseSubmissions.length > 0
              ? `${courseSubmissions.length} submissions`
              : "No submissions",
          averageGrade: percentageToGrade(averagePercentage),
          engagement:
            courseEnrollments.length > 0
              ? Math.round(
                  (uniqueSubmitters / courseEnrollments.length) * 100,
                )
              : 0,
        };
      });

      const activity: LecturerRecentActivity[] = submissionRows
        .slice(0, 8)
        .map(submission => {
          const assignment = assignmentById.get(
            submission.assignment_id,
          );
          const course = assignment
            ? courseById.get(assignment.course_id)
            : undefined;
          const student = profilesById.get(submission.student_id);

          return {
            id: submission.id,
            student: student?.full_name || "Student",
            avatarUrl: student?.avatar_url || undefined,
            action: "submitted",
            item: assignment?.title || "Assignment",
            course: getCourseCode(course),
            time: formatDateTime(submission.submitted_at),
            needsGrading: submission.grade == null,
            grade: submission.grade,
          };
        });

      const deadlines: LecturerUpcomingDeadline[] = assignmentRows
        .filter(assignment => new Date(assignment.due_date) >= new Date())
        .sort(
          (left, right) =>
            new Date(left.due_date).getTime()
            - new Date(right.due_date).getTime(),
        )
        .slice(0, 5)
        .map(assignment => {
          const course = courseById.get(assignment.course_id);
          return {
            id: assignment.id,
            courseId: assignment.course_id,
            course:
              `${getCourseCode(course)} - ${course?.name || "Course"}`,
            title: assignment.title,
            dueDate: assignment.due_date,
            submissionCount:
              (submissionsByAssignment.get(assignment.id) || []).length,
            enrolledStudents:
              (enrollmentsByCourse.get(assignment.course_id) || []).length,
          };
        });

      const uniqueStudents = new Set(
        enrollmentRows.map(enrollment => enrollment.student_id),
      ).size;
      const averageEngagement =
        courses.length > 0
          ? Math.round(
              courses.reduce(
                (sum, course) => sum + course.engagement,
                0,
              ) / courses.length,
            )
          : 0;

      setMyCourses(courses);
      setRecentActivity(activity);
      setUpcomingDeadlines(deadlines);
      setStats({
        totalStudents: uniqueStudents,
        pendingGrades: submissionRows.filter(
          submission => submission.grade == null,
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

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <LecturerDashboardView
      courses={myCourses}
      loadError={loadError}
      onNavigate={navigate}
      profile={{
        avatarUrl: profile?.avatar_url,
        fullName: profile?.full_name,
      }}
      recentActivity={recentActivity}
      stats={stats}
      upcomingDeadlines={upcomingDeadlines}
    />
  );
}
