import type { Dispatch, SetStateAction } from "react";
import { Loader2, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudyGroupCard } from "./StudyGroupCard";
import type {
  EnrolledCourse,
  StudyGroupSummary,
} from "./StudyGroupTypes";

type StudyGroupsBrowserProps = {
  activeView: "all" | "joined";
  courses: EnrolledCourse[];
  courseFilter: string;
  cursor: { createdAt: string; id: string } | null;
  groups: StudyGroupSummary[];
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadError: string;
  search: string;
  setActiveView: Dispatch<SetStateAction<"all" | "joined">>;
  setCourseFilter: Dispatch<SetStateAction<string>>;
  setSearch: Dispatch<SetStateAction<string>>;
  onCreate: () => void;
  onLoadMore: (
    cursor: { createdAt: string; id: string } | null,
  ) => void;
  onOpen: (group: StudyGroupSummary) => void;
  formatDateTime: (value: string) => string;
};

export function StudyGroupsBrowser({
  activeView,
  courses,
  courseFilter,
  cursor,
  groups,
  hasMore,
  isLoading,
  isLoadingMore,
  loadError,
  search,
  setActiveView,
  setCourseFilter,
  setSearch,
  onCreate,
  onLoadMore,
  onOpen,
  formatDateTime,
}: StudyGroupsBrowserProps) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Study Groups</h1>
          <p className="text-muted-foreground">
            Study with classmates, share resources and schedule focused sessions.
          </p>
        </div>
        <Button onClick={onCreate} disabled={courses.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          New Group
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search groups or courses..."
            className="pl-9"
          />
        </div>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="md:w-64">
            <SelectValue placeholder="All courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.code} - {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as "all" | "joined")}
      >
        <TabsList>
          <TabsTrigger value="all">Available Groups</TabsTrigger>
          <TabsTrigger value="joined">My Groups</TabsTrigger>
        </TabsList>
      </Tabs>

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <StudyGroupCard
              key={group.id}
              group={group}
              onOpen={onOpen}
              formatDateTime={formatDateTime}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
          <p className="font-medium">
            {activeView === "joined"
              ? "You have not joined a study group yet"
              : "No study groups found"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one for a course you are enrolled in.
          </p>
        </div>
      )}

      {hasMore && (
        <Button
          variant="outline"
          className="w-full"
          disabled={isLoadingMore}
          onClick={() => onLoadMore(cursor)}
        >
          {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Load More
        </Button>
      )}
    </>
  );
}
