import { X } from "lucide-react";
import { ASSESSMENT_TYPE_OPTIONS } from "@/lib/assessmentTypes";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export type AssessmentTypeFilter = "all"
  | (typeof ASSESSMENT_TYPE_OPTIONS)[number]["value"];

type AssessmentFiltersProps = {
  typeFilter: AssessmentTypeFilter;
  resultCount: number;
  totalCount: number;
  onTypeChange: (value: AssessmentTypeFilter) => void;
};

export function AssessmentFilters({
  typeFilter,
  resultCount,
  totalCount,
  onTypeChange,
}: AssessmentFiltersProps) {
  const hasActiveFilter = typeFilter !== "all";

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <Select
        value={typeFilter}
        onValueChange={value =>
          onTypeChange(value as AssessmentTypeFilter)
        }
      >
        <SelectTrigger className="w-full sm:w-[210px]">
          <SelectValue placeholder="All assessment types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assessment Types</SelectItem>
          {ASSESSMENT_TYPE_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {resultCount} of {totalCount}
        </span>
        {hasActiveFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onTypeChange("all")}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
