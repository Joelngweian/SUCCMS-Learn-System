import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { notify } from "@/lib/notify";
import { findReplyNode, updateReplyTreeNode } from "./forumTree";
import {
  normalizeForumReply,
  normalizeForumThread,
  type ForumReply,
  type ForumThreadDetail,
} from "./forumTypes";

const ROOT_COMMENT_PAGE_SIZE = 10;
const CHILD_REPLY_PAGE_SIZE = 5;
export const FORUM_REPLY_SELECT = `
  *,
  author:user_profiles!author_id(id, full_name, avatar_url, role),
  reactions:forum_reply_reactions(type)
`;

export function useForumThreadDetails() {
  const [selectedThread, setSelectedThread] =
    useState<ForumThreadDetail | null>(null);
  const [hasMoreRootComments, setHasMoreRootComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [expandedReplyIds, setExpandedReplyIds] = useState<Record<string, boolean>>({});
  const [loadingReplyBranches, setLoadingReplyBranches] =
    useState<Record<string, boolean>>({});

  const attachChildMetadata = async (
    replies: Array<Omit<
      ForumReply,
      "children" | "childCount" | "childrenLoaded" | "hasMoreChildren"
    >> = [],
  ) => {
    if (replies.length === 0) return [];

    const replyIds = replies.map((reply) => reply.id);
    const { data: childRows, error } = await supabase
      .from("forum_replies")
      .select("parent_id")
      .in("parent_id", replyIds);

    if (error) throw error;

    const childCounts: Record<string, number> = {};
    (childRows || []).forEach((row) => {
      if (row.parent_id) {
        childCounts[row.parent_id] = (childCounts[row.parent_id] || 0) + 1;
      }
    });

    return replies.map((reply) =>
      normalizeForumReply(reply, childCounts[reply.id] || 0),
    );
  };

  const fetchRootCommentPage = async (threadId: string, start: number) => {
    const { data, error, count } = await supabase
      .from("forum_replies")
      .select(FORUM_REPLY_SELECT, { count: "exact" })
      .eq("thread_id", threadId)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .range(start, start + ROOT_COMMENT_PAGE_SIZE - 1);

    if (error) throw error;

    return {
      replies: await attachChildMetadata(data || []),
      rootCount: count || 0,
    };
  };

  const fetchThreadDetails = async (threadId: string) => {
    try {
      const [threadResult, totalReplyResult, rootPage] = await Promise.all([
        supabase
          .from("forum_threads")
          .select("*, author:user_profiles!author_id(id, full_name, avatar_url, role)")
          .eq("id", threadId)
          .single(),
        supabase
          .from("forum_replies")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", threadId),
        fetchRootCommentPage(threadId, 0),
      ]);

      if (threadResult.error) throw threadResult.error;
      if (totalReplyResult.error) throw totalReplyResult.error;

      const thread = normalizeForumThread(threadResult.data);
      setExpandedReplyIds({});
      setLoadingReplyBranches({});
      setHasMoreRootComments(rootPage.replies.length < rootPage.rootCount);
      setSelectedThread({
        ...thread,
        structuredReplies: rootPage.replies,
        replyCount: totalReplyResult.count || 0,
        rootReplyCount: rootPage.rootCount,
      });
    } catch (error) {
      notify.error(error, "Discussion details could not be loaded.");
      setSelectedThread(null);
    }
  };

  const loadMoreComments = async () => {
    if (!selectedThread || loadingMoreComments || !hasMoreRootComments) return;
    setLoadingMoreComments(true);

    try {
      const existingRoots = selectedThread.structuredReplies || [];
      const page = await fetchRootCommentPage(
        selectedThread.id,
        existingRoots.length,
      );
      const existingIds = new Set(existingRoots.map((reply) => reply.id));
      const newReplies = page.replies.filter(
        (reply) => !existingIds.has(reply.id),
      );
      const nextRoots = [...existingRoots, ...newReplies];

      setSelectedThread((current) => current ? {
        ...current,
        structuredReplies: nextRoots,
        rootReplyCount: page.rootCount,
      } : current);
      setHasMoreRootComments(nextRoots.length < page.rootCount);
    } catch (error) {
      notify.error(error, "More comments could not be loaded.");
    } finally {
      setLoadingMoreComments(false);
    }
  };

  const loadChildReplies = async (parentId: string, append = false) => {
    if (!selectedThread || loadingReplyBranches[parentId]) return;

    const parent = findReplyNode(
      selectedThread.structuredReplies || [],
      parentId,
    );
    if (!parent) return;

    const start = append ? (parent.children || []).length : 0;
    setLoadingReplyBranches((current) => ({ ...current, [parentId]: true }));

    try {
      const { data, error, count } = await supabase
        .from("forum_replies")
        .select(FORUM_REPLY_SELECT, { count: "exact" })
        .eq("thread_id", selectedThread.id)
        .eq("parent_id", parentId)
        .order("created_at", { ascending: false })
        .range(start, start + CHILD_REPLY_PAGE_SIZE - 1);

      if (error) throw error;

      const replies = await attachChildMetadata(data || []);
      setSelectedThread((current) => {
        if (!current) return current;

        return {
          ...current,
          structuredReplies: updateReplyTreeNode(
            current.structuredReplies || [],
            parentId,
            (node) => {
              const existingChildren = append ? (node.children || []) : [];
              const existingIds = new Set(
                existingChildren.map((child) => child.id),
              );
              const newChildren = replies.filter(
                (child) => !existingIds.has(child.id),
              );
              const nextChildren = [...existingChildren, ...newChildren];
              const childCount = count || 0;

              return {
                ...node,
                children: nextChildren,
                childCount,
                childrenLoaded: true,
                hasMoreChildren: nextChildren.length < childCount,
              };
            },
          ),
        };
      });
      setExpandedReplyIds((current) => ({ ...current, [parentId]: true }));
    } catch (error) {
      notify.error(error, "Replies could not be loaded.");
    } finally {
      setLoadingReplyBranches((current) => ({
        ...current,
        [parentId]: false,
      }));
    }
  };

  const toggleReplies = (comment: ForumReply) => {
    if (expandedReplyIds[comment.id]) {
      setExpandedReplyIds((current) => ({
        ...current,
        [comment.id]: false,
      }));
      return;
    }

    if (comment.childrenLoaded) {
      setExpandedReplyIds((current) => ({
        ...current,
        [comment.id]: true,
      }));
      return;
    }

    void loadChildReplies(comment.id);
  };

  return {
    expandedReplyIds,
    fetchThreadDetails,
    hasMoreRootComments,
    loadChildReplies,
    loadMoreComments,
    loadingMoreComments,
    loadingReplyBranches,
    selectedThread,
    setExpandedReplyIds,
    setHasMoreRootComments,
    setLoadingReplyBranches,
    setSelectedThread,
    toggleReplies,
  };
}
