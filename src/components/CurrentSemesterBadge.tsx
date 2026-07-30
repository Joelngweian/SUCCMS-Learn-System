import { CalendarDays } from "lucide-react";
import { useCurrentAcademicTerm } from "@/hooks/useCurrentAcademicTerm";

export function CurrentSemesterBadge() {
  const currentTerm = useCurrentAcademicTerm();

  if (!currentTerm) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300"
      title={currentTerm.name}
    >
      <CalendarDays className="h-3.5 w-3.5" />
      <span>{currentTerm.code}</span>
    </div>
  );
}
