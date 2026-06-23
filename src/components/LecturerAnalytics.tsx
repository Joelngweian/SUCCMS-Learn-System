import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  FileText,
  MessageSquare,
} from "lucide-react";
import { LecturerAnalyticsView } from "./analytics/LecturerAnalyticsView";
import {
  type AnalyticsPeriod,
  type AssignmentMetric,
  type CourseMetric,
  type RiskStudent,
  type TeachingInsight,
  type TrendBucket,
  type TrendPoint,
} from "./analytics/lecturerAnalyticsTypes";

type LecturerAnalyticsPayload = {
  courseMetrics: CourseMetric[];
  assignmentMetrics: AssignmentMetric[];
  riskStudents: RiskStudent[];
  trendSeries: Record<string, TrendPoint[]>;
};

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

const parseAnalyticsPayload = (value: unknown): LecturerAnalyticsPayload => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};

  return {
    courseMetrics: Array.isArray(record.courseMetrics)
      ? record.courseMetrics as CourseMetric[]
      : [],
    assignmentMetrics: Array.isArray(record.assignmentMetrics)
      ? record.assignmentMetrics as AssignmentMetric[]
      : [],
    riskStudents: Array.isArray(record.riskStudents)
      ? record.riskStudents as RiskStudent[]
      : [],
    trendSeries:
      record.trendSeries
      && typeof record.trendSeries === "object"
      && !Array.isArray(record.trendSeries)
        ? record.trendSeries as Record<string, TrendPoint[]>
        : {},
  };
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
      const periodStart = getPeriodStart(period);
      const bucketStart = startOfWeek(periodStart);
      const { data, error } = await supabase.rpc("get_lecturer_analytics", {
        p_period_start: periodStart.toISOString(),
        p_bucket_start: bucketStart.toISOString(),
      });

      if (error) throw error;

      const analytics = parseAnalyticsPayload(data);
      setCourseMetrics(analytics.courseMetrics);
      setAssignmentMetrics(analytics.assignmentMetrics);
      setRiskStudents(analytics.riskStudents);
      setTrendSeries(analytics.trendSeries);
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
