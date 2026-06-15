import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { getCourseOffering } from "@/data/courseRepository";
import type { NormalizedCourseOffering } from "@/lib/courseOfferings";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Calendar,
  ClipboardCheck,
  FileText,
  Loader2,
  MessageSquare,
  Users,
} from "lucide-react";
import { CourseHeader } from "./course/CourseHeader";
import { CourseTabLoading } from "./course/CourseTabLoading";

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

  if (isLoading || !course) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <CourseHeader course={course} isLecturer={isLecturer} onBack={onBack} />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as CourseTab)}
        className="flex flex-1 flex-col"
      >
        <TabsList className="mb-4 grid w-full max-w-[720px] grid-cols-5">
          <TabsTrigger value="posts" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <FileText className="h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <Calendar className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="people" className="gap-2">
            <Users className="h-4 w-4" />
            People
          </TabsTrigger>
        </TabsList>

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
              isLecturer={isLecturer}
            />
          )}
          {activeTab === "people" && (
            <CoursePeopleSection courseId={courseId} />
          )}
        </Suspense>
      </Tabs>
    </div>
  );
}
