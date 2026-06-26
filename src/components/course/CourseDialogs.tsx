import type { ChangeEvent } from "react";
import {
  BookOpenCheck,
  FolderKanban,
  Paperclip,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSESSMENT_TYPE_OPTIONS,
  getAssessmentTitlePlaceholder,
  type AssessmentDraft,
  type AssessmentType,
} from "@/lib/assessmentTypes";
import type {
  CoursePerson,
  CourseResourceFile,
} from "./coursePageTypes";

type AddStudentDialogProps = {
  open: boolean;
  searchQuery: string;
  students: CoursePerson[];
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onAddStudent: (studentId: string) => void;
};

export function AddStudentDialog({
  open,
  searchQuery,
  students,
  onOpenChange,
  onSearchChange,
  onAddStudent,
}: AddStudentDialogProps) {
  const matchingStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" hideCloseButton>
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle>Add Student to Course</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={event => onSearchChange(event.target.value)}
          />

          {matchingStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-lg">
              No matching students found.
            </p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {matchingStudents.map(student => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shadow-sm border border-muted">
                      <AvatarImage src={student.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {student.full_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{student.full_name}</span>
                      <span className="text-xs text-muted-foreground">Student</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => onAddStudent(student.id)}>
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ASSESSMENT_TYPE_ICONS: Record<AssessmentType, LucideIcon> = {
  tutorial: BookOpenCheck,
  individual_assignment: UserRound,
  group_project: UsersRound,
  mini_project: FolderKanban,
};

type CreateAssessmentDialogProps = {
  open: boolean;
  assignment: AssessmentDraft;
  rubricFiles: CourseResourceFile[];
  materialFiles: CourseResourceFile[];
  isUploading: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignmentChange: (assignment: AssessmentDraft) => void;
  onRubricUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onMaterialUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onCreate: () => void;
};

export function CreateAssessmentDialog({
  open,
  assignment,
  rubricFiles,
  materialFiles,
  isUploading,
  onOpenChange,
  onAssignmentChange,
  onRubricUpload,
  onMaterialUpload,
  onCreate,
}: CreateAssessmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"
        hideCloseButton
      >
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle>Create Assessment</DialogTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <div>
              <Label>Assessment Type</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Select the kind of work students will complete.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {ASSESSMENT_TYPE_OPTIONS.map(option => {
                const Icon = ASSESSMENT_TYPE_ICONS[option.value];
                const isSelected =
                  assignment.assessment_type === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      onAssignmentChange({
                        ...assignment,
                        assessment_type: option.value,
                      })
                    }
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/40"
                    }`}
                  >
                    <span
                      className={`rounded-md p-2 ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={assignment.title}
                onChange={event => onAssignmentChange({
                  ...assignment,
                  title: event.target.value,
                })}
                placeholder={getAssessmentTitlePlaceholder(
                  assignment.assessment_type,
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={assignment.due_date}
                onChange={event => onAssignmentChange({
                  ...assignment,
                  due_date: event.target.value,
                })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Instructions</Label>
            <Textarea
              value={assignment.description}
              onChange={event => onAssignmentChange({
                ...assignment,
                description: event.target.value,
              })}
              placeholder="Describe the task..."
            />
          </div>
          <div className="space-y-2">
            <Label>Rubric / Grading Criteria (Optional)</Label>
            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
              {rubricFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rubric attached yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2 justify-center w-full">
                  {rubricFiles.map((file, index) => (
                    <Badge
                      key={`${file.path}-${index}`}
                      variant="outline"
                      className="gap-1 bg-blue-50 text-blue-700 border-blue-200"
                    >
                      <Paperclip className="h-3 w-3" />
                      {file.name}
                    </Badge>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("rubric-upload")?.click()}
                disabled={isUploading}
                className="bg-white dark:bg-zinc-950"
              >
                <Paperclip className="h-4 w-4 mr-2" /> Add Rubric
              </Button>
              <Input
                id="rubric-upload"
                type="file"
                className="hidden"
                onChange={onRubricUpload}
                disabled={isUploading}
                multiple
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Total Marks (Optional)</Label>
            <Input
              type="number"
              value={assignment.points}
              onChange={event => onAssignmentChange({
                ...assignment,
                points: event.target.value,
              })}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label>Attach Materials</Label>
            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
              {materialFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No materials attached yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 justify-center w-full">
                  {materialFiles.map((file, index) => (
                    <Badge
                      key={`${file.path}-${index}`}
                      variant="secondary"
                      className="gap-1"
                    >
                      <Paperclip className="h-3 w-3" />
                      {file.name}
                    </Badge>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("materials-upload")?.click()}
                disabled={isUploading}
                className="bg-white dark:bg-zinc-950"
              >
                <Paperclip className="h-4 w-4 mr-2" /> Add Materials
              </Button>
              <Input
                id="materials-upload"
                type="file"
                className="hidden"
                onChange={onMaterialUpload}
                disabled={isUploading}
                multiple
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={onCreate}
            disabled={
              !assignment.assessment_type
              || !assignment.title.trim()
              || !assignment.due_date
              || isUploading
            }
          >
            Create Assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type NewFolderDialogProps = {
  open: boolean;
  folderName: string;
  error: string;
  onOpenChange: (open: boolean) => void;
  onFolderNameChange: (value: string) => void;
  onCreate: () => void;
};

export function NewFolderDialog({
  open,
  folderName,
  error,
  onOpenChange,
  onFolderNameChange,
  onCreate,
}: NewFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton>
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle>New Folder</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <Input
          value={folderName}
          onChange={event => onFolderNameChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter") void onCreate();
          }}
          placeholder="Folder name"
          autoFocus
        />
        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </div>
        )}
        <DialogFooter>
          <Button onClick={onCreate} disabled={!folderName.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
