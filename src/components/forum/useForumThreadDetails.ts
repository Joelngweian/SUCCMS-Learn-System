import { useState } from "react";
import {
  getChildReplyPage,
  getForumThreadDetail,
  getReplyChildCounts,
  getRootCommentPage,
  getThreadReplyCount,
} from "@/data/forumRepository";
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

    const childCounts = await getReplyChildCounts(
      replies.map((reply) => reply.id),
    );

    return replies.map((reply) =>
      normalizeForumReply(reply, childCounts[reply.id] || 0),
    );
  };

  const fetchRootCommentPage = async (threadId: string, start: number) => {
    const page = await getRootCommentPage({ start, threadId });

    return {
      replies: await attachChildMetadata(
        page.rows.slice(0, ROOT_COMMENT_PAGE_SIZE),
      ),
      rootCount: page.rootCount,
    };
  };

  const fetchThreadDetails = async (threadId: string) => {
    try {
      const [threadResult, totalReplyResult, rootPage] = await Promise.all([
        getForumThreadDetail(threadId),
        getThreadReplyCount(threadId),
        fetchRootCommentPage(threadId, 0),
      ]);

      const thread = normalizeForumThread(threadResult);
      setExpandedReplyIds({});
      setLoadingReplyBranches({});
      setHasMoreRootComments(rootPage.replies.length < rootPage.rootCount);
      setSelectedThread({
        ...thread,
        structuredReplies: rootPage.replies,
        replyCount: totalReplyResult,
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
      const page = await getChildReplyPage({
        parentId,
        start,
        threadId: selectedThread.id,
      });
      const replies = await attachChildMetadata(
        page.rows.slice(0, CHILD_REPLY_PAGE_SIZE),
      );
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
              const childCount = page.childCount;

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
