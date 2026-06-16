import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCourseMemberIds,
  getUserCourseOfferings,
} from "@/data/courseRepository";
import {
  getForumThreadsPage,
  getUserForumReactions,
} from "@/data/forumRepository";
import { getMentionProfiles } from "@/data/profileRepository";
import {
  normalizeForumThread,
  type ForumCourse,
  type ForumMentionMember,
  type ForumThread,
} from "./forumTypes";

const THREAD_PAGE_SIZE = 12;

export function useForumFeed({
  profileRole,
  userId,
}: {
  profileRole?: string | null;
  userId?: string | null;
}) {
  const [courses, setCourses] = useState<ForumCourse[]>([]);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [userReactions, setUserReactions] = useState<Record<string, string>>(
    {},
  );
  const [replyReactions, setReplyReactions] = useState<
    Record<string, string>
  >({});
  const [mentionMembers, setMentionMembers] = useState<
    ForumMentionMember[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [hasMoreThreads, setHasMoreThreads] = useState(false);
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const requestIdRef = useRef(0);
  const threadsRef = useRef<ForumThread[]>([]);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const fetchCourses = useCallback(async () => {
    if (!userId) return;
    try {
      setCourses(await getUserCourseOfferings(userId, profileRole));
    } catch (error) {
      console.error("Failed to load forum courses:", error);
      setCourses([]);
    }
  }, [profileRole, userId]);

  const fetchMentionMembers = useCallback(async (courseId: string | null) => {
    try {
      if (!courseId) {
        setMentionMembers(await getMentionProfiles());
        return;
      }

      const { instructorIds, studentIds } =
        await getCourseMemberIds(courseId);
      const memberIds = [...studentIds, ...instructorIds];
      if (memberIds.length === 0) {
        setMentionMembers([]);
        return;
      }

      setMentionMembers(await getMentionProfiles(memberIds));
    } catch (error) {
      console.error("Error fetching mention members:", error);
      setMentionMembers([]);
    }
  }, []);

  const fetchUserReactions = useCallback(async () => {
    if (!userId) return;
    try {
      const reactions = await getUserForumReactions(userId);
      setUserReactions(reactions.threadReactions);
      setReplyReactions(reactions.replyReactions);
    } catch (error) {
      console.error("Failed to load forum reactions:", error);
    }
  }, [userId]);

  const fetchThreads = useCallback(
    async (reset = true) => {
      if (!reset && (loadingMoreRef.current || !hasMoreRef.current)) return;
      const requestId = ++requestIdRef.current;

      if (reset) {
        setLoading(true);
        setLoadingMoreThreads(false);
        loadingMoreRef.current = false;
      } else {
        setLoadingMoreThreads(true);
        loadingMoreRef.current = true;
      }

      try {
        const rows = await getForumThreadsPage({
          courseIds: courses.map(course => course.id),
          filter: selectedFilter,
          search: debouncedSearchQuery,
          start: reset ? 0 : threadsRef.current.length,
        });
        if (requestId !== requestIdRef.current) return;

        const page = rows.slice(0, THREAD_PAGE_SIZE).map(normalizeForumThread);
        const hasMore = rows.length > THREAD_PAGE_SIZE;
        hasMoreRef.current = hasMore;
        setHasMoreThreads(hasMore);
        setThreads(current => {
          const next = reset
            ? page
            : [
                ...current,
                ...page.filter(
                  thread =>
                    !current.some(
                      currentThread => currentThread.id === thread.id,
                    ),
                ),
              ];
          threadsRef.current = next;
          return next;
        });
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        console.error("Error fetching forum threads:", error);
        if (reset) {
          threadsRef.current = [];
          setThreads([]);
        }
        hasMoreRef.current = false;
        setHasMoreThreads(false);
      }

      if (reset) setLoading(false);
      else {
        loadingMoreRef.current = false;
        setLoadingMoreThreads(false);
      }
    },
    [courses, debouncedSearchQuery, selectedFilter],
  );

  useEffect(() => {
    if (!userId) return;
    void fetchCourses();
    void fetchUserReactions();
  }, [fetchCourses, fetchUserReactions, userId]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearchQuery(searchQuery.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (userId) void fetchThreads(true);
  }, [fetchThreads, userId]);

  return {
    courses,
    fetchMentionMembers,
    fetchThreads,
    hasMoreThreads,
    loading,
    loadingMoreThreads,
    mentionMembers,
    replyReactions,
    searchQuery,
    selectedFilter,
    setMentionMembers,
    setReplyReactions,
    setSearchQuery,
    setSelectedFilter,
    setThreads,
    setUserReactions,
    threads,
    userReactions,
  };
}
