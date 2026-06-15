import type {
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  RefObject,
} from "react";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ForumReactionBar } from "./ForumReactionBar";
import type { ForumReply } from "./forumTypes";

interface ForumCommentNodeProps {
  comment: ForumReply;
  depth?: number;
  maxNestingDepth: number;
  currentUserId?: string;
  activeReplyBox: string | null;
  replyTargetId: string | null;
  replyText: string;
  replyImagePreview: string | null;
  replyFileInputRef: RefObject<HTMLInputElement | null>;
  editingReplyId: string | null;
  editingReplyText: string;
  savingReplyId: string | null;
  deletingReplyId: string | null;
  isPostingReply: boolean;
  replyReactions: Record<string, string>;
  openReactionPicker: string | null;
  expandedReplyIds: Record<string, boolean>;
  loadingReplyBranches: Record<string, boolean>;
  formatDate: (value: string) => string;
  renderMentionedText: (content: string) => ReactNode;
  renderEmojiPicker: (onSelect: (emoji: string) => void) => ReactNode;
  renderMentionSuggestions: (
    value: string,
    onSelect: (token: string) => void
  ) => ReactNode;
  onNavigateProfile: (event: MouseEvent, userId: string) => void;
  onOpenImage: (imageUrl: string) => void;
  onReact: (targetId: string, type: string, isThread: boolean) => void;
  onOpenReactionPickerChange: (key: string | null) => void;
  onStartReply: (comment: ForumReply, depth: number) => void;
  onStartEdit: (comment: ForumReply) => void;
  onEditingReplyTextChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (replyId: string) => void;
  onDelete: (comment: ForumReply) => void;
  onToggleReplies: (comment: ForumReply) => void;
  onReplyTextChange: (value: string) => void;
  onReplyKeyDown: (
    event: KeyboardEvent<HTMLTextAreaElement>,
    parentId: string
  ) => void;
  onReplyImageChange: (file: File) => void;
  onRemoveReplyImage: () => void;
  onResetReplyComposer: () => void;
  onPostReply: (parentId: string) => void;
  onLoadChildReplies: (parentId: string) => void;
}

export function ForumCommentNode({
  comment,
  depth = 0,
  maxNestingDepth,
  currentUserId,
  activeReplyBox,
  replyTargetId,
  replyText,
  replyImagePreview,
  replyFileInputRef,
  editingReplyId,
  editingReplyText,
  savingReplyId,
  deletingReplyId,
  isPostingReply,
  replyReactions,
  openReactionPicker,
  expandedReplyIds,
  loadingReplyBranches,
  formatDate,
  renderMentionedText,
  renderEmojiPicker,
  renderMentionSuggestions,
  onNavigateProfile,
  onOpenImage,
  onReact,
  onOpenReactionPickerChange,
  onStartReply,
  onStartEdit,
  onEditingReplyTextChange,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onToggleReplies,
  onReplyTextChange,
  onReplyKeyDown,
  onReplyImageChange,
  onRemoveReplyImage,
  onResetReplyComposer,
  onPostReply,
  onLoadChildReplies,
}: ForumCommentNodeProps) {
  const showReplyBox = activeReplyBox === comment.id;
  const indentLevel = Math.min(depth, maxNestingDepth - 1);
  const indentClass = indentLevel > 0 ? "mt-5" : "mt-8";
  const isOwnComment = comment.author_id === currentUserId;
  const isEditingComment = editingReplyId === comment.id;

  const sharedChildProps = {
    maxNestingDepth,
    currentUserId,
    activeReplyBox,
    replyTargetId,
    replyText,
    replyImagePreview,
    replyFileInputRef,
    editingReplyId,
    editingReplyText,
    savingReplyId,
    deletingReplyId,
    isPostingReply,
    replyReactions,
    openReactionPicker,
    expandedReplyIds,
    loadingReplyBranches,
    formatDate,
    renderMentionedText,
    renderEmojiPicker,
    renderMentionSuggestions,
    onNavigateProfile,
    onOpenImage,
    onReact,
    onOpenReactionPickerChange,
    onStartReply,
    onStartEdit,
    onEditingReplyTextChange,
    onCancelEdit,
    onSaveEdit,
    onDelete,
    onToggleReplies,
    onReplyTextChange,
    onReplyKeyDown,
    onReplyImageChange,
    onRemoveReplyImage,
    onResetReplyComposer,
    onPostReply,
    onLoadChildReplies,
  };

  return (
    <div className={`flex w-full gap-4 ${indentClass}`}>
      <Avatar
        className={`${
          depth > 0 ? "h-8 w-8" : "h-10 w-10"
        } cursor-pointer hover:opacity-80`}
        onClick={(event) =>
          onNavigateProfile(event, comment.author?.id)
        }
      >
        <AvatarImage src={comment.author?.avatar_url} />
        <AvatarFallback>{comment.author?.full_name?.[0]}</AvatarFallback>
      </Avatar>

      <div className="group flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className="cursor-pointer text-sm font-semibold text-gray-900 hover:underline dark:text-gray-100"
            onClick={(event) =>
              onNavigateProfile(event, comment.author?.id)
            }
          >
            {comment.author?.full_name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(comment.created_at)}
          </span>
        </div>

        {isEditingComment ? (
          <div className="mt-3 space-y-3">
            <div className="relative">
              <Textarea
                value={editingReplyText}
                onChange={(event) =>
                  onEditingReplyTextChange(event.target.value)
                }
                className="min-h-[96px] bg-white p-3 pr-12 text-sm dark:bg-zinc-900 dark:text-white dark:placeholder-gray-400"
                autoFocus
              />
              <div className="absolute bottom-2 right-2">
                {renderEmojiPicker((emoji) =>
                  onEditingReplyTextChange(`${editingReplyText}${emoji}`)
                )}
              </div>
              {renderMentionSuggestions(editingReplyText, (token) =>
                onEditingReplyTextChange(
                  editingReplyText.replace(
                    /(^|\s)@([^\s@]*)$/,
                    `$1${token} `
                  )
                )
              )}
            </div>
            <div className="flex justify-end gap-4 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="px-4"
                onClick={onCancelEdit}
              >
                Cancel
              </Button>
              <Button
                className="px-5"
                size="sm"
                onClick={() => onSaveEdit(comment.id)}
                disabled={
                  !editingReplyText.trim() || savingReplyId === comment.id
                }
              >
                {savingReplyId === comment.id && (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                )}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-100">
            {renderMentionedText(comment.content)}
          </div>
        )}

        {comment.image_url && (
          <div className="mt-2">
            <img
              src={comment.image_url}
              alt="Attachment"
              className="max-h-48 cursor-pointer rounded-lg border transition-opacity hover:opacity-90 dark:border-zinc-700"
              onClick={() => onOpenImage(comment.image_url)}
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <ForumReactionBar
            targetId={comment.id}
            reactions={comment.reactions || []}
            myReaction={replyReactions[comment.id]}
            targetType="reply"
            openPicker={openReactionPicker}
            onOpenPickerChange={onOpenReactionPickerChange}
            onReact={onReact}
          />

          <div className="flex items-center gap-4">
            <button
              onClick={() => onStartReply(comment, depth)}
              className="px-1 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            >
              Reply
            </button>
            {isOwnComment && !isEditingComment && (
              <>
                <button
                  onClick={() => onStartEdit(comment)}
                  className="px-1 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(comment)}
                  disabled={deletingReplyId === comment.id}
                  className="px-1 text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingReplyId === comment.id ? "Deleting..." : "Delete"}
                </button>
              </>
            )}
          </div>
        </div>

        {(comment.childCount || 0) > 0 && (
          <button
            type="button"
            onClick={() => onToggleReplies(comment)}
            disabled={loadingReplyBranches[comment.id]}
            className="flex min-h-8 items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
            style={{
              marginTop: "14px",
              marginBottom: expandedReplyIds[comment.id] ? "10px" : "0",
            }}
          >
            {loadingReplyBranches[comment.id] && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {expandedReplyIds[comment.id]
              ? "Hide replies"
              : `View ${comment.childCount} ${
                  comment.childCount === 1 ? "reply" : "replies"
                }`}
          </button>
        )}

        {showReplyBox && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-1">
            <div className="relative">
              <Textarea
                autoFocus
                placeholder={`Replying to ${comment.author?.full_name}...`}
                dir="ltr"
                className="min-h-[76px] resize-none border-b-2 bg-white p-3 pr-20 text-sm focus:border-primary dark:bg-zinc-900 dark:text-white dark:placeholder-gray-400"
                style={{ textAlign: "left" }}
                value={replyText}
                onChange={(event) => onReplyTextChange(event.target.value)}
                onKeyDown={(event) =>
                  onReplyKeyDown(event, replyTargetId ?? comment.id)
                }
              />
              {renderMentionSuggestions(replyText, (token) =>
                onReplyTextChange(
                  replyText.replace(
                    /(^|\s)@([^\s@]*)$/,
                    `$1${token} `
                  )
                )
              )}
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {renderEmojiPicker((emoji) =>
                  onReplyTextChange(`${replyText}${emoji}`)
                )}
                <button
                  type="button"
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                  onClick={() => replyFileInputRef.current?.click()}
                  title="Attach an image"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
              </div>
              <input
                type="file"
                ref={replyFileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onReplyImageChange(file);
                }}
              />
            </div>

            {replyImagePreview && (
              <div className="group relative mt-2 inline-block">
                <img
                  src={replyImagePreview}
                  alt="Preview"
                  className="h-20 w-20 rounded-lg border-2 border-gray-200 object-cover shadow-sm dark:border-zinc-700"
                />
                <button
                  onClick={onRemoveReplyImage}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white opacity-0 shadow-md transition-all hover:bg-red-600 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetReplyComposer}
                className="h-8 dark:text-white dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => onPostReply(replyTargetId ?? comment.id)}
                disabled={
                  isPostingReply || (!replyText.trim() && !replyImagePreview)
                }
                className="h-8"
              >
                {isPostingReply && (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                )}
                Reply
              </Button>
            </div>
          </div>
        )}

        {expandedReplyIds[comment.id] && (
          <>
            {comment.children.map((child) => (
              <div
                key={child.id}
                style={{
                  marginLeft: `${
                    indentLevel >= maxNestingDepth - 1
                      ? (maxNestingDepth - 1) * 3
                      : (indentLevel + 1) * 3
                  }rem`,
                }}
              >
                <ForumCommentNode
                  {...sharedChildProps}
                  comment={child}
                  depth={depth + 1}
                />
              </div>
            ))}
            {comment.hasMoreChildren && (
              <div
                className="mt-4"
                style={{
                  marginLeft: `${
                    indentLevel >= maxNestingDepth - 1
                      ? (maxNestingDepth - 1) * 3
                      : (indentLevel + 1) * 3
                  }rem`,
                }}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onLoadChildReplies(comment.id)}
                  disabled={loadingReplyBranches[comment.id]}
                  className="gap-2"
                >
                  {loadingReplyBranches[comment.id] && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Load more replies
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
