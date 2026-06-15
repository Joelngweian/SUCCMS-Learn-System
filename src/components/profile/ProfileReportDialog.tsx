import { Loader2 } from "lucide-react";
import { REPORT_REASON_OPTIONS } from "@/lib/reporting";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

interface ProfileReportDialogProps {
  details: string;
  isReporting: boolean;
  onDetailsChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
  open: boolean;
  reason: string;
}

export function ProfileReportDialog({
  details,
  isReporting,
  onDetailsChange,
  onOpenChange,
  onReasonChange,
  onSubmit,
  open,
  reason,
}: ProfileReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report User</DialogTitle>
          <DialogDescription>
            Reports are sent privately to platform administrators for review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Reason</Label>
          <Select value={reason} onValueChange={onReasonChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_REASON_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-user-details">Details (Optional)</Label>
          <Textarea
            id="report-user-details"
            value={details}
            onChange={event => onDetailsChange(event.target.value)}
            placeholder="Explain what happened..."
            maxLength={1000}
            className="min-h-24"
          />
          <p className="text-right text-xs text-muted-foreground">
            {details.length}/1000
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isReporting}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!reason || isReporting}>
            {isReporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
