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
      className: "bg-green-50/60 text-green-700",
      valueClassName: "text-green-800",
    },
    {
      label: "Late",
      value: summary.late,
      className: "bg-amber-50/60 text-amber-700",
      valueClassName: "text-amber-800",
    },
    {
      label: "Absent",
      value: summary.absent,
      className: "bg-red-50/60 text-red-700",
      valueClassName: "text-red-800",
    },
    {
      label: "Excused",
      value: summary.excused,
      className: "bg-blue-50/60 text-blue-700",
      valueClassName: "text-blue-800",
    },
    {
      label: "Not Checked In",
      value: summary.unmarked,
      className: "bg-muted/30 text-muted-foreground",
      valueClassName: "",
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
                <span className="text-green-700">
                  {session.present} credited
                </span>
                <span className="text-red-700">
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
