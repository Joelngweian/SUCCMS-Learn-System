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
import { useAssignmentsData } from "./assignments/useAssignmentsData";

export function Assignments() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isLecturer = profile?.role === "lecturer";
  const { loading, studentBuckets, lecturerBuckets } = useAssignmentsData({
    isLecturer,
    profileId: profile?.id,
    userId: user?.id,
  });

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
              Assignments
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {isLecturer
                ? "Manage all course assignments."
                : "Track your upcoming tasks."}
            </p>
          </div>
          {!isLecturer && studentBuckets.crucialCount > 0 && (
            <div className="hidden animate-pulse items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 sm:flex">
              <AlertCircle className="h-4 w-4" />
              {studentBuckets.crucialCount} assignments due soon!
            </div>
          )}
        </div>

        <Tabs
          defaultValue={isLecturer ? "needs-grading" : "upcoming"}
          className="w-full"
        >
          <TabsList
            className="mb-8 grid h-14 w-full grid-cols-3 rounded-xl border border-border bg-card p-1 shadow-sm"
          >
            {isLecturer ? (
              <>
                <TabsTrigger
                  value="needs-grading"
                  className="rounded-lg text-base font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  Needs Grading
                  {lecturerBuckets.needsGrading.length > 0 && (
                    <Badge className="ml-2 border-0 bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                      {lecturerBuckets.needsGrading.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="graded"
                  className="rounded-lg text-base font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  Graded
                  {lecturerBuckets.graded.length > 0 && (
                    <Badge className="ml-2 border-0 bg-green-100 text-green-700 hover:bg-green-200">
                      {lecturerBuckets.graded.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="all"
                  className="rounded-lg text-base font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  All
                  {lecturerBuckets.all.length > 0 && (
                    <Badge className="ml-2 border-0 bg-muted text-foreground">
                      {lecturerBuckets.all.length}
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
                  {studentBuckets.upcoming.length > 0 && (
                    <Badge className="ml-2 border-0 bg-muted text-foreground">
                      {studentBuckets.upcoming.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="past-due"
                  className="rounded-lg text-base font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  Past Due
                  {studentBuckets.pastDue.length > 0 && (
                    <Badge className="ml-2 border-0 bg-red-100 text-red-700 hover:bg-red-200">
                      {studentBuckets.pastDue.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="rounded-lg text-base font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  Completed
                  {studentBuckets.completed.length > 0 && (
                    <Badge className="ml-2 border-0 bg-green-100 text-green-700 hover:bg-green-200">
                      {studentBuckets.completed.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {isLecturer ? (
            <>
              <TabsContent value="needs-grading" className="space-y-4">
                {lecturerBuckets.needsGrading.length === 0 ? (
                  <AssignmentEmptyState
                    icon={<AlertCircle className="h-10 w-10 text-yellow-500" />}
                    title="No ungraded submissions"
                    description="You're all caught up."
                  />
                ) : (
                  lecturerBuckets.needsGrading.map(item => (
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
                {lecturerBuckets.graded.length === 0 ? (
                  <AssignmentEmptyState
                    icon={<CheckCircle className="h-10 w-10 text-green-500" />}
                    title="No graded assignments yet"
                    description="Once graded, they'll appear here."
                  />
                ) : (
                  lecturerBuckets.graded.map(item => (
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
                {lecturerBuckets.all.length === 0 ? (
                  <AssignmentEmptyState
                    icon={<FileText className="h-10 w-10 text-muted-foreground" />}
                    title="No assignments created"
                    description="Create assignments in your course page."
                  />
                ) : (
                  lecturerBuckets.all.map(item => (
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
                {studentBuckets.upcoming.length === 0 ? (
                  <AssignmentEmptyState
                    icon={<CheckCircle className="h-10 w-10 text-blue-500" />}
                    title="All caught up!"
                    description="No upcoming assignments."
                  />
                ) : (
                  studentBuckets.upcoming.map(item => (
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
                {studentBuckets.pastDue.length === 0 ? (
                  <AssignmentEmptyState
                    icon={<Clock className="h-10 w-10 text-green-500" />}
                    title="No overdue work"
                    description="You're doing great!"
                  />
                ) : (
                  studentBuckets.pastDue.map(item => (
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
                {studentBuckets.completed.length === 0 ? (
                  <AssignmentEmptyState
                    icon={<FileText className="h-10 w-10 text-muted-foreground" />}
                    title="No completed work"
                    description="Submitted assignments appear here."
                  />
                ) : (
                  studentBuckets.completed.map(item => (
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
