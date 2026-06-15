import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCourseMemberIds,
  getUserCourseOfferings,
} from "@/data/courseRepository";
import { getMentionProfiles } from "@/data/profileRepository";
import { supabase } from "@/lib/supabase";
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
    const [threadResult, replyResult] = await Promise.all([
      supabase
        .from("forum_reactions")
        .select("thread_id, type")
        .eq("user_id", userId),
      supabase
        .from("forum_reply_reactions")
        .select("reply_id, type")
        .eq("user_id", userId),
    ]);

    if (!threadResult.error) {
      setUserReactions(
        Object.fromEntries(
          (threadResult.data || []).map(reaction => [
            reaction.thread_id,
            reaction.type,
          ]),
        ),
      );
    }
    if (!replyResult.error) {
      setReplyReactions(
        Object.fromEntries(
          (replyResult.data || []).map(reaction => [
            reaction.reply_id,
            reaction.type,
          ]),
        ),
      );
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

      const start = reset ? 0 : threadsRef.current.length;
      let query = supabase
        .from("forum_threads")
        .select(`
          *,
          author:user_profiles!author_id(id, full_name, avatar_url, role),
          replies:forum_replies(count),
          reactions:forum_reactions(type)
        `)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(start, start + THREAD_PAGE_SIZE);

      if (selectedFilter === "general") {
        query = query.is("course_id", null);
      } else if (selectedFilter !== "all") {
        query = query.eq("course_id", selectedFilter);
      } else if (courses.length > 0) {
        query = query.or(
          `course_id.in.(${courses.map(course => course.id).join(",")}),course_id.is.null`,
        );
      } else {
        query = query.is("course_id", null);
      }

      const normalizedSearch = debouncedSearchQuery
        .replace(/[,%_()]/g, " ")
        .trim();
      if (normalizedSearch) {
        query = query.or(
          `title.ilike.%${normalizedSearch}%,content.ilike.%${normalizedSearch}%,category.ilike.%${normalizedSearch}%`,
        );
      }

      const { data, error } = await query;
      if (requestId !== requestIdRef.current) return;

      if (error) {
        console.error("Error fetching forum threads:", error);
        if (reset) {
          threadsRef.current = [];
          setThreads([]);
        }
        hasMoreRef.current = false;
        setHasMoreThreads(false);
      } else {
        const rows = data || [];
        const page = rows
          .slice(0, THREAD_PAGE_SIZE)
          .map(normalizeForumThread);
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
                    !current.some(currentThread => currentThread.id === thread.id),
                ),
              ];
          threadsRef.current = next;
          return next;
        });
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
