import { useRef, type Dispatch, type SetStateAction } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { cn } from "../ui/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import type {
  EnrolledCourse,
  NewStudyGroup,
  NewStudySession,
} from "./StudyGroupTypes";
import { GENERAL_STUDY_GROUP_COURSE_ID } from "./StudyGroupTypes";
import {
  combineStudySessionDateTimeValue,
  getStudySessionDateTimeParts,
  hasCompleteStudySessionDateTimeValue,
} from "./studySessionDateTime";

export const STUDY_SESSION_DATE_DISPLAY_PLACEHOLDER = "yyyy-mm-dd";
export const STUDY_SESSION_NATIVE_DATE_INPUT_TYPE = "date";

interface StudySessionDatePickerProps {
  ariaLabel: string;
  value: string;
  onDateChange: (date: string) => void;
}

function StudySessionDatePicker({
  ariaLabel,
  value,
  onDateChange,
}: StudySessionDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;

    input.focus();
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // Some browsers block showPicker outside supported trusted interactions.
      }
    }
    input.click();
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={openPicker}
        className={cn(
          "border-input flex h-9 w-full min-w-0 items-center justify-between rounded-md border bg-input-background px-3 py-1 text-left text-base transition-[color,box-shadow] outline-none md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        )}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || STUDY_SESSION_DATE_DISPLAY_PLACEHOLDER}
        </span>
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
      </button>
      <input
        ref={inputRef}
        aria-hidden="true"
        tabIndex={-1}
        type={STUDY_SESSION_NATIVE_DATE_INPUT_TYPE}
        value={value}
        onChange={(event) => onDateChange(event.target.value)}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
    </div>
  );
}

interface CreateStudyGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: EnrolledCourse[];
  value: NewStudyGroup;
  onChange: Dispatch<SetStateAction<NewStudyGroup>>;
  error: string;
  isSaving: boolean;
  onSubmit: () => void;
}

export function CreateStudyGroupDialog({
  open,
  onOpenChange,
  courses,
  value,
  onChange,
  error,
  isSaving,
  onSubmit,
}: CreateStudyGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="pr-12">
          <DialogTitle>Create Study Group</DialogTitle>
          <DialogDescription>
            Choose a course group for enrolled classmates, or General for
            everyone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Group Scope</Label>
            <Select
              value={value.courseId}
              onValueChange={(courseId) =>
                onChange((current) => ({ ...current, courseId }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GENERAL_STUDY_GROUP_COURSE_ID}>
                  General - Open to everyone
                </SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="study-group-name">Group Name</Label>
            <Input
              id="study-group-name"
              value={value.name}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Database Revision Group"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="study-group-description">Description</Label>
            <Textarea
              id="study-group-description"
              value={value.description}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="What will this group focus on?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="study-group-capacity">Maximum Members</Label>
            <Input
              id="study-group-capacity"
              type="number"
              min={2}
              max={100}
              value={value.maxMembers}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  maxMembers: Number(event.target.value) || 2,
                }))
              }
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            onClick={onSubmit}
            disabled={isSaving || !value.courseId || !value.name.trim()}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StudySessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: NewStudySession;
  onChange: Dispatch<SetStateAction<NewStudySession>>;
  error: string;
  isSaving: boolean;
  onSubmit: () => void;
}

export function StudySessionDialog({
  open,
  onOpenChange,
  value,
  onChange,
  error,
  isSaving,
  onSubmit,
}: StudySessionDialogProps) {
  const startDateTime = getStudySessionDateTimeParts(value.startsAt);
  const endDateTime = getStudySessionDateTimeParts(value.endsAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="pr-12">
          <DialogTitle>Schedule Study Session</DialogTitle>
          <DialogDescription>
            Members will receive a notification when the session is created.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Session Title</Label>
            <Input
              value={value.title}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Final Exam Revision"
            />
          </div>
          <div className="space-y-2">
            <Label>Start</Label>
            <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-2">
              <StudySessionDatePicker
                ariaLabel="Start date"
                value={startDateTime.date}
                onDateChange={(date) =>
                  onChange((current) => ({
                    ...current,
                    startsAt: combineStudySessionDateTimeValue(
                      date,
                      getStudySessionDateTimeParts(current.startsAt).time,
                    ),
                  }))
                }
              />
              <Input
                aria-label="Start time"
                type="time"
                value={startDateTime.time}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    startsAt: combineStudySessionDateTimeValue(
                      getStudySessionDateTimeParts(current.startsAt).date,
                      event.target.value,
                    ),
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>End</Label>
            <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-2">
              <StudySessionDatePicker
                ariaLabel="End date"
                value={endDateTime.date}
                onDateChange={(date) =>
                  onChange((current) => ({
                    ...current,
                    endsAt: combineStudySessionDateTimeValue(
                      date,
                      getStudySessionDateTimeParts(current.endsAt).time,
                    ),
                  }))
                }
              />
              <Input
                aria-label="End time"
                type="time"
                value={endDateTime.time}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    endsAt: combineStudySessionDateTimeValue(
                      getStudySessionDateTimeParts(current.endsAt).date,
                      event.target.value,
                    ),
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location Type</Label>
            <Select
              value={value.locationType}
              onValueChange={(locationType) =>
                onChange((current) => ({ ...current, locationType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">In Person</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {value.locationType === "in_person" && (
            <div className="space-y-2">
            <Label>
              Location
            </Label>
            <Input
              type="text"
              value={value.locationText}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  locationText: event.target.value,
                }))
              }
              placeholder="Library Room 3"
            />
            </div>
          )}
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={value.description}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Topics and preparation notes..."
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 md:col-span-2">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={
              isSaving ||
              !value.title.trim() ||
              !hasCompleteStudySessionDateTimeValue(value.startsAt) ||
              !hasCompleteStudySessionDateTimeValue(value.endsAt) ||
              (value.locationType === "in_person" && !value.locationText.trim())
            }
            onClick={onSubmit}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Schedule Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
