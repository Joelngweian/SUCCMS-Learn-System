import { useMemo, useState, type MouseEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  AssessmentFilters,
  type AssessmentTypeFilter,
} from "@/components/assignments/AssessmentFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import {
  getAssignmentMaxScore,
  type CourseAssignment,
  type CourseSubmission,
  type SubmissionFile,
} from "./coursePageTypes";
import {
  getAssessmentTypeLabel,
  matchesAssessmentFilters,
} from "@/lib/assessmentTypes";

type CourseAssignmentsTabProps = {
  isLecturer: boolean;
  assignments: CourseAssignment[];
  mySubmissions: CourseSubmission[];
  onCreateAssessment: () => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onSelectAssignment: (
    assignment: CourseAssignment,
    files: SubmissionFile[],
  ) => void;
};

export function CourseAssignmentsTab({
  isLecturer,
  assignments,
  mySubmissions,
  onCreateAssessment,
  onDeleteAssignment,
  onSelectAssignment,
}: CourseAssignmentsTabProps) {
  const [typeFilter, setTypeFilter] =
    useState<AssessmentTypeFilter>("all");
  const filteredAssignments = useMemo(
    () =>
      assignments.filter(assignment =>
        matchesAssessmentFilters({
          assessmentType: assignment.assessment_type,
          typeFilter,
        }),
      ),
    [assignments, typeFilter],
  );
  const filterActive = typeFilter !== "all";

  return (
    <TabsContent value="assignments" className="space-y-4">
      {isLecturer && (
        <Button onClick={onCreateAssessment} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Create Assessment
        </Button>
      )}

      <AssessmentFilters
        typeFilter={typeFilter}
        resultCount={filteredAssignments.length}
        totalCount={assignments.length}
        onTypeChange={setTypeFilter}
      />

      <div className="grid gap-4">
        {filteredAssignments.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {filterActive
              ? "No assessments match your filters."
              : "No active assessments."}
          </div>
        )}

        {filteredAssignments.map(assignment => {
          const submission = mySubmissions.find(
            item => item.assignment_id === assignment.id
          );
          const isSubmitted = Boolean(submission);
          const isLate = isSubmitted
            && new Date(submission.submitted_at) > new Date(assignment.due_date);
          const isMissing = !isSubmitted && new Date() > new Date(assignment.due_date);

          return (
            <Card
              key={assignment.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onSelectAssignment(
                assignment,
                submission?.files ?? []
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="min-w-0">
                  <Badge
                    variant="secondary"
                    className="mb-2 text-[10px] font-medium"
                  >
                    {getAssessmentTypeLabel(assignment.assessment_type)}
                  </Badge>
                  <CardTitle className="truncate text-base font-semibold">
                    {assignment.title}
                  </CardTitle>
                </div>
                {isLecturer ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500"
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation();
                      onDeleteAssignment(assignment.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    {submission?.grade != null && (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 border-green-200"
                      >
                        Graded
                      </Badge>
                    )}
                    <Badge
                      variant={
                        isSubmitted
                          ? (isLate ? "destructive" : "default")
                          : (isMissing ? "destructive" : "outline")
                      }
                    >
                      {isSubmitted
                        ? (isLate ? "Done Late" : "Turned In")
                        : (isMissing ? "Missing" : "Assigned")}
                    </Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex justify-between items-center mt-2">
                  <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                  {submission?.grade != null ? (
                    <Badge
                      variant="secondary"
                      className="text-sm font-bold bg-green-100 text-green-800 hover:bg-green-200 px-2"
                    >
                      {submission.grade} / {getAssignmentMaxScore(assignment)}
                    </Badge>
                  ) : (
                    <span>{getAssignmentMaxScore(assignment)} pts</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TabsContent>
  );
}
