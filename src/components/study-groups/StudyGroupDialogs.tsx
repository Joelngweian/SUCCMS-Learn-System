import type { Dispatch, SetStateAction } from "react";
import { Loader2 } from "lucide-react";
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
            Group membership is limited to students enrolled in the selected
            course.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select
              value={value.courseId}
              onValueChange={(courseId) =>
                onChange((current) => ({ ...current, courseId }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
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
            <Input
              type="datetime-local"
              value={value.startsAt}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  startsAt: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>End</Label>
            <Input
              type="datetime-local"
              value={value.endsAt}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  endsAt: event.target.value,
                }))
              }
            />
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
          <div className="space-y-2">
            <Label>
              {value.locationType === "online" ? "Meeting Link" : "Location"}
            </Label>
            <Input
              type={value.locationType === "online" ? "url" : "text"}
              value={
                value.locationType === "online"
                  ? value.meetingUrl
                  : value.locationText
              }
              onChange={(event) =>
                onChange((current) =>
                  current.locationType === "online"
                    ? { ...current, meetingUrl: event.target.value }
                    : { ...current, locationText: event.target.value }
                )
              }
              placeholder={
                value.locationType === "online"
                  ? "https://teams.microsoft.com/..."
                  : "Library Room 3"
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Attendee Limit (Optional)</Label>
            <Input
              type="number"
              min={2}
              max={100}
              value={value.maxAttendees}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  maxAttendees: event.target.value,
                }))
              }
            />
          </div>
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
              !value.startsAt ||
              !value.endsAt ||
              (value.locationType === "online"
                ? !value.meetingUrl.trim()
                : !value.locationText.trim())
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
