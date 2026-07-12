import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Share2,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { LazyForumEmojiPicker } from "./LazyForumEmojiPicker";
import { CampusPostMedia } from "./CampusPostMedia";
import {
  formatCampusPostTime,
  getCampusMemberInitials,
  getCampusRoleBadgeClass,
} from "./campusFeedPresentation";
import { renderCampusMentionText } from "./campusMentions";
import type {
  CampusPost,
  CampusPostAttachment,
  CampusPostComment,
  SelectedCampusMedia,
} from "./campusFeedTypes";
import { MAX_CAMPUS_COMMENT_MEDIA_FILES } from "./campusFeedLimits";

type CampusPostCommentsDialogProps = {
  activePost: CampusPost | null;
  activeComments: CampusPostComment[];
  areActiveCommentsLoading: boolean;
  isActiveCommentSubmitting: boolean;
  commentDrafts: Record<string, string>;
  setCommentDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  commentMedia: SelectedCampusMedia | null;
  commentMediaError: string;
  commentFileInputRef: RefObject<HTMLInputElement>;
  editCommentFileInputRef: RefObject<HTMLInputElement>;
  editingCommentId: string | null;
  editCommentDraft: string;
  setEditCommentDraft: Dispatch<SetStateAction<string>>;
  editCommentAttachments: CampusPostAttachment[];
  setEditCommentAttachments: Dispatch<SetStateAction<CampusPostAttachment[]>>;
  editCommentMedia: SelectedCampusMedia | null;
  editCommentMediaError: string;
  openCommentMenuId: string | null;
  setOpenCommentMenuId: Dispatch<SetStateAction<string | null>>;
  updatingCommentIds: Set<string>;
  deletingCommentIds: Set<string>;
  onOpenChange: (open: boolean) => void;
  onToggleReaction: (post: CampusPost) => void;
  onSharePost: (post: CampusPost) => void;
  onSubmitComment: (event: FormEvent<HTMLFormElement>, postId: string) => void;
  onSelectCommentMedia: (
    event: ChangeEvent<HTMLInputElement>,
    isEditingComment: boolean,
  ) => void;
  onReleaseCommentMedia: () => void;
  onReleaseEditCommentMedia: () => void;
  onCancelEditingComment: () => void;
  onStartEditingComment: (comment: CampusPostComment) => void;
  onSaveEditedComment: (comment: CampusPostComment) => void | Promise<void>;
  onDeleteComment: (comment: CampusPostComment) => void | Promise<void>;
  onOpenAttachment: (attachment: CampusPostAttachment) => void;
};

export function CampusPostCommentsDialog({
  activePost,
  activeComments,
  areActiveCommentsLoading,
  isActiveCommentSubmitting,
  commentDrafts,
  setCommentDrafts,
  commentMedia,
  commentMediaError,
  commentFileInputRef,
  editCommentFileInputRef,
  editingCommentId,
  editCommentDraft,
  setEditCommentDraft,
  editCommentAttachments,
  setEditCommentAttachments,
  editCommentMedia,
  editCommentMediaError,
  openCommentMenuId,
  setOpenCommentMenuId,
  updatingCommentIds,
  deletingCommentIds,
  onOpenChange,
  onToggleReaction,
  onSharePost,
  onSubmitComment,
  onSelectCommentMedia,
  onReleaseCommentMedia,
  onReleaseEditCommentMedia,
  onCancelEditingComment,
  onStartEditingComment,
  onSaveEditedComment,
  onDeleteComment,
  onOpenAttachment,
}: CampusPostCommentsDialogProps) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  return (
    <Dialog open={Boolean(activePost)} onOpenChange={onOpenChange}>
      <DialogContent
        className="grid h-[90vh] max-h-[900px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-4xl"
        onPointerDownOutside={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}
      >
        {activePost && (
          <>
            <div className="border-b px-6 py-4 text-center">
              <DialogTitle className="pr-10 text-lg">
                {activePost.authorName}&apos;s Post
              </DialogTitle>
              <DialogDescription className="sr-only">
                Campus post details and comments.
              </DialogDescription>
            </div>

            <div className="overflow-y-auto">
              <div className="space-y-4 border-b p-5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${activePost.authorId}`)}
                    className="shrink-0 rounded-full"
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage
                        src={activePost.authorAvatarUrl || undefined}
                      />
                      <AvatarFallback>
                        {getCampusMemberInitials(activePost.authorName)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/profile/${activePost.authorId}`)
                        }
                        className="truncate text-sm font-semibold hover:underline"
                      >
                        {activePost.authorName}
                      </button>
                      <Badge
                        variant="outline"
                        className={`capitalize ${getCampusRoleBadgeClass(activePost.authorRole)}`}
                      >
                        {activePost.authorRole}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCampusPostTime(activePost.createdAt)}
                      {activePost.updatedAt !== activePost.createdAt
                        ? " · Edited"
                        : ""}
                      {" · Campus"}
                    </p>
                  </div>
                </div>

                {activePost.content && (
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {renderCampusMentionText(activePost.content)}
                  </p>
                )}
              </div>

              <CampusPostMedia post={activePost} onOpen={onOpenAttachment} />

              <div className="border-b px-5 py-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {activePost.reactionCount} reaction
                    {activePost.reactionCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    {activePost.commentCount} comment
                    {activePost.commentCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 border-t pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className={
                      activePost.viewerReaction
                        ? "text-primary hover:text-primary"
                        : "text-muted-foreground"
                    }
                    onClick={() => onToggleReaction(activePost)}
                  >
                    <ThumbsUp
                      className={`h-4 w-4 ${
                        activePost.viewerReaction ? "fill-current" : ""
                      }`}
                    />
                    Like
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => onSharePost(activePost)}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>

              <div className="space-y-4 bg-muted/20 p-5">
                <h3 className="text-sm font-semibold">Comments</h3>
                {areActiveCommentsLoading ? (
                  <div className="flex min-h-32 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : activeComments.length > 0 ? (
                  <div className="space-y-4">
                    {activeComments.map(comment => (
                      <div key={comment.id} className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${comment.authorId}`)}
                          className="shrink-0 rounded-full"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={comment.authorAvatarUrl || undefined}
                            />
                            <AvatarFallback className="text-xs">
                              {getCampusMemberInitials(comment.authorName)}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="min-w-0 max-w-[85%] flex-1">
                          <div className="group/comment-menu flex items-start gap-1">
                            <div
                              className={`min-w-0 max-w-full rounded-2xl bg-muted px-3.5 py-2.5 ${
                                editingCommentId === comment.id ? "w-full" : ""
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold">
                                  {comment.authorName}
                                </span>
                                <span className="text-[10px] capitalize text-muted-foreground">
                                  {comment.authorRole}
                                </span>
                              </div>

                              {editingCommentId === comment.id ? (
                                <div className="mt-2 space-y-2">
                                  <Textarea
                                    value={editCommentDraft}
                                    onChange={event =>
                                      setEditCommentDraft(event.target.value)
                                    }
                                    maxLength={2000}
                                    className="min-h-20 resize-y bg-background"
                                    autoFocus
                                    aria-label="Edit comment"
                                  />

                                  {editCommentAttachments.map(attachment => (
                                    <div
                                      key={attachment.path}
                                      className="relative overflow-hidden rounded-xl bg-background"
                                    >
                                      <img
                                        src={attachment.url}
                                        alt={attachment.name}
                                        className="max-h-56 w-full object-cover"
                                      />
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        className="absolute right-2 top-2 h-7 w-7 rounded-full"
                                        onClick={() =>
                                          setEditCommentAttachments([])
                                        }
                                        aria-label="Remove comment media"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}

                                  {editCommentMedia && (
                                    <div className="relative overflow-hidden rounded-xl bg-background">
                                      <img
                                        src={editCommentMedia.previewUrl}
                                        alt={editCommentMedia.file.name}
                                        className="max-h-56 w-full object-cover"
                                      />
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        className="absolute right-2 top-2 h-7 w-7 rounded-full"
                                        onClick={onReleaseEditCommentMedia}
                                        aria-label="Remove new comment media"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}

                                  {editCommentMediaError && (
                                    <p className="text-xs text-destructive">
                                      {editCommentMediaError}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1">
                                      <LazyForumEmojiPicker
                                        onSelect={emoji =>
                                          setEditCommentDraft(current =>
                                            current.length + emoji.length <= 2000
                                              ? `${current}${emoji}`
                                              : current,
                                          )
                                        }
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-full"
                                        onClick={() =>
                                          editCommentFileInputRef.current?.click()
                                        }
                                        title="Attach a photo"
                                        aria-label="Attach a photo"
                                      >
                                        <ImagePlus className="h-4 w-4 text-emerald-600" />
                                      </Button>
                                      <input
                                        ref={editCommentFileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={event =>
                                          onSelectCommentMedia(event, true)
                                        }
                                      />
                                    </div>

                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={onCancelEditingComment}
                                        disabled={updatingCommentIds.has(
                                          comment.id,
                                        )}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                          void onSaveEditedComment(comment)
                                        }
                                        disabled={
                                          (!editCommentDraft.trim()
                                            && editCommentAttachments.length === 0
                                            && !editCommentMedia)
                                          || updatingCommentIds.has(comment.id)
                                        }
                                      >
                                        {updatingCommentIds.has(comment.id) && (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        )}
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {comment.content && (
                                    <p className="mt-0.5 break-words text-sm">
                                      {renderCampusMentionText(comment.content)}
                                    </p>
                                  )}
                                  {comment.attachments.map(attachment => (
                                    <button
                                      key={attachment.path}
                                      type="button"
                                      className="mt-2 block overflow-hidden rounded-xl"
                                      onClick={() => onOpenAttachment(attachment)}
                                    >
                                      <img
                                        src={attachment.url}
                                        alt={attachment.name}
                                        className="max-h-72 max-w-full object-cover"
                                      />
                                    </button>
                                  ))}
                                </>
                              )}
                            </div>

                            {(comment.authorId === user?.id
                              || profile?.role === "admin")
                              && editingCommentId !== comment.id && (
                                <DropdownMenu
                                  modal={false}
                                  open={openCommentMenuId === comment.id}
                                  onOpenChange={open =>
                                    setOpenCommentMenuId(
                                      open ? comment.id : null,
                                    )
                                  }
                                >
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0 rounded-full opacity-100 transition-opacity sm:opacity-0 sm:group-hover/comment-menu:opacity-100 sm:group-focus-within/comment-menu:opacity-100"
                                      aria-label="Comment options"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {comment.authorId === user?.id && (
                                      <DropdownMenuItem
                                        onSelect={() =>
                                          onStartEditingComment(comment)
                                        }
                                      >
                                        <Pencil className="h-4 w-4" />
                                        Edit comment
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      variant="destructive"
                                      disabled={deletingCommentIds.has(
                                        comment.id,
                                      )}
                                      onSelect={() =>
                                        void onDeleteComment(comment)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete comment
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                          </div>

                          <span className="ml-3 mt-1 block text-[10px] text-muted-foreground">
                            {formatCampusPostTime(comment.createdAt)}
                            {comment.updatedAt !== comment.createdAt
                              ? " · Edited"
                              : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm font-medium">No comments yet</p>
                    <p className="text-xs text-muted-foreground">
                      Start the conversation.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <form
              className="space-y-3 border-t bg-background p-4"
              onSubmit={event => onSubmitComment(event, activePost.id)}
            >
              {commentMedia && (
                <div className="ml-12 w-fit max-w-[min(18rem,calc(100%-3rem))]">
                  <div className="relative overflow-hidden rounded-xl border bg-muted">
                    <img
                      src={commentMedia.previewUrl}
                      alt={commentMedia.file.name}
                      className="max-h-44 w-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-2 h-7 w-7 rounded-full"
                      onClick={onReleaseCommentMedia}
                      aria-label="Remove comment media"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {commentMediaError && (
                <p className="ml-12 text-xs text-destructive">
                  {commentMediaError}
                </p>
              )}

              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getCampusMemberInitials(
                      profile?.full_name || "Campus Member",
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 items-center rounded-full bg-muted/60 pr-2">
                  <Input
                    value={commentDrafts[activePost.id] || ""}
                    onChange={event =>
                      setCommentDrafts(current => ({
                        ...current,
                        [activePost.id]: event.target.value,
                      }))
                    }
                    maxLength={2000}
                    placeholder="Write a comment..."
                    className="min-w-0 flex-1 rounded-full border-0 bg-transparent shadow-none focus-visible:ring-0"
                    autoFocus
                  />
                  <LazyForumEmojiPicker
                    onSelect={emoji =>
                      setCommentDrafts(current => {
                        const draft = current[activePost.id] || "";
                        return draft.length + emoji.length <= 2000
                          ? {
                              ...current,
                              [activePost.id]: `${draft}${emoji}`,
                            }
                          : current;
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-full"
                    onClick={() => commentFileInputRef.current?.click()}
                    disabled={
                      (commentMedia ? 1 : 0) >= MAX_CAMPUS_COMMENT_MEDIA_FILES
                    }
                    title="Attach a photo"
                    aria-label="Attach a photo"
                  >
                    <ImagePlus className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <input
                    ref={commentFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={event => onSelectCommentMedia(event, false)}
                  />
                </div>
                <Button
                  type="submit"
                  size="icon"
                  className="shrink-0 rounded-full"
                  disabled={
                    isActiveCommentSubmitting
                    || (!(commentDrafts[activePost.id] || "").trim()
                      && !commentMedia)
                  }
                  aria-label="Post comment"
                >
                  {isActiveCommentSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
