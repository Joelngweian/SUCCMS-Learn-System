import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { confirmAction } from "@/lib/confirm";
import type { Database } from "@/lib/database.types";
import { getNotifyMessage, notify } from "@/lib/notify";
import { subscribeToPrivateBroadcast } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";
import {
  isStoredCampusAttachment,
  normalizeCampusPostAttachments,
  type CampusPost,
  type CampusPostAttachment,
  type CampusPostReaction,
  type SelectedCampusMedia,
} from "./campusFeedTypes";
import {
  CAMPUS_POST_PAGE_SIZE,
  signCampusPostMedia,
} from "./campusFeedData";
import {
  MAX_CAMPUS_POST_MEDIA_FILES,
  getCampusPostMediaError,
} from "./campusFeedLimits";
import {
  removeCampusPostFiles,
  uploadCampusPostMedia,
} from "./campusFeedStorage";
import { useCampusComments } from "./useCampusComments";

type CampusPostRow = Database["public"]["Tables"]["campus_posts"]["Row"];
type CampusPostReactionRow =
  Database["public"]["Tables"]["campus_post_reactions"]["Row"];
type CampusPostCommentRow =
  Database["public"]["Tables"]["campus_post_comments"]["Row"];
type CampusAuthorRow = Pick<
  Database["public"]["Tables"]["user_profiles"]["Row"],
  "avatar_url" | "full_name" | "id" | "is_active" | "role"
>;

const campusReactionValues = new Set<string>([
  "like",
  "love",
  "celebrate",
  "support",
]);

const toCampusReaction = (value: unknown): CampusPostReaction | null =>
  typeof value === "string" && campusReactionValues.has(value)
    ? value as CampusPostReaction
    : null;

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
  const nextOffsetRef = useRef(0);
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

  const fetchPosts = useCallback(async (append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setFeedError("");
    }

    try {
      const from = append ? nextOffsetRef.current : 0;
      const to = from + CAMPUS_POST_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("campus_posts")
        .select("id, author_id, content, attachments, created_at, updated_at", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      if (error) throw error;

      const rows = (data || []) as CampusPostRow[];
      const postIds = rows.map(row => row.id);
      const authorIds = Array.from(new Set(rows.map(row => row.author_id)));

      const [
        authorResult,
        reactionResult,
        commentResult,
      ] = await Promise.all([
        authorIds.length > 0
          ? supabase
              .from("user_profiles")
              .select("id, full_name, avatar_url, role, is_active")
              .in("id", authorIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length > 0
          ? supabase
              .from("campus_post_reactions")
              .select("post_id, user_id, reaction")
              .in("post_id", postIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length > 0
          ? supabase
              .from("campus_post_comments")
              .select("post_id")
              .in("post_id", postIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (authorResult.error) throw authorResult.error;
      if (reactionResult.error) throw reactionResult.error;
      if (commentResult.error) throw commentResult.error;

      const authorsById = new Map(
        ((authorResult.data || []) as CampusAuthorRow[]).map(author => [
          author.id,
          author,
        ]),
      );
      const reactions = (reactionResult.data || []) as CampusPostReactionRow[];
      const comments = (commentResult.data || []) as Pick<
        CampusPostCommentRow,
        "post_id"
      >[];
      const reactionCountByPostId = new Map<string, number>();
      const commentCountByPostId = new Map<string, number>();
      const viewerReactionByPostId = new Map<string, CampusPostReaction>();

      reactions.forEach(reaction => {
        reactionCountByPostId.set(
          reaction.post_id,
          (reactionCountByPostId.get(reaction.post_id) || 0) + 1,
        );
        if (reaction.user_id === userId) {
          const viewerReaction = toCampusReaction(reaction.reaction);
          if (viewerReaction) {
            viewerReactionByPostId.set(reaction.post_id, viewerReaction);
          }
        }
      });
      comments.forEach(comment => {
        commentCountByPostId.set(
          comment.post_id,
          (commentCountByPostId.get(comment.post_id) || 0) + 1,
        );
      });

      const page = await signCampusPostMedia(
        rows
          .map(row => {
            const author = authorsById.get(row.author_id);
            if (author?.is_active === false) return null;

            return {
              id: row.id,
              authorId: row.author_id,
              authorName: author?.full_name || "Campus member",
              authorAvatarUrl: author?.avatar_url || null,
              authorRole: author?.role || "student",
              content: row.content,
              attachments: normalizeCampusPostAttachments(row.attachments),
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              reactionCount: reactionCountByPostId.get(row.id) || 0,
              commentCount: commentCountByPostId.get(row.id) || 0,
              viewerReaction: viewerReactionByPostId.get(row.id) || null,
            } satisfies CampusPost;
          })
          .filter((post): post is CampusPost => post !== null),
      );

      const loadedCount = from + rows.length;
      nextOffsetRef.current = loadedCount;
      setHasMore(typeof count === "number"
        ? loadedCount < count
        : rows.length === CAMPUS_POST_PAGE_SIZE);
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
  }, [userId]);

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
    nextOffsetRef.current = 0;
    setNewPostsAvailable(false);
    await fetchPosts();
  }, [fetchPosts]);

  const loadMorePosts = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    await fetchPosts(true);
  }, [fetchPosts, hasMore, isLoadingMore]);

  const addSelectedMedia = (files: File[]) => {
    if (files.length === 0) return;

    setComposerError("");
    const remainingSlots =
      MAX_CAMPUS_POST_MEDIA_FILES - selectedMedia.length;
    if (remainingSlots <= 0) {
      setComposerError(
        `You can attach up to ${MAX_CAMPUS_POST_MEDIA_FILES} media files.`,
      );
      return;
    }

    const accepted: SelectedCampusMedia[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      const mediaError = getCampusPostMediaError(file);
      if (mediaError) {
        setComposerError(mediaError);
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

  const selectMedia = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    addSelectedMedia(files);
  };

  const selectDroppedMedia = (files: File[]) => {
    addSelectedMedia(files);
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
      ...post.attachments
        .filter(isStoredCampusAttachment)
        .map(attachment => attachment.path),
      ...(commentRows || []).flatMap(row =>
        normalizeCampusPostAttachments(row.attachments)
          .filter(isStoredCampusAttachment)
          .map(attachment => attachment.path)
      ),
    ];
    if (paths.length > 0) {
      const { error: storageError } = await removeCampusPostFiles(paths);
      if (storageError) {
        notify.warning("Post deleted, but some media files need administrator cleanup.");
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
        `You can attach up to ${MAX_CAMPUS_POST_MEDIA_FILES} media files.`,
      );
      return false;
    }
    if (!trimmedContent && retainedAttachments.length + newMedia.length === 0) {
      notify.warning("A post needs text or at least one media file.");
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
          ...(isStoredCampusAttachment(attachment)
            ? {}
            : { url: attachment.url }),
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
        .filter(isStoredCampusAttachment)
        .map(attachment => attachment.path);
      if (removedPaths.length > 0) {
        const { error: storageError } = await removeCampusPostFiles(removedPaths);
        if (storageError) {
          notify.warning(
            "Post updated, but some removed media files need administrator cleanup.",
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
    selectDroppedMedia,
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
