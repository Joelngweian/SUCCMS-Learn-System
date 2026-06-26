import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TabsContent } from "@/components/ui/tabs";
import { CourseTabLoading } from "./CourseTabLoading";
import { useCoursePeople } from "./useCoursePeople";

const CourseAttendance = lazy(() =>
  import("../CourseAttendance").then((module) => ({
    default: module.CourseAttendance,
  })),
);

export function CourseAttendanceSection({
  courseId,
  courseCode,
  courseName,
  isLecturer,
}: {
  courseId: string;
  courseCode?: string;
  courseName?: string;
  isLecturer: boolean;
}) {
  const { user } = useAuth();
  const { people } = useCoursePeople(courseId);

  return (
    <TabsContent value="attendance">
      <Suspense fallback={<CourseTabLoading />}>
        <CourseAttendance
          courseId={courseId}
          courseCode={courseCode}
          courseName={courseName}
          userId={user?.id || null}
          isLecturer={isLecturer}
          students={people}
        />
      </Suspense>
    </TabsContent>
  );
}
