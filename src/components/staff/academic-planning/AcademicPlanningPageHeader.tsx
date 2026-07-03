import { RefreshCw } from "lucide-react";
import { Button } from "../../ui/button";

type AcademicPlanningPageHeaderProps = {
  isLoading: boolean;
  onRefresh: () => void;
};

export function AcademicPlanningPageHeader({
  isLoading,
  onRefresh,
}: AcademicPlanningPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          AARO Staff Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage study plan versions, course structures and lecturer class
          assignment.
        </p>
      </div>
      <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh
      </Button>
    </div>
  );
}
