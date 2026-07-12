import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type RefObject,
} from "react";
import { ImagePlus, Loader2, Send, Video, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { CampusMentionSuggestions } from "./CampusMentionSuggestions";
import { LazyForumEmojiPicker } from "./LazyForumEmojiPicker";
import {
  MAX_CAMPUS_POST_MEDIA_FILES,
  isCampusVideoType,
} from "./campusFeedLimits";
import { getCampusMemberInitials } from "./campusFeedPresentation";
import type {
  ActiveCampusMention,
  CampusMentionSuggestion,
  CampusMentionTarget,
} from "./campusMentions";
import type { SelectedCampusMedia } from "./campusFeedTypes";

export function CampusPostComposer({
  activeMention,
  composerError,
  draftContent,
  isCreating,
  isMentionLoading,
  mentionSuggestions,
  onCreatePost,
  onDraftChange,
  onMentionChange,
  onMentionSelect,
  onDropMedia,
  onEmojiSelect,
  onRemoveSelectedMedia,
  onSelectMedia,
  profileAvatarUrl,
  profileName,
  selectedMedia,
  textareaRef,
}: {
  activeMention: ActiveCampusMention | null;
  composerError: string;
  draftContent: string;
  isCreating: boolean;
  isMentionLoading: boolean;
  mentionSuggestions: CampusMentionSuggestion[];
  onCreatePost: () => void;
  onDraftChange: (value: string) => void;
  onMentionChange: (
    target: CampusMentionTarget,
    value: string,
    cursorPosition: number | null,
  ) => void;
  onMentionSelect: (suggestion: CampusMentionSuggestion) => void;
  onDropMedia: (files: File[]) => void;
  onEmojiSelect: (emoji: string) => void;
  onRemoveSelectedMedia: (mediaId: string) => void;
  onSelectMedia: (event: ChangeEvent<HTMLInputElement>) => void;
  profileAvatarUrl?: string | null;
  profileName?: string | null;
  selectedMedia: SelectedCampusMedia[];
  textareaRef: RefObject<HTMLTextAreaElement>;
}) {
  const firstName = profileName?.split(" ")[0] || "Scholar";
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);

  const hasDraggedFiles = (event: DragEvent<HTMLDivElement>) =>
    Array.from(event.dataTransfer.types).includes("Files");

  const handleMediaDrag = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    if (!isCreating) setIsDraggingMedia(true);
  };

  const handleMediaDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    setIsDraggingMedia(false);
    if (isCreating) return;
    onDropMedia(Array.from(event.dataTransfer.files));
  };

  return (
    <Card
      className={`overflow-visible shadow-sm transition-colors ${
        isDraggingMedia
          ? "border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/20"
          : ""
      }`}
      onDragEnter={handleMediaDrag}
      onDragOver={handleMediaDrag}
      onDragLeave={() => setIsDraggingMedia(false)}
      onDrop={handleMediaDrop}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profileAvatarUrl || undefined} />
            <AvatarFallback>
              {getCampusMemberInitials(profileName || "Campus Member")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={draftContent}
                onChange={event => {
                  onDraftChange(event.target.value);
                  onMentionChange(
                    "composer",
                    event.target.value,
                    event.currentTarget.selectionStart,
                  );
                }}
                onClick={event =>
                  onMentionChange(
                    "composer",
                    event.currentTarget.value,
                    event.currentTarget.selectionStart,
                  )
                }
                onKeyUp={event =>
                  onMentionChange(
                    "composer",
                    event.currentTarget.value,
                    event.currentTarget.selectionStart,
                  )
                }
                placeholder={`What's on your mind, ${firstName}?`}
                maxLength={5000}
                className="min-h-24 resize-none border-0 bg-muted/60 px-4 py-3 shadow-none focus-visible:ring-1"
              />
              <CampusMentionSuggestions
                activeMention={activeMention}
                isLoading={isMentionLoading}
                onSelect={onMentionSelect}
                suggestions={mentionSuggestions}
                target="composer"
              />
            </div>

            {selectedMedia.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {selectedMedia.map(media => (
                  <div
                    key={media.id}
                    className="group relative overflow-hidden rounded-lg border bg-muted"
                  >
                    {isCampusVideoType(media.file.type) ? (
                      <video
                        src={media.previewUrl}
                        controls
                        muted
                        playsInline
                        preload="metadata"
                        className="h-36 w-full bg-black object-cover"
                      >
                        <track kind="captions" />
                      </video>
                    ) : (
                      <img
                        src={media.previewUrl}
                        alt={media.file.name}
                        className="h-36 w-full object-cover"
                      />
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-2 h-7 w-7 rounded-full opacity-90"
                      onClick={() => onRemoveSelectedMedia(media.id)}
                      aria-label={`Remove ${media.file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {composerError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {composerError}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={
                    isCreating
                    || selectedMedia.length >= MAX_CAMPUS_POST_MEDIA_FILES
                  }
                >
                  <ImagePlus className="h-4 w-4 text-emerald-600" />
                  Photo
                </Button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={onSelectMedia}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={
                    isCreating
                    || selectedMedia.length >= MAX_CAMPUS_POST_MEDIA_FILES
                  }
                >
                  <Video className="h-4 w-4 text-blue-600" />
                  Video
                </Button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  multiple
                  className="hidden"
                  onChange={onSelectMedia}
                />
                <LazyForumEmojiPicker onSelect={onEmojiSelect} />
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {isDraggingMedia
                    ? "Drop photos or videos here"
                    : "Campus-wide - students, lecturers and admins"}
                </span>
              </div>
              <Button
                type="button"
                className="bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                onClick={onCreatePost}
                disabled={
                  isCreating
                  || (!draftContent.trim() && selectedMedia.length === 0)
                }
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Post
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
