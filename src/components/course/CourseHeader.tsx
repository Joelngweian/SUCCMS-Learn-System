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
    <div className="flex items-start justify-between border-b pb-4">
      <div>
        <Button
          variant="ghost"
          className="mb-2 pl-0 hover:bg-transparent"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-primary">{course.name}</h1>
        <div className="mt-2 flex gap-3 text-muted-foreground">
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
            {course.course_code}
          </span>
          <span className="text-xs">|</span>
          <span className="text-xs">{course.semester || "General"}</span>
        </div>
      </div>
      {isLecturer && (
        <Card className="min-w-[200px] border-yellow-200 bg-yellow-50">
          <CardContent className="flex h-full flex-col justify-center p-4">
            <div className="mb-1 flex items-center gap-2">
              <Key className="h-4 w-4 text-yellow-700" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-800">
                Enrollment Key
              </span>
            </div>
            <p className="select-all font-mono text-xl font-bold tracking-wide text-yellow-900">
              {course.enrollment_key || "NOT SET"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
