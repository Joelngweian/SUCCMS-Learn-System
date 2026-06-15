import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
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
import { formatClassDate, type AttendanceSession } from "./attendanceTypes";

interface TeacherAttendanceDialogsProps {
  selectedDate: string;
  today: string;
  sessionDuration: string;
  selectedSession: AttendanceSession | null;
  startOpen: boolean;
  correctionOpen: boolean;
  deleteOpen: boolean;
  correctedDate: string;
  errorMessage: string;
  isCorrectingDate: boolean;
  isDeletingClass: boolean;
  onStartOpenChange: (open: boolean) => void;
  onCorrectionOpenChange: (open: boolean) => void;
  onDeleteOpenChange: (open: boolean) => void;
  onCorrectedDateChange: (value: string) => void;
  onConfirmStart: () => void;
  onCorrectDate: () => void;
  onDeleteClass: () => void;
}

export function TeacherAttendanceDialogs({
  selectedDate,
  today,
  sessionDuration,
  selectedSession,
  startOpen,
  correctionOpen,
  deleteOpen,
  correctedDate,
  errorMessage,
  isCorrectingDate,
  isDeletingClass,
  onStartOpenChange,
  onCorrectionOpenChange,
  onDeleteOpenChange,
  onCorrectedDateChange,
  onConfirmStart,
  onCorrectDate,
  onDeleteClass,
}: TeacherAttendanceDialogsProps) {
  const classDate = formatClassDate(
    selectedSession?.class_date || selectedDate
  );

  return (
    <>
      <AlertDialog open={startOpen} onOpenChange={onStartOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedSession
                ? "Reopen Student Check-In?"
                : "Start Student Check-In?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that this class is on{" "}
              <strong className="text-foreground">
                {formatClassDate(selectedDate)}
              </strong>
              . A new six-character code will remain valid for{" "}
              {sessionDuration} minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmStart}>
              Confirm and Start
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={correctionOpen}
        onOpenChange={(open) => {
          if (!isCorrectingDate) onCorrectionOpenChange(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Correct Class Date</DialogTitle>
            <DialogDescription>
              This moves the check-in session and every student attendance
              record from {classDate}.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label
              htmlFor="correct-attendance-date"
              className="mb-1.5 block text-sm font-medium"
            >
              Correct Date
            </label>
            <Input
              id="correct-attendance-date"
              type="date"
              value={correctedDate}
              max={today}
              onChange={(event) =>
                onCorrectedDateChange(event.target.value)
              }
            />
          </div>

          {errorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onCorrectionOpenChange(false)}
              disabled={isCorrectingDate}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onCorrectDate}
              disabled={
                isCorrectingDate ||
                correctedDate.length === 0 ||
                correctedDate > today ||
                correctedDate === selectedSession?.class_date
              }
            >
              {isCorrectingDate && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Correct Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!isDeletingClass) onDeleteOpenChange(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete This Class Record?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the check-in session and every student
              attendance record for{" "}
              <strong className="text-foreground">{classDate}</strong>. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingClass}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault();
                onDeleteClass();
              }}
              disabled={isDeletingClass}
            >
              {isDeletingClass && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
