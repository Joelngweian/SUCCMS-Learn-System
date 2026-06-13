import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { OnlineActivity } from "./SocialWidgets";
import { Stories } from "./Stories";
import {
  BookOpen,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Bell,
  Brain,
  Sparkles,
  BrainCircuit,
  Youtube,
  PlayCircle,
  ExternalLink,
  Music,
  Loader2,
  GraduationCap,
  ChevronRight,
} from "lucide-react";

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

const getCourseCode = (course: any) => course?.course_code || course?.code || "N/A";

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

export function StudentDashboard() {
  const { user, profile } = useAuth();
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
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user?.id]);

  const getFallbackStudyMaterials = (courses: StudentCourse[]) => {
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
  };

  const generateSmartRecommendations = async (courses: StudentCourse[]) => {
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

    if (courses.length === 0 || !user) {
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
    const cacheKey = `student-study-recommendations:v2:${user.id}`;

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

      const { data, error } = await supabase.functions.invoke(
        "student-study-recommendations",
        {
          body: { courses: courseContext },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const recommendations = Array.isArray(data?.recommendations)
        ? data.recommendations
            .filter(
              (item: any) =>
                typeof item?.id === "string" &&
                typeof item?.title === "string" &&
                typeof item?.url === "string" &&
                /^https?:\/\//i.test(item.url)
            )
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
  };

  const loadDashboardData = async () => {
    if (!user) return;

    setIsLoading(true);
    setLoadError("");

    try {
      const [
        enrollmentResult,
        announcementResult,
        announcementReadResult,
        gpaResult,
      ] = await Promise.all([
        supabase
          .from("course_enrollments")
          .select(`course_id, enrolled_at, course_offerings(${COURSE_OFFERING_SELECT})`)
          .eq("student_id", user.id),
        supabase
          .from("announcements")
          .select("id, title, content, priority, attachments, created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("user_id", user.id),
        supabase
          .from("student_gpa")
          .select("gpa, total_credits")
          .eq("student_id", user.id)
          .maybeSingle(),
      ]);

      if (enrollmentResult.error) throw enrollmentResult.error;
      if (announcementResult.error) throw announcementResult.error;

      const enrollmentRows = enrollmentResult.data || [];
      const courseIds = enrollmentRows
        .map((row: any) => row.course_id)
        .filter(Boolean);

      let instructorRows: any[] = [];
      let assignmentRows: any[] = [];
      let submissionRows: any[] = [];
      let gradeRows: any[] = [];

      if (courseIds.length > 0) {
        const [instructorResult, assignmentResult, gradeResult] = await Promise.all([
          supabase
            .from("course_instructors")
            .select("course_id, user_profiles(id, full_name, avatar_url)")
            .in("course_id", courseIds),
          supabase
            .from("assignments")
            .select("id, course_id, title, due_date, max_score, created_at")
            .in("course_id", courseIds)
            .order("due_date", { ascending: true }),
          supabase
            .from("student_grades")
            .select("course_id, score, max_score, graded_at")
            .eq("student_id", user.id)
            .in("course_id", courseIds),
        ]);

        if (instructorResult.error) throw instructorResult.error;
        if (assignmentResult.error) throw assignmentResult.error;

        instructorRows = instructorResult.data || [];
        assignmentRows = assignmentResult.data || [];
        gradeRows = gradeResult.data || [];

        const assignmentIds = assignmentRows.map((assignment: any) => assignment.id);
        if (assignmentIds.length > 0) {
          const submissionResult = await supabase
            .from("assignment_submissions")
            .select("id, assignment_id, submitted_at, grade")
            .eq("student_id", user.id)
            .in("assignment_id", assignmentIds);

          if (submissionResult.error) throw submissionResult.error;
          submissionRows = submissionResult.data || [];
        }
      }

      const instructorsByCourse = new Map<string, string[]>();
      instructorRows.forEach((row: any) => {
        const instructor = row.user_profiles;
        if (!instructor?.full_name) return;
        const current = instructorsByCourse.get(row.course_id) || [];
        current.push(instructor.full_name);
        instructorsByCourse.set(row.course_id, current);
      });

      const submissionsByAssignment = new Map(
        submissionRows.map((submission: any) => [submission.assignment_id, submission])
      );
      const assignmentsByCourse = new Map<string, any[]>();
      assignmentRows.forEach((assignment: any) => {
        const current = assignmentsByCourse.get(assignment.course_id) || [];
        current.push(assignment);
        assignmentsByCourse.set(assignment.course_id, current);
      });

      const gradesByCourse = new Map<string, any[]>();
      gradeRows.forEach((grade: any) => {
        const current = gradesByCourse.get(grade.course_id) || [];
        current.push(grade);
        gradesByCourse.set(grade.course_id, current);
      });

      const now = new Date();
      const courseList: StudentCourse[] = enrollmentRows
        .map((row: any) => {
          const course = normalizeCourseOffering(row.course_offerings);
          if (!course.id) return null;

          const courseAssignments = assignmentsByCourse.get(course.id) || [];
          const completed = courseAssignments.filter((assignment: any) =>
            submissionsByAssignment.has(assignment.id)
          );
          const pending = courseAssignments.filter((assignment: any) =>
            !submissionsByAssignment.has(assignment.id)
          );
          const nextAssignment = pending
            .filter((assignment: any) => new Date(assignment.due_date) >= now)
            .sort(
              (a: any, b: any) =>
                new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            )[0];

          const courseGrades = gradesByCourse.get(course.id) || [];
          let gradePercentage: number | null = null;

          if (courseGrades.length > 0) {
            gradePercentage =
              courseGrades.reduce((sum: number, grade: any) => {
                const maxScore = Number(grade.max_score) || 100;
                return sum + (Number(grade.score) / maxScore) * 100;
              }, 0) / courseGrades.length;
          } else {
            const gradedSubmissions = completed
              .map((assignment: any) => {
                const submission: any = submissionsByAssignment.get(assignment.id);
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
            .map((assignment: any) => submissionsByAssignment.get(assignment.id))
            .filter(Boolean)
            .sort(
              (a: any, b: any) =>
                new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
            )[0] as any;

          return {
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
          };
        })
        .filter(Boolean) as StudentCourse[];

      const futureAssignments = assignmentRows
        .filter(
          (assignment: any) =>
            !submissionsByAssignment.has(assignment.id) &&
            new Date(assignment.due_date) >= now
        )
        .sort(
          (a: any, b: any) =>
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        )
        .slice(0, 5)
        .map((assignment: any) => {
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
        (announcementReadResult.data || []).map((row: any) => row.announcement_id)
      );
      const announcementList = (announcementResult.data || []).map((announcement: any) => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        attachments: Array.isArray(announcement.attachments)
          ? announcement.attachments
          : [],
        createdAt: announcement.created_at,
        isRead: readIds.has(announcement.id),
      }));

      setEnrolledCourses(courseList);
      setUpcomingAssignments(futureAssignments);
      setAnnouncements(announcementList);
      setStats({
        pendingAssignments: assignmentRows.filter(
          (assignment: any) => !submissionsByAssignment.has(assignment.id)
        ).length,
        gpa:
          !gpaResult.error && gpaResult.data?.gpa != null
            ? Number(gpaResult.data.gpa)
            : null,
        credits: courseList.reduce((sum, course) => sum + course.credits, 0),
        unreadAlerts: announcementList.filter((announcement) => !announcement.isRead).length,
      });
      void generateSmartRecommendations(courseList);
    } catch (error: any) {
      console.error("Failed to load student dashboard:", error);
      setLoadError(error?.message || "Could not load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Scholar"}!
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Sparkles className="h-4 w-4 text-purple-500" />
            {isLoadingAi
              ? 'AI Assistant: "Finding relevant resources for your current courses..."'
              : `AI Assistant: "I've found ${aiData.studyMaterials.length} relevant resources based on your enrollment."`}
          </p>
        </div>
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors px-3 py-1">
          <Brain className="h-3 w-3 mr-1" />
          {isLoadingAi ? "Preparing Study Plan" : "AI Study Plan Ready"}
        </Badge>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {loadError}
        </div>
      )}

      <Card className="overflow-hidden bg-gradient-to-r from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-950 border-dashed">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Jump Back In
            </CardTitle>
            <CardDescription>Pick up where you left off</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiData.recentCourses.length > 0 ? (
              aiData.recentCourses.map((course) => (
                <button
                  type="button"
                  key={course.courseCode}
                  onClick={() => navigate("/courses")}
                  className="group w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-sm">{course.courseName}</h4>
                      <p className="text-[10px] text-muted-foreground">
                        Last active: {course.lastAccessed.toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {course.courseCode}
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
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

        <Card className="col-span-1 border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-purple-500" />
              Smart Study Picks
            </CardTitle>
            <CardDescription>Curated external resources for you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingAi ? (
              <div className="flex min-h-[120px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
              </div>
            ) : (
              <>
                {aiData.studyMaterials.map((item) => (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors border border-transparent hover:border-purple-100 group"
                  >
                    <div className={`p-2 rounded-md shrink-0 ${getResourceColor(item.type)}`}>
                      {getResourceIcon(item.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-tight group-hover:underline decoration-purple-400 underline-offset-2">
                        {item.title}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        {item.reason}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{item.source}</p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
                {aiData.studyMaterials.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">
                    No specific recommendations found for your current courses.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-amber-50/30 to-transparent dark:from-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-amber-500" />
              Motivation Zone
            </CardTitle>
            <CardDescription>Productivity boosters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiData.motivation.map((item) => (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/60 dark:hover:bg-black/20 transition-all group"
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${getResourceColor(item.type)}`}>
                  {getResourceIcon(item.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold line-clamp-1 group-hover:text-amber-700">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {item.source}
                  </p>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            ))}
            <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg text-xs text-center italic text-muted-foreground border">
              "Focus is not about saying yes. It's about saying no to the hundred other good ideas."
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enrolled</p>
                <p className="text-2xl font-semibold">{enrolledCourses.length}</p>
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
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold">{stats.pendingAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">GPA</p>
                <p className="text-2xl font-semibold">
                  {stats.gpa == null ? "--" : stats.gpa.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <GraduationCap className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-semibold">{stats.credits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Bell className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unread Alerts</p>
                <p className="text-2xl font-semibold">{stats.unreadAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>My Courses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrolledCourses.length > 0 ? (
                enrolledCourses.map((course) => (
                  <button
                    type="button"
                    key={course.id}
                    onClick={() => navigate(`/courses?courseId=${course.id}`)}
                    className="w-full p-4 border rounded-lg space-y-3 text-left hover:bg-muted/40 transition-colors"
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
                          {course.completedAssignments}/{course.assignments} assignments submitted
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
                            Next: {course.nextAssignment.title} ·{" "}
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
                  <Button className="mt-4" onClick={() => navigate("/courses")}>
                    Browse Courses
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <OnlineActivity userRole="student" />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingAssignments.length > 0 ? (
                upcomingAssignments.map((assignment) => (
                  <button
                    type="button"
                    key={assignment.id}
                    onClick={() =>
                      navigate(
                        `/courses?courseId=${assignment.courseId}&assignmentId=${assignment.id}`
                      )
                    }
                    className="w-full rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.courseCode} · {assignment.courseName}
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
                  <div key={announcement.id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
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
                            style={{
                              width: 180,
                              height: 110,
                              maxWidth: "100%",
                            }}
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
                        <span className="h-2 w-2 rounded-full bg-blue-600" title="Unread" />
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
        </div>
      </div>
    </div>
  );
}
