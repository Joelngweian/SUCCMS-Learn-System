import type {
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  RefObject,
} from "react";
import { Edit2, Image as ImageIcon, Loader2, Trash2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ForumThreadDetail } from "./forumTypes";

interface ForumThreadDetailCardProps {
  thread: ForumThreadDetail;
  currentUserId?: string;
  deletingThreadId: string | null;
  courseBadge: ReactNode;
  formatDate: (value: string) => string;
  renderMentionedText: (content: string) => ReactNode;
  onOpenProfile: (event: MouseEvent, userId: string) => void;
  onEdit: (thread: ForumThreadDetail) => void;
  onDelete: (threadId: string) => void;
  onOpenImage: (imageUrl: string) => void;
}

export function ForumThreadDetailCard({
  thread,
  currentUserId,
  deletingThreadId,
  courseBadge,
  formatDate,
  renderMentionedText,
  onOpenProfile,
  onEdit,
  onDelete,
  onOpenImage,
}: ForumThreadDetailCardProps) {
  return (
    <Card className="mb-6 border-2 border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <CardContent className="p-8 dark:text-white">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex gap-2">
            {courseBadge}
            <Badge
              className="border-none px-3 py-1 text-sm"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "#d1d5db",
              }}
            >
              #{thread?.category ?? "general"}
            </Badge>
          </div>
          {thread?.author_id === currentUserId && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(thread)}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-700"
                disabled={deletingThreadId === thread.id}
                onClick={() => onDelete(thread.id)}
              >
                {deletingThreadId === thread.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          )}
        </div>

        <h1 className="mb-6 text-3xl font-extrabold leading-tight text-gray-900 dark:text-white">
          {thread?.title ?? "Discussion"}
        </h1>

        <div
          className="mb-8 flex cursor-pointer items-center gap-3 border-b border-gray-100 pb-6 dark:border-zinc-800"
          onClick={(event) =>
            thread?.author?.id &&
            onOpenProfile(event, thread.author.id)
          }
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={thread?.author?.avatar_url} />
            <AvatarFallback>
              {thread?.author?.full_name?.[0] ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-bold text-gray-900 hover:underline dark:text-white">
              {thread?.author?.full_name ?? "Anonymous"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {thread?.created_at
                ? formatDate(thread.created_at)
                : "Date unknown"}
            </p>
          </div>
        </div>

        <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-gray-800 dark:text-gray-100">
          {renderMentionedText(thread?.content ?? "No content")}
        </div>

        {(thread?.images ?? []).length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {(thread?.images ?? []).map(
              (
                image: string | null | undefined,
                index: number
              ) =>
                image ? (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt={`Attachment ${index + 1}`}
                    className="h-auto w-full cursor-pointer rounded-xl border shadow-sm transition-opacity hover:opacity-95 dark:border-zinc-700"
                    onClick={() => onOpenImage(image)}
                    onError={() =>
                      console.error("Image failed to load:", image)
                    }
                  />
                ) : null
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ForumRootCommentComposerProps {
  avatarUrl?: string | null;
  fallback: string;
  activeReplyBox: string | null;
  replyText: string;
  replyImagePreview: string | null;
  hasReplyImage: boolean;
  isPostingReply: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  renderEmojiPicker: (onSelect: (emoji: string) => void) => ReactNode;
  renderMentionSuggestions: (
    value: string,
    onSelect: (token: string) => void
  ) => ReactNode;
  onTextChange: (value: string) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onImageChange: (file: File) => void;
  onRemoveImage: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function ForumRootCommentComposer({
  avatarUrl,
  fallback,
  activeReplyBox,
  replyText,
  replyImagePreview,
  hasReplyImage,
  isPostingReply,
  fileInputRef,
  renderEmojiPicker,
  renderMentionSuggestions,
  onTextChange,
  onFocus,
  onKeyDown,
  onImageChange,
  onRemoveImage,
  onCancel,
  onSubmit,
}: ForumRootCommentComposerProps) {
  const isRootComposerActive = activeReplyBox === null;
  const displayedText = isRootComposerActive ? replyText : "";

  return (
    <div className="mb-12 flex gap-4">
      <Avatar className="h-10 w-10">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="relative border-b-2 border-gray-200 transition-colors focus-within:border-black dark:border-zinc-800 dark:focus-within:border-white">
          <Textarea
            placeholder="Add a comment..."
            dir="ltr"
            className="min-h-[36px] resize-none border-0 bg-transparent p-1 pr-20 text-sm focus-visible:ring-0 dark:text-white dark:placeholder-gray-400"
            style={{ textAlign: "left" }}
            value={displayedText}
            onChange={(event) => {
              if (isRootComposerActive) onTextChange(event.target.value);
            }}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
          />
          {renderMentionSuggestions(displayedText, (token) =>
            onTextChange(
              replyText.replace(
                /(^|\s)@([^\s@]*)$/,
                `$1${token} `
              )
            )
          )}
          <div className="absolute bottom-0.5 right-0 flex items-center gap-1">
            {renderEmojiPicker((emoji) =>
              onTextChange(`${replyText}${emoji}`)
            )}
            <button
              type="button"
              className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              onClick={() => fileInputRef.current?.click()}
              title="Attach an image"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isRootComposerActive && replyImagePreview && (
          <div className="group relative mt-2 inline-block">
            <img
              src={replyImagePreview}
              alt="Preview"
              className="h-24 w-24 rounded-lg border-2 border-gray-200 object-cover shadow-sm dark:border-zinc-700"
            />
            <button
              onClick={onRemoveImage}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white opacity-0 shadow-md transition-all hover:bg-red-600 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {isRootComposerActive && (replyText.length > 0 || hasReplyImage) && (
          <div className="flex animate-in justify-end gap-2 fade-in">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="rounded-full dark:text-white dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={
                isPostingReply || (!replyText.trim() && !hasReplyImage)
              }
              size="sm"
              className="rounded-full"
            >
              {isPostingReply && (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              )}
              Comment
            </Button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImageChange(file);
          }}
        />
      </div>
    </div>
  );
}
