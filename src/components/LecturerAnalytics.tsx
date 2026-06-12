import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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

type CourseMetric = {
  id: string;
  code: string;
  name: string;
  studentIds: string[];
  students: number;
  completion: number;
  engagement: number;
  averageScore: number;
  submissionRate: number;
  pendingGrades: number;
  riskStudents: number;
  forumPosts: number;
  dueAssignments: number;
};

type AssignmentMetric = {
  id: string;
  courseId: string;
  title: string;
  course: string;
  submitted: number;
  total: number;
  average: number | null;
  ungraded: number;
};

type RiskStudent = {
  id: string;
  courseId: string;
  name: string;
  course: string;
  risk: "High" | "Medium";
  reason: string;
  score: number;
};

type TrendPoint = {
  week: string;
  engagement: number;
  submissions: number;
  averageScore: number;
};

type TrendBucket = {
  start: Date;
  end: Date;
  label: string;
};

const getCourseCode = (course: any) => course?.course_code || course?.code || "N/A";

const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));

const average = (values: number[]) =>
  values.length > 0
    ? Math.round(values.reduce((total, value) => total + value, 0) / values.length)
    : 0;

const startOfWeek = (value: Date) => {
  const date = new Date(value);
  const day = date.getDay();
  const distance = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - distance);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getPeriodStart = (period: string) => {
  const now = new Date();

  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const weeks = period === "semester" ? 16 : 6;
  const start = startOfWeek(now);
  start.setDate(start.getDate() - (weeks - 1) * 7);
  return start;
};

const createTrendBuckets = (period: string): TrendBucket[] => {
  const now = new Date();
  const periodStart = getPeriodStart(period);
  const firstBucket = startOfWeek(periodStart);
  const buckets: TrendBucket[] = [];
  let cursor = new Date(firstBucket);

  while (cursor <= now && buckets.length < 24) {
    const end = new Date(cursor);
    end.setDate(end.getDate() + 7);

    buckets.push({
      start: new Date(cursor),
      end,
      label: `Week ${buckets.length + 1}`,
    });

    cursor = end;
  }

  return buckets;
};

const isWithinPeriod = (value: string | null | undefined, start: Date) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start && date <= new Date();
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

export function LecturerAnalytics() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialCourse = searchParams.get("course") || "all";
  const [courseFilter, setCourseFilter] = useState(initialCourse);
  const [period, setPeriod] = useState("6-weeks");
  const [courseMetrics, setCourseMetrics] = useState<CourseMetric[]>([]);
  const [assignmentMetrics, setAssignmentMetrics] = useState<AssignmentMetric[]>([]);
  const [riskStudents, setRiskStudents] = useState<RiskStudent[]>([]);
  const [trendSeries, setTrendSeries] = useState<Record<string, TrendPoint[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (user) loadAnalyticsData();
  }, [user?.id, period]);

  const loadAnalyticsData = async () => {
    if (!user) return;

    setIsLoading(true);
    setLoadError("");

    try {
      const teachingResult = await supabase
        .from("course_instructors")
        .select("course_id")
        .eq("user_id", user.id);

      if (teachingResult.error) throw teachingResult.error;

      const courseIds = Array.from(
        new Set((teachingResult.data || []).map((row: any) => row.course_id).filter(Boolean))
      ) as string[];

      if (courseIds.length === 0) {
        setCourseMetrics([]);
        setAssignmentMetrics([]);
        setRiskStudents([]);
        setTrendSeries({});
        return;
      }

      const periodStart = getPeriodStart(period);
      const [
        courseResult,
        enrollmentResult,
        assignmentResult,
        attendanceResult,
        threadResult,
      ] = await Promise.all([
        supabase
          .from("course_offerings")
          .select(COURSE_OFFERING_SELECT)
          .in("id", courseIds),
        supabase
          .from("course_enrollments")
          .select("course_id, student_id, enrolled_at")
          .in("course_id", courseIds),
        supabase
          .from("assignments")
          .select("id, course_id, title, due_date, max_score, created_at")
          .in("course_id", courseIds)
          .order("due_date", { ascending: false }),
        supabase
          .from("attendance")
          .select("course_id, student_id, class_date, marked_present")
          .in("course_id", courseIds)
          .gte("class_date", periodStart.toISOString().slice(0, 10)),
        supabase
          .from("forum_threads")
          .select("id, course_id, author_id, created_at")
          .in("course_id", courseIds),
      ]);

      if (courseResult.error) throw courseResult.error;
      if (enrollmentResult.error) throw enrollmentResult.error;
      if (assignmentResult.error) throw assignmentResult.error;

      if (attendanceResult.error) {
        console.warn("Attendance analytics could not be loaded:", attendanceResult.error);
      }
      if (threadResult.error) {
        console.warn("Forum analytics could not be loaded:", threadResult.error);
      }

      const courseRows = (courseResult.data || []).map(normalizeCourseOffering);
      const enrollmentRows = enrollmentResult.data || [];
      const assignmentRows = assignmentResult.data || [];
      const attendanceRows = attendanceResult.error ? [] : attendanceResult.data || [];
      const threadRows = threadResult.error ? [] : threadResult.data || [];
      const assignmentIds = assignmentRows.map((assignment: any) => assignment.id);
      const threadIds = threadRows.map((thread: any) => thread.id);

      let submissionRows: any[] = [];
      if (assignmentIds.length > 0) {
        const submissionResult = await supabase
          .from("assignment_submissions")
          .select("id, assignment_id, student_id, submitted_at, grade, is_late")
          .in("assignment_id", assignmentIds);

        if (submissionResult.error) throw submissionResult.error;
        submissionRows = submissionResult.data || [];
      }

      let replyRows: any[] = [];
      if (threadIds.length > 0) {
        const replyResult = await supabase
          .from("forum_replies")
          .select("id, thread_id, author_id, created_at")
          .in("thread_id", threadIds);

        if (replyResult.error) {
          console.warn("Forum reply analytics could not be loaded:", replyResult.error);
        } else {
          replyRows = replyResult.data || [];
        }
      }

      const studentIds = Array.from(
        new Set(enrollmentRows.map((enrollment: any) => enrollment.student_id).filter(Boolean))
      ) as string[];
      let profileRows: any[] = [];

      if (studentIds.length > 0) {
        const profileResult = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .in("id", studentIds);

        if (profileResult.error) {
          console.warn("Student names could not be loaded:", profileResult.error);
        } else {
          profileRows = profileResult.data || [];
        }
      }

      const courseById = new Map(courseRows.map((course: any) => [course.id, course]));
      const assignmentById = new Map(
        assignmentRows.map((assignment: any) => [assignment.id, assignment])
      );
      const threadById = new Map(threadRows.map((thread: any) => [thread.id, thread]));
      const profileById = new Map(profileRows.map((profile: any) => [profile.id, profile]));
      const enrollmentsByCourse = new Map<string, any[]>();
      const assignmentsByCourse = new Map<string, any[]>();
      const submissionsByAssignment = new Map<string, any[]>();
      const attendanceByCourse = new Map<string, any[]>();
      const threadsByCourse = new Map<string, any[]>();
      const repliesByCourse = new Map<string, any[]>();

      enrollmentRows.forEach((enrollment: any) => {
        const rows = enrollmentsByCourse.get(enrollment.course_id) || [];
        rows.push(enrollment);
        enrollmentsByCourse.set(enrollment.course_id, rows);
      });

      assignmentRows.forEach((assignment: any) => {
        const rows = assignmentsByCourse.get(assignment.course_id) || [];
        rows.push(assignment);
        assignmentsByCourse.set(assignment.course_id, rows);
      });

      submissionRows.forEach((submission: any) => {
        const rows = submissionsByAssignment.get(submission.assignment_id) || [];
        rows.push(submission);
        submissionsByAssignment.set(submission.assignment_id, rows);
      });

      attendanceRows.forEach((attendance: any) => {
        const rows = attendanceByCourse.get(attendance.course_id) || [];
        rows.push(attendance);
        attendanceByCourse.set(attendance.course_id, rows);
      });

      threadRows.forEach((thread: any) => {
        const rows = threadsByCourse.get(thread.course_id) || [];
        rows.push(thread);
        threadsByCourse.set(thread.course_id, rows);
      });

      replyRows.forEach((reply: any) => {
        const thread: any = threadById.get(reply.thread_id);
        if (!thread?.course_id) return;

        const rows = repliesByCourse.get(thread.course_id) || [];
        rows.push(reply);
        repliesByCourse.set(thread.course_id, rows);
      });

      const periodAssignments = assignmentRows.filter(
        (assignment: any) =>
          isWithinPeriod(assignment.created_at, periodStart) ||
          isWithinPeriod(assignment.due_date, periodStart)
      );
      const periodAssignmentIds = new Set(
        periodAssignments.map((assignment: any) => assignment.id)
      );
      const periodThreads = threadRows.filter((thread: any) =>
        isWithinPeriod(thread.created_at, periodStart)
      );
      const periodReplies = replyRows.filter((reply: any) =>
        isWithinPeriod(reply.created_at, periodStart)
      );
      const now = new Date();

      const assignmentRowsForDisplay: AssignmentMetric[] = periodAssignments.map(
        (assignment: any) => {
          const course: any = courseById.get(assignment.course_id);
          const enrollments = enrollmentsByCourse.get(assignment.course_id) || [];
          const submissions = submissionsByAssignment.get(assignment.id) || [];
          const submittedStudents = new Set(
            submissions.map((submission: any) => submission.student_id)
          );
          const gradedPercentages = submissions
            .filter((submission: any) => submission.grade != null)
            .map(
              (submission: any) =>
                (Number(submission.grade) / (Number(assignment.max_score) || 100)) * 100
            );

          return {
            id: assignment.id,
            courseId: assignment.course_id,
            title: assignment.title,
            course: getCourseCode(course),
            submitted: submittedStudents.size,
            total: enrollments.length,
            average:
              gradedPercentages.length > 0
                ? clampPercent(
                    gradedPercentages.reduce(
                      (sum: number, value: number) => sum + value,
                      0
                    ) / gradedPercentages.length
                  )
                : null,
            ungraded: submissions.filter((submission: any) => submission.grade == null)
              .length,
          };
        }
      );

      const riskRows: RiskStudent[] = [];

      courseRows.forEach((course: any) => {
        const courseEnrollments = enrollmentsByCourse.get(course.id) || [];
        const courseAssignments = (assignmentsByCourse.get(course.id) || []).filter(
          (assignment: any) => periodAssignmentIds.has(assignment.id)
        );
        const courseAttendance = attendanceByCourse.get(course.id) || [];
        const courseThreads = (threadsByCourse.get(course.id) || []).filter((thread: any) =>
          isWithinPeriod(thread.created_at, periodStart)
        );
        const courseReplies = (repliesByCourse.get(course.id) || []).filter((reply: any) =>
          isWithinPeriod(reply.created_at, periodStart)
        );
        const courseForumAuthors = new Set([
          ...courseThreads.map((thread: any) => thread.author_id),
          ...courseReplies.map((reply: any) => reply.author_id),
        ]);

        courseEnrollments.forEach((enrollment: any) => {
          const enrolledAt = new Date(enrollment.enrolled_at);
          const applicableAssignments = courseAssignments.filter((assignment: any) => {
            const dueDate = new Date(assignment.due_date);
            return dueDate >= enrolledAt && dueDate <= now;
          });
          const studentSubmissions = applicableAssignments.flatMap((assignment: any) =>
            (submissionsByAssignment.get(assignment.id) || []).filter(
              (submission: any) => submission.student_id === enrollment.student_id
            )
          );
          const submittedAssignmentIds = new Set(
            studentSubmissions.map((submission: any) => submission.assignment_id)
          );
          const missingAssignments = applicableAssignments.filter(
            (assignment: any) => !submittedAssignmentIds.has(assignment.id)
          ).length;
          const submissionRate =
            applicableAssignments.length > 0
              ? clampPercent(
                  (submittedAssignmentIds.size / applicableAssignments.length) * 100
                )
              : null;
          const gradedPercentages = studentSubmissions
            .filter((submission: any) => submission.grade != null)
            .map((submission: any) => {
              const assignment: any = assignmentById.get(submission.assignment_id);
              return (
                (Number(submission.grade) / (Number(assignment?.max_score) || 100)) * 100
              );
            });
          const averageScore =
            gradedPercentages.length > 0
              ? clampPercent(
                  gradedPercentages.reduce(
                    (sum: number, value: number) => sum + value,
                    0
                  ) / gradedPercentages.length
                )
              : null;
          const studentAttendance = courseAttendance.filter(
            (attendance: any) => attendance.student_id === enrollment.student_id
          );
          const attendanceRate =
            studentAttendance.length > 0
              ? clampPercent(
                  (studentAttendance.filter((attendance: any) => attendance.marked_present)
                    .length /
                    studentAttendance.length) *
                    100
                )
              : null;
          const hasForumActivity = courseForumAuthors.has(enrollment.student_id);
          const highSignals: string[] = [];
          const mediumSignals: string[] = [];

          if (missingAssignments >= 2) {
            highSignals.push(`${missingAssignments} missed assignments`);
          } else if (missingAssignments === 1) {
            mediumSignals.push("1 missed assignment");
          }

          if (averageScore != null && averageScore < 50) {
            highSignals.push(`average grade ${averageScore}%`);
          } else if (averageScore != null && averageScore < 70) {
            mediumSignals.push(`average grade ${averageScore}%`);
          }

          if (attendanceRate != null && attendanceRate < 60) {
            highSignals.push(`attendance ${attendanceRate}%`);
          } else if (attendanceRate != null && attendanceRate < 75) {
            mediumSignals.push(`attendance ${attendanceRate}%`);
          }

          if (submissionRate != null && submissionRate < 75 && missingAssignments === 0) {
            mediumSignals.push(`submission rate ${submissionRate}%`);
          }

          if (
            courseThreads.length + courseReplies.length > 0 &&
            !hasForumActivity &&
            (highSignals.length > 0 || mediumSignals.length > 0)
          ) {
            mediumSignals.push("no discussion participation");
          }

          if (highSignals.length === 0 && mediumSignals.length === 0) return;

          const profile: any = profileById.get(enrollment.student_id);
          const risk = highSignals.length > 0 ? "High" : "Medium";
          const reasons = [...highSignals, ...mediumSignals].slice(0, 3);
          const currentScore =
            averageScore ?? submissionRate ?? attendanceRate ?? (hasForumActivity ? 100 : 0);

          riskRows.push({
            id: enrollment.student_id,
            courseId: course.id,
            name:
              profile?.full_name ||
              `Student ${String(enrollment.student_id).slice(0, 6)}`,
            course: getCourseCode(course),
            risk,
            reason: reasons.join(", "),
            score: clampPercent(currentScore),
          });
        });
      });

      const courseRowsForDisplay: CourseMetric[] = courseRows.map((course: any) => {
        const enrollments = enrollmentsByCourse.get(course.id) || [];
        const enrolledStudentIds = enrollments.map(
          (enrollment: any) => enrollment.student_id
        );
        const enrolledStudentSet = new Set(enrolledStudentIds);
        const courseAssignments = periodAssignments.filter(
          (assignment: any) => assignment.course_id === course.id
        );
        const dueAssignments = courseAssignments.filter(
          (assignment: any) => new Date(assignment.due_date) <= now
        );
        const courseSubmissions = courseAssignments.flatMap(
          (assignment: any) => submissionsByAssignment.get(assignment.id) || []
        );
        const dueSubmissions = dueAssignments.flatMap(
          (assignment: any) => submissionsByAssignment.get(assignment.id) || []
        );
        const uniqueSubmissionKeys = new Set(
          courseSubmissions.map(
            (submission: any) =>
              `${submission.assignment_id}:${submission.student_id}`
          )
        );
        const uniqueDueSubmissionKeys = new Set(
          dueSubmissions.map(
            (submission: any) =>
              `${submission.assignment_id}:${submission.student_id}`
          )
        );
        const gradedPercentages = courseSubmissions
          .filter((submission: any) => submission.grade != null)
          .map((submission: any) => {
            const assignment: any = assignmentById.get(submission.assignment_id);
            return (
              (Number(submission.grade) / (Number(assignment?.max_score) || 100)) *
              100
            );
          });
        const courseThreads = periodThreads.filter(
          (thread: any) => thread.course_id === course.id
        );
        const courseReplies = periodReplies.filter((reply: any) => {
          const thread: any = threadById.get(reply.thread_id);
          return thread?.course_id === course.id;
        });
        const courseAttendance = attendanceByCourse.get(course.id) || [];
        const activeStudentIds = new Set<string>();

        courseSubmissions.forEach((submission: any) => {
          if (enrolledStudentSet.has(submission.student_id)) {
            activeStudentIds.add(submission.student_id);
          }
        });
        courseThreads.forEach((thread: any) => {
          if (enrolledStudentSet.has(thread.author_id)) {
            activeStudentIds.add(thread.author_id);
          }
        });
        courseReplies.forEach((reply: any) => {
          if (enrolledStudentSet.has(reply.author_id)) {
            activeStudentIds.add(reply.author_id);
          }
        });
        courseAttendance.forEach((attendance: any) => {
          if (attendance.marked_present && enrolledStudentSet.has(attendance.student_id)) {
            activeStudentIds.add(attendance.student_id);
          }
        });

        const expectedSubmissions = enrollments.length * courseAssignments.length;
        const expectedDueSubmissions = enrollments.length * dueAssignments.length;

        return {
          id: course.id,
          code: getCourseCode(course),
          name: course.name,
          studentIds: enrolledStudentIds,
          students: enrollments.length,
          completion:
            expectedDueSubmissions > 0
              ? clampPercent(
                  (uniqueDueSubmissionKeys.size / expectedDueSubmissions) * 100
                )
              : 0,
          engagement:
            enrollments.length > 0
              ? clampPercent((activeStudentIds.size / enrollments.length) * 100)
              : 0,
          averageScore:
            gradedPercentages.length > 0
              ? clampPercent(
                  gradedPercentages.reduce(
                    (sum: number, value: number) => sum + value,
                    0
                  ) / gradedPercentages.length
                )
              : 0,
          submissionRate:
            expectedSubmissions > 0
              ? clampPercent(
                  (uniqueSubmissionKeys.size / expectedSubmissions) * 100
                )
              : 0,
          pendingGrades: courseSubmissions.filter(
            (submission: any) => submission.grade == null
          ).length,
          riskStudents: riskRows.filter((student) => student.courseId === course.id)
            .length,
          forumPosts: courseThreads.length + courseReplies.length,
          dueAssignments: dueAssignments.length,
        };
      });

      const buildTrend = (selectedCourseIds: Set<string>): TrendPoint[] => {
        const buckets = createTrendBuckets(period);
        const selectedEnrollments = enrollmentRows.filter((enrollment: any) =>
          selectedCourseIds.has(enrollment.course_id)
        );
        const selectedStudentIds = new Set(
          selectedEnrollments.map((enrollment: any) => enrollment.student_id)
        );

        return buckets.map((bucket) => {
          const isInBucket = (value: string) => {
            const date = new Date(value);
            return date >= bucket.start && date < bucket.end;
          };
          const bucketSubmissions = submissionRows.filter((submission: any) => {
            const assignment: any = assignmentById.get(submission.assignment_id);
            return (
              selectedCourseIds.has(assignment?.course_id) &&
              isInBucket(submission.submitted_at)
            );
          });
          const bucketThreads = threadRows.filter(
            (thread: any) =>
              selectedCourseIds.has(thread.course_id) && isInBucket(thread.created_at)
          );
          const bucketReplies = replyRows.filter((reply: any) => {
            const thread: any = threadById.get(reply.thread_id);
            return (
              selectedCourseIds.has(thread?.course_id) &&
              isInBucket(reply.created_at)
            );
          });
          const bucketAttendance = attendanceRows.filter(
            (attendance: any) =>
              selectedCourseIds.has(attendance.course_id) &&
              isInBucket(attendance.class_date)
          );
          const activeStudents = new Set<string>();

          bucketSubmissions.forEach((submission: any) => {
            if (selectedStudentIds.has(submission.student_id)) {
              activeStudents.add(submission.student_id);
            }
          });
          bucketThreads.forEach((thread: any) => {
            if (selectedStudentIds.has(thread.author_id)) {
              activeStudents.add(thread.author_id);
            }
          });
          bucketReplies.forEach((reply: any) => {
            if (selectedStudentIds.has(reply.author_id)) {
              activeStudents.add(reply.author_id);
            }
          });
          bucketAttendance.forEach((attendance: any) => {
            if (attendance.marked_present && selectedStudentIds.has(attendance.student_id)) {
              activeStudents.add(attendance.student_id);
            }
          });

          const dueAssignments = assignmentRows.filter((assignment: any) => {
            const dueDate = new Date(assignment.due_date);
            return (
              selectedCourseIds.has(assignment.course_id) &&
              dueDate >= bucket.start &&
              dueDate < bucket.end
            );
          });
          const expectedDueSubmissions = dueAssignments.reduce(
            (total: number, assignment: any) =>
              total + (enrollmentsByCourse.get(assignment.course_id) || []).length,
            0
          );
          const submittedDue = dueAssignments.reduce((total: number, assignment: any) => {
            const submitters = new Set(
              (submissionsByAssignment.get(assignment.id) || []).map(
                (submission: any) => submission.student_id
              )
            );
            return total + submitters.size;
          }, 0);
          const gradedPercentages = bucketSubmissions
            .filter((submission: any) => submission.grade != null)
            .map((submission: any) => {
              const assignment: any = assignmentById.get(submission.assignment_id);
              return (
                (Number(submission.grade) / (Number(assignment?.max_score) || 100)) *
                100
              );
            });
          const bucketSubmitters = new Set(
            bucketSubmissions.map((submission: any) => submission.student_id)
          );

          return {
            week: bucket.label,
            engagement:
              selectedStudentIds.size > 0
                ? clampPercent((activeStudents.size / selectedStudentIds.size) * 100)
                : 0,
            submissions:
              expectedDueSubmissions > 0
                ? clampPercent((submittedDue / expectedDueSubmissions) * 100)
                : selectedStudentIds.size > 0
                  ? clampPercent(
                      (bucketSubmitters.size / selectedStudentIds.size) * 100
                    )
                  : 0,
            averageScore:
              gradedPercentages.length > 0
                ? clampPercent(
                    gradedPercentages.reduce(
                      (sum: number, value: number) => sum + value,
                      0
                    ) / gradedPercentages.length
                  )
                : 0,
          };
        });
      };

      const trends: Record<string, TrendPoint[]> = {
        all: buildTrend(new Set(courseIds)),
      };

      courseRows.forEach((course: any) => {
        trends[getCourseCode(course)] = buildTrend(new Set([course.id]));
      });

      setCourseMetrics(courseRowsForDisplay);
      setAssignmentMetrics(assignmentRowsForDisplay);
      setRiskStudents(
        riskRows.sort((a, b) => {
          if (a.risk !== b.risk) return a.risk === "High" ? -1 : 1;
          return a.score - b.score;
        })
      );
      setTrendSeries(trends);
    } catch (error: any) {
      console.error("Failed to load lecturer analytics:", error);
      setLoadError(error?.message || "Could not load analytics data.");
      setCourseMetrics([]);
      setAssignmentMetrics([]);
      setRiskStudents([]);
      setTrendSeries({});
    } finally {
      setIsLoading(false);
    }
  };

  const visibleCourses = useMemo(() => {
    if (courseFilter === "all") return courseMetrics;
    return courseMetrics.filter((course) => course.code === courseFilter);
  }, [courseFilter, courseMetrics]);

  const visibleAssignments = useMemo(() => {
    if (courseFilter === "all") return assignmentMetrics;
    return assignmentMetrics.filter((assignment) => assignment.course === courseFilter);
  }, [assignmentMetrics, courseFilter]);

  const visibleRiskStudents = useMemo(() => {
    if (courseFilter === "all") return riskStudents;
    return riskStudents.filter((student) => student.course === courseFilter);
  }, [courseFilter, riskStudents]);

  const weeklyTrend =
    trendSeries[courseFilter] ||
    trendSeries.all ||
    createTrendBuckets(period).map((bucket) => ({
      week: bucket.label,
      engagement: 0,
      submissions: 0,
      averageScore: 0,
    }));

  const teachingInsights = useMemo(() => {
    const pendingGrades = visibleCourses.reduce(
      (total, course) => total + course.pendingGrades,
      0
    );
    const weakestCourse = visibleCourses
      .filter((course) => course.dueAssignments > 0)
      .sort((a, b) => a.completion - b.completion)[0];
    const busiestForum = [...visibleCourses].sort(
      (a, b) => b.forumPosts - a.forumPosts
    )[0];

    return [
      {
        title: weakestCourse
          ? weakestCourse.completion < 70
            ? `${weakestCourse.code} needs attention`
            : `${weakestCourse.code} completion is stable`
          : "No completion data yet",
        desc: weakestCourse
          ? `${weakestCourse.completion}% of due assignment submissions are complete, with ${weakestCourse.riskStudents} student risk signal${weakestCourse.riskStudents === 1 ? "" : "s"}.`
          : "Completion insights will appear after students begin submitting assignments.",
        icon: AlertTriangle,
        tone: "text-orange-600",
        bg: "bg-orange-50 dark:bg-orange-950/30",
      },
      {
        title:
          pendingGrades > 0
            ? "Grading backlog is visible"
            : "Grading is up to date",
        desc:
          pendingGrades > 0
            ? `${pendingGrades} submitted assignment${pendingGrades === 1 ? " is" : "s are"} waiting for a grade.`
            : "There are no submitted assignments waiting for a grade.",
        icon: FileText,
        tone: "text-blue-600",
        bg: "bg-blue-50 dark:bg-blue-950/30",
      },
      {
        title:
          busiestForum && busiestForum.forumPosts > 0
            ? `${busiestForum.code} has the most discussion activity`
            : "No forum activity recorded",
        desc:
          busiestForum && busiestForum.forumPosts > 0
            ? `${busiestForum.forumPosts} discussion post${busiestForum.forumPosts === 1 ? "" : "s"} and replies were recorded in the selected period.`
            : "Discussion insights will appear after students or lecturers post in a course forum.",
        icon: MessageSquare,
        tone: "text-emerald-600",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
      },
    ];
  }, [visibleCourses]);

  const totals = {
    students: new Set(visibleCourses.flatMap((course) => course.studentIds)).size,
    engagement: average(visibleCourses.map((course) => course.engagement)),
    completion: average(visibleCourses.map((course) => course.completion)),
    pendingGrades: visibleCourses.reduce((total, course) => total + course.pendingGrades, 0),
    riskStudents: visibleCourses.reduce((total, course) => total + course.riskStudents, 0),
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <BarChart3 className="h-8 w-8 text-primary" />
            Learning Analytics
          </h1>
          <p className="mt-1 text-muted-foreground">Track student progress, engagement, grading workload, and course risk signals.</p>
          {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="h-10 w-full bg-background sm:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courseMetrics.map((course) => (
                <SelectItem key={course.id} value={course.code}>{course.code} - {course.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={setPeriod}>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Users} label="Students" value={totals.students.toString()} helper={`${visibleCourses.length} active course${visibleCourses.length > 1 ? "s" : ""}`} tone="blue" />
        <MetricCard icon={TrendingUp} label="Avg. Engagement" value={`${totals.engagement}%`} helper="Learning activity index" tone="green" />
        <MetricCard icon={Target} label="Completion" value={`${totals.completion}%`} helper="Course progress average" tone="purple" />
        <MetricCard icon={FileText} label="Pending Grades" value={totals.pendingGrades.toString()} helper="Needs lecturer action" tone="orange" />
        <MetricCard icon={AlertTriangle} label="At Risk" value={totals.riskStudents.toString()} helper="Students to review" tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Progress Trend
            </CardTitle>
            <CardDescription>Engagement, submissions, and score movement across the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={10} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="engagement" stroke="#2563eb" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="submissions" stroke="#16a34a" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="averageScore" stroke="#9333ea" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-purple-600" />
              Teaching Insights
            </CardTitle>
            <CardDescription>Suggested actions based on current course signals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {teachingInsights.map((insight) => {
              const Icon = insight.icon;

              return (
                <div key={insight.title} className="rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${insight.bg}`}>
                      <Icon className={`h-4 w-4 ${insight.tone}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{insight.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{insight.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Course Comparison
            </CardTitle>
            <CardDescription>Compare course completion, engagement, and assessment readiness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {visibleCourses.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {isLoading ? "Loading course analytics..." : "No course data available."}
              </div>
            ) : visibleCourses.map((course) => (
              <div key={course.id} className="rounded-xl border p-4">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{course.code}</Badge>
                      <p className="font-semibold">{course.name}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{course.students} students enrolled</p>
                  </div>
                  <Badge className={course.riskStudents >= 6 ? getRiskBadge("High") : getRiskBadge("Low")}>
                    {course.riskStudents} risk signal{course.riskStudents === 1 ? "" : "s"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <ProgressMetric label="Completion" value={course.completion} />
                  <ProgressMetric label="Engagement" value={course.engagement} />
                  <ProgressMetric label="Submission Rate" value={course.submissionRate} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              At-Risk Students
            </CardTitle>
            <CardDescription>Students who may need follow-up before the next assessment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleRiskStudents.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {isLoading ? "Loading student risk signals..." : "No risk signals for this course."}
              </div>
            ) : (
              visibleRiskStudents.map((student) => (
                <div key={`${student.courseId}-${student.id}`} className="rounded-xl border p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.course}</p>
                    </div>
                    <Badge className={getRiskBadge(student.risk)}>{student.risk}</Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{student.reason}</p>
                  <div className="mt-4">
                    <ProgressMetric label="Current score" value={student.score} compact />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Engagement Mix
            </CardTitle>
            <CardDescription>Forum activity and engagement by course.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visibleCourses} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="code" tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                  <Tooltip />
                  <Bar dataKey="forumPosts" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-orange-600" />
              Assignment Analytics
            </CardTitle>
            <CardDescription>Submission status and grading workload by assignment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleAssignments.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {isLoading ? "Loading assignment analytics..." : "No assignments in the selected period."}
              </div>
            ) : visibleAssignments.map((assignment) => {
              const submittedPercent =
                assignment.total > 0
                  ? clampPercent((assignment.submitted / assignment.total) * 100)
                  : 0;

              return (
                <div key={assignment.id} className="rounded-xl border p-4">
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
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {assignment.average == null ? "Avg N/A" : `Avg ${assignment.average}%`}
                      </Badge>
                      {assignment.ungraded > 0 && <Badge variant="destructive">{assignment.ungraded} ungraded</Badge>}
                    </div>
                  </div>
                  <ProgressMetric label="Submission progress" value={submittedPercent} compact />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type MetricCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "purple" | "orange" | "red";
};

const toneClass = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  green: "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400",
  red: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
};

const MetricCard = ({ icon: Icon, label, value, helper, tone }: MetricCardProps) => (
  <Card className="shadow-sm">
    <CardContent className="p-5">
      <div className="flex items-start gap-4">
        <div className={`rounded-xl p-3 ${toneClass[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
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

const ProgressMetric = ({ label, value, compact = false }: ProgressMetricProps) => (
  <div className={compact ? "space-y-2" : "space-y-3"}>
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}%</span>
    </div>
    <Progress value={value} className={compact ? "h-2" : "h-2.5"} />
  </div>
);
