import type { NormalizedCourseOffering } from "@/lib/courseOfferings";
import { ArrowLeft, Key } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

interface CourseHeaderProps {
  course: NormalizedCourseOffering;
  isLecturer: boolean;
  onBack: () => void;
}

export function CourseHeader({
  course,
  isLecturer,
  onBack,
}: CourseHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-start sm:justify-between sm:pb-4">
      <div>
        <Button
          variant="ghost"
          className="mb-1 h-auto px-0 py-0 text-xs hover:bg-transparent sm:mb-2 sm:py-2 sm:text-sm"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
          Back to Dashboard
        </Button>
        <h1 className="max-w-3xl text-2xl font-bold leading-tight text-primary sm:text-3xl">
          {course.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground sm:gap-3">
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
            {course.course_code}
          </span>
          <span className="text-xs">|</span>
          <span className="text-xs">{course.semester || "General"}</span>
        </div>
      </div>
      {isLecturer && (
        <Card className="w-full border-yellow-200 bg-yellow-50 sm:w-auto sm:min-w-[200px]">
          <CardContent className="flex h-full flex-col justify-center p-3 sm:p-4">
            <div className="mb-1 flex items-center gap-2">
              <Key className="h-4 w-4 text-yellow-700" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-800">
                Enrollment Key
              </span>
            </div>
            <p className="select-all font-mono text-lg font-bold tracking-wide text-yellow-900 sm:text-xl">
              {course.enrollment_key || "NOT SET"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
