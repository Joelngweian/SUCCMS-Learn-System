import { lazy, Suspense } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { AppErrorBoundary } from "../../common/AppErrorBoundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import type { AcademicPlanningTab } from "./academicPlanningTabs";

const StudyPlansTabContent = lazy(() =>
  import("./StudyPlansTabContent").then(module => ({
    default: module.StudyPlansTabContent,
  })),
);
const AcademicCalendarTabContent = lazy(() =>
  import("./AcademicCalendarTabContent").then(module => ({
    default: module.AcademicCalendarTabContent,
  })),
);
const StudentStudyPlansTabContent = lazy(() =>
  import("./StudentStudyPlansTabContent").then(module => ({
    default: module.StudentStudyPlansTabContent,
  })),
);
const ClassAssignmentTabContent = lazy(() =>
  import("./ClassAssignmentTabContent").then(module => ({
    default: module.ClassAssignmentTabContent,
  })),
);

function AcademicPlanningTabFallback() {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}

type AcademicPlanningTabsShellProps = {
  activePlanningTab: AcademicPlanningTab;
  onTabChange: (value: string) => void;
};

const planningTabs = [
  {
    value: "study-plans",
    label: "Study Plan Versions",
    description: "Import and review course rows.",
    Icon: BookOpen,
  },
  {
    value: "academic-calendar",
    label: "Academic Calendar",
    description: "Upload semester dates.",
    Icon: CalendarDays,
  },
  {
    value: "student-study-plans",
    label: "Student Plans",
    description: "Assign intake tracks.",
    Icon: GraduationCap,
  },
  {
    value: "assignments",
    label: "Course Assign",
    description: "Assign lecturers.",
    Icon: ClipboardList,
  },
] satisfies Array<{
  value: AcademicPlanningTab;
  label: string;
  description: string;
  Icon: typeof BookOpen;
}>;

export function AcademicPlanningTabsShell({
  activePlanningTab,
  onTabChange,
}: AcademicPlanningTabsShellProps) {
  return (
    <Tabs
      value={activePlanningTab}
      onValueChange={onTabChange}
      className="min-w-0"
    >
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid min-w-0 lg:grid-cols-[210px_minmax(0,1fr)]">
        <TabsList className="grid h-auto min-w-0 grid-cols-2 gap-0 rounded-none bg-muted/20 p-0 lg:block lg:min-h-[520px] lg:border-r lg:bg-card">
          {planningTabs.map(({ value, label, Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-auto w-full justify-start gap-3 whitespace-normal rounded-none border-0 border-b border-l-4 border-l-transparent bg-transparent p-4 text-left shadow-none data-[state=active]:border-l-blue-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-950/40 dark:data-[state=active]:text-blue-200"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{label}</span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-w-0 p-4">
          <TabsContent value="study-plans" className="mt-0 min-w-0 space-y-4">
            {activePlanningTab === "study-plans" && (
              <AppErrorBoundary
                resetKey={activePlanningTab}
                title="Study Plans could not be displayed."
                description="The study plan import and course structure tab hit a render error. Try again or refresh the data."
              >
                <Suspense fallback={<AcademicPlanningTabFallback />}>
                  <StudyPlansTabContent />
                </Suspense>
              </AppErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="academic-calendar" className="mt-0 min-w-0 space-y-4">
            {activePlanningTab === "academic-calendar" && (
              <AppErrorBoundary
                resetKey={activePlanningTab}
                title="Academic Calendar could not be displayed."
                description="The calendar tab hit a render error. Try again or refresh the data."
              >
                <Suspense fallback={<AcademicPlanningTabFallback />}>
                  <AcademicCalendarTabContent />
                </Suspense>
              </AppErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="student-study-plans" className="mt-0 min-w-0 space-y-4">
            {activePlanningTab === "student-study-plans" && (
              <AppErrorBoundary
                resetKey={activePlanningTab}
                title="Student Study Plans could not be displayed."
                description="The student assignment tab hit a render error. Try again or refresh the data."
              >
                <Suspense fallback={<AcademicPlanningTabFallback />}>
                  <StudentStudyPlansTabContent />
                </Suspense>
              </AppErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="mt-0 min-w-0 space-y-4">
            {activePlanningTab === "assignments" && (
              <AppErrorBoundary
                resetKey={activePlanningTab}
                title="Course Assign could not be displayed."
                description="The lecturer assignment tab hit a render error. Try again or refresh the data."
              >
                <Suspense fallback={<AcademicPlanningTabFallback />}>
                  <ClassAssignmentTabContent />
                </Suspense>
              </AppErrorBoundary>
            )}
          </TabsContent>
        </div>
        </div>
      </div>
    </Tabs>
  );
}
