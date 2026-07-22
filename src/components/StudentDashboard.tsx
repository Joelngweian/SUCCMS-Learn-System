import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings";
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
  STUDY_RECOMMENDATION_CACHE_TTL,
  buildRuleBasedInsights,
  getFallbackStudyMaterials,
  getMotivationPicks,
  type Recommendation,
  type StudyInsightCourseContext,
} from "./student-dashboard/studentDashboardRecommendations";
import {
  asRecord,
  asArray,
  asNumber,
  asStringList,
  formatRelativeDate,
  getCourseCode,
  isRecommendation,
  normalizeDashboardAnnouncement,
  normalizeDashboardCourse,
  normalizeAnnouncementAttachments,
  normalizeInsightCourse,
  normalizeUpcomingAssignment,
  percentageToGrade,
  signDashboardAnnouncementAttachments,
  type AssignmentRow,
  type AttendanceRow,
  type CourseActivity,
  type DashboardAnnouncement,
  type DashboardAssignment,
  type GradeRow,
  type InstructorRow,
  type StudentCourse,
  type SubmissionRow,
} from "./student-dashboard/studentDashboardData";
import {
  AlertCircle,
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

  const generateSmartRecommendations = useCallback(async (
    courses: StudentCourse[],
  ) => {
    setIsLoadingAi(true);

    const motivationPicks = getMotivationPicks();

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

      const { fetchStudentStudyRecommendations } = await import("@/data/studentAiRepository");
      const data = asRecord(await fetchStudentStudyRecommendations(courseContext));
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
  }, [userId]);

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

      const { fetchStudentStudyInsights } = await import("@/data/studentAiRepository");
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
    <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 gap-6 animate-in fade-in duration-500 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:items-start">
      <div className="min-w-0 space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Scholar"}!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Stories, courses and campus activity are ready.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                  <Sparkles className="h-4 w-4 text-primary" />
                  Study Panel
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="overflow-hidden p-0"
              >
                <SheetTitle className="sr-only">Your Study Panel</SheetTitle>
                <SheetDescription className="sr-only">
                  Quick study actions, course shortcuts and campus updates.
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

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Stories</h2>
          <Stories
            currentUserName={profile?.full_name || "Your Story"}
            currentUserInitials={(profile?.full_name || "YS")
              .split(" ")
              .map((part) => part[0])
              .join("")}
            currentUserAvatar={profile?.avatar_url}
            currentUserRole={profile?.role}
            compact
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Student Data</h2>
          <StudentStatsGrid
            enrolledCount={enrolledCourses.length}
            pendingAssignments={stats.pendingAssignments}
            gpa={stats.gpa}
            credits={stats.credits}
            unreadAlerts={stats.unreadAlerts}
          />
        </section>

        <main className="min-w-0">
          <CampusFeed />
        </main>
      </div>

      <div className="hidden 2xl:block">{studyPanel}</div>
    </div>
  );
}
