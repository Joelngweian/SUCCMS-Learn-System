import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
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

export function AcademicPlanningTabsShell({
  activePlanningTab,
  onTabChange,
}: AcademicPlanningTabsShellProps) {
  return (
    <Tabs
      value={activePlanningTab}
      onValueChange={onTabChange}
      className="space-y-4"
    >
      <TabsList className="grid h-auto w-full grid-cols-2 p-1 sm:grid-cols-4">
        <TabsTrigger value="study-plans" className="text-xs sm:text-sm">
          Study Plans
        </TabsTrigger>
        <TabsTrigger value="academic-calendar" className="text-xs sm:text-sm">
          Academic Calendar
        </TabsTrigger>
        <TabsTrigger value="student-study-plans" className="text-xs sm:text-sm">
          Student Study Plans
        </TabsTrigger>
        <TabsTrigger value="assignments" className="text-xs sm:text-sm">
          Class Assignment
        </TabsTrigger>
      </TabsList>

      <TabsContent value="study-plans" className="space-y-4">
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

      <TabsContent value="academic-calendar" className="space-y-4">
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

      <TabsContent value="student-study-plans" className="space-y-4">
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

      <TabsContent value="assignments" className="space-y-4">
        {activePlanningTab === "assignments" && (
          <AppErrorBoundary
            resetKey={activePlanningTab}
            title="Class Assignment could not be displayed."
            description="The lecturer assignment tab hit a render error. Try again or refresh the data."
          >
            <Suspense fallback={<AcademicPlanningTabFallback />}>
              <ClassAssignmentTabContent />
            </Suspense>
          </AppErrorBoundary>
        )}
      </TabsContent>
    </Tabs>
  );
}
