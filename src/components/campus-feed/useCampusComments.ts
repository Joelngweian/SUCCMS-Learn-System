import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type { UserProfile } from "@/contexts/AuthContext";
import { confirmAction } from "@/lib/confirm";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import {
  normalizeCampusPostAttachments,
  type CampusPost,
  type CampusPostAttachment,
  type CampusPostComment,
  type SelectedCampusMedia,
} from "./campusFeedTypes";
import {
  signCampusCommentMedia,
  type CampusCommentRow,
} from "./campusFeedData";
import { MAX_CAMPUS_COMMENT_MEDIA_FILES } from "./campusFeedLimits";
import {
  removeCampusPostFiles,
  uploadCampusCommentMedia,
} from "./campusFeedStorage";

type UseCampusCommentsArgs = {
  profile: UserProfile | null;
  setPosts: Dispatch<SetStateAction<CampusPost[]>>;
  userId?: string;
};

export const useCampusComments = ({
  profile,
  setPosts,
  userId,
}: UseCampusCommentsArgs) => {
  const [commentsByPost, setCommentsByPost] =
    useState<Record<string, CampusPostComment[]>>({});
  const [loadedCommentPostIds, setLoadedCommentPostIds] =
    useState<Set<string>>(new Set());
  const [loadingCommentPostIds, setLoadingCommentPostIds] =
    useState<Set<string>>(new Set());
  const [updatingCommentIds, setUpdatingCommentIds] =
    useState<Set<string>>(new Set());
  const [deletingCommentIds, setDeletingCommentIds] =
    useState<Set<string>>(new Set());

  const loadComments = useCallback(async (postId: string) => {
    if (
      loadedCommentPostIds.has(postId)
      || loadingCommentPostIds.has(postId)
    ) return;

    setLoadingCommentPostIds(current => new Set(current).add(postId));
    try {
      const { data, error } = await supabase
        .from("campus_post_comments")
        .select(
          "id, post_id, author_id, content, attachments, created_at, updated_at",
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(30);
      if (error) throw error;

      const rows = (data || []) as CampusCommentRow[];
      const authorIds = Array.from(new Set(rows.map(row => row.author_id)));
      const profileById = new Map<string, {
        full_name: string;
        avatar_url: string | null;
        role: string;
      }>();

      if (authorIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("user_profiles")
          .select("id, full_name, avatar_url, role")
          .in("id", authorIds);
        if (profileError) throw profileError;
        (profiles || []).forEach(author =>
          profileById.set(author.id, author)
        );
      }

      const comments = await signCampusCommentMedia(rows.map(row => {
        const author = profileById.get(row.author_id);
        return {
          id: row.id,
          postId: row.post_id,
          authorId: row.author_id,
          authorName: author?.full_name || "Campus member",
          authorAvatarUrl: author?.avatar_url || null,
          authorRole: author?.role || "student",
          content: row.content,
          attachments: normalizeCampusPostAttachments(row.attachments),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }));

      setCommentsByPost(current => ({
        ...current,
        [postId]: comments,
      }));
      setLoadedCommentPostIds(current => new Set(current).add(postId));
    } catch (error) {
      notify.error(error, "Comments could not be loaded.");
    } finally {
      setLoadingCommentPostIds(current => {
        const next = new Set(current);
        next.delete(postId);
        return next;
      });
    }
  }, [loadedCommentPostIds, loadingCommentPostIds]);

  const addComment = async (
    postId: string,
    content: string,
    media: SelectedCampusMedia | null,
  ) => {
    const trimmedContent = content.trim();
    if (!userId || !profile || (!trimmedContent && !media)) return false;

    let uploadedPath = "";
    try {
      const attachments: CampusPostAttachment[] = [];
      if (media) {
        const attachment = await uploadCampusCommentMedia(userId, postId, media);
        uploadedPath = attachment.path;
        attachments.push(attachment);
      }

      const { data, error } = await supabase
        .from("campus_post_comments")
        .insert({
          post_id: postId,
          author_id: userId,
          content: trimmedContent,
          attachments,
        })
        .select(
          "id, post_id, author_id, content, attachments, created_at, updated_at",
        )
        .single();
      if (error) throw error;

      const [comment] = await signCampusCommentMedia([{
        id: data.id,
        postId: data.post_id,
        authorId: data.author_id,
        authorName: profile.full_name || "Campus member",
        authorAvatarUrl: profile.avatar_url || null,
        authorRole: profile.role,
        content: data.content,
        attachments: normalizeCampusPostAttachments(data.attachments),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }]);
      setCommentsByPost(current => ({
        ...current,
        [postId]: [...(current[postId] || []), comment],
      }));
      setLoadedCommentPostIds(current => new Set(current).add(postId));
      setPosts(current => current.map(post =>
        post.id === postId
          ? { ...post, commentCount: post.commentCount + 1 }
          : post
      ));
      return true;
    } catch (error) {
      if (uploadedPath) {
        await removeCampusPostFiles([uploadedPath]);
      }
      notify.error(error, "Your comment could not be published.");
      return false;
    }
  };

  const updateComment = async (
    comment: CampusPostComment,
    content: string,
    retainedAttachments: CampusPostAttachment[],
    newMedia: SelectedCampusMedia | null,
  ) => {
    const trimmedContent = content.trim();
    if (
      retainedAttachments.length + (newMedia ? 1 : 0)
      > MAX_CAMPUS_COMMENT_MEDIA_FILES
    ) {
      notify.warning(
        `A comment can include up to ${MAX_CAMPUS_COMMENT_MEDIA_FILES} image.`,
      );
      return false;
    }
    if (
      !userId
      || comment.authorId !== userId
      || (!trimmedContent && retainedAttachments.length === 0 && !newMedia)
      || updatingCommentIds.has(comment.id)
    ) return false;

    setUpdatingCommentIds(current => new Set(current).add(comment.id));
    let uploadedPath = "";
    try {
      const attachments = retainedAttachments.map(attachment => ({
        name: attachment.name,
        path: attachment.path,
        size: attachment.size,
        type: attachment.type,
      }));
      if (newMedia) {
        const attachment = await uploadCampusCommentMedia(
          userId,
          comment.postId,
          newMedia,
        );
        uploadedPath = attachment.path;
        attachments.push(attachment);
      }

      const { data, error } = await supabase
        .from("campus_post_comments")
        .update({ content: trimmedContent, attachments })
        .eq("id", comment.id)
        .eq("author_id", userId)
        .select("content, attachments, updated_at")
        .single();
      if (error) throw error;

      const [signedComment] = await signCampusCommentMedia([{
        ...comment,
        content: data.content,
        attachments: normalizeCampusPostAttachments(data.attachments),
        updatedAt: data.updated_at,
      }]);
      setCommentsByPost(current => ({
        ...current,
        [comment.postId]: (current[comment.postId] || []).map(item =>
          item.id === comment.id
            ? signedComment
            : item
        ),
      }));

      const retainedPaths = new Set(
        retainedAttachments.map(attachment => attachment.path),
      );
      const removedPaths = comment.attachments
        .filter(attachment => !retainedPaths.has(attachment.path))
        .map(attachment => attachment.path);
      if (removedPaths.length > 0) {
        const { error: storageError } = await removeCampusPostFiles(removedPaths);
        if (storageError) {
          notify.warning(
            "Comment updated, but the removed image needs administrator cleanup.",
          );
        }
      }

      notify.success("Comment updated.");
      return true;
    } catch (error) {
      if (uploadedPath) {
        await removeCampusPostFiles([uploadedPath]);
      }
      notify.error(error, "The comment could not be updated.");
      return false;
    } finally {
      setUpdatingCommentIds(current => {
        const next = new Set(current);
        next.delete(comment.id);
        return next;
      });
    }
  };

  const deleteComment = async (comment: CampusPostComment) => {
    if (
      deletingCommentIds.has(comment.id)
      || !(await confirmAction({
        title: "Delete comment?",
        description: "This comment will be permanently removed.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) return false;

    setDeletingCommentIds(current => new Set(current).add(comment.id));
    try {
      const { error } = await supabase
        .from("campus_post_comments")
        .delete()
        .eq("id", comment.id);
      if (error) throw error;

      const paths = comment.attachments.map(attachment => attachment.path);
      if (paths.length > 0) {
        const { error: storageError } = await removeCampusPostFiles(paths);
        if (storageError) {
          notify.warning(
            "Comment deleted, but its image needs administrator cleanup.",
          );
        }
      }

      setCommentsByPost(current => ({
        ...current,
        [comment.postId]: (current[comment.postId] || []).filter(
          item => item.id !== comment.id,
        ),
      }));
      setPosts(current => current.map(post =>
        post.id === comment.postId
          ? {
              ...post,
              commentCount: Math.max(0, post.commentCount - 1),
            }
          : post
      ));
      notify.success("Comment deleted.");
      return true;
    } catch (error) {
      notify.error(error, "The comment could not be deleted.");
      return false;
    } finally {
      setDeletingCommentIds(current => {
        const next = new Set(current);
        next.delete(comment.id);
        return next;
      });
    }
  };

  return {
    addComment,
    commentsByPost,
    deleteComment,
    deletingCommentIds,
    loadComments,
    loadingCommentPostIds,
    updateComment,
    updatingCommentIds,
  };
};
