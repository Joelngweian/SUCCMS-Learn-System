export type StudyPlanProgrammeKey = "IT" | "CS" | "BOSE";
export type StudyPlanLevel = "Diploma" | "Bachelor";

export interface StudyPlanCourseEntry {
  programmeKey: StudyPlanProgrammeKey;
  programmeName: string;
  level: StudyPlanLevel;
  intakeYear: number;
  intakeSemester: "A" | "B" | "C";
  termCode: string;
  courseCode: string | null;
  courseName: string;
  category: string | null;
  creditHours: number | null;
  isPlaceholder: boolean;
  sourceFiles: string[];
  position: number;
  planCourseKey: string;
}

export interface AcademicTermCalendar {
  id?: string;
  code: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  enrollment_starts_at: string | null;
  enrollment_ends_at: string | null;
  status: string | null;
}

export const FALLBACK_ACADEMIC_TERM_CALENDAR: AcademicTermCalendar[] = [
  { code: "2026A", name: "Semester A 2026", starts_at: "2026-03-02", ends_at: "2026-05-01", enrollment_starts_at: "2026-02-09", enrollment_ends_at: "2026-03-12", status: "closed" },
  { code: "2026B", name: "Semester B 2026", starts_at: "2026-05-25", ends_at: "2026-09-18", enrollment_starts_at: "2026-05-18", enrollment_ends_at: "2026-06-04", status: "active" },
  { code: "2026C", name: "Semester C 2026", starts_at: "2026-10-05", ends_at: "2027-01-29", enrollment_starts_at: "2026-09-28", enrollment_ends_at: "2026-10-15", status: "planned" },
];

const isDateWithin = (date: Date, start: string | null, end: string | null) => {
  if (!start || !end) return false;
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return current >= Date.parse(`${start}T00:00:00Z`) && current <= Date.parse(`${end}T23:59:59Z`);
};

export function getFallbackCurrentAcademicTerm(now = new Date()): AcademicTermCalendar {
  const ranked = FALLBACK_ACADEMIC_TERM_CALENDAR
    .map(term => {
      const enrollmentMatch = isDateWithin(now, term.enrollment_starts_at, term.enrollment_ends_at);
      const teachingMatch = isDateWithin(now, term.starts_at, term.ends_at);
      const enrollmentStart = term.enrollment_starts_at ? Date.parse(`${term.enrollment_starts_at}T00:00:00Z`) : Number.POSITIVE_INFINITY;
      const teachingStart = term.starts_at ? Date.parse(`${term.starts_at}T00:00:00Z`) : Number.POSITIVE_INFINITY;
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      return {
        term,
        rank: enrollmentMatch ? 0 : teachingMatch ? 1 : enrollmentStart >= today ? 2 : teachingStart >= today ? 3 : 4,
        sortDate: enrollmentStart >= today ? enrollmentStart : teachingStart >= today ? teachingStart : -Math.max(enrollmentStart, teachingStart),
      };
    })
    .sort((left, right) => left.rank - right.rank || left.sortDate - right.sortDate);

  return ranked[0]?.term || FALLBACK_ACADEMIC_TERM_CALENDAR[0];
}

export function getProgrammeKeyFromProgramme(programme?: string | null): StudyPlanProgrammeKey | null {
  const value = (programme || "").toLowerCase();
  if (value.includes("software engineering")) return "BOSE";
  if (value.includes("information technology")) return "IT";
  if (value.includes("computer science")) return "CS";
  return null;
}

export function parseStudentIdFromEmail(email?: string | null) {
  const localPart = (email || "").split("@")[0]?.trim().toUpperCase() || "";
  const match = /^([DB])(\d{2})\d{4}([ABC])$/.exec(localPart);
  if (!match) return null;
  return {
    id: localPart,
    level: match[1] === "B" ? "Bachelor" as const : "Diploma" as const,
    intakeYear: 2000 + Number(match[2]),
    intakeSemester: match[3] as "A" | "B" | "C",
  };
}

export function isConcreteStudyPlanEntry(entry: StudyPlanCourseEntry) {
  return Boolean(entry.courseCode && !entry.isPlaceholder);
}