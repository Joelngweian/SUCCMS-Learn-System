import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { getCourseOffering } from "@/data/courseRepository";
import type { NormalizedCourseOffering } from "@/lib/courseOfferings";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  AlertCircle,
  Calendar,
  ClipboardCheck,
  FileText,
  Loader2,
  MessageSquare,
  Users,
} from "lucide-react";
import { CourseHeader } from "./course/CourseHeader";
import { CourseTabLoading } from "./course/CourseTabLoading";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

const CoursePostsSection = lazy(() =>
  import("./course/CoursePostsSection").then((module) => ({
    default: module.CoursePostsSection,
  })),
);
const CourseFilesSection = lazy(() =>
  import("./course/CourseFilesSection").then((module) => ({
    default: module.CourseFilesSection,
  })),
);
const CourseAssignmentsSection = lazy(() =>
  import("./course/CourseAssignmentsSection").then((module) => ({
    default: module.CourseAssignmentsSection,
  })),
);
const CourseAttendanceSection = lazy(() =>
  import("./course/CourseAttendanceSection").then((module) => ({
    default: module.CourseAttendanceSection,
  })),
);
const CoursePeopleSection = lazy(() =>
  import("./course/CoursePeopleSection").then((module) => ({
    default: module.CoursePeopleSection,
  })),
);

type CourseTab = "posts" | "files" | "assignments" | "attendance" | "people";

class CourseTabErrorBoundary extends Component<
  { children: ReactNode; onBack: () => void },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Course tab crashed:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold">
                This course page could not be displayed.
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Please go back and try again. If it keeps happening, check the
                browser console for the detailed error.
              </p>
            </div>
            <Button onClick={this.props.onBack}>Back to Courses</Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

interface CoursePageProps {
  courseId: string;
  onBack: () => void;
}

export function CoursePage({ courseId, onBack }: CoursePageProps) {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get("assignmentId");
  const isLecturer = profile?.role === "lecturer";
  const [activeTab, setActiveTab] = useState<CourseTab>(
    assignmentId ? "assignments" : "posts",
  );
  const [course, setCourse] = useState<NormalizedCourseOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCourseDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      setCourse(await getCourseOffering(courseId));
    } catch (error) {
      console.error("Failed to load course:", error);
      setCourse(null);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void fetchCourseDetails();
  }, [fetchCourseDetails]);

  useEffect(() => {
    if (assignmentId) setActiveTab("assignments");
  }, [assignmentId]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-col items-center gap-3 px-4 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold">Course not found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This course offering could not be loaded. It may have been
              removed, or the database migration has not been applied yet.
            </p>
          </div>
          <Button onClick={onBack}>Back to Courses</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-4 sm:space-y-6">
      <CourseHeader course={course} isLecturer={isLecturer} onBack={onBack} />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as CourseTab)}
        className="flex flex-1 flex-col"
      >
        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <TabsList className="mb-3 flex w-max min-w-full justify-start gap-1 sm:mb-4 sm:grid sm:w-full sm:max-w-[720px] sm:grid-cols-5">
            <TabsTrigger
              value="posts"
              className="min-w-[92px] flex-none gap-1.5 px-3 text-xs sm:min-w-0 sm:flex-1 sm:gap-2 sm:text-sm"
            >
              <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="min-w-[92px] flex-none gap-1.5 px-3 text-xs sm:min-w-0 sm:flex-1 sm:gap-2 sm:text-sm"
            >
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="min-w-[120px] flex-none gap-1.5 px-3 text-xs sm:min-w-0 sm:flex-1 sm:gap-2 sm:text-sm"
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Assessments
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="min-w-[112px] flex-none gap-1.5 px-3 text-xs sm:min-w-0 sm:flex-1 sm:gap-2 sm:text-sm"
            >
              <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger
              value="people"
              className="min-w-[92px] flex-none gap-1.5 px-3 text-xs sm:min-w-0 sm:flex-1 sm:gap-2 sm:text-sm"
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              People
            </TabsTrigger>
          </TabsList>
        </div>

        <CourseTabErrorBoundary key={`${courseId}:${activeTab}`} onBack={onBack}>
          <Suspense fallback={<CourseTabLoading />}>
            {activeTab === "posts" && (
              <CoursePostsSection courseId={courseId} isLecturer={isLecturer} />
            )}
            {activeTab === "files" && (
              <CourseFilesSection courseId={courseId} isLecturer={isLecturer} />
            )}
            {activeTab === "assignments" && (
              <CourseAssignmentsSection
                assignmentId={assignmentId}
                courseId={courseId}
                isLecturer={isLecturer}
              />
            )}
            {activeTab === "attendance" && (
              <CourseAttendanceSection
                courseId={courseId}
                courseCode={course.code || course.course_code}
                courseName={course.name}
                isLecturer={isLecturer}
              />
            )}
            {activeTab === "people" && (
              <CoursePeopleSection courseId={courseId} />
            )}
          </Suspense>
        </CourseTabErrorBoundary>
      </Tabs>
    </div>
  );
}
