import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCourseOfferings,
  getLecturerCourseIds,
} from "@/data/courseRepository";
import { getProfileSummaries } from "@/data/profileRepository";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  FileText,
  MessageSquare,
} from "lucide-react";
import { LecturerAnalyticsView } from "./analytics/LecturerAnalyticsView";
import {
  clampPercent,
  type AnalyticsAssignment,
  type AnalyticsAttendance,
  type AnalyticsCourse,
  type AnalyticsEnrollment,
  type AnalyticsPeriod,
  type AnalyticsProfile,
  type AnalyticsReply,
  type AnalyticsSubmission,
  type AnalyticsThread,
  type AssignmentMetric,
  type CourseMetric,
  type RiskStudent,
  type TeachingInsight,
  type TrendBucket,
  type TrendPoint,
} from "./analytics/lecturerAnalyticsTypes";

const getCourseCode = (course: AnalyticsCourse | undefined) =>
  course?.course_code || course?.code || "N/A";

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

const getPeriodStart = (period: AnalyticsPeriod) => {
  const now = new Date();

  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const weeks = period === "semester" ? 16 : 6;
  const start = startOfWeek(now);
  start.setDate(start.getDate() - (weeks - 1) * 7);
  return start;
};

const createTrendBuckets = (period: AnalyticsPeriod): TrendBucket[] => {
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

export function LecturerAnalytics() {
  const { user } = useAuth();
  const userId = user?.id;
  const [searchParams] = useSearchParams();
  const initialCourse = searchParams.get("course") || "all";
  const [courseFilter, setCourseFilter] = useState(initialCourse);
  const [period, setPeriod] = useState<AnalyticsPeriod>("6-weeks");
  const [courseMetrics, setCourseMetrics] = useState<CourseMetric[]>([]);
  const [assignmentMetrics, setAssignmentMetrics] = useState<AssignmentMetric[]>([]);
  const [riskStudents, setRiskStudents] = useState<RiskStudent[]>([]);
  const [trendSeries, setTrendSeries] = useState<Record<string, TrendPoint[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadAnalyticsData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setLoadError("");

    try {
      const courseIds = await getLecturerCourseIds(userId);

      if (courseIds.length === 0) {
        setCourseMetrics([]);
        setAssignmentMetrics([]);
        setRiskStudents([]);
        setTrendSeries({});
        return;
      }

      const periodStart = getPeriodStart(period);
      const [
        courseRows,
        enrollmentResult,
        assignmentResult,
        attendanceResult,
        threadResult,
      ] = await Promise.all([
        getCourseOfferings(courseIds),
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

      if (enrollmentResult.error) throw enrollmentResult.error;
      if (assignmentResult.error) throw assignmentResult.error;

      if (attendanceResult.error) {
        console.warn("Attendance analytics could not be loaded:", attendanceResult.error);
      }
      if (threadResult.error) {
        console.warn("Forum analytics could not be loaded:", threadResult.error);
      }

      const enrollmentRows = enrollmentResult.data || [];
      const assignmentRows = assignmentResult.data || [];
      const attendanceRows = attendanceResult.error ? [] : attendanceResult.data || [];
      const threadRows = threadResult.error ? [] : threadResult.data || [];
      const assignmentIds = assignmentRows.map(assignment => assignment.id);
      const threadIds = threadRows.map(thread => thread.id);

      let submissionRows: AnalyticsSubmission[] = [];
      if (assignmentIds.length > 0) {
        const submissionResult = await supabase
          .from("assignment_submissions")
          .select("id, assignment_id, student_id, submitted_at, grade, is_late")
          .in("assignment_id", assignmentIds);

        if (submissionResult.error) throw submissionResult.error;
        submissionRows = submissionResult.data || [];
      }

      let replyRows: AnalyticsReply[] = [];
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
        new Set(
          enrollmentRows
            .map(enrollment => enrollment.student_id)
            .filter(Boolean),
        ),
      ) as string[];
      let profileRows: AnalyticsProfile[] = [];

      if (studentIds.length > 0) {
        profileRows = (await getProfileSummaries(studentIds)).map(profile => ({
          id: profile.id,
          full_name: profile.full_name,
        }));
      }

      const courseById = new Map(
        courseRows.map(course => [course.id, course] as const),
      );
      const assignmentById = new Map(
        assignmentRows.map(assignment => [assignment.id, assignment] as const),
      );
      const threadById = new Map(
        threadRows.map(thread => [thread.id, thread] as const),
      );
      const profileById = new Map(
        profileRows.map(profile => [profile.id, profile] as const),
      );
      const enrollmentsByCourse = new Map<string, AnalyticsEnrollment[]>();
      const assignmentsByCourse = new Map<string, AnalyticsAssignment[]>();
      const submissionsByAssignment = new Map<string, AnalyticsSubmission[]>();
      const attendanceByCourse = new Map<string, AnalyticsAttendance[]>();
      const threadsByCourse = new Map<string, AnalyticsThread[]>();
      const repliesByCourse = new Map<string, AnalyticsReply[]>();

      enrollmentRows.forEach(enrollment => {
        const rows = enrollmentsByCourse.get(enrollment.course_id) || [];
        rows.push(enrollment);
        enrollmentsByCourse.set(enrollment.course_id, rows);
      });

      assignmentRows.forEach(assignment => {
        const rows = assignmentsByCourse.get(assignment.course_id) || [];
        rows.push(assignment);
        assignmentsByCourse.set(assignment.course_id, rows);
      });

      submissionRows.forEach(submission => {
        const rows = submissionsByAssignment.get(submission.assignment_id) || [];
        rows.push(submission);
        submissionsByAssignment.set(submission.assignment_id, rows);
      });

      attendanceRows.forEach(attendance => {
        const rows = attendanceByCourse.get(attendance.course_id) || [];
        rows.push(attendance);
        attendanceByCourse.set(attendance.course_id, rows);
      });

      threadRows.forEach(thread => {
        const rows = threadsByCourse.get(thread.course_id) || [];
        rows.push(thread);
        threadsByCourse.set(thread.course_id, rows);
      });

      replyRows.forEach(reply => {
        const thread = threadById.get(reply.thread_id);
        if (!thread?.course_id) return;

        const rows = repliesByCourse.get(thread.course_id) || [];
        rows.push(reply);
        repliesByCourse.set(thread.course_id, rows);
      });

      const periodAssignments = assignmentRows.filter(
        assignment =>
          isWithinPeriod(assignment.created_at, periodStart) ||
          isWithinPeriod(assignment.due_date, periodStart)
      );
      const periodAssignmentIds = new Set(
        periodAssignments.map(assignment => assignment.id)
      );
      const periodThreads = threadRows.filter(thread =>
        isWithinPeriod(thread.created_at, periodStart)
      );
      const periodReplies = replyRows.filter(reply =>
        isWithinPeriod(reply.created_at, periodStart)
      );
      const now = new Date();

      const assignmentRowsForDisplay: AssignmentMetric[] = periodAssignments.map(
        assignment => {
          const course = courseById.get(assignment.course_id);
          const enrollments = enrollmentsByCourse.get(assignment.course_id) || [];
          const submissions = submissionsByAssignment.get(assignment.id) || [];
          const submittedStudents = new Set(
            submissions.map(submission => submission.student_id)
          );
          const gradedPercentages = submissions
            .filter(submission => submission.grade != null)
            .map(
              submission =>
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
            ungraded: submissions.filter(submission => submission.grade == null)
              .length,
          };
        }
      );

      const riskRows: RiskStudent[] = [];

      courseRows.forEach(course => {
        const courseEnrollments = enrollmentsByCourse.get(course.id) || [];
        const courseAssignments = (assignmentsByCourse.get(course.id) || []).filter(
          assignment => periodAssignmentIds.has(assignment.id)
        );
        const courseAttendance = attendanceByCourse.get(course.id) || [];
        const courseThreads = (threadsByCourse.get(course.id) || []).filter(thread =>
          isWithinPeriod(thread.created_at, periodStart)
        );
        const courseReplies = (repliesByCourse.get(course.id) || []).filter(reply =>
          isWithinPeriod(reply.created_at, periodStart)
        );
        const courseForumAuthors = new Set([
          ...courseThreads.map(thread => thread.author_id),
          ...courseReplies.map(reply => reply.author_id),
        ]);

        courseEnrollments.forEach(enrollment => {
          const enrolledAt = new Date(enrollment.enrolled_at);
          const applicableAssignments = courseAssignments.filter(assignment => {
            const dueDate = new Date(assignment.due_date);
            return dueDate >= enrolledAt && dueDate <= now;
          });
          const studentSubmissions = applicableAssignments.flatMap(assignment =>
            (submissionsByAssignment.get(assignment.id) || []).filter(
              submission => submission.student_id === enrollment.student_id
            )
          );
          const submittedAssignmentIds = new Set(
            studentSubmissions.map(submission => submission.assignment_id)
          );
          const missingAssignments = applicableAssignments.filter(
            assignment => !submittedAssignmentIds.has(assignment.id)
          ).length;
          const submissionRate =
            applicableAssignments.length > 0
              ? clampPercent(
                  (submittedAssignmentIds.size / applicableAssignments.length) * 100
                )
              : null;
          const gradedPercentages = studentSubmissions
            .filter(submission => submission.grade != null)
            .map(submission => {
              const assignment = assignmentById.get(submission.assignment_id);
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
            attendance => attendance.student_id === enrollment.student_id
          );
          const attendanceRate =
            studentAttendance.length > 0
              ? clampPercent(
                  (studentAttendance.filter(attendance => attendance.marked_present)
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

          const profile = profileById.get(enrollment.student_id);
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

      const courseRowsForDisplay: CourseMetric[] = courseRows.map(course => {
        const enrollments = enrollmentsByCourse.get(course.id) || [];
        const enrolledStudentIds = enrollments.map(
          enrollment => enrollment.student_id
        );
        const enrolledStudentSet = new Set(enrolledStudentIds);
        const courseAssignments = periodAssignments.filter(
          assignment => assignment.course_id === course.id
        );
        const dueAssignments = courseAssignments.filter(
          assignment => new Date(assignment.due_date) <= now
        );
        const courseSubmissions = courseAssignments.flatMap(
          assignment => submissionsByAssignment.get(assignment.id) || []
        );
        const dueSubmissions = dueAssignments.flatMap(
          assignment => submissionsByAssignment.get(assignment.id) || []
        );
        const uniqueSubmissionKeys = new Set(
          courseSubmissions.map(
            submission =>
              `${submission.assignment_id}:${submission.student_id}`
          )
        );
        const uniqueDueSubmissionKeys = new Set(
          dueSubmissions.map(
            submission =>
              `${submission.assignment_id}:${submission.student_id}`
          )
        );
        const gradedPercentages = courseSubmissions
          .filter(submission => submission.grade != null)
          .map(submission => {
            const assignment = assignmentById.get(submission.assignment_id);
            return (
              (Number(submission.grade) / (Number(assignment?.max_score) || 100)) *
              100
            );
          });
        const courseThreads = periodThreads.filter(
          thread => thread.course_id === course.id
        );
        const courseReplies = periodReplies.filter(reply => {
          const thread = threadById.get(reply.thread_id);
          return thread?.course_id === course.id;
        });
        const courseAttendance = attendanceByCourse.get(course.id) || [];
        const activeStudentIds = new Set<string>();

        courseSubmissions.forEach(submission => {
          if (enrolledStudentSet.has(submission.student_id)) {
            activeStudentIds.add(submission.student_id);
          }
        });
        courseThreads.forEach(thread => {
          if (enrolledStudentSet.has(thread.author_id)) {
            activeStudentIds.add(thread.author_id);
          }
        });
        courseReplies.forEach(reply => {
          if (enrolledStudentSet.has(reply.author_id)) {
            activeStudentIds.add(reply.author_id);
          }
        });
        courseAttendance.forEach(attendance => {
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
            submission => submission.grade == null
          ).length,
          riskStudents: riskRows.filter((student) => student.courseId === course.id)
            .length,
          forumPosts: courseThreads.length + courseReplies.length,
          dueAssignments: dueAssignments.length,
        };
      });

      const buildTrend = (selectedCourseIds: Set<string>): TrendPoint[] => {
        const buckets = createTrendBuckets(period);
        const selectedEnrollments = enrollmentRows.filter(enrollment =>
          selectedCourseIds.has(enrollment.course_id)
        );
        const selectedStudentIds = new Set(
          selectedEnrollments.map(enrollment => enrollment.student_id)
        );

        return buckets.map((bucket) => {
          const isInBucket = (value: string) => {
            const date = new Date(value);
            return date >= bucket.start && date < bucket.end;
          };
          const bucketSubmissions = submissionRows.filter(submission => {
            const assignment = assignmentById.get(submission.assignment_id);
            return (
              Boolean(assignment?.course_id)
              && selectedCourseIds.has(assignment.course_id)
              &&
              isInBucket(submission.submitted_at)
            );
          });
          const bucketThreads = threadRows.filter(
            thread =>
              selectedCourseIds.has(thread.course_id) && isInBucket(thread.created_at)
          );
          const bucketReplies = replyRows.filter(reply => {
            const thread = threadById.get(reply.thread_id);
            return (
              Boolean(thread?.course_id)
              && selectedCourseIds.has(thread.course_id)
              &&
              isInBucket(reply.created_at)
            );
          });
          const bucketAttendance = attendanceRows.filter(
            attendance =>
              selectedCourseIds.has(attendance.course_id) &&
              isInBucket(attendance.class_date)
          );
          const activeStudents = new Set<string>();

          bucketSubmissions.forEach(submission => {
            if (selectedStudentIds.has(submission.student_id)) {
              activeStudents.add(submission.student_id);
            }
          });
          bucketThreads.forEach(thread => {
            if (selectedStudentIds.has(thread.author_id)) {
              activeStudents.add(thread.author_id);
            }
          });
          bucketReplies.forEach(reply => {
            if (selectedStudentIds.has(reply.author_id)) {
              activeStudents.add(reply.author_id);
            }
          });
          bucketAttendance.forEach(attendance => {
            if (attendance.marked_present && selectedStudentIds.has(attendance.student_id)) {
              activeStudents.add(attendance.student_id);
            }
          });

          const dueAssignments = assignmentRows.filter(assignment => {
            const dueDate = new Date(assignment.due_date);
            return (
              selectedCourseIds.has(assignment.course_id) &&
              dueDate >= bucket.start &&
              dueDate < bucket.end
            );
          });
          const expectedDueSubmissions = dueAssignments.reduce(
            (total, assignment) =>
              total + (enrollmentsByCourse.get(assignment.course_id) || []).length,
            0
          );
          const submittedDue = dueAssignments.reduce((total, assignment) => {
            const submitters = new Set(
              (submissionsByAssignment.get(assignment.id) || []).map(
                submission => submission.student_id
              )
            );
            return total + submitters.size;
          }, 0);
          const gradedPercentages = bucketSubmissions
            .filter(submission => submission.grade != null)
            .map(submission => {
              const assignment = assignmentById.get(submission.assignment_id);
              return (
                (Number(submission.grade) / (Number(assignment?.max_score) || 100)) *
                100
              );
            });
          const bucketSubmitters = new Set(
            bucketSubmissions.map(submission => submission.student_id)
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

      courseRows.forEach(course => {
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
    } catch (error: unknown) {
      console.error("Failed to load lecturer analytics:", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load analytics data.",
      );
      setCourseMetrics([]);
      setAssignmentMetrics([]);
      setRiskStudents([]);
      setTrendSeries({});
    } finally {
      setIsLoading(false);
    }
  }, [period, userId]);

  useEffect(() => {
    void loadAnalyticsData();
  }, [loadAnalyticsData]);

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

  const teachingInsights = useMemo<TeachingInsight[]>(() => {
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
    <LecturerAnalyticsView
      courseFilter={courseFilter}
      period={period}
      courseMetrics={courseMetrics}
      visibleCourses={visibleCourses}
      visibleAssignments={visibleAssignments}
      visibleRiskStudents={visibleRiskStudents}
      weeklyTrend={weeklyTrend}
      teachingInsights={teachingInsights}
      totals={totals}
      isLoading={isLoading}
      loadError={loadError}
      onCourseFilterChange={setCourseFilter}
      onPeriodChange={setPeriod}
    />
  );
}
