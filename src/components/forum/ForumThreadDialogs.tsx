import type { RefObject } from "react";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ForumCourse } from "./forumTypes";

type ThreadDraft = {
  title: string;
  content: string;
  course_id: string;
};

type ThreadEditDraft = {
  title: string;
  content: string;
};

type CreateDiscussionDialogProps = {
  open: boolean;
  courses: ForumCourse[];
  draft: ThreadDraft;
  images: File[];
  imagePreviews: string[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  isSaving: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: ThreadDraft) => void;
  onRemoveImage: (index: number) => void;
  onAddImages: (files: File[]) => void;
  onSubmit: () => void;
};

export function CreateDiscussionDialog({
  open,
  courses,
  draft,
  images,
  imagePreviews,
  fileInputRef,
  isSaving,
  error,
  onOpenChange,
  onDraftChange,
  onRemoveImage,
  onAddImages,
  onSubmit,
}: CreateDiscussionDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!isSaving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        hideCloseButton
        className="max-w-2xl dark:bg-zinc-900 dark:border-zinc-800"
      >
        <button
          type="button"
          aria-label="Close discussion dialog"
          disabled={isSaving}
          onClick={() => onOpenChange(false)}
          className="absolute z-10 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          style={{ top: "16px", right: "16px", left: "auto" }}
        >
          <X className="h-5 w-5" />
        </button>
        <DialogHeader className="pr-12">
          <DialogTitle className="text-2xl dark:text-white">
            Start a New Discussion
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Where to post?
            </label>
            <Select
              value={draft.course_id}
              onValueChange={courseId =>
                onDraftChange({ ...draft, course_id: courseId })
              }
            >
              <SelectTrigger
                className="h-12 text-base dark:bg-gray-100 dark:border-gray-300"
                style={{ color: "black" }}
              >
                <SelectValue placeholder="Select Context" />
              </SelectTrigger>
              <SelectContent className="dark:bg-zinc-800 dark:border-zinc-700">
                <SelectItem value="general" className="font-bold text-purple-600">
                  General Lounge (Campus Life)
                </SelectItem>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Topic Title
            </label>
            <Input
              placeholder="E.g., How do I solve the Tutorial 3 bug? #Homework"
              className="h-12 text-lg dark:bg-gray-100 dark:border-gray-300"
              style={{ color: "black" }}
              value={draft.title}
              onChange={event =>
                onDraftChange({ ...draft, title: event.target.value })
              }
            />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Content
            </label>
            <Textarea
              placeholder="Write your thoughts here..."
              className="min-h-[200px] p-4 text-base leading-relaxed whitespace-pre-wrap dark:bg-gray-100 dark:border-gray-300"
              style={{ color: "black" }}
              value={draft.content}
              onChange={event =>
                onDraftChange({ ...draft, content: event.target.value })
              }
            />

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Attachments ({images.length}/5)
              </label>
              <div className="flex flex-wrap gap-3">
                {imagePreviews.map((src, index) => (
                  <div key={`${src}-${index}`} className="group relative inline-block">
                    <img
                      src={src}
                      alt="Preview"
                      className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200 dark:border-zinc-700 shadow-sm"
                    />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                      onClick={() => onRemoveImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <button
                    type="button"
                    className="h-24 w-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg hover:border-primary dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-zinc-800/50 transition-all duration-200 group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-6 w-6 text-gray-400 group-hover:text-primary transition-colors" />
                    <span className="text-xs text-gray-400 group-hover:text-primary font-medium mt-1 transition-colors">
                      Add Photo
                    </span>
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={event => {
                    onAddImages(Array.from(event.target.files || []));
                    event.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={onSubmit}
            size="lg"
            className="w-full sm:w-auto font-bold"
            disabled={!draft.title.trim() || !draft.content.trim() || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Posting..." : "Post Discussion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type EditDiscussionDialogProps = {
  open: boolean;
  draft: ThreadEditDraft;
  existingImages: string[];
  images: File[];
  imagePreviews: string[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  isSaving: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: ThreadEditDraft) => void;
  onRemoveExistingImage: (index: number) => void;
  onRemoveNewImage: (index: number) => void;
  onAddImages: (files: File[]) => void;
  onSubmit: () => void;
};

export function EditDiscussionDialog({
  open,
  draft,
  existingImages,
  images,
  imagePreviews,
  fileInputRef,
  isSaving,
  error,
  onOpenChange,
  onDraftChange,
  onRemoveExistingImage,
  onRemoveNewImage,
  onAddImages,
  onSubmit,
}: EditDiscussionDialogProps) {
  const imageCount = existingImages.length + images.length;

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!isSaving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        hideCloseButton
        className="max-w-2xl dark:bg-zinc-900 dark:border-zinc-800"
      >
        <button
          type="button"
          aria-label="Close edit dialog"
          disabled={isSaving}
          onClick={() => onOpenChange(false)}
          className="absolute z-50 flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          style={{ top: "24px", right: "24px", left: "auto" }}
        >
          <X className="h-4 w-4" />
        </button>
        <DialogHeader className="pr-12">
          <DialogTitle className="text-2xl dark:text-white">
            Edit Discussion
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Topic Title
            </label>
            <Input
              className="h-12 text-lg dark:bg-gray-100 dark:border-gray-300"
              style={{ color: "black" }}
              value={draft.title}
              onChange={event =>
                onDraftChange({ ...draft, title: event.target.value })
              }
            />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Content
            </label>
            <Textarea
              className="min-h-[180px] p-4 text-base leading-relaxed whitespace-pre-wrap dark:bg-gray-100 dark:border-gray-300"
              style={{ color: "black" }}
              value={draft.content}
              onChange={event =>
                onDraftChange({ ...draft, content: event.target.value })
              }
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Images ({imageCount}/5)
            </label>
            <div className="flex flex-wrap gap-3">
              {existingImages.map((src, index) => (
                <div
                  key={`existing-${src}-${index}`}
                  className="group relative inline-block"
                >
                  <img
                    src={src}
                    alt="Existing attachment"
                    className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200 dark:border-zinc-700 shadow-sm"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-all"
                    onClick={() => onRemoveExistingImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {imagePreviews.map((src, index) => (
                <div
                  key={`new-${src}-${index}`}
                  className="group relative inline-block"
                >
                  <img
                    src={src}
                    alt="New attachment preview"
                    className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200 dark:border-zinc-700 shadow-sm"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-all"
                    onClick={() => onRemoveNewImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {imageCount < 5 && (
                <button
                  type="button"
                  className="h-24 w-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg hover:border-primary dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-zinc-800/50 transition-all duration-200 group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-6 w-6 text-gray-400 group-hover:text-primary transition-colors" />
                  <span className="text-xs text-gray-400 group-hover:text-primary font-medium mt-1 transition-colors">
                    Add Photo
                  </span>
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={event => {
                  onAddImages(Array.from(event.target.files || []));
                  event.target.value = "";
                }}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!draft.title.trim() || !draft.content.trim() || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
