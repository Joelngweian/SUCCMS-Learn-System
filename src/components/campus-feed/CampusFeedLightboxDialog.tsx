import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import type { CampusPostAttachment } from "./campusFeedTypes";

export function CampusFeedLightboxDialog({
  attachment,
  onOpenChange,
}: {
  attachment: CampusPostAttachment | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(attachment)} onOpenChange={onOpenChange}>
      <DialogContent className="border-0 bg-black/95 p-2 sm:max-w-6xl">
        <DialogTitle className="sr-only">
          {attachment?.name || "Campus post image"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Full-size preview of an image attached to a campus post.
        </DialogDescription>
        {attachment?.url && (
          <img
            src={attachment.url}
            alt={attachment.name}
            className="max-h-[88vh] w-full object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
