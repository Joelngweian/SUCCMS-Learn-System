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
import {
  formatClassDate,
  getSessionTimingState,
  type AttendanceSession,
} from "./attendanceTypes";

interface TeacherAttendanceDialogsProps {
  selectedDate: string;
  today: string;
  classHours: string;
  sessionDuration: string;
  selectedSession: AttendanceSession | null;
  startOpen: boolean;
  correctionOpen: boolean;
  correctedDate: string;
  errorMessage: string;
  isCorrectingDate: boolean;
  onStartOpenChange: (open: boolean) => void;
  onCorrectionOpenChange: (open: boolean) => void;
  onCorrectedDateChange: (value: string) => void;
  onConfirmStart: () => void;
  onCorrectDate: () => void;
}

export function TeacherAttendanceDialogs({
  selectedDate,
  today,
  classHours,
  sessionDuration,
  selectedSession,
  startOpen,
  correctionOpen,
  correctedDate,
  errorMessage,
  isCorrectingDate,
  onStartOpenChange,
  onCorrectionOpenChange,
  onCorrectedDateChange,
  onConfirmStart,
  onCorrectDate,
}: TeacherAttendanceDialogsProps) {
  const classDate = formatClassDate(
    selectedSession?.class_date || selectedDate
  );
  const selectedSessionIsUpcoming =
    selectedSession != null &&
    getSessionTimingState(selectedSession) === "upcoming";

  return (
    <>
      <AlertDialog open={startOpen} onOpenChange={onStartOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedSessionIsUpcoming
                ? "Open This Hour Now?"
                : selectedSession
                  ? "Reopen Student Check-In?"
                  : "Start Student Check-In?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that this class is on{" "}
              <strong className="text-foreground">
                {formatClassDate(selectedDate)}
              </strong>
              . The system will create{" "}
              <strong className="text-foreground">
                {selectedSession
                  ? selectedSessionIsUpcoming
                    ? "a check-in code for this hour without changing its scheduled time"
                    : "a check-in code for the selected hour"
                  : `${classHours} hourly slot${classHours === "1" ? "" : "s"}`}
              </strong>
              , and each code will remain valid for {sessionDuration} minutes.
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

    </>
  );
}
