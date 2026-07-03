import type { StudyInsight } from "../StudentStudyInsights";

export const STUDY_RECOMMENDATION_CACHE_TTL = 6 * 60 * 60 * 1000;

export type Recommendation = {
  id: string;
  title: string;
  type: string;
  url: string;
  source?: string;
  reason?: string;
};

export type StudyInsightCourseContext = {
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

type RecommendationCourseContext = {
  code: string;
  name: string;
};

const KNOWLEDGE_BASE: Recommendation[] = [
  {
    id: "db-1",
    title: "Complete Guide to Database Normalization (1NF-3NF)",
    type: "video",
    url: "https://www.youtube.com/watch?v=rBPQ5fg_kiY",
    source: "YouTube",
  },
  {
    id: "db-2",
    title: "SQL Indexing and Performance Tuning",
    type: "article",
    url: "https://use-the-index-luke.com/",
    source: "Use The Index Luke",
  },
  {
    id: "se-1",
    title: "Agile Methodology Crash Course",
    type: "video",
    url: "https://www.youtube.com/watch?v=8bmS5awqzc0",
    source: "YouTube",
  },
  {
    id: "algo-1",
    title: "Data Structures & Algorithms - Full Course",
    type: "video",
    url: "https://www.youtube.com/watch?v=8hly31xKli0",
    source: "FreeCodeCamp",
  },
  {
    id: "web-1",
    title: "React Hooks: The Complete Guide",
    type: "article",
    url: "https://react.dev/reference/react",
    source: "React Docs",
  },
  {
    id: "ethics-1",
    title: "ACM Code of Ethics and Professional Conduct",
    type: "article",
    url: "https://www.acm.org/code-of-ethics",
    source: "Association for Computing Machinery",
  },
  {
    id: "ethics-2",
    title: "Information Technology and Moral Values",
    type: "article",
    url: "https://plato.stanford.edu/entries/it-moral-values/",
    source: "Stanford Encyclopedia of Philosophy",
  },
  {
    id: "ethics-3",
    title: "UNESCO Recommendation on the Ethics of Artificial Intelligence",
    type: "article",
    url: "https://www.unesco.org/en/articles/recommendation-ethics-artificial-intelligence",
    source: "UNESCO",
  },
  {
    id: "prod-1",
    title: "Atomic Habits: How to Get 1% Better Every Day",
    type: "productivity",
    url: "https://www.youtube.com/watch?v=PZ7lDrwYdZc",
    source: "James Clear",
  },
  {
    id: "prod-2",
    title: "Deep Work: Rules for Focused Success",
    type: "productivity",
    url: "https://www.youtube.com/watch?v=d66815uVerk",
    source: "Cal Newport",
  },
  {
    id: "music-1",
    title: "Lofi Girl - Beats to Relax/Study To",
    type: "music",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    source: "Lofi Girl Live",
  },
].map(resource => ({
  ...resource,
  tags: [] as string[],
})) as Recommendation[];

const RESOURCE_TAGS: Record<string, string[]> = {
  "algo-1": ["Algorithms", "Data", "Structures", "CS205", "Code"],
  "db-1": ["Database", "SQL", "CS301", "Data"],
  "db-2": ["Database", "Performance", "CS301"],
  "ethics-1": ["Ethics", "Computing", "Professional", "CSIS3083"],
  "ethics-2": ["Ethics", "Computing", "Technology", "Moral"],
  "ethics-3": ["Ethics", "AI", "Computing", "Governance"],
  "music-1": ["Music", "Focus"],
  "prod-1": ["Productivity", "General"],
  "prod-2": ["Productivity", "Focus"],
  "se-1": ["Software", "Agile", "CS410", "Project"],
  "web-1": ["Web", "React", "Frontend", "CS405"],
};

const tagsForResource = (resource: Recommendation) => RESOURCE_TAGS[resource.id] || [];

export const getMotivationPicks = () =>
  KNOWLEDGE_BASE.filter(
    resource => resource.type === "productivity" || resource.type === "music",
  ).slice(0, 2);

export const getFallbackStudyMaterials = (courses: RecommendationCourseContext[]) => {
  const userInterests = courses.flatMap(course => [
    course.code,
    ...course.name.split(/\s+/).filter(Boolean),
  ]);

  return KNOWLEDGE_BASE.filter(resource => {
    if (resource.type === "productivity" || resource.type === "music") return false;
    return tagsForResource(resource).some(tag =>
      userInterests.some(interest => {
        const normalizedInterest = interest.toLowerCase();
        const normalizedTag = tag.toLowerCase();
        return (
          normalizedInterest === normalizedTag ||
          normalizedInterest.includes(normalizedTag) ||
          normalizedTag.includes(normalizedInterest)
        );
      }),
    );
  })
    .map(resource => ({
      ...resource,
      reason: `Recommended for ${
        tagsForResource(resource).find(tag =>
          userInterests.some(interest => {
            const normalizedInterest = interest.toLowerCase();
            const normalizedTag = tag.toLowerCase();
            return (
              normalizedInterest === normalizedTag ||
              normalizedInterest.includes(normalizedTag) ||
              normalizedTag.includes(normalizedInterest)
            );
          }),
        ) || "your course"
      }`,
    }))
    .slice(0, 3);
};

export const buildRuleBasedInsights = (
  courses: StudyInsightCourseContext[],
): StudyInsight[] => {
  const insights: Array<StudyInsight & { priority: number }> = [];
  const now = Date.now();

  courses.forEach(course => {
    const grades = [...course.grades].sort(
      (a, b) => new Date(a.gradedAt).getTime() - new Date(b.gradedAt).getTime(),
    );

    if (grades.length >= 2) {
      const midpoint = Math.ceil(grades.length / 2);
      const earlier = grades.slice(0, midpoint);
      const recent = grades.slice(midpoint);
      const earlierAverage =
        earlier.reduce((sum, grade) => sum + grade.percentage, 0) / earlier.length;
      const recentAverage =
        recent.reduce((sum, grade) => sum + grade.percentage, 0) / recent.length;
      const change = Math.round(recentAverage - earlierAverage);

      insights.push({
        id: `performance-${course.id}`,
        type: "performance",
        severity: change >= 0 ? "positive" : change <= -10 ? "critical" : "warning",
        title: change >= 0 ? "Performance Is Improving" : "Performance Has Declined",
        description: change >= 0
          ? `Your recent ${course.code} results improved by ${Math.abs(change)} percentage points.`
          : `Your recent ${course.code} results dropped by ${Math.abs(change)} percentage points compared with earlier work.`,
        confidence: Math.min(95, 65 + grades.length * 5),
        courseCode: course.code,
        actionPlan: change >= 0
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
      b.classDate.localeCompare(a.classDate),
    );
    if (attendance.length >= 2) {
      const credited = attendance.filter(record => record.status !== "absent").length;
      const attendanceRate = Math.round((credited / attendance.length) * 100);
      const consecutiveConcern = attendance
        .slice(0, 3)
        .filter(record => record.status === "absent" || record.status === "late").length;

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
      assignment => !assignment.submitted && new Date(assignment.dueDate).getTime() < now,
    );
    const dueSoon = course.assignments.filter(assignment => {
      if (assignment.submitted) return false;
      const difference = new Date(assignment.dueDate).getTime() - now;
      return difference >= 0 && difference <= 3 * 86400000;
    });
    const lateCount = course.assignments.filter(assignment => assignment.isLate).length;

    if (overdue.length > 0 || dueSoon.length > 0 || lateCount >= 2) {
      const descriptionParts = [];
      if (overdue.length > 0) descriptionParts.push(`${overdue.length} overdue`);
      if (dueSoon.length > 0) descriptionParts.push(`${dueSoon.length} due within 3 days`);
      if (lateCount >= 2) descriptionParts.push(`${lateCount} submitted late`);

      insights.push({
        id: `assignment-${course.id}`,
        type: "assignment",
        severity: overdue.length > 0 ? "critical" : "warning",
        title: "Assignment Risk Detected",
        description: `${course.code} currently has ${descriptionParts.join(", ")}.`,
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
