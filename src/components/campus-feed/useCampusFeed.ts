import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { confirmAction } from "@/lib/confirm";
import { getNotifyMessage, notify } from "@/lib/notify";
import { subscribeToPrivateBroadcast } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";
import {
  normalizeCampusPostAttachments,
  type CampusPost,
  type CampusPostAttachment,
  type SelectedCampusMedia,
} from "./campusFeedTypes";
import {
  CAMPUS_POST_PAGE_SIZE,
  normalizeCampusPost,
  signCampusPostMedia,
  type CampusPostCursor,
  type CampusPostPageRow,
} from "./campusFeedData";
import {
  MAX_CAMPUS_POST_MEDIA_BYTES,
  MAX_CAMPUS_POST_MEDIA_FILES,
} from "./campusFeedLimits";
import {
  removeCampusPostFiles,
  uploadCampusPostMedia,
} from "./campusFeedStorage";
import { useCampusComments } from "./useCampusComments";

export function useCampusFeed() {
  const { profile, user } = useAuth();
  const userId = user?.id;
  const [posts, setPosts] = useState<CampusPost[]>([]);
  const [draftContent, setDraftContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<SelectedCampusMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingPostIds, setUpdatingPostIds] =
    useState<Set<string>>(new Set());
  const [feedError, setFeedError] = useState("");
  const [composerError, setComposerError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const nextCursorRef = useRef<CampusPostCursor | null>(null);
  const previewUrlsRef = useRef(new Set<string>());
  const {
    addComment,
    commentsByPost,
    deleteComment,
    deletingCommentIds,
    loadComments,
    loadingCommentPostIds,
    updateComment,
    updatingCommentIds,
  } = useCampusComments({ profile, setPosts, userId });

  const releaseSelectedMedia = useCallback(() => {
    previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
    setSelectedMedia([]);
  }, []);

  const fetchPosts = useCallback(async (
    cursor: CampusPostCursor | null = null,
    append = false,
  ) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setFeedError("");
    }

    try {
      const { data, error } = await supabase.rpc("get_campus_posts_page", {
        p_before_created_at: cursor?.createdAt || null,
        p_before_id: cursor?.id || null,
        p_limit: CAMPUS_POST_PAGE_SIZE + 1,
      });
      if (error) throw error;

      const rows = (data || []) as CampusPostPageRow[];
      const pageRows = rows.slice(0, CAMPUS_POST_PAGE_SIZE);
      const page = await signCampusPostMedia(
        pageRows.map(normalizeCampusPost),
      );
      const lastRow = pageRows.at(-1);

      nextCursorRef.current = lastRow
        ? { createdAt: lastRow.created_at, id: lastRow.id }
        : null;
      setHasMore(rows.length > CAMPUS_POST_PAGE_SIZE);
      setPosts(current => {
        if (!append) return page;
        const existingIds = new Set(current.map(post => post.id));
        return [
          ...current,
          ...page.filter(post => !existingIds.has(post.id)),
        ];
      });
    } catch (error) {
      console.error("Failed to load campus posts:", error);
      setFeedError(
        getNotifyMessage(
          error,
          "Campus posts could not be loaded. Confirm that the campus feed migration has been installed.",
        ),
      );
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void fetchPosts();
    const previewUrls = previewUrlsRef.current;

    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      previewUrls.clear();
    };
  }, [fetchPosts]);

  useEffect(() => {
    if (!userId) return;

    return subscribeToPrivateBroadcast({
      topic: "campus:feed",
      onMessage: message => {
        if (!message || typeof message !== "object") return;
        const payload = (message as { payload?: unknown }).payload;
        if (!payload || typeof payload !== "object") return;

        const change = payload as {
          author_id?: unknown;
          post_id?: unknown;
          type?: unknown;
        };
        const postId =
          typeof change.post_id === "string" ? change.post_id : null;
        const authorId =
          typeof change.author_id === "string" ? change.author_id : null;
        const type =
          typeof change.type === "string"
            ? change.type.toUpperCase()
            : "";

        if (type === "DELETE" && postId) {
          setPosts(current => current.filter(post => post.id !== postId));
          return;
        }

        if (authorId !== userId) setNewPostsAvailable(true);
      },
    });
  }, [userId]);

  const refreshPosts = useCallback(async () => {
    nextCursorRef.current = null;
    setNewPostsAvailable(false);
    await fetchPosts();
  }, [fetchPosts]);

  const loadMorePosts = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursorRef.current) return;
    await fetchPosts(nextCursorRef.current, true);
  }, [fetchPosts, hasMore, isLoadingMore]);

  const selectMedia = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    setComposerError("");
    const remainingSlots =
      MAX_CAMPUS_POST_MEDIA_FILES - selectedMedia.length;
    if (remainingSlots <= 0) {
      setComposerError(
        `You can attach up to ${MAX_CAMPUS_POST_MEDIA_FILES} images.`,
      );
      return;
    }

    const accepted: SelectedCampusMedia[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      if (!file.type.startsWith("image/")) {
        setComposerError("Campus posts currently support image attachments only.");
        continue;
      }
      if (file.size > MAX_CAMPUS_POST_MEDIA_BYTES) {
        setComposerError(`${file.name} is larger than 10 MB.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl,
      });
    }

    setSelectedMedia(current => [...current, ...accepted]);
  };

  const removeSelectedMedia = (mediaId: string) => {
    setSelectedMedia(current => current.filter(media => {
      if (media.id !== mediaId) return true;
      URL.revokeObjectURL(media.previewUrl);
      previewUrlsRef.current.delete(media.previewUrl);
      return false;
    }));
  };

  const createPost = async () => {
    if (
      !userId
      || !profile
      || isCreating
      || (!draftContent.trim() && selectedMedia.length === 0)
    ) return;

    setIsCreating(true);
    setComposerError("");
    const uploadedPaths: string[] = [];

    try {
      const attachments: CampusPostAttachment[] = [];
      for (const media of selectedMedia) {
        const attachment = await uploadCampusPostMedia(userId, media);
        uploadedPaths.push(attachment.path);
        attachments.push(attachment);
      }

      const { data, error } = await supabase
        .from("campus_posts")
        .insert({
          author_id: userId,
          content: draftContent.trim(),
          attachments,
        })
        .select("id, author_id, content, attachments, created_at, updated_at")
        .single();
      if (error) throw error;

      const [createdPost] = await signCampusPostMedia([{
        id: data.id,
        authorId: data.author_id,
        authorName: profile.full_name || "Campus member",
        authorAvatarUrl: profile.avatar_url || null,
        authorRole: profile.role,
        content: data.content,
        attachments: normalizeCampusPostAttachments(data.attachments),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        reactionCount: 0,
        commentCount: 0,
        viewerReaction: null,
      }]);

      setPosts(current => [
        createdPost,
        ...current.filter(post => post.id !== createdPost.id),
      ]);
      setDraftContent("");
      releaseSelectedMedia();
      notify.success("Your campus post is live.");
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await removeCampusPostFiles(uploadedPaths);
      }
      setComposerError(
        getNotifyMessage(
          error,
          "The post could not be published. Please try again.",
        ),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const deletePost = async (post: CampusPost) => {
    if (
      !(await confirmAction({
        title: "Delete campus post?",
        description:
          "This post, its reactions, comments, and uploaded media will be permanently deleted.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) return;

    const { data: commentRows, error: commentMediaError } = await supabase
      .from("campus_post_comments")
      .select("attachments")
      .eq("post_id", post.id);
    if (commentMediaError) {
      notify.error(
        commentMediaError,
        "The post could not be prepared for deletion.",
      );
      return;
    }

    const { error } = await supabase
      .from("campus_posts")
      .delete()
      .eq("id", post.id);
    if (error) {
      notify.error(error, "The campus post could not be deleted.");
      return;
    }

    setPosts(current => current.filter(item => item.id !== post.id));
    const paths = [
      ...post.attachments.map(attachment => attachment.path),
      ...(commentRows || []).flatMap(row =>
        normalizeCampusPostAttachments(row.attachments)
          .map(attachment => attachment.path)
      ),
    ];
    if (paths.length > 0) {
      const { error: storageError } = await removeCampusPostFiles(paths);
      if (storageError) {
        notify.warning("Post deleted, but some image files need administrator cleanup.");
      }
    }
  };

  const updatePost = async (
    post: CampusPost,
    content: string,
    retainedAttachments: CampusPostAttachment[],
    newMedia: SelectedCampusMedia[],
  ) => {
    if (!userId || post.authorId !== userId) return false;

    const trimmedContent = content.trim();
    if (
      retainedAttachments.length + newMedia.length
      > MAX_CAMPUS_POST_MEDIA_FILES
    ) {
      notify.warning(
        `You can attach up to ${MAX_CAMPUS_POST_MEDIA_FILES} images.`,
      );
      return false;
    }
    if (!trimmedContent && retainedAttachments.length + newMedia.length === 0) {
      notify.warning("A post needs text or at least one image.");
      return false;
    }

    setUpdatingPostIds(current => new Set(current).add(post.id));
    const uploadedPaths: string[] = [];
    try {
      const attachments: CampusPostAttachment[] = retainedAttachments.map(
        attachment => ({
          name: attachment.name,
          path: attachment.path,
          size: attachment.size,
          type: attachment.type,
        }),
      );

      for (const media of newMedia) {
        const attachment = await uploadCampusPostMedia(userId, media);
        uploadedPaths.push(attachment.path);
        attachments.push(attachment);
      }

      const [signedPost] = await signCampusPostMedia([{
        ...post,
        content: trimmedContent,
        attachments,
      }]);
      const { data, error } = await supabase
        .from("campus_posts")
        .update({
          content: trimmedContent,
          attachments,
        })
        .eq("id", post.id)
        .eq("author_id", userId)
        .select("content, attachments, updated_at")
        .single();
      if (error) throw error;

      setPosts(current => current.map(item =>
        item.id === post.id
          ? {
              ...item,
              content: data.content,
              attachments: signedPost.attachments,
              updatedAt: data.updated_at,
            }
          : item
      ));

      const retainedPaths = new Set(
        retainedAttachments.map(attachment => attachment.path),
      );
      const removedPaths = post.attachments
        .filter(attachment => !retainedPaths.has(attachment.path))
        .map(attachment => attachment.path);
      if (removedPaths.length > 0) {
        const { error: storageError } = await removeCampusPostFiles(removedPaths);
        if (storageError) {
          notify.warning(
            "Post updated, but some removed images need administrator cleanup.",
          );
        }
      }

      notify.success("Post updated.");
      return true;
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await removeCampusPostFiles(uploadedPaths);
      }
      notify.error(error, "The campus post could not be updated.");
      return false;
    } finally {
      setUpdatingPostIds(current => {
        const next = new Set(current);
        next.delete(post.id);
        return next;
      });
    }
  };

  const toggleReaction = async (post: CampusPost) => {
    if (!userId) return;

    const wasReacted = post.viewerReaction !== null;
    setPosts(current => current.map(item =>
      item.id === post.id
        ? {
            ...item,
            reactionCount: Math.max(
              0,
              item.reactionCount + (wasReacted ? -1 : 1),
            ),
            viewerReaction: wasReacted ? null : "like",
          }
        : item
    ));

    const result = wasReacted
      ? await supabase
          .from("campus_post_reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", userId)
      : await supabase
          .from("campus_post_reactions")
          .upsert({
            post_id: post.id,
            user_id: userId,
            reaction: "like",
          });

    if (result.error) {
      setPosts(current => current.map(item =>
        item.id === post.id ? post : item
      ));
      notify.error(result.error, "Your reaction could not be saved.");
    }
  };

  return {
    addComment,
    commentsByPost,
    composerError,
    createPost,
    deleteComment,
    deletePost,
    deletingCommentIds,
    draftContent,
    feedError,
    hasMore,
    isCreating,
    isLoading,
    isLoadingMore,
    loadComments,
    loadMorePosts,
    loadingCommentPostIds,
    newPostsAvailable,
    posts,
    refreshPosts,
    removeSelectedMedia,
    selectMedia,
    selectedMedia,
    setDraftContent,
    toggleReaction,
    updateComment,
    updatePost,
    updatingCommentIds,
    updatingPostIds,
  };
}
