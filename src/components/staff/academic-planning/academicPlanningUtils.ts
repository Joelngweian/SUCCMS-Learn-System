import type { LecturerOption, StudyPlanVersion } from "@/data/academicPlanningRepository";
import type { AcademicTermOption, CourseTemplateSummary } from "@/data/courseRepository";

export const ALL_FILTER_VALUE = "all";
export const ASSIGNMENT_COURSES_PAGE_SIZE = 8;
export const STUDENT_ASSIGNMENT_PAGE_SIZE = 10;
export const activeSegmentClassName = "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600";

export type StudentAssignmentStatusFilter = "unassigned" | "assigned" | "all";
export type AssignmentStatusFilter = "need" | "assigned" | "all";
export type AcademicCalendarStatus = "planned" | "active" | "closed";

export type AssignmentTermOption = {
  academicTerm: AcademicTermOption | null;
  code: string;
  label: string;
};

export const assignmentStatusLabel: Record<AssignmentStatusFilter, string> = {
  need: "Need Assign",
  assigned: "Assigned",
  all: "All",
};

export const studentAssignmentStatusLabel: Record<StudentAssignmentStatusFilter, string> = {
  unassigned: "Need Assign",
  assigned: "Assigned",
  all: "All",
};

export const academicCalendarStatusClassName: Record<AcademicCalendarStatus, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  closed: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  planned: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
};

export const normalizeAssignmentCourseCode = (value?: string | null) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s*\/\s*/g, "/");

export const courseCodeAliases = (value?: string | null) => {
  const normalized = normalizeAssignmentCourseCode(value);
  if (!normalized) return [];
  return Array.from(new Set([normalized, ...normalized.split("/").map(code => code.trim()).filter(Boolean)]));
};

export const normalizeTermCode = (value?: string | null) => {
  const normalized = String(value || "").trim().toUpperCase();
  const match = normalized.match(/^(\d{4})([ABC])$/);
  return match ? `${match[1]}${match[2]}` : null;
};

export const creditLimitForTermCode = (termCode?: string | null) => {
  const normalized = normalizeTermCode(termCode);
  if (!normalized) return null;
  const semester = normalized.slice(-1);
  if (semester === "A") return 9;
  if (semester === "B" || semester === "C") return 21;
  return null;
};

export const termSortValue = (termCode?: string | null) => {
  const normalized = normalizeTermCode(termCode);
  if (!normalized) return Number.MAX_SAFE_INTEGER;
  const year = Number(normalized.slice(0, 4));
  const semester = normalized.slice(4);
  const semesterIndex = semester === "A" ? 0 : semester === "B" ? 1 : 2;
  return year * 3 + semesterIndex;
};

export const compareTermCodes = (left?: string | null, right?: string | null) =>
  termSortValue(left) - termSortValue(right) || String(left || "").localeCompare(String(right || ""));

export const termLabelFromCode = (termCode: string) => {
  const normalized = normalizeTermCode(termCode) || termCode;
  const year = normalized.slice(0, 4);
  const semester = normalized.slice(4);
  return `${normalized} - Semester ${semester} ${year}`;
};

export const studyPlanVersionTermCode = (version: StudyPlanVersion) =>
  normalizeTermCode(version.effective_from_term_code) ||
  normalizeTermCode(version.intake_year && version.intake_semester ? `${version.intake_year}${version.intake_semester}` : null);

export const versionIntakeLabel = (version: StudyPlanVersion) =>
  `${version.intake_year || "Any"}${version.intake_semester || ""}${version.track_code ? ` ${version.track_code}` : ""}`;

export const versionLabel = (version: StudyPlanVersion) =>
  `${version.programme_key} ${versionIntakeLabel(version)}`;

export const normalizeStudentIdentifierForAssignment = (value?: string | null) =>
  String(value || "").trim().toLowerCase();

export const studentIdentifierKeys = (student: { email?: string | null; id: string }) => {
  const email = normalizeStudentIdentifierForAssignment(student.email);
  const localPart = email.includes("@") ? email.split("@")[0] : email;
  return Array.from(new Set([student.id.toLowerCase(), email, localPart].filter(Boolean)));
};

export const courseTemplateLabel = (course?: CourseTemplateSummary) => {
  if (!course) return "Unknown course";
  return `${course.course_code || course.code} - ${course.name}`;
};

export const termLabel = (term?: AcademicTermOption) => {
  if (!term) return "Unknown semester";
  return `${term.code} - ${term.name}`;
};

export const isCalendarBackedAcademicTerm = (term?: AcademicTermOption | null) => Boolean(
  term?.code
  && (term.starts_at || term.teaching_starts_at)
  && (term.ends_at || term.teaching_ends_at),
);

export const formatDateLabel = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const parseAcademicTermDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const todayDateOnly = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const academicTermStartDate = (term: AcademicTermOption) =>
  parseAcademicTermDate(term.teaching_starts_at || term.starts_at);

const academicTermEndDate = (term: AcademicTermOption) =>
  parseAcademicTermDate(term.teaching_ends_at || term.ends_at);

export const resolveAcademicTermStatus = (term: AcademicTermOption): AcademicCalendarStatus => {
  const today = todayDateOnly();
  const startsAt = academicTermStartDate(term);
  const endsAt = academicTermEndDate(term);

  if (endsAt && endsAt < today) return "closed";
  if (startsAt && startsAt <= today && (!endsAt || endsAt >= today)) return "active";
  if (startsAt && startsAt > today) return "planned";
  return term.status === "active" || term.status === "closed" || term.status === "planned"
    ? term.status
    : "planned";
};

export const nextAcademicCalendarYearLabel = (term?: AcademicTermOption | null) => {
  const normalized = normalizeTermCode(term?.code);
  if (!normalized) return "next";
  const year = Number(normalized.slice(0, 4));
  const semester = normalized.slice(4);
  return String(semester === "C" ? year + 1 : year);
};

export const buildAssignmentTermOptions = (
  academicTerms: AcademicTermOption[],
  currentTermCode?: string | null,
): AssignmentTermOption[] => {
  const currentSortValue = normalizeTermCode(currentTermCode)
    ? termSortValue(currentTermCode)
    : null;

  return academicTerms
    .filter(isCalendarBackedAcademicTerm)
    .map(term => ({ code: normalizeTermCode(term.code), term }))
    .filter((entry): entry is { code: string; term: AcademicTermOption } => Boolean(entry.code))
    .filter(({ code }) => currentSortValue === null || termSortValue(code) >= currentSortValue)
    .sort((left, right) => compareTermCodes(left.code, right.code))
    .map(({ code, term }) => ({
      academicTerm: term,
      code,
      label: termLabel(term),
    }));
};

export const lecturerLabel = (lecturer?: LecturerOption) =>
  lecturer?.full_name || "Unknown lecturer";
