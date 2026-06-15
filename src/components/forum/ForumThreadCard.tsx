import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Edit2, Loader2, MessageCircle, Pin, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ForumThread } from "./forumTypes";

const renderMentionedText = (content: string) => {
  const parts = content.split(/(@everyone|@[\w\u00C0-\uFFFF-]+)/g);

  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith("@")) {
      return (
        <span
          key={`${part}-${index}`}
          className="rounded bg-blue-50 px-1 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        >
          {part}
        </span>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
};

function ThreadContentPreview({ content }: { content: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const element = contentRef.current;
    if (!element || isExpanded) return;

    const measureOverflow = () => {
      setHasOverflow(element.scrollHeight > element.clientHeight + 1);
    };

    measureOverflow();
    const frame = window.requestAnimationFrame(measureOverflow);
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(element);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [content, isExpanded]);

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsExpanded((current) => !current);
  };

  return (
    <div className="forum-thread-preview">
      <div
        ref={contentRef}
        className={`forum-thread-preview-text text-base leading-relaxed text-gray-600 dark:text-gray-100${
          isExpanded ? " expanded" : ""
        }`}
      >
        {renderMentionedText(content)}
      </div>
      {(hasOverflow || isExpanded) && (
        <button
          type="button"
          className="forum-thread-preview-toggle"
          onClick={handleToggle}
          aria-expanded={isExpanded}
        >
          {isExpanded ? "Show less" : "See more"}
        </button>
      )}
    </div>
  );
}

interface ForumThreadCardProps {
  thread: ForumThread;
  currentUserId?: string;
  deletingThreadId: string | null;
  courseBadge: ReactNode;
  reactionBar: ReactNode;
  formatDate: (value: string) => string;
  onOpen: (threadId: string) => void;
  onOpenProfile: (event: MouseEvent, userId: string) => void;
  onEdit: (thread: ForumThread, event: MouseEvent) => void;
  onDelete: (threadId: string, event: MouseEvent) => void;
  onOpenImage: (imageUrl: string) => void;
}

export function ForumThreadCard({
  thread,
  currentUserId,
  deletingThreadId,
  courseBadge,
  reactionBar,
  formatDate,
  onOpen,
  onOpenProfile,
  onEdit,
  onDelete,
  onOpenImage,
}: ForumThreadCardProps) {
  const replyCount =
    thread.replies && thread.replies[0] ? thread.replies[0].count : 0;
  const isOwnThread = thread.author_id === currentUserId;

  return (
    <Card
      className="group cursor-pointer border-2 border-gray-200 transition-all duration-200 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
      onClick={() => onOpen(thread.id)}
    >
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3"
            onClick={(event) => onOpenProfile(event, thread.author?.id)}
          >
            <Avatar className="h-10 w-10 border border-gray-200 transition-all hover:ring-2 hover:ring-primary">
              <AvatarImage src={thread.author?.avatar_url} />
              <AvatarFallback>{thread.author?.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 hover:underline dark:text-white">
                  {thread.author?.full_name}
                </span>
                {thread.author?.role === "lecturer" && (
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    Lecturer
                  </Badge>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(thread.created_at)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isOwnThread && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  onClick={(event) => onEdit(thread, event)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-red-500 hover:text-red-700"
                  disabled={deletingThreadId === thread.id}
                  onClick={(event) => onDelete(thread.id, event)}
                >
                  {deletingThreadId === thread.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
            {thread.is_pinned && (
              <Pin className="h-5 w-5 rotate-45 fill-blue-100 text-blue-500" />
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xl font-bold text-gray-900 transition-colors group-hover:text-primary dark:text-white">
            {thread.title}
          </h3>
          <ThreadContentPreview content={thread.content || ""} />

          {(thread?.images ?? []).length > 0 && (
            <div className="mt-4 flex h-48 items-center justify-center overflow-hidden rounded-lg bg-gray-100 p-3 dark:bg-zinc-800/50">
              <div className="flex h-full w-full flex-wrap items-center justify-center gap-2">
                {(thread?.images ?? [])
                  .slice(0, 4)
                  .map((image: string, index: number) =>
                    image ? (
                      <img
                        key={`${image}-${index}`}
                        src={image}
                        alt="Preview"
                        className="h-full max-w-1/2 cursor-pointer rounded border object-contain transition-opacity hover:opacity-90 dark:border-zinc-700"
                        onClick={() => onOpenImage(image)}
                        onError={() =>
                          console.error("Image failed to load:", image)
                        }
                      />
                    ) : null
                  )}
                {(thread?.images ?? []).length > 4 && (
                  <div className="flex h-40 w-20 cursor-pointer items-center justify-center rounded bg-gray-300 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-400 dark:bg-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-600">
                    +{(thread?.images ?? []).length - 4}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {courseBadge}
          <Badge
            className="border-none"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "#d1d5db",
            }}
          >
            #{thread.category}
          </Badge>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-zinc-800">
          {reactionBar}
          <div className="flex items-center gap-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              {replyCount} replies
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
