import { useRef, type ChangeEvent, type RefObject } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { CampusMentionSuggestions } from "./CampusMentionSuggestions";
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
  onRemoveSelectedMedia: (mediaId: string) => void;
  onSelectMedia: (event: ChangeEvent<HTMLInputElement>) => void;
  profileAvatarUrl?: string | null;
  profileName?: string | null;
  selectedMedia: SelectedCampusMedia[];
  textareaRef: RefObject<HTMLTextAreaElement>;
}) {
  const firstName = profileName?.split(" ")[0] || "Scholar";
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="overflow-visible shadow-sm">
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
                    <img
                      src={media.previewUrl}
                      alt={media.file.name}
                      className="h-36 w-full object-cover"
                    />
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
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCreating || selectedMedia.length >= 4}
                >
                  <ImagePlus className="h-4 w-4 text-emerald-600" />
                  Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={onSelectMedia}
                />
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  Campus-wide 路 students, lecturers and admins
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
