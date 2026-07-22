import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent } from "../../ui/card";

type AcademicPlanningOverviewCardsProps = {
  lecturersCount: number;
  semestersCount: number;
  selectedCoursesCount: number;
  studyPlansCount: number;
};

export function AcademicPlanningOverviewCards({
  lecturersCount,
  semestersCount,
  selectedCoursesCount,
  studyPlansCount,
}: AcademicPlanningOverviewCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <BookOpen className="h-8 w-8 rounded-lg bg-blue-100 p-2 text-blue-700" />
          <div>
            <p className="text-xs text-muted-foreground">Study Plans</p>
            <p className="text-xl font-bold">{studyPlansCount}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <ClipboardList className="h-8 w-8 rounded-lg bg-green-100 p-2 text-green-700" />
          <div>
            <p className="text-xs text-muted-foreground">Selected Courses</p>
            <p className="text-xl font-bold">{selectedCoursesCount}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <GraduationCap className="h-8 w-8 rounded-lg bg-purple-100 p-2 text-purple-700" />
          <div>
            <p className="text-xs text-muted-foreground">Lecturers</p>
            <p className="text-xl font-bold">{lecturersCount}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <CalendarDays className="h-8 w-8 rounded-lg bg-orange-100 p-2 text-orange-700" />
          <div>
            <p className="text-xs text-muted-foreground">Semesters</p>
            <p className="text-xl font-bold">{semestersCount}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
