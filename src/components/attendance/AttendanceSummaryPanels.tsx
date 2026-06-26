import type {
  AttendanceSummary,
  SessionSummary,
} from "./attendanceTypes";
import { formatClassDate } from "./attendanceTypes";

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
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border p-3 ${card.className}`}
        >
          <p className="text-xs">{card.label}</p>
          <p className={`mt-1 text-xl font-semibold ${card.valueClassName}`}>
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

export function RecentClasses({
  sessions,
  selectedDate,
  onSelect,
}: RecentClassesProps) {
  return (
    <aside className="space-y-3">
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
        <div className="space-y-2">
          {sessions.slice(0, 8).map((session) => (
            <button
              type="button"
              key={session.date}
              onClick={() => onSelect(session.date)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
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
