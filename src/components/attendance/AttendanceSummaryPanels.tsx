import type {
  AttendanceSummary,
  SessionSummary,
} from "./attendanceTypes";
import { formatClassDate } from "./attendanceTypes";
import { CalendarDays, Check } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

interface AttendanceSummaryCardsProps {
  summary: AttendanceSummary;
}

export function AttendanceSummaryCards({
  summary,
}: AttendanceSummaryCardsProps) {
  const cards = [
    {
      label: "Present",
      value: summary.present,
      className:
        "border-green-200 bg-green-50/70 text-green-700 dark:border-green-900/60 dark:bg-green-950/35 dark:text-green-300",
      valueClassName: "text-green-800 dark:text-green-200",
    },
    {
      label: "Late",
      value: summary.late,
      className:
        "border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300",
      valueClassName: "text-amber-800 dark:text-amber-200",
    },
    {
      label: "Absent",
      value: summary.absent,
      className:
        "border-red-200 bg-red-50/70 text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-300",
      valueClassName: "text-red-800 dark:text-red-200",
    },
    {
      label: "Excused",
      value: summary.excused,
      className:
        "border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-300",
      valueClassName: "text-blue-800 dark:text-blue-200",
    },
    {
      label: "Not Checked In",
      value: summary.unmarked,
      className:
        "border-slate-200 bg-muted/30 text-muted-foreground dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
      valueClassName: "dark:text-slate-100",
      spanClassName: "col-span-2 sm:col-span-1",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border p-2.5 sm:p-3 ${card.className} ${
            card.spanClassName || ""
          }`}
        >
          <p className="text-xs">{card.label}</p>
          <p
            className={`mt-1 text-lg font-semibold sm:text-xl ${card.valueClassName}`}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

interface RecentClassesProps {
  sessions: SessionSummary[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

export function RecentClassesDialogButton({
  sessions,
  selectedDate,
  onSelect,
}: RecentClassesProps) {
  const selectedSession = sessions.find(
    (session) => session.date === selectedDate,
  );

  return (
    <div className="xl:hidden">
      {sessions.length === 0 ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-start gap-2 text-muted-foreground"
          disabled
        >
          <CalendarDays className="h-4 w-4" />
          No recent classes
        </Button>
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-between gap-3 px-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">Recent Classes</span>
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {selectedSession
                  ? formatClassDate(selectedSession.date)
                  : `${sessions.length} saved`}
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-4 sm:p-6">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle>Recent Classes</DialogTitle>
              <DialogDescription>
                Select a saved class date to review or edit attendance.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {sessions.slice(0, 12).map((session) => (
                <DialogClose asChild key={session.date}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selectedDate === session.date
                        ? "border-primary bg-primary/5"
                        : "bg-card hover:bg-muted/40"
                    }`}
                    onClick={() => onSelect(session.date)}
                  >
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        selectedDate === session.date
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {formatClassDate(session.date)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {session.slots} slot
                        {session.slots === 1 ? "" : "s"} ·{" "}
                        {session.present} credited · {session.absent} absent
                      </span>
                    </span>
                  </button>
                </DialogClose>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
export function RecentClasses({
  sessions,
  selectedDate,
  onSelect,
}: RecentClassesProps) {
  return (
    <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
      <div>
        <h3 className="text-sm font-semibold">Recent Classes</h3>
        <p className="text-xs text-muted-foreground">
          Select a date to review or edit it.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
          No saved class sessions yet.
        </div>
      ) : (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:mx-0 xl:block xl:space-y-2 xl:overflow-visible xl:px-0 xl:pb-0">
          {sessions.slice(0, 8).map((session) => (
            <button
              type="button"
              key={session.date}
              onClick={() => onSelect(session.date)}
              className={`min-w-[210px] rounded-lg border p-3 text-left transition-colors xl:w-full ${
                selectedDate === session.date
                  ? "border-primary bg-primary/5"
                  : "bg-card hover:bg-muted/30"
              }`}
            >
              <p className="text-sm font-medium">
                {formatClassDate(session.date)}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  {session.slots} slot{session.slots === 1 ? "" : "s"}
                </span>
                <span className="text-green-700 dark:text-green-300">
                  {session.present} credited
                </span>
                <span className="text-red-700 dark:text-red-300">
                  {session.absent} absent
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
