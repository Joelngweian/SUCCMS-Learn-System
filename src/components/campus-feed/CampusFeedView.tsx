import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { CampusFeedLightboxDialog } from "./CampusFeedLightboxDialog";
import {
  CampusPostAuthorHeader,
  CampusPostEngagementBar,
} from "./CampusPostCardParts";
import { CampusPostComposer } from "./CampusPostComposer";
import { CampusPostCommentsDialog } from "./CampusPostCommentsDialog";
import { CampusPostEditForm } from "./CampusPostEditForm";
import { CampusPostMedia } from "./CampusPostMedia";
import {
  formatCampusPostTime,
  getCampusMemberInitials,
} from "./campusFeedPresentation";
import {
  getActiveCampusMention,
  renderCampusMentionText,
  searchCampusMentionCourses,
  toUserMentionSuggestion,
  type ActiveCampusMention,
  type CampusMentionSuggestion,
  type CampusMentionTarget,
  type CampusMentionUserRow,
} from "./campusMentions";
import type {
  CampusPost,
  CampusPostAttachment,
  CampusPostComment,
  SelectedCampusMedia,
} from "./campusFeedTypes";
import {
  MAX_CAMPUS_POST_MEDIA_BYTES,
  MAX_CAMPUS_POST_MEDIA_FILES,
} from "./campusFeedLimits";
import { useCampusFeed } from "./useCampusFeed";

export function CampusFeed() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const editCommentFileInputRef = useRef<HTMLInputElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editPostTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editPreviewUrlsRef = useRef(new Set<string>());
  const commentPreviewUrlsRef = useRef(new Set<string>());
  const highlightedPostRef = useRef<string | null>(null);
  const mentionRequestRef = useRef(0);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeMention, setActiveMention] =
    useState<ActiveCampusMention | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<
    CampusMentionSuggestion[]
  >([]);
  const [isMentionLoading, setIsMentionLoading] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [submittingCommentIds, setSubmittingCommentIds] =
    useState<Set<string>>(new Set());
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(
    new Set(),
  );
  const [lightboxAttachment, setLightboxAttachment] =
    useState<CampusPost["attachments"][number] | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editAttachments, setEditAttachments] = useState<
    CampusPostAttachment[]
  >([]);
  const [editSelectedMedia, setEditSelectedMedia] = useState<
    SelectedCampusMedia[]
  >([]);
  const [editError, setEditError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState("");
  const [commentMedia, setCommentMedia] =
    useState<SelectedCampusMedia | null>(null);
  const [commentMediaError, setCommentMediaError] = useState("");
  const [editCommentAttachments, setEditCommentAttachments] = useState<
    CampusPostAttachment[]
  >([]);
  const [editCommentMedia, setEditCommentMedia] =
    useState<SelectedCampusMedia | null>(null);
  const [editCommentMediaError, setEditCommentMediaError] = useState("");
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(
    null,
  );
  const feed = useCampusFeed();
  const activePost =
    feed.posts.find(post => post.id === activePostId) || null;
  const activeComments = activePost
    ? feed.commentsByPost[activePost.id] || []
    : [];
  const areActiveCommentsLoading = activePost
    ? feed.loadingCommentPostIds.has(activePost.id)
    : false;
  const isActiveCommentSubmitting = activePost
    ? submittingCommentIds.has(activePost.id)
    : false;

  useEffect(() => {
    const previewUrls = editPreviewUrlsRef.current;
    const commentPreviewUrls = commentPreviewUrlsRef.current;
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      previewUrls.clear();
      commentPreviewUrls.forEach(url => URL.revokeObjectURL(url));
      commentPreviewUrls.clear();
    };
  }, []);

  useEffect(() => {
    const targetPostId = window.location.hash.match(/^#campus-post-(.+)$/)?.[1];
    if (!targetPostId || highlightedPostRef.current === targetPostId) return;
    if (!feed.posts.some(post => post.id === targetPostId)) return;

    highlightedPostRef.current = targetPostId;
    window.setTimeout(() => {
      const element = document.getElementById(`campus-post-${targetPostId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.classList.add("ring-2", "ring-primary/40");
      window.setTimeout(() => {
        element?.classList.remove("ring-2", "ring-primary/40");
      }, 2400);
    }, 120);
  }, [feed.posts]);

  useEffect(() => {
    if (!activeMention) {
      setMentionSuggestions([]);
      setIsMentionLoading(false);
      return;
    }

    const requestId = ++mentionRequestRef.current;
    const searchTerm = activeMention.query.trim();
    const debounceTimer = window.setTimeout(async () => {
      setIsMentionLoading(true);
      try {
        const userQuery = supabase
          .from("user_profiles")
          .select("id, full_name, username, avatar_url, role")
          .or("is_active.eq.true,is_active.is.null")
          .order("full_name", { ascending: true })
          .limit(5);

        if (user?.id) userQuery.neq("id", user.id);
        if (searchTerm) {
          userQuery.or(
            `full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`,
          );
        }

        const [courseSuggestions, userResult] = await Promise.all([
          searchCampusMentionCourses(searchTerm),
          userQuery,
        ]);
        if (requestId !== mentionRequestRef.current) return;
        if (userResult.error) throw userResult.error;

        setMentionSuggestions([
          ...courseSuggestions,
          ...((userResult.data || []) as CampusMentionUserRow[])
            .map(toUserMentionSuggestion)
            .slice(0, Math.max(0, 8 - courseSuggestions.length)),
        ]);
      } catch (error) {
        console.error("Campus mention suggestions failed:", error);
        if (requestId === mentionRequestRef.current) {
          setMentionSuggestions([]);
        }
      } finally {
        if (requestId === mentionRequestRef.current) {
          setIsMentionLoading(false);
        }
      }
    }, searchTerm ? 180 : 0);

    return () => window.clearTimeout(debounceTimer);
  }, [activeMention, user?.id]);

  const releaseEditMedia = () => {
    editPreviewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    editPreviewUrlsRef.current.clear();
    setEditSelectedMedia([]);
  };

  const updateActiveMention = (
    target: CampusMentionTarget,
    value: string,
    cursorPosition: number | null,
  ) => {
    setActiveMention(
      getActiveCampusMention(target, value, cursorPosition),
    );
  };

  const insertMentionSuggestion = (suggestion: CampusMentionSuggestion) => {
    if (!activeMention) return;

    const mentionText = `@${suggestion.token} `;
    const currentValue =
      activeMention.target === "composer" ? feed.draftContent : editDraft;
    const nextValue =
      currentValue.slice(0, activeMention.start)
      + mentionText
      + currentValue.slice(activeMention.end);
    const nextCursor = activeMention.start + mentionText.length;
    const textareaRef =
      activeMention.target === "composer"
        ? composerTextareaRef
        : editPostTextareaRef;

    if (activeMention.target === "composer") {
      feed.setDraftContent(nextValue);
    } else {
      setEditDraft(nextValue);
    }

    setActiveMention(null);
    setMentionSuggestions([]);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const openPostDialog = (postId: string) => {
    setActivePostId(postId);
    void feed.loadComments(postId);
  };

  const releaseCommentMedia = () => {
    if (commentMedia) {
      URL.revokeObjectURL(commentMedia.previewUrl);
      commentPreviewUrlsRef.current.delete(commentMedia.previewUrl);
    }
    setCommentMedia(null);
    setCommentMediaError("");
  };

  const releaseEditCommentMedia = () => {
    if (editCommentMedia) {
      URL.revokeObjectURL(editCommentMedia.previewUrl);
      commentPreviewUrlsRef.current.delete(editCommentMedia.previewUrl);
    }
    setEditCommentMedia(null);
    setEditCommentMediaError("");
  };

  const startEditingComment = (comment: CampusPostComment) => {
    releaseEditCommentMedia();
    setEditingCommentId(comment.id);
    setEditCommentDraft(comment.content);
    setEditCommentAttachments(comment.attachments);
  };

  const cancelEditingComment = () => {
    releaseEditCommentMedia();
    setEditingCommentId(null);
    setEditCommentDraft("");
    setEditCommentAttachments([]);
  };

  const saveEditedComment = async (comment: CampusPostComment) => {
    const updated = await feed.updateComment(
      comment,
      editCommentDraft,
      editCommentAttachments,
      editCommentMedia,
    );
    if (updated) cancelEditingComment();
  };

  const selectCommentMedia = (
    event: ChangeEvent<HTMLInputElement>,
    editing: boolean,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const setError = editing
      ? setEditCommentMediaError
      : setCommentMediaError;
    if (!file.type.startsWith("image/")) {
      setError("Comments currently support image attachments only.");
      return;
    }
    if (file.size > MAX_CAMPUS_POST_MEDIA_BYTES) {
      setError(`${file.name} is larger than 10 MB.`);
      return;
    }

    if (editing) {
      releaseEditCommentMedia();
    } else {
      releaseCommentMedia();
    }
    const previewUrl = URL.createObjectURL(file);
    commentPreviewUrlsRef.current.add(previewUrl);
    const selected = {
      id: crypto.randomUUID(),
      file,
      previewUrl,
    };
    if (editing) {
      setEditCommentAttachments([]);
      setEditCommentMedia(selected);
      setEditCommentMediaError("");
    } else {
      setCommentMedia(selected);
      setCommentMediaError("");
    }
  };

  const togglePostContent = (postId: string) => {
    setExpandedPostIds(current => {
      const next = new Set(current);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const startEditingPost = (post: CampusPost) => {
    releaseEditMedia();
    setActiveMention(null);
    setEditingPostId(post.id);
    setEditDraft(post.content);
    setEditAttachments(post.attachments);
    setEditError("");
  };

  const cancelEditingPost = () => {
    releaseEditMedia();
    setActiveMention(current =>
      current?.target === "editPost" ? null : current,
    );
    setEditingPostId(null);
    setEditDraft("");
    setEditAttachments([]);
    setEditError("");
  };

  const saveEditedPost = async (post: CampusPost) => {
    const updated = await feed.updatePost(
      post,
      editDraft,
      editAttachments,
      editSelectedMedia,
    );
    if (updated) cancelEditingPost();
  };

  const removeExistingEditAttachment = (path: string) => {
    setEditAttachments(current =>
      current.filter(attachment => attachment.path !== path)
    );
    setEditError("");
  };

  const removeNewEditMedia = (mediaId: string) => {
    setEditSelectedMedia(current => current.filter(media => {
      if (media.id !== mediaId) return true;
      URL.revokeObjectURL(media.previewUrl);
      editPreviewUrlsRef.current.delete(media.previewUrl);
      return false;
    }));
    setEditError("");
  };

  const selectEditMedia = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    const remainingSlots =
      MAX_CAMPUS_POST_MEDIA_FILES
      - editAttachments.length
      - editSelectedMedia.length;
    if (remainingSlots <= 0) {
      setEditError(
        `You can attach up to ${MAX_CAMPUS_POST_MEDIA_FILES} images.`,
      );
      return;
    }

    const accepted: SelectedCampusMedia[] = [];
    let nextError = "";
    for (const file of files.slice(0, remainingSlots)) {
      if (!file.type.startsWith("image/")) {
        nextError = "Campus posts currently support image attachments only.";
        continue;
      }
      if (file.size > MAX_CAMPUS_POST_MEDIA_BYTES) {
        nextError = `${file.name} is larger than 10 MB.`;
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      editPreviewUrlsRef.current.add(previewUrl);
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl,
      });
    }

    setEditSelectedMedia(current => [...current, ...accepted]);
    setEditError(nextError);
  };

  const submitComment = async (
    event: FormEvent<HTMLFormElement>,
    postId: string,
  ) => {
    event.preventDefault();
    const content = commentDrafts[postId] || "";
    if (
      (!content.trim() && !commentMedia)
      || submittingCommentIds.has(postId)
    ) return;

    setSubmittingCommentIds(current => new Set(current).add(postId));
    const created = await feed.addComment(postId, content, commentMedia);
    if (created) {
      setCommentDrafts(current => ({ ...current, [postId]: "" }));
      releaseCommentMedia();
    }
    setSubmittingCommentIds(current => {
      const next = new Set(current);
      next.delete(postId);
      return next;
    });
  };

  const sharePost = async (post: CampusPost) => {
    const url = `${window.location.origin}${window.location.pathname}#campus-post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.authorName}'s campus post`,
          text: post.content.slice(0, 180),
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        notify.success("Post link copied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      notify.error(error, "The post link could not be shared.");
    }
  };

  return (
    <section
      aria-labelledby="campus-feed-title"
      className="mx-auto w-full max-w-[820px] space-y-4"
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 id="campus-feed-title" className="text-xl font-semibold">
              Campus Feed
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Posts shared across the SUCCMS campus community.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void feed.refreshPosts()}
          disabled={feed.isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${feed.isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <CampusPostComposer
        activeMention={activeMention}
        composerError={feed.composerError}
        draftContent={feed.draftContent}
        isCreating={feed.isCreating}
        isMentionLoading={isMentionLoading}
        mentionSuggestions={mentionSuggestions}
        onCreatePost={() => {
          setActiveMention(null);
          void feed.createPost();
        }}
        onDraftChange={feed.setDraftContent}
        onMentionChange={updateActiveMention}
        onMentionSelect={insertMentionSuggestion}
        onRemoveSelectedMedia={feed.removeSelectedMedia}
        onSelectMedia={feed.selectMedia}
        profileAvatarUrl={profile?.avatar_url}
        profileName={profile?.full_name}
        selectedMedia={feed.selectedMedia}
        textareaRef={composerTextareaRef}
      />

      {feed.newPostsAvailable && (
        <button
          type="button"
          onClick={() => void feed.refreshPosts()}
          className="w-full rounded-full border bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          New campus posts are available 鈥?show latest
        </button>
      )}

      {feed.feedError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {feed.feedError}
        </div>
      )}

      {feed.isLoading && feed.posts.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : feed.posts.length === 0 && !feed.feedError ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">The campus feed is ready</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first person to share an update.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feed.posts.map(post => {
            const isOwner = post.authorId === user?.id;
            const isContentExpanded = expandedPostIds.has(post.id);
            const isEditing = editingPostId === post.id;
            const isUpdating = feed.updatingPostIds.has(post.id);
            const hasLongContent =
              post.content.length > 360
              || post.content.split(/\r?\n/).length > 5;

            return (
              <Card
                id={`campus-post-${post.id}`}
                key={post.id}
                className={`relative shadow-sm ${
                  isEditing ? "overflow-visible" : "overflow-hidden"
                }`}
              >
                <CampusPostAuthorHeader
                  isEditing={isEditing}
                  isOwner={isOwner}
                  onDelete={() => void feed.deletePost(post)}
                  onEdit={() => startEditingPost(post)}
                  onOpenProfile={() => navigate(`/profile/${post.authorId}`)}
                  post={post}
                />

                <CardContent className="space-y-3 p-0">
                  {isEditing ? (
                    <CampusPostEditForm
                      activeMention={activeMention}
                      editAttachments={editAttachments}
                      editDraft={editDraft}
                      editError={editError}
                      editFileInputRef={editFileInputRef}
                      editPostTextareaRef={editPostTextareaRef}
                      editSelectedMedia={editSelectedMedia}
                      isMentionLoading={isMentionLoading}
                      isUpdating={isUpdating}
                      mentionSuggestions={mentionSuggestions}
                      onCancel={cancelEditingPost}
                      onDraftChange={setEditDraft}
                      onMentionChange={(value, cursorPosition) =>
                        updateActiveMention("editPost", value, cursorPosition)
                      }
                      onMentionSelect={insertMentionSuggestion}
                      onRemoveExistingAttachment={removeExistingEditAttachment}
                      onRemoveNewMedia={removeNewEditMedia}
                      onSave={() => void saveEditedPost(post)}
                      onSelectEditMedia={selectEditMedia}
                    />
                  ) : post.content ? (
                    <div className="px-4">
                      <p
                        className={`whitespace-pre-wrap break-words text-sm leading-6 ${
                          hasLongContent && !isContentExpanded
                            ? "line-clamp-5"
                            : ""
                        }`}
                      >
                        {renderCampusMentionText(post.content)}
                      </p>
                      {hasLongContent && (
                        <button
                          type="button"
                          onClick={() => togglePostContent(post.id)}
                          className="mt-1 text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline"
                        >
                          {isContentExpanded ? "See less" : "See more"}
                        </button>
                      )}
                    </div>
                  ) : null}

                  {!isEditing && (
                    <CampusPostMedia
                      post={post}
                      onOpen={setLightboxAttachment}
                    />
                  )}

                  <CampusPostEngagementBar
                    onComment={() => openPostDialog(post.id)}
                    onShare={() => void sharePost(post)}
                    onToggleReaction={() => void feed.toggleReaction(post)}
                    post={post}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {feed.hasMore && !feed.feedError && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void feed.loadMorePosts()}
          disabled={feed.isLoadingMore}
        >
          {feed.isLoadingMore && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Load more posts
        </Button>
      )}

      <CampusPostCommentsDialog
        activePost={activePost}
        activeComments={activeComments}
        areActiveCommentsLoading={areActiveCommentsLoading}
        isActiveCommentSubmitting={isActiveCommentSubmitting}
        commentDrafts={commentDrafts}
        setCommentDrafts={setCommentDrafts}
        commentMedia={commentMedia}
        commentMediaError={commentMediaError}
        commentFileInputRef={commentFileInputRef}
        editCommentFileInputRef={editCommentFileInputRef}
        editingCommentId={editingCommentId}
        editCommentDraft={editCommentDraft}
        setEditCommentDraft={setEditCommentDraft}
        editCommentAttachments={editCommentAttachments}
        setEditCommentAttachments={setEditCommentAttachments}
        editCommentMedia={editCommentMedia}
        editCommentMediaError={editCommentMediaError}
        openCommentMenuId={openCommentMenuId}
        setOpenCommentMenuId={setOpenCommentMenuId}
        updatingCommentIds={feed.updatingCommentIds}
        deletingCommentIds={feed.deletingCommentIds}
        onOpenChange={open => {
          if (!open) {
            setOpenCommentMenuId(null);
            setActivePostId(null);
            cancelEditingComment();
            releaseCommentMedia();
          }
        }}
        onToggleReaction={post => void feed.toggleReaction(post)}
        onSharePost={post => void sharePost(post)}
        onSubmitComment={submitComment}
        onSelectCommentMedia={selectCommentMedia}
        onReleaseCommentMedia={releaseCommentMedia}
        onReleaseEditCommentMedia={releaseEditCommentMedia}
        onCancelEditingComment={cancelEditingComment}
        onStartEditingComment={startEditingComment}
        onSaveEditedComment={saveEditedComment}
        onDeleteComment={comment => void feed.deleteComment(comment)}
        onOpenAttachment={setLightboxAttachment}
      />

      <CampusFeedLightboxDialog
        attachment={lightboxAttachment}
        onOpenChange={open => {
          if (!open) setLightboxAttachment(null);
        }}
      />
    </section>
  );
}
