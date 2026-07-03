import { useCallback, useEffect, useMemo, useState } from "react";
import { getNotifyMessage } from "@/lib/notify";
import {
  loadEnrolledStudyGroupCourses,
  loadStudyGroupPage,
} from "./studyGroupData";
import type {
  EnrolledCourse,
  StudyGroupSummary,
} from "./StudyGroupTypes";

const GROUP_PAGE_SIZE = 12;

export const useStudyGroupsBrowserState = (userId?: string) => {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [groups, setGroups] = useState<StudyGroupSummary[]>([]);
  const [activeView, setActiveView] = useState<"all" | "joined">("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<{
    createdAt: string;
    id: string;
  } | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const joinedGroups = useMemo(
    () => groups.filter((group) => group.is_member),
    [groups],
  );
  const visibleGroups = activeView === "joined" ? joinedGroups : groups;

  const loadCourses = useCallback(async () => {
    if (!userId) return;
    setCourses(await loadEnrolledStudyGroupCourses(userId));
  }, [userId]);

  const loadGroups = useCallback(async (
    before: { createdAt: string; id: string } | null,
    append: boolean,
  ) => {
    if (append) setIsLoadingMore(true);
    else {
      setIsLoading(true);
      setLoadError("");
    }

    try {
      const result = await loadStudyGroupPage({
        before,
        courseFilter,
        joinedOnly: activeView === "joined",
        limit: GROUP_PAGE_SIZE,
        search,
      });
      const page = result.page;
      const lastRow = page[page.length - 1];

      setGroups((current) => (append ? [...current, ...page] : page));
      setHasMore(result.hasMore);
      setCursor(
        lastRow
          ? { createdAt: lastRow.created_at, id: lastRow.id }
          : before,
      );
    } catch (error: unknown) {
      console.error("Failed to load study groups:", error);
      setLoadError(
        getNotifyMessage(
          error,
          "Study groups could not be loaded. Run the study groups migration first.",
        ),
      );
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [activeView, courseFilter, search]);

  useEffect(() => {
    if (!userId) return;

    void loadCourses().catch((error) => {
      console.error("Failed to load enrolled courses:", error);
    });
  }, [loadCourses, userId]);

  useEffect(() => {
    if (!userId) return;
    const timeout = window.setTimeout(() => {
      void loadGroups(null, false);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadGroups, userId]);

  const refreshGroups = async () => {
    await loadGroups(null, false);
  };

  return {
    activeView,
    courseFilter,
    courses,
    cursor,
    groups,
    hasMore,
    isLoading,
    isLoadingMore,
    loadError,
    loadGroups,
    refreshGroups,
    search,
    setActiveView,
    setCourseFilter,
    setGroups,
    setSearch,
    visibleGroups,
  };
};
