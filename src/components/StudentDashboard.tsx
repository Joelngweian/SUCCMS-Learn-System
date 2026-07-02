import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  fetchStudentStudyInsights,
  fetchStudentStudyRecommendations,
} from "@/data/studentAiRepository";
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings";
import type { Database } from "@/lib/database.types";
import { withSignedStorageUrls } from "@/lib/storageUrls";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CampusFeed } from "@/components/campus-feed";
import { Stories } from "./Stories";
import {
  type StudyInsight,
} from "./StudentStudyInsights";
import {
  StudentStatsGrid,
} from "./student-dashboard/StudentDashboardPanels";
import { StudentDashboardRightRail } from "./student-dashboard/StudentDashboardRightRail";
import {
  AlertCircle,
  Brain,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

const KNOWLEDGE_BASE = [
  {
    id: "db-1",
    title: "Complete Guide to Database Normalization (1NF-3NF)",
    type: "video",
    url: "https://www.youtube.com/watch?v=rBPQ5fg_kiY",
    source: "YouTube",
    tags: ["Database", "SQL", "CS301", "Data"],
  },
  {
    id: "db-2",
    title: "SQL Indexing and Performance Tuning",
    type: "article",
    url: "https://use-the-index-luke.com/",
    source: "Use The Index Luke",
    tags: ["Database", "Performance", "CS301"],
  },
  {
    id: "se-1",
    title: "Agile Methodology Crash Course",
    type: "video",
    url: "https://www.youtube.com/watch?v=8bmS5awqzc0",
    source: "YouTube",
    tags: ["Software", "Agile", "CS410", "Project"],
  },
  {
    id: "algo-1",
    title: "Data Structures & Algorithms - Full Course",
    type: "video",
    url: "https://www.youtube.com/watch?v=8hly31xKli0",
    source: "FreeCodeCamp",
    tags: ["Algorithms", "Data", "Structures", "CS205", "Code"],
  },
  {
    id: "web-1",
    title: "React Hooks: The Complete Guide",
    type: "article",
    url: "https://react.dev/reference/react",
    source: "React Docs",
    tags: ["Web", "React", "Frontend", "CS405"],
  },
  {
    id: "ethics-1",
    title: "ACM Code of Ethics and Professional Conduct",
    type: "article",
    url: "https://www.acm.org/code-of-ethics",
    source: "Association for Computing Machinery",
    tags: ["Ethics", "Computing", "Professional", "CSIS3083"],
  },
  {
    id: "ethics-2",
    title: "Information Technology and Moral Values",
    type: "article",
    url: "https://plato.stanford.edu/entries/it-moral-values/",
    source: "Stanford Encyclopedia of Philosophy",
    tags: ["Ethics", "Computing", "Technology", "Moral"],
  },
  {
    id: "ethics-3",
    title: "UNESCO Recommendation on the Ethics of Artificial Intelligence",
    type: "article",
    url: "https://www.unesco.org/en/articles/recommendation-ethics-artificial-intelligence",
    source: "UNESCO",
    tags: ["Ethics", "AI", "Computing", "Governance"],
  },
  {
    id: "prod-1",
    title: "Atomic Habits: How to Get 1% Better Every Day",
    type: "productivity",
    url: "https://www.youtube.com/watch?v=PZ7lDrwYdZc",
    source: "James Clear",
    tags: ["Productivity", "General"],
  },
  {
    id: "prod-2",
    title: "Deep Work: Rules for Focused Success",
    type: "productivity",
    url: "https://www.youtube.com/watch?v=d66815uVerk",
    source: "Cal Newport",
    tags: ["Productivity", "Focus"],
  },
  {
    id: "music-1",
    title: "Lofi Girl - Beats to Relax/Study To",
    type: "music",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    source: "Lofi Girl Live",
    tags: ["Music", "Focus"],
  },
];

const STUDY_RECOMMENDATION_CACHE_TTL = 6 * 60 * 60 * 1000;

interface Recommendation {
  id: string;
  title: string;
  type: string;
  url: string;
  source?: string;
  reason?: string;
}

interface CourseActivity {
  courseCode: string;
  courseName: string;
  lastAccessed: Date;
  progress: number;
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
  lastActivity: Date;
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

type StudyInsightCourseContext = {
  id: string;
  code: string;
  name: string;
  grades: Array<{
    percentage: number;
    gradedAt: string;
    feedback: string;
    assignmentTitle: string;
    rubric: string;
  }>;
  attendance: Array<{
    status: string;
    classDate: string;
  }>;
  assignments: Array<{
    title: string;
    dueDate: string;
    submitted: boolean;
    isLate: boolean;
  }>;
};

type AssignmentRow = Pick<
  Database["public"]["Tables"]["assignments"]["Row"],
  | "id"
  | "course_id"
  | "title"
  | "description"
  | "rubric"
  | "due_date"
  | "max_score"
  | "created_at"
>;
type SubmissionRow = Pick<
  Database["public"]["Tables"]["assignment_submissions"]["Row"],
  "id" | "assignment_id" | "submitted_at" | "is_late" | "grade" | "feedback"
>;
type GradeRow = Pick<
  Database["public"]["Tables"]["student_grades"]["Row"],
  | "course_id"
  | "assignment_id"
  | "score"
  | "max_score"
  | "feedback"
  | "graded_at"
>;
type AttendanceRow = Pick<
  Database["public"]["Tables"]["attendance"]["Row"],
  "course_id" | "class_date" | "status" | "marked_present"
>;

type InstructorRow = {
  course_id: string;
  user_profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const asStringList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value: unknown) => value === true;

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const isRecommendation = (value: unknown): value is Recommendation => {
  const item = asRecord(value);
  return (
    typeof item.id === "string"
    && typeof item.title === "string"
    && typeof item.type === "string"
    && typeof item.url === "string"
    && /^https?:\/\//i.test(item.url)
  );
};

const normalizeAnnouncementAttachments = (
  value: unknown,
): DashboardAnnouncement["attachments"] =>
  Array.isArray(value)
    ? value.flatMap((attachment) => {
        const item = asRecord(attachment);
        if (
          typeof item.name !== "string"
          || typeof item.url !== "string"
        ) {
          return [];
        }
        return [{
          name: item.name,
          path: typeof item.path === "string" ? item.path : "",
          url: item.url,
          type: typeof item.type === "string" ? item.type : "",
          size: typeof item.size === "number" ? item.size : 0,
        }];
      })
    : [];

const normalizeDashboardCourse = (value: unknown): StudentCourse | null => {
  const course = asRecord(value);
  const id = asString(course.id);
  if (!id) return null;

  const next = asRecord(course.nextAssignment);
  const nextAssignment = asString(next.id)
    ? {
        dueDate: asString(next.dueDate),
        id: asString(next.id),
        title: asString(next.title),
      }
    : undefined;

  return {
    assignments: asNumber(course.assignments),
    code: asString(course.code, "N/A"),
    completedAssignments: asNumber(course.completedAssignments),
    credits: asNumber(course.credits),
    grade: typeof course.grade === "string" ? course.grade : null,
    id,
    lastActivity: new Date(asString(course.lastActivity)),
    lecturer: asString(course.lecturer, "No lecturer assigned"),
    name: asString(course.name, "Course"),
    nextAssignment,
    pendingAssignments: asNumber(course.pendingAssignments),
    progress: asNumber(course.progress),
    status: asString(course.status, "active"),
  };
};

const normalizeUpcomingAssignment = (
  value: unknown,
): DashboardAssignment | null => {
  const assignment = asRecord(value);
  const id = asString(assignment.id);
  const courseId = asString(assignment.courseId);
  if (!id || !courseId) return null;

  return {
    courseCode: asString(assignment.courseCode, "N/A"),
    courseId,
    courseName: asString(assignment.courseName, "Course"),
    dueDate: asString(assignment.dueDate),
    id,
    title: asString(assignment.title),
  };
};

const normalizeDashboardAnnouncement = (
  value: unknown,
): DashboardAnnouncement | null => {
  const announcement = asRecord(value);
  const id = asString(announcement.id);
  if (!id) return null;
  const priority = announcement.priority === "high" || announcement.priority === "low"
    ? announcement.priority
    : "medium";

  return {
    attachments: normalizeAnnouncementAttachments(announcement.attachments),
    content: asString(announcement.content),
    createdAt: asString(announcement.createdAt),
    id,
    isRead: asBoolean(announcement.isRead),
    priority,
    title: asString(announcement.title),
  };
};

const signDashboardAnnouncementAttachments = async (
  announcements: DashboardAnnouncement[],
) => {
  const signedAttachments = await withSignedStorageUrls(
    "announcement-attachments",
    announcements.flatMap(announcement => announcement.attachments),
  );
  const attachmentUrlByPath = new Map(
    signedAttachments.map(attachment => [attachment.path, attachment.url]),
  );

  return announcements.map(announcement => ({
    ...announcement,
    attachments: announcement.attachments.map(attachment => ({
      ...attachment,
      url: attachmentUrlByPath.get(attachment.path) || attachment.url,
    })),
  }));
};

const normalizeInsightCourse = (
  value: unknown,
): StudyInsightCourseContext | null => {
  const course = asRecord(value);
  const id = asString(course.id);
  if (!id) return null;

  return {
    assignments: asArray(course.assignments).map(asRecord).map(assignment => ({
      dueDate: asString(assignment.dueDate),
      isLate: asBoolean(assignment.isLate),
      submitted: asBoolean(assignment.submitted),
      title: asString(assignment.title),
    })),
    attendance: asArray(course.attendance).map(asRecord).map(record => ({
      classDate: asString(record.classDate),
      status: asString(record.status),
    })),
    code: asString(course.code, "N/A"),
    grades: asArray(course.grades).map(asRecord).map(grade => ({
      assignmentTitle: asString(grade.assignmentTitle, "Course assessment"),
      feedback: asString(grade.feedback),
      gradedAt: asString(grade.gradedAt),
      percentage: asNumber(grade.percentage),
      rubric: asString(grade.rubric),
    })),
    id,
    name: asString(course.name, "Course"),
  };
};

const getCourseCode = (course: {
  course_code?: string | null;
  code?: string | null;
}) => course.course_code || course.code || "N/A";

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

const formatRelativeDate = (value: string) => {
  const date = new Date(value);
  const difference = date.getTime() - Date.now();
  const absoluteDays = Math.ceil(Math.abs(difference) / 86400000);

  if (difference > 0 && absoluteDays === 1) return "Due tomorrow";
  if (difference > 0 && absoluteDays < 7) return `Due in ${absoluteDays} days`;
  if (difference < 0) return `Due ${date.toLocaleDateString()}`;
  return `Due ${date.toLocaleDateString()}`;
};

const buildRuleBasedInsights = (
  courses: StudyInsightCourseContext[]
): StudyInsight[] => {
  const insights: Array<StudyInsight & { priority: number }> = [];
  const now = Date.now();

  courses.forEach((course) => {
    const grades = [...course.grades].sort(
      (a, b) =>
        new Date(a.gradedAt).getTime() - new Date(b.gradedAt).getTime()
    );

    if (grades.length >= 2) {
      const midpoint = Math.ceil(grades.length / 2);
      const earlier = grades.slice(0, midpoint);
      const recent = grades.slice(midpoint);
      const earlierAverage =
        earlier.reduce((sum, grade) => sum + grade.percentage, 0) /
        earlier.length;
      const recentAverage =
        recent.reduce((sum, grade) => sum + grade.percentage, 0) /
        recent.length;
      const change = Math.round(recentAverage - earlierAverage);

      insights.push({
        id: `performance-${course.id}`,
        type: "performance",
        severity: change >= 0 ? "positive" : change <= -10 ? "critical" : "warning",
        title: change >= 0 ? "Performance Is Improving" : "Performance Has Declined",
        description:
          change >= 0
            ? `Your recent ${course.code} results improved by ${Math.abs(
                change
              )} percentage points.`
            : `Your recent ${course.code} results dropped by ${Math.abs(
                change
              )} percentage points compared with earlier work.`,
        confidence: Math.min(95, 65 + grades.length * 5),
        courseCode: course.code,
        actionPlan:
          change >= 0
            ? [
                "Continue the study method used for your recent assignments.",
                "Review the latest feedback to preserve the same standard.",
              ]
            : [
                "Review feedback from your two most recent graded assignments.",
                "Redo the lowest-scoring section before the next assessment.",
                "Ask your lecturer about any requirement that remains unclear.",
              ],
        priority: change >= 0 ? 35 : 90 + Math.min(Math.abs(change), 10),
      });
    }

    const attendance = [...course.attendance].sort((a, b) =>
      b.classDate.localeCompare(a.classDate)
    );
    if (attendance.length >= 2) {
      const credited = attendance.filter(
        (record) => record.status !== "absent"
      ).length;
      const attendanceRate = Math.round((credited / attendance.length) * 100);
      const consecutiveConcern = attendance
        .slice(0, 3)
        .filter(
          (record) =>
            record.status === "absent" || record.status === "late"
        ).length;

      if (attendanceRate < 80 || consecutiveConcern >= 2) {
        insights.push({
          id: `attendance-${course.id}`,
          type: "attendance",
          severity: attendanceRate < 60 ? "critical" : "warning",
          title: "Attendance Needs Attention",
          description: `${course.code} attendance is ${attendanceRate}%. ${
            consecutiveConcern >= 2
              ? `${consecutiveConcern} of your latest 3 classes were absent or late.`
              : "Improving consistency will reduce learning gaps."
          }`,
          confidence: Math.min(98, 70 + attendance.length * 3),
          courseCode: course.code,
          actionPlan: [
            "Check the next class schedule and set a reminder before it starts.",
            "Review materials from any missed or late class.",
            "Contact your lecturer if an absence should be recorded as excused.",
          ],
          priority: attendanceRate < 60 ? 100 : 85,
        });
      } else if (attendance.length >= 5 && attendanceRate >= 90) {
        insights.push({
          id: `attendance-positive-${course.id}`,
          type: "attendance",
          severity: "positive",
          title: "Strong Attendance",
          description: `You have maintained ${attendanceRate}% attendance in ${course.code}.`,
          confidence: Math.min(98, 75 + attendance.length * 2),
          courseCode: course.code,
          actionPlan: [
            "Keep your current class routine and arrive before check-in closes.",
          ],
          priority: 30,
        });
      }
    }

    const overdue = course.assignments.filter(
      (assignment) =>
        !assignment.submitted &&
        new Date(assignment.dueDate).getTime() < now
    );
    const dueSoon = course.assignments.filter((assignment) => {
      if (assignment.submitted) return false;
      const difference = new Date(assignment.dueDate).getTime() - now;
      return difference >= 0 && difference <= 3 * 86400000;
    });
    const lateCount = course.assignments.filter(
      (assignment) => assignment.isLate
    ).length;

    if (overdue.length > 0 || dueSoon.length > 0 || lateCount >= 2) {
      const descriptionParts = [];
      if (overdue.length > 0) {
        descriptionParts.push(`${overdue.length} overdue`);
      }
      if (dueSoon.length > 0) {
        descriptionParts.push(`${dueSoon.length} due within 3 days`);
      }
      if (lateCount >= 2) {
        descriptionParts.push(`${lateCount} submitted late`);
      }

      insights.push({
        id: `assignment-${course.id}`,
        type: "assignment",
        severity: overdue.length > 0 ? "critical" : "warning",
        title: "Assignment Risk Detected",
        description: `${course.code} currently has ${descriptionParts.join(
          ", "
        )}.`,
        confidence: 96,
        courseCode: course.code,
        actionPlan: [
          overdue.length > 0
            ? `Contact your lecturer about ${overdue[0].title} and confirm whether a late submission is accepted.`
            : `Begin ${dueSoon[0]?.title || "the nearest assignment"} today.`,
          "Break the remaining work into small sections with a completion time for each.",
          "Upload the completed work before the deadline instead of waiting for the final hour.",
        ],
        priority: overdue.length > 0 ? 110 : 95,
      });
    }
  });

  return insights
    .sort((a, b) => b.priority - a.priority)
    .map(({ priority: _priority, ...insight }) => insight);
};

export function StudentDashboard() {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<StudentCourse[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<DashboardAssignment[]>([]);
  const [announcements, setAnnouncements] = useState<DashboardAnnouncement[]>([]);
  const [stats, setStats] = useState({
    pendingAssignments: 0,
    gpa: null as number | null,
    credits: 0,
    unreadAlerts: 0,
  });
  const [aiData, setAiData] = useState<{
    recentCourses: CourseActivity[];
    studyMaterials: Recommendation[];
    motivation: Recommendation[];
  }>({ recentCourses: [], studyMaterials: [], motivation: [] });
  const [studyInsights, setStudyInsights] = useState<StudyInsight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isStudyPanelOpen, setIsStudyPanelOpen] = useState(false);

  const getFallbackStudyMaterials = useCallback((courses: StudentCourse[]) => {
    const userInterests = courses.flatMap((course) => [
      course.code,
      ...course.name.split(/\s+/).filter(Boolean),
    ]);

    return KNOWLEDGE_BASE.filter((resource) => {
      if (resource.type === "productivity" || resource.type === "music") return false;
      return resource.tags.some((tag) =>
        userInterests.some((interest) => {
          const normalizedInterest = interest.toLowerCase();
          const normalizedTag = tag.toLowerCase();
          return (
            normalizedInterest === normalizedTag ||
            normalizedInterest.includes(normalizedTag) ||
            normalizedTag.includes(normalizedInterest)
          );
        })
      );
    })
      .map((resource) => ({
        ...resource,
        reason: `Recommended for ${
          resource.tags.find((tag) =>
            userInterests.some((interest) => {
              const normalizedInterest = interest.toLowerCase();
              const normalizedTag = tag.toLowerCase();
              return (
                normalizedInterest === normalizedTag ||
                normalizedInterest.includes(normalizedTag) ||
                normalizedTag.includes(normalizedInterest)
              );
            })
          ) || "your course"
        }`,
      }))
      .slice(0, 3);
  }, []);

  const generateSmartRecommendations = useCallback(async (
    courses: StudentCourse[],
  ) => {
    setIsLoadingAi(true);

    const motivationPicks = KNOWLEDGE_BASE.filter(
      (resource) => resource.type === "productivity" || resource.type === "music"
    ).slice(0, 2);

    const jumpBackIn = [...courses]
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
      .slice(0, 2)
      .map((course) => ({
        courseCode: course.code,
        courseName: course.name,
        lastAccessed: course.lastActivity,
        progress: course.progress,
      }));

    setAiData((current) => ({
      ...current,
      recentCourses: jumpBackIn,
      motivation: motivationPicks,
    }));

    if (courses.length === 0 || !userId) {
      setAiData({
        recentCourses: jumpBackIn,
        studyMaterials: [],
        motivation: motivationPicks,
      });
      setIsLoadingAi(false);
      return;
    }

    const courseContext = courses.map((course) => ({
      code: course.code,
      name: course.name,
      progress: course.progress,
      completedAssignments: course.completedAssignments,
      pendingAssignments: course.pendingAssignments,
      grade: course.grade,
      nextAssignment: course.nextAssignment
        ? {
            title: course.nextAssignment.title,
            dueDate: course.nextAssignment.dueDate,
          }
        : null,
    }));
    const courseSignature = JSON.stringify(courseContext);
    const cacheKey = `student-study-recommendations:v2:${userId}`;

    try {
      const cachedValue = localStorage.getItem(cacheKey);
      if (cachedValue) {
        const cached = JSON.parse(cachedValue);
        if (
          cached?.courseSignature === courseSignature &&
          Date.now() - Number(cached?.createdAt || 0) < STUDY_RECOMMENDATION_CACHE_TTL &&
          Array.isArray(cached?.recommendations)
        ) {
          setAiData({
            recentCourses: jumpBackIn,
            studyMaterials: cached.recommendations.slice(0, 3),
            motivation: motivationPicks,
          });
          return;
        }
      }

      const data = asRecord(
        await fetchStudentStudyRecommendations(courseContext),
      );
      if (typeof data.error === "string") throw new Error(data.error);

      const recommendations = Array.isArray(data?.recommendations)
        ? data.recommendations
            .filter(isRecommendation)
            .slice(0, 3)
        : [];

      if (recommendations.length === 0) {
        throw new Error("No verified study recommendations were returned.");
      }

      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          createdAt: Date.now(),
          courseSignature,
          recommendations,
        })
      );
      setAiData({
        recentCourses: jumpBackIn,
        studyMaterials: recommendations,
        motivation: motivationPicks,
      });
    } catch (error) {
      console.warn("AI study recommendations are unavailable; using local resources.", error);
      setAiData({
        recentCourses: jumpBackIn,
        studyMaterials: getFallbackStudyMaterials(courses),
        motivation: motivationPicks,
      });
    } finally {
      setIsLoadingAi(false);
    }
  }, [getFallbackStudyMaterials, userId]);

  const generateStudyInsights = useCallback(async (
    courseContext: StudyInsightCourseContext[]
  ) => {
    const ruleInsights = buildRuleBasedInsights(courseContext);
    setStudyInsights(ruleInsights);

    const coursesWithGrades = courseContext.filter(
      (course) => course.grades.length > 0
    );
    if (!userId || coursesWithGrades.length === 0) {
      setIsLoadingInsights(false);
      return;
    }

    setIsLoadingInsights(true);
    const anonymousContext = coursesWithGrades.map((course) => ({
      code: course.code,
      name: course.name,
      grades: course.grades.slice(-8),
      attendance: course.attendance.slice(0, 12),
      assignments: course.assignments.slice(0, 12),
    }));
    const contextSignature = JSON.stringify(anonymousContext);
    const cacheKey = `student-study-insights:v1:${userId}`;

    try {
      const cachedValue = localStorage.getItem(cacheKey);
      if (cachedValue) {
        const cached = JSON.parse(cachedValue);
        if (
          cached?.contextSignature === contextSignature &&
          Date.now() - Number(cached?.createdAt || 0) <
            STUDY_RECOMMENDATION_CACHE_TTL &&
          Array.isArray(cached?.insights)
        ) {
          setStudyInsights([...ruleInsights, ...cached.insights]);
          return;
        }
      }

      const data = asRecord(await fetchStudentStudyInsights(anonymousContext));
      if (typeof data.error === "string") throw new Error(data.error);

      const aiInsights: StudyInsight[] = Array.isArray(data?.insights)
        ? data.insights
            .map(asRecord)
            .filter((insight) =>
              (insight.type === "strength" || insight.type === "weakness")
              && typeof insight.title === "string"
              && typeof insight.description === "string"
              && Array.isArray(insight.actionPlan)
            )
            .slice(0, 4)
            .map((insight, index) => {
              const insightType =
                insight.type === "strength" ? "strength" : "weakness";
              const title = typeof insight.title === "string"
                ? insight.title
                : "Study insight";
              const description = typeof insight.description === "string"
                ? insight.description
                : "";

              return {
                id:
                  typeof insight.id === "string"
                    ? insight.id
                    : `ai-insight-${index}`,
                type: insightType,
                severity:
                  insightType === "strength"
                    ? ("positive" as const)
                    : ("warning" as const),
                title: title.slice(0, 90),
                description: description.slice(0, 260),
                confidence: Math.min(
                  95,
                  Math.max(55, Number(insight.confidence) || 70)
                ),
                courseCode:
                  typeof insight.courseCode === "string"
                    ? insight.courseCode.slice(0, 30)
                    : undefined,
                actionPlan: asStringList(insight.actionPlan)
                  .slice(0, 4)
                  .map((step) => step.slice(0, 180)),
              };
            })
        : [];

      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          createdAt: Date.now(),
          contextSignature,
          insights: aiInsights,
        })
      );
      setStudyInsights([...ruleInsights, ...aiInsights]);
    } catch (error) {
      console.warn(
        "AI strengths and weaknesses are unavailable; using calculated insights.",
        error
      );
      setStudyInsights(ruleInsights);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [userId]);

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setLoadError("");

    try {
      const dashboardResult = await supabase.rpc("get_student_dashboard_data");
      if (!dashboardResult.error) {
        const payload = asRecord(dashboardResult.data);
        const courseList = asArray(payload.courses)
          .map(normalizeDashboardCourse)
          .filter((course): course is StudentCourse => course !== null);
        const futureAssignments = asArray(payload.upcomingAssignments)
          .map(normalizeUpcomingAssignment)
          .filter((assignment): assignment is DashboardAssignment => assignment !== null);
        const announcementList = asArray(payload.announcements)
          .map(normalizeDashboardAnnouncement)
          .filter((announcement): announcement is DashboardAnnouncement => announcement !== null);
        const insightContext = asArray(payload.insightContext)
          .map(normalizeInsightCourse)
          .filter((course): course is StudyInsightCourseContext => course !== null);
        const summary = asRecord(payload.stats);

        setEnrolledCourses(courseList);
        setUpcomingAssignments(futureAssignments);
        setAnnouncements(
          await signDashboardAnnouncementAttachments(announcementList),
        );
        setStats({
          credits: asNumber(summary.credits),
          gpa: summary.gpa == null ? null : asNumber(summary.gpa),
          pendingAssignments: asNumber(summary.pendingAssignments),
          unreadAlerts: asNumber(summary.unreadAlerts),
        });
        void generateSmartRecommendations(courseList);
        void generateStudyInsights(insightContext);
        return;
      }

      // Keep existing deployments usable until the accompanying SQL migration
      // is applied. Other RPC failures should remain visible instead of silently
      // falling back to the heavier browser fan-out.
      if (dashboardResult.error.code !== "PGRST202") {
        throw dashboardResult.error;
      }
      console.warn(
        "Student dashboard summary RPC is not installed yet; using compatibility queries.",
      );

      const [
        enrollmentResult,
        announcementResult,
        announcementReadResult,
        gpaResult,
      ] = await Promise.all([
        supabase
          .from("course_enrollments")
          .select(`course_id, enrolled_at, course_offerings(${COURSE_OFFERING_SELECT})`)
          .eq("student_id", userId),
        supabase
          .from("announcements")
          .select("id, title, content, priority, attachments, created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("user_id", userId),
        supabase
          .from("student_gpa")
          .select("gpa, total_credits")
          .eq("student_id", userId)
          .maybeSingle(),
      ]);

      if (enrollmentResult.error) throw enrollmentResult.error;
      if (announcementResult.error) throw announcementResult.error;

      const enrollmentRows = enrollmentResult.data || [];
      const courseIds = enrollmentRows
        .map((row) => row.course_id)
        .filter(Boolean);

      let instructorRows: InstructorRow[] = [];
      let assignmentRows: AssignmentRow[] = [];
      let submissionRows: SubmissionRow[] = [];
      let gradeRows: GradeRow[] = [];
      let attendanceRows: AttendanceRow[] = [];

      if (courseIds.length > 0) {
        const [
          instructorResult,
          assignmentResult,
          gradeResult,
          attendanceResult,
        ] = await Promise.all([
          supabase
            .from("course_instructors")
            .select("course_id, user_profiles(id, full_name, avatar_url)")
            .in("course_id", courseIds),
          supabase
            .from("assignments")
            .select(
              "id, course_id, title, description, rubric, due_date, max_score, created_at"
            )
            .in("course_id", courseIds)
            .order("due_date", { ascending: true }),
          supabase
            .from("student_grades")
            .select(
              "course_id, assignment_id, score, max_score, feedback, graded_at"
            )
            .eq("student_id", userId)
            .in("course_id", courseIds),
          supabase
            .from("attendance")
            .select("course_id, class_date, status, marked_present")
            .eq("student_id", userId)
            .in("course_id", courseIds)
            .order("class_date", { ascending: false }),
        ]);

        if (instructorResult.error) throw instructorResult.error;
        if (assignmentResult.error) throw assignmentResult.error;

        instructorRows = instructorResult.data || [];
        assignmentRows = assignmentResult.data || [];
        gradeRows = gradeResult.data || [];
        attendanceRows = attendanceResult.error
          ? []
          : attendanceResult.data || [];

        const assignmentIds = assignmentRows.map((assignment) => assignment.id);
        if (assignmentIds.length > 0) {
          const submissionResult = await supabase
            .from("assignment_submissions")
            .select(
              "id, assignment_id, submitted_at, is_late, grade, feedback"
            )
            .eq("student_id", userId)
            .in("assignment_id", assignmentIds);

          if (submissionResult.error) throw submissionResult.error;
          submissionRows = submissionResult.data || [];
        }
      }

      const instructorsByCourse = new Map<string, string[]>();
      instructorRows.forEach((row) => {
        const instructor = row.user_profiles;
        if (!instructor?.full_name) return;
        const current = instructorsByCourse.get(row.course_id) || [];
        current.push(instructor.full_name);
        instructorsByCourse.set(row.course_id, current);
      });

      const submissionsByAssignment = new Map(
        submissionRows.map((submission) => [submission.assignment_id, submission])
      );
      const assignmentsByCourse = new Map<string, AssignmentRow[]>();
      assignmentRows.forEach((assignment) => {
        const current = assignmentsByCourse.get(assignment.course_id) || [];
        current.push(assignment);
        assignmentsByCourse.set(assignment.course_id, current);
      });

      const gradesByCourse = new Map<string, GradeRow[]>();
      gradeRows.forEach((grade) => {
        const current = gradesByCourse.get(grade.course_id) || [];
        current.push(grade);
        gradesByCourse.set(grade.course_id, current);
      });

      const now = new Date();
      const courseList: StudentCourse[] = enrollmentRows
        .flatMap((row) => {
          const course = normalizeCourseOffering(row.course_offerings);
          if (!course.id) return [];

          const courseAssignments = assignmentsByCourse.get(course.id) || [];
          const completed = courseAssignments.filter((assignment) =>
            submissionsByAssignment.has(assignment.id)
          );
          const pending = courseAssignments.filter((assignment) =>
            !submissionsByAssignment.has(assignment.id)
          );
          const nextAssignment = pending
            .filter((assignment) => new Date(assignment.due_date) >= now)
            .sort(
              (a, b) =>
                new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            )[0];

          const courseGrades = gradesByCourse.get(course.id) || [];
          let gradePercentage: number | null = null;

          if (courseGrades.length > 0) {
            gradePercentage =
              courseGrades.reduce((sum, grade) => {
                const maxScore = Number(grade.max_score) || 100;
                return sum + (Number(grade.score) / maxScore) * 100;
              }, 0) / courseGrades.length;
          } else {
            const gradedSubmissions = completed
              .map((assignment) => {
                const submission = submissionsByAssignment.get(assignment.id);
                if (submission?.grade == null) return null;
                return (Number(submission.grade) / (Number(assignment.max_score) || 100)) * 100;
              })
              .filter((value: number | null): value is number => value != null);

            if (gradedSubmissions.length > 0) {
              gradePercentage =
                gradedSubmissions.reduce((sum, value) => sum + value, 0) /
                gradedSubmissions.length;
            }
          }

          const lastSubmission = completed
            .map((assignment) => submissionsByAssignment.get(assignment.id))
            .filter((submission): submission is SubmissionRow => Boolean(submission))
            .sort(
              (a, b) =>
                new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
            )[0];

          return [{
            id: course.id,
            code: getCourseCode(course),
            name: course.name,
            lecturer:
              (instructorsByCourse.get(course.id) || []).join(", ") ||
              "No lecturer assigned",
            progress:
              courseAssignments.length > 0
                ? Math.round((completed.length / courseAssignments.length) * 100)
                : 0,
            assignments: courseAssignments.length,
            completedAssignments: completed.length,
            pendingAssignments: pending.length,
            status: course.status || "active",
            grade: percentageToGrade(gradePercentage),
            credits: Number(course.credits ?? course.credit_hours ?? 0),
            lastActivity: new Date(
              lastSubmission?.submitted_at || row.enrolled_at || course.created_at
            ),
            nextAssignment: nextAssignment
              ? {
                  id: nextAssignment.id,
                  title: nextAssignment.title,
                  dueDate: nextAssignment.due_date,
              }
              : undefined,
          }];
        });

      const assignmentsById = new Map(
        assignmentRows.map((assignment) => [assignment.id, assignment])
      );
      const attendanceByCourse = new Map<string, AttendanceRow[]>();
      attendanceRows.forEach((record) => {
        const current = attendanceByCourse.get(record.course_id) || [];
        current.push(record);
        attendanceByCourse.set(record.course_id, current);
      });
      const insightContext: StudyInsightCourseContext[] = courseList.map(
        (course) => ({
          id: course.id,
          code: course.code,
          name: course.name,
          grades: (gradesByCourse.get(course.id) || []).map((grade) => {
            const assignment = grade.assignment_id
              ? assignmentsById.get(grade.assignment_id)
              : null;
            const maxScore = Number(grade.max_score) || 100;
            return {
              percentage: Math.round(
                (Number(grade.score) / maxScore) * 100
              ),
              gradedAt: grade.graded_at,
              feedback: String(grade.feedback || ""),
              assignmentTitle: String(
                assignment?.title || "Course assessment"
              ),
              rubric: String(assignment?.rubric || ""),
            };
          }),
          attendance: (attendanceByCourse.get(course.id) || []).map(
            (record) => ({
              status:
                record.status ||
                (record.marked_present ? "present" : "absent"),
              classDate: record.class_date,
            })
          ),
          assignments: (assignmentsByCourse.get(course.id) || []).map(
            (assignment) => {
              const submission = submissionsByAssignment.get(
                assignment.id
              );
              return {
                title: assignment.title,
                dueDate: assignment.due_date,
                submitted: Boolean(submission),
                isLate: Boolean(submission?.is_late),
              };
            }
          ),
        })
      );

      const futureAssignments = assignmentRows
        .filter(
          (assignment) =>
            !submissionsByAssignment.has(assignment.id) &&
            new Date(assignment.due_date) >= now
        )
        .sort(
          (a, b) =>
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        )
        .slice(0, 5)
        .map((assignment) => {
          const course = courseList.find((item) => item.id === assignment.course_id);
          return {
            id: assignment.id,
            courseId: assignment.course_id,
            courseCode: course?.code || "N/A",
            courseName: course?.name || "Course",
            title: assignment.title,
            dueDate: assignment.due_date,
          };
        });

      const readIds = new Set(
        (announcementReadResult.data || []).map((row) => row.announcement_id)
      );
      const announcementList: DashboardAnnouncement[] =
        (announcementResult.data || []).map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        priority:
          announcement.priority === "high"
          || announcement.priority === "low"
            ? announcement.priority
            : "medium",
        attachments: normalizeAnnouncementAttachments(
          announcement.attachments,
        ),
        createdAt: announcement.created_at,
        isRead: readIds.has(announcement.id),
      }));

      setEnrolledCourses(courseList);
      setUpcomingAssignments(futureAssignments);
      setAnnouncements(
        await signDashboardAnnouncementAttachments(announcementList),
      );
      setStats({
        pendingAssignments: assignmentRows.filter(
          (assignment) => !submissionsByAssignment.has(assignment.id)
        ).length,
        gpa:
          !gpaResult.error && gpaResult.data?.gpa != null
            ? Number(gpaResult.data.gpa)
            : null,
        credits: courseList.reduce((sum, course) => sum + course.credits, 0),
        unreadAlerts: announcementList.filter((announcement) => !announcement.isRead).length,
      });
      void generateSmartRecommendations(courseList);
      void generateStudyInsights(insightContext);
    } catch (error: unknown) {
      console.error("Failed to load student dashboard:", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load dashboard data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [generateSmartRecommendations, generateStudyInsights, userId]);

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

  const studyPanel = (
    <StudentDashboardRightRail
      announcements={announcements}
      courses={enrolledCourses}
      formatRelativeDate={formatRelativeDate}
      isLoadingAi={isLoadingAi}
      isLoadingInsights={isLoadingInsights}
      motivation={aiData.motivation}
      onBrowseCourses={() => {
        setIsStudyPanelOpen(false);
        navigate("/courses");
      }}
      onOpenAssignment={(courseId, assignmentId) => {
        setIsStudyPanelOpen(false);
        navigate(`/courses?courseId=${courseId}&assignmentId=${assignmentId}`);
      }}
      onOpenCourse={(courseId) => {
        setIsStudyPanelOpen(false);
        navigate(`/courses?courseId=${courseId}`);
      }}
      recentCourses={aiData.recentCourses}
      studyInsights={studyInsights}
      studyMaterials={aiData.studyMaterials}
      upcomingAssignments={upcomingAssignments}
    />
  );

  return (
    <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-500 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:items-start">
      <div className="min-w-0 space-y-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Scholar"}!
            </h1>
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4 text-purple-500" />
              {isLoadingAi
                ? 'AI Assistant: "Finding relevant resources for your current courses..."'
                : `AI Assistant: "I've found ${aiData.studyMaterials.length} relevant resources based on your enrollment."`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-purple-100 px-3 py-1 text-purple-800 transition-colors hover:bg-purple-200">
              <Brain className="mr-1 h-3 w-3" />
              {isLoadingAi ? "Preparing Study Plan" : "AI Study Plan Ready"}
            </Badge>
            <Sheet
              open={isStudyPanelOpen}
              onOpenChange={setIsStudyPanelOpen}
            >
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="2xl:hidden"
                >
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Study Panel
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="overflow-hidden p-0"
              >
                <SheetTitle className="sr-only">Your Study Panel</SheetTitle>
                <SheetDescription className="sr-only">
                  Quick study actions, AI insights and course shortcuts.
                </SheetDescription>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  {studyPanel}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {loadError && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {loadError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border bg-card px-4 pt-4 shadow-sm sm:px-6 sm:pt-5">
          <Stories
            currentUserName={profile?.full_name || "Your Story"}
            currentUserInitials={(profile?.full_name || "YS")
              .split(" ")
              .map((part) => part[0])
              .join("")}
            currentUserAvatar={profile?.avatar_url}
            currentUserRole={profile?.role}
          />
        </div>

        <StudentStatsGrid
          enrolledCount={enrolledCourses.length}
          pendingAssignments={stats.pendingAssignments}
          gpa={stats.gpa}
          credits={stats.credits}
          unreadAlerts={stats.unreadAlerts}
        />

        <main className="min-w-0">
          <CampusFeed />
        </main>
      </div>

      <div className="hidden 2xl:block">{studyPanel}</div>
    </div>
  );
}
