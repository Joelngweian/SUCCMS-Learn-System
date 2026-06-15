import type { RefObject } from "react";
import { FileText, Megaphone, Paperclip, Pencil, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminAnnouncement,
  AnnouncementAttachment,
} from "./AdminDashboardTypes";

interface AdminAnnouncementsPanelProps {
  announcements: AdminAnnouncement[];
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  expiry: string;
  files: File[];
  existingAttachments: AnnouncementAttachment[];
  editingId: string | null;
  isPublishing: boolean;
  formRef: RefObject<HTMLDivElement | null>;
  attachmentInputRef: RefObject<HTMLInputElement | null>;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onPriorityChange: (value: "low" | "medium" | "high") => void;
  onExpiryChange: (value: string) => void;
  onRemoveExistingAttachment: (path: string) => void;
  onRemoveFile: (index: number) => void;
  onReset: () => void;
  onPublish: () => void;
  onEdit: (announcement: AdminAnnouncement) => void;
  onDelete: (announcement: AdminAnnouncement) => void;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "border-red-200 bg-red-100 text-red-800";
    case "medium":
      return "border-yellow-200 bg-yellow-100 text-yellow-800";
    case "low":
      return "border-blue-200 bg-blue-100 text-blue-800";
    default:
      return "border-gray-200 bg-gray-100 text-gray-800";
  }
};

export function AdminAnnouncementsPanel({
  announcements,
  title,
  content,
  priority,
  expiry,
  files,
  existingAttachments,
  editingId,
  isPublishing,
  formRef,
  attachmentInputRef,
  onTitleChange,
  onContentChange,
  onPriorityChange,
  onExpiryChange,
  onRemoveExistingAttachment,
  onRemoveFile,
  onReset,
  onPublish,
  onEdit,
  onDelete,
}: AdminAnnouncementsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Campus Announcements</CardTitle>
            {editingId && (
              <p className="mt-1 text-sm text-muted-foreground">
                Editing an existing announcement
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={onReset}
                disabled={isPublishing}
              >
                Cancel
              </Button>
            )}
            <Button
              className="flex items-center gap-2"
              onClick={onPublish}
              disabled={
                isPublishing || !title.trim() || !content.trim()
              }
            >
              {editingId ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Megaphone className="h-4 w-4" />
              )}
              {isPublishing
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Publish Announcement"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={formRef} className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="announcement-title">Title</Label>
            <Input
              id="announcement-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Announcement title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcement-content">Content</Label>
            <Textarea
              id="announcement-content"
              value={content}
              onChange={(event) => onContentChange(event.target.value)}
              placeholder="Write the campus announcement..."
              className="min-h-28"
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments (Optional)</Label>
            {existingAttachments.length > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                {existingAttachments.map((attachment) => (
                  <div
                    key={attachment.path}
                    className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Existing attachment
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        onRemoveExistingAttachment(attachment.path)
                      }
                      title="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {files.length > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => onRemoveFile(index)}
                      title="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => attachmentInputRef.current?.click()}
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Attach
            </Button>
            <p className="text-xs text-muted-foreground">
              Up to 5 images or documents, maximum 10MB each.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) =>
                  onPriorityChange(value as "low" | "medium" | "high")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="announcement-expiry">
                Expires At (Optional)
              </Label>
              <Input
                id="announcement-expiry"
                type="datetime-local"
                value={expiry}
                onChange={(event) => onExpiryChange(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4>Active Announcements</h4>
          {announcements.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              No active announcements.
            </div>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="rounded-lg border p-4">
                {announcement.attachments?.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {announcement.attachments.map((attachment) =>
                      attachment.type.startsWith("image/") ? (
                        <a
                          key={attachment.path}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block overflow-hidden rounded-md border"
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="block object-cover"
                            style={{
                              width: 240,
                              height: 150,
                              maxWidth: "100%",
                            }}
                          />
                        </a>
                      ) : (
                        <a
                          key={attachment.path}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate">{attachment.name}</span>
                        </a>
                      )
                    )}
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium">{announcement.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {announcement.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge className={getPriorityColor(announcement.priority)}>
                      {announcement.priority}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(announcement)}
                      title="Edit announcement"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete announcement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete this announcement?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove the announcement and
                            all of its attachments.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(announcement)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>
                    Published{" "}
                    {new Date(announcement.created_at).toLocaleString()}
                  </span>
                  {announcement.expires_at && (
                    <span>
                      Expires{" "}
                      {new Date(announcement.expires_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
