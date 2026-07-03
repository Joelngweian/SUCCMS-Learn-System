import {
  type ChangeEvent,
  type RefObject,
} from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { CampusMentionSuggestions } from "./CampusMentionSuggestions";
import {
  MAX_CAMPUS_POST_MEDIA_FILES,
} from "./campusFeedLimits";
import type {
  CampusPostAttachment,
  SelectedCampusMedia,
} from "./campusFeedTypes";
import type {
  ActiveCampusMention,
  CampusMentionSuggestion,
} from "./campusMentions";

type CampusPostEditFormProps = {
  activeMention: ActiveCampusMention | null;
  editAttachments: CampusPostAttachment[];
  editDraft: string;
  editError: string;
  editFileInputRef: RefObject<HTMLInputElement>;
  editPostTextareaRef: RefObject<HTMLTextAreaElement>;
  editSelectedMedia: SelectedCampusMedia[];
  isMentionLoading: boolean;
  isUpdating: boolean;
  mentionSuggestions: CampusMentionSuggestion[];
  onCancel: () => void;
  onDraftChange: (value: string) => void;
  onMentionChange: (value: string, cursorPosition: number | null) => void;
  onMentionSelect: (suggestion: CampusMentionSuggestion) => void;
  onRemoveExistingAttachment: (path: string) => void;
  onRemoveNewMedia: (mediaId: string) => void;
  onSave: () => void;
  onSelectEditMedia: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function CampusPostEditForm({
  activeMention,
  editAttachments,
  editDraft,
  editError,
  editFileInputRef,
  editPostTextareaRef,
  editSelectedMedia,
  isMentionLoading,
  isUpdating,
  mentionSuggestions,
  onCancel,
  onDraftChange,
  onMentionChange,
  onMentionSelect,
  onRemoveExistingAttachment,
  onRemoveNewMedia,
  onSave,
  onSelectEditMedia,
}: CampusPostEditFormProps) {
  const attachedCount = editAttachments.length + editSelectedMedia.length;

  return (
    <div className="space-y-3 px-4">
      <div className="relative">
        <Textarea
          ref={editPostTextareaRef}
          value={editDraft}
          onChange={event => {
            onDraftChange(event.target.value);
            onMentionChange(
              event.target.value,
              event.currentTarget.selectionStart,
            );
          }}
          onClick={event =>
            onMentionChange(
              event.currentTarget.value,
              event.currentTarget.selectionStart,
            )
          }
          onKeyUp={event =>
            onMentionChange(
              event.currentTarget.value,
              event.currentTarget.selectionStart,
            )
          }
          maxLength={5000}
          className="min-h-28 resize-y"
          autoFocus
          aria-label="Edit post content"
        />
        <CampusMentionSuggestions
          activeMention={activeMention}
          isLoading={isMentionLoading}
          onSelect={onMentionSelect}
          suggestions={mentionSuggestions}
          target="editPost"
        />
      </div>

      {attachedCount > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {editAttachments.map(attachment => (
            <div
              key={attachment.path}
              className="group relative overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={attachment.url}
                alt={attachment.name}
                className="h-28 w-full object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full opacity-90"
                onClick={() => onRemoveExistingAttachment(attachment.path)}
                disabled={isUpdating}
                aria-label={`Remove ${attachment.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {editSelectedMedia.map(media => (
            <div
              key={media.id}
              className="group relative overflow-hidden rounded-lg border border-primary/30 bg-muted"
            >
              <img
                src={media.previewUrl}
                alt={media.file.name}
                className="h-28 w-full object-cover"
              />
              <Badge className="absolute bottom-1.5 left-1.5 text-[10px]">
                New
              </Badge>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full opacity-90"
                onClick={() => onRemoveNewMedia(media.id)}
                disabled={isUpdating}
                aria-label={`Remove ${media.file.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {editError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {editError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editFileInputRef.current?.click()}
            disabled={isUpdating || attachedCount >= MAX_CAMPUS_POST_MEDIA_FILES}
          >
            <ImagePlus className="h-4 w-4 text-emerald-600" />
            Add photos
          </Button>
          <input
            ref={editFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={onSelectEditMedia}
          />
          <span className="text-xs text-muted-foreground">
            {attachedCount}/{MAX_CAMPUS_POST_MEDIA_FILES}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isUpdating || (!editDraft.trim() && attachedCount === 0)}
          >
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
