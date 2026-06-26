import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import { AssignmentCard } from "./assignments/AssignmentCard";
import { AssignmentEmptyState } from "./assignments/AssignmentEmptyState";
import {
  AssessmentFilters,
  type AssessmentTypeFilter,
} from "./assignments/AssessmentFilters";
import { useAssignmentsData } from "./assignments/useAssignmentsData";
import { matchesAssessmentFilters } from "@/lib/assessmentTypes";

export function Assignments() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isLecturer = profile?.role === "lecturer";
  const [typeFilter, setTypeFilter] =
    useState<AssessmentTypeFilter>("all");
  const { loading, studentBuckets, lecturerBuckets } = useAssignmentsData({
    isLecturer,
    profileId: profile?.id,
    userId: user?.id,
  });

  const filterItems = <T extends typeof lecturerBuckets.all>(
    items: T,
  ) =>
    items.filter(item =>
      matchesAssessmentFilters({
        assessmentType: item.assessment_type,
        typeFilter,
      }),
    );

  const filteredLecturerBuckets = useMemo(
    () => ({
      all: filterItems(lecturerBuckets.all),
      needsGrading: filterItems(lecturerBuckets.needsGrading),
      graded: filterItems(lecturerBuckets.graded),
    }),
    // filterItems is derived entirely from these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lecturerBuckets, typeFilter],
  );
  const filteredStudentBuckets = useMemo(
    () => ({
      upcoming: filterItems(studentBuckets.upcoming),
      pastDue: filterItems(studentBuckets.pastDue),
      completed: filterItems(studentBuckets.completed),
    }),
    // filterItems is derived entirely from these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [studentBuckets, typeFilter],
  );
  const totalAssessmentCount = isLecturer
    ? lecturerBuckets.all.length
    : studentBuckets.upcoming.length
      + studentBuckets.pastDue.length
      + studentBuckets.completed.length;
  const filteredAssessmentCount = isLecturer
    ? filteredLecturerBuckets.all.length
    : filteredStudentBuckets.upcoming.length
      + filteredStudentBuckets.pastDue.length
      + filteredStudentBuckets.completed.length;
  const filterActive = typeFilter !== "all";

  const openAssignment = (courseId: string, assignmentId: string) => {
    navigate(`/courses?courseId=${courseId}&assignmentId=${assignmentId}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 pb-20 lg:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Assessments
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {isLecturer
                ? "Manage tutorials, assignments and projects across your courses."
                : "Track your upcoming assessments."}
            </p>
          </div>
          {!isLecturer && studentBuckets.crucialCount > 0 && (
            <div className="hidden animate-pulse items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 sm:flex">
              <AlertCircle className="h-4 w-4" />
              {studentBuckets.crucialCount} assessments due soon!
            </div>
          )}
        </div>

        <Tabs
          defaultValue={isLecturer ? "needs-grading" : "upcoming"}
          className="w-full"
        >
          <TabsList
            className="mb-4 grid h-14 w-full grid-cols-3 rounded-xl border border-border bg-card p-1 shadow-sm"
          >
            {isLecturer ? (
              <>
                <TabsTrigger
                  value="needs-grading"
                  className="rounded-lg text-base font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  Needs Grading
                  {filteredLecturerBuckets.needsGrading.length > 0 && (
                    <Badge className="ml-2 border-0 bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                      {filteredLecturerBuckets.needsGrading.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="graded"
                  className="rounded-lg text-base font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  Graded
                  {filteredLecturerBuckets.graded.length > 0 && (
                    <Badge className="ml-2 border-0 bg-green-100 text-green-700 hover:bg-green-200">
                      {filteredLecturerBuckets.graded.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="all"
                  className="rounded-lg text-base font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  All
                  {filteredLecturerBuckets.all.length > 0 && (
                    <Badge className="ml-2 border-0 bg-muted text-foreground">
                      {filteredLecturerBuckets.all.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger
                  value="upcoming"
                  className="rounded-lg text-base font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  Upcoming
                  {filteredStudentBuckets.upcoming.length > 0 && (
                    <Badge className="ml-2 border-0 bg-muted text-foreground">
                      {filteredStudentBuckets.upcoming.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="past-due"
                  className="rounded-lg text-base font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  Past Due
                  {filteredStudentBuckets.pastDue.length > 0 && (
                    <Badge className="ml-2 border-0 bg-red-100 text-red-700 hover:bg-red-200">
                      {filteredStudentBuckets.pastDue.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="rounded-lg text-base font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  Completed
                  {filteredStudentBuckets.completed.length > 0 && (
                    <Badge className="ml-2 border-0 bg-green-100 text-green-700 hover:bg-green-200">
                      {filteredStudentBuckets.completed.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <div className="mb-8">
            <AssessmentFilters
              typeFilter={typeFilter}
              resultCount={filteredAssessmentCount}
              totalCount={totalAssessmentCount}
              onTypeChange={setTypeFilter}
            />
          </div>

          {isLecturer ? (
            <>
              <TabsContent value="needs-grading" className="space-y-4">
                {filteredLecturerBuckets.needsGrading.length === 0 ? (
                  <AssignmentEmptyState
                    icon={<AlertCircle className="h-10 w-10 text-yellow-500" />}
                    title={
                      filterActive
                        ? "No matching assessments"
                        : "No ungraded submissions"
                    }
                    description={
                      filterActive
                        ? "Try another assessment type."
                        : "You're all caught up."
                    }
                  />
                ) : (
                  filteredLecturerBuckets.needsGrading.map(item => (
                    <AssignmentCard
                      key={item.id}
                      item={item}
                      type="needsGrading"
                      onOpen={openAssignment}
                    />
                  ))
                )}
              </TabsContent>
              <TabsContent value="graded" className="space-y-4">
                {filteredLecturerBuckets.graded.length === 0 ? (
                  <AssignmentEmptyState
                    icon={<CheckCircle className="h-10 w-10 text-green-500" />}
                    title={
                      filterActive
                        ? "No matching assessments"
                        : "No graded assessments yet"
                    }
                    description={
                      filterActive
                        ? "Try another assessment type."
                        : "Once graded, they'll appear here."
                    }
                  />
                ) : (
                  filteredLecturerBuckets.graded.map(item => (
                    <AssignmentCard
                      key={item.id}
                      item={item}
                      type="graded"
                      onOpen={openAssignment}
                    />
                  ))
                )}
              </TabsContent>
              <TabsContent value="all" className="space-y-4">
                {filteredLecturerBuckets.all.length === 0 ? (
                  <AssignmentEmptyState
                    icon={<FileText className="h-10 w-10 text-muted-foreground" />}
                    title={
                      filterActive
                        ? "No matching assessments"
                        : "No assessments created"
                    }
                    description={
                      filterActive
                        ? "Try another assessment type."
                        : "Create an assessment from the course page."
                    }
                  />
                ) : (
                  filteredLecturerBuckets.all.map(item => (
                    <AssignmentCard
                      key={item.id}
                      item={item}
                      type="all"
                      onOpen={openAssignment}
                    />
                  ))
                )}
              </TabsContent>
            </>
          ) : (
            <>
              <TabsContent value="upcoming" className="space-y-4">
                {filteredStudentBuckets.upcoming.length === 0 ? (
                  <AssignmentEmptyState
                    icon={<CheckCircle className="h-10 w-10 text-blue-500" />}
                    title={
                      filterActive
                        ? "No matching assessments"
                        : "All caught up!"
                    }
                    description={
                      filterActive
                        ? "Try another assessment type."
                        : "No upcoming assessments."
                    }
                  />
                ) : (
                  filteredStudentBuckets.upcoming.map(item => (
                    <AssignmentCard
                      key={item.id}
                      item={item}
                      type="upcoming"
                      onOpen={openAssignment}
                    />
                  ))
                )}
              </TabsContent>
              <TabsContent value="past-due" className="space-y-4">
                {filteredStudentBuckets.pastDue.length === 0 ? (
                  <AssignmentEmptyState
                    icon={<Clock className="h-10 w-10 text-green-500" />}
                    title={
                      filterActive
                        ? "No matching assessments"
                        : "No overdue work"
                    }
                    description={
                      filterActive
                        ? "Try another assessment type."
                        : "You're doing great!"
                    }
                  />
                ) : (
                  filteredStudentBuckets.pastDue.map(item => (
                    <AssignmentCard
                      key={item.id}
                      item={item}
                      type="pastDue"
                      onOpen={openAssignment}
                    />
                  ))
                )}
              </TabsContent>
              <TabsContent value="completed" className="space-y-4">
                {filteredStudentBuckets.completed.length === 0 ? (
                  <AssignmentEmptyState
                    icon={<FileText className="h-10 w-10 text-muted-foreground" />}
                    title={
                      filterActive
                        ? "No matching assessments"
                        : "No completed work"
                    }
                    description={
                      filterActive
                        ? "Try another assessment type."
                        : "Submitted assessments appear here."
                    }
                  />
                ) : (
                  filteredStudentBuckets.completed.map(item => (
                    <AssignmentCard
                      key={item.id}
                      item={item}
                      type="completed"
                      onOpen={openAssignment}
                    />
                  ))
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}
