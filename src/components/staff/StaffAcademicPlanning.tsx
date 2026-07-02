import { lazy, Suspense, type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  UserRoundCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { notify } from "@/lib/notify";
import {
  addStudyPlanCourse,
  assignCourseOfferingToLecturer,
  assignStudentStudyPlan,
  deleteStudyPlanCourse,
  importStudyPlanVersion,
  listCourseAssignmentsForTerm,
  listLecturerOptions,
  listAssignableStudents,
  listPlannedCoursesForTerm,
  listStudentStudyPlanAssignments,
  unassignStudentStudyPlan,
  listStudyPlanCourses,
  listStudyPlanVersions,
  type AssignableStudent,
  type CourseAssignmentSummary,
  type DbStudyPlanCourse,
  type LecturerOption,
  type PlannedAssignmentCourse,
  type StudentStudyPlanAssignment,
  type StudyPlanVersion,
} from "@/data/academicPlanningRepository";
import {
  parseStudyPlanFiles,
  type ParsedStudyPlanImport,
} from "@/data/studyPlanImportParser";
import {
  parseLecturerAssignmentFile,
  type ParsedLecturerAssignmentRow,
} from "@/data/lecturerAssignmentImportParser";
import {
  parseStudentStudyPlanAssignmentFile,
  type ParsedStudentStudyPlanAssignmentRow,
} from "@/data/studentStudyPlanAssignmentImportParser";
import { getProgrammeKeyFromProgramme } from "@/data/studyPlanUtils";
import {
  parseAcademicCalendarPdf,
  type ParsedAcademicCalendar,
} from "@/data/academicCalendarParser";
import {
  getAcademicTermOptions,
  getCourseCatalogTemplates,
  getCurrentEnrollmentTerm,
  upsertAcademicTermsFromCalendar,
  type AcademicTermOption,
  type CourseTemplateSummary,
  type CurrentEnrollmentTerm,
} from "@/data/courseRepository";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { StaffAcademicPlanningProvider } from "./academic-planning/AcademicPlanningContext";
import { ImportTemplateHelpDialog } from "./academic-planning/ImportTemplateHelpDialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "../ui/table";

const StudyPlansTabContent = lazy(() =>
  import("./academic-planning/StudyPlansTabContent").then(module => ({ default: module.StudyPlansTabContent })),
);
const AcademicCalendarTabContent = lazy(() =>
  import("./academic-planning/AcademicCalendarTabContent").then(module => ({ default: module.AcademicCalendarTabContent })),
);
const StudentStudyPlansTabContent = lazy(() =>
  import("./academic-planning/StudentStudyPlansTabContent").then(module => ({ default: module.StudentStudyPlansTabContent })),
);
const ClassAssignmentTabContent = lazy(() =>
  import("./academic-planning/ClassAssignmentTabContent").then(module => ({ default: module.ClassAssignmentTabContent })),
);

const emptyCourseForm = {
  category: "",
  courseCode: "",
  courseName: "",
  creditHours: "3",
  isPlaceholder: "false",
  termCode: "2026B",
};

const ALL_FILTER_VALUE = "all";
const ASSIGNMENT_COURSES_PAGE_SIZE = 8;
const STUDENT_ASSIGNMENT_PAGE_SIZE = 10;
const activeSegmentClassName = "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600";
const academicPlanningTabs = ["study-plans", "academic-calendar", "student-study-plans", "assignments"] as const;
type AcademicPlanningTab = (typeof academicPlanningTabs)[number];
const parseAcademicPlanningTab = (value?: string | null): AcademicPlanningTab =>
  academicPlanningTabs.includes(value as AcademicPlanningTab)
    ? (value as AcademicPlanningTab)
    : "study-plans";
type StudentAssignmentStatusFilter = "unassigned" | "assigned" | "all";

type AssignmentStatusFilter = "need" | "assigned" | "all";
type ImportTemplateHelpType = "study-plan" | "student-assignment" | "lecturer-assignment";
type AcademicCalendarStatus = "planned" | "active" | "closed";

type AssignmentListItem = {
  assignedLecturerIds: string[];
  assignments: CourseAssignmentSummary[];
  assignable: boolean;
  categories: string[];
  courseCode: string;
  courseId: string | null;
  courseName: string;
  creditHours: number | null;
  issue: string | null;
  key: string;
  programmeGroup: string;
  programmeLabel: string;
  programmes: string[];
  plannedRows: PlannedAssignmentCourse[];
};

type AssignmentImportPreviewRow = ParsedLecturerAssignmentRow & {
  course?: CourseTemplateSummary;
  lecturer?: LecturerOption;
  message: string;
  status: "ready" | "invalid" | "already-assigned";
};

type AssignmentImportPreview = {
  fileName: string;
  rows: AssignmentImportPreviewRow[];
  warnings: string[];
};

type StudentAssignmentImportPreviewRow = ParsedStudentStudyPlanAssignmentRow & {
  message: string;
  status: "ready" | "invalid" | "already-assigned";
  student?: AssignableStudent;
  studyPlanVersion?: StudyPlanVersion;
};

type StudentAssignmentImportPreview = {
  fileName: string;
  rows: StudentAssignmentImportPreviewRow[];
  warnings: string[];
};

const normalizeAssignmentCourseCode = (value?: string | null) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s*\/\s*/g, "/");

const courseCodeAliases = (value?: string | null) => {
  const normalized = normalizeAssignmentCourseCode(value);
  if (!normalized) return [];
  return Array.from(new Set([normalized, ...normalized.split("/").map(code => code.trim()).filter(Boolean)]));
};

type AssignmentTermOption = {
  academicTerm: AcademicTermOption | null;
  code: string;
  label: string;
};

const normalizeTermCode = (value?: string | null) => {
  const normalized = String(value || "").trim().toUpperCase();
  const match = normalized.match(/^(\d{4})([ABC])$/);
  return match ? `${match[1]}${match[2]}` : null;
};

const termSortValue = (termCode?: string | null) => {
  const normalized = normalizeTermCode(termCode);
  if (!normalized) return Number.MAX_SAFE_INTEGER;
  const year = Number(normalized.slice(0, 4));
  const semester = normalized.slice(4);
  const semesterIndex = semester === "A" ? 0 : semester === "B" ? 1 : 2;
  return year * 3 + semesterIndex;
};

const compareTermCodes = (left?: string | null, right?: string | null) =>
  termSortValue(left) - termSortValue(right) || String(left || "").localeCompare(String(right || ""));

const termLabelFromCode = (termCode: string) => {
  const normalized = normalizeTermCode(termCode) || termCode;
  const year = normalized.slice(0, 4);
  const semester = normalized.slice(4);
  return `${normalized} - Semester ${semester} ${year}`;
};

const studyPlanVersionTermCode = (version: StudyPlanVersion) =>
  normalizeTermCode(version.effective_from_term_code) ||
  normalizeTermCode(version.intake_year && version.intake_semester ? `${version.intake_year}${version.intake_semester}` : null);

const assignmentStatusLabel: Record<AssignmentStatusFilter, string> = {
  need: "Need Assignment",
  assigned: "Assigned",
  all: "All",
};

const versionIntakeLabel = (version: StudyPlanVersion) =>
  `${version.intake_year || "Any"}${version.intake_semester || ""}${version.track_code ? ` ${version.track_code}` : ""}`;

const versionLabel = (version: StudyPlanVersion) =>
  `${version.programme_key} ${versionIntakeLabel(version)} - ${version.version_code}`;

const studentAssignmentStatusLabel: Record<StudentAssignmentStatusFilter, string> = {
  unassigned: "Need Assignment",
  assigned: "Assigned",
  all: "All",
};

const normalizeStudentIdentifierForAssignment = (value?: string | null) =>
  String(value || "").trim().toLowerCase();

const studentIdentifierKeys = (student: AssignableStudent) => {
  const email = normalizeStudentIdentifierForAssignment(student.email);
  const localPart = email.includes("@") ? email.split("@")[0] : email;
  return Array.from(new Set([student.id.toLowerCase(), email, localPart].filter(Boolean)));
};

const courseTemplateLabel = (course?: CourseTemplateSummary) => {
  if (!course) return "Unknown course";
  return `${course.course_code || course.code} - ${course.name}`;
};

const termLabel = (term?: AcademicTermOption) => {
  if (!term) return "Unknown semester";
  return `${term.code} - ${term.name}`;
};

const isCalendarBackedAcademicTerm = (term?: AcademicTermOption | null) => Boolean(
  term?.code
  && (term.starts_at || term.teaching_starts_at)
  && (term.ends_at || term.teaching_ends_at),
);

const formatDateLabel = (value?: string | null) => {
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

const resolveAcademicTermStatus = (term: AcademicTermOption): AcademicCalendarStatus => {
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

const nextAcademicCalendarYearLabel = (term?: AcademicTermOption | null) => {
  const normalized = normalizeTermCode(term?.code);
  if (!normalized) return "next";
  const year = Number(normalized.slice(0, 4));
  const semester = normalized.slice(4);
  return String(semester === "C" ? year + 1 : year);
};
const academicCalendarStatusClassName: Record<AcademicCalendarStatus, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  closed: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  planned: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
};

const buildAssignmentTermOptions = (
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

const lecturerLabel = (lecturer?: LecturerOption) =>
  lecturer?.full_name || "Unknown lecturer";

function AcademicPlanningTabFallback() {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}

export function StaffAcademicPlanning() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activePlanningTab, setActivePlanningTab] = useState<AcademicPlanningTab>(
    parseAcademicPlanningTab(searchParams.get("tab")),
  );
  const [versions, setVersions] = useState<StudyPlanVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [versionProgrammeFilter, setVersionProgrammeFilter] = useState(ALL_FILTER_VALUE);
  const [versionIntakeFilter, setVersionIntakeFilter] = useState(ALL_FILTER_VALUE);
  const [versionLevelFilter, setVersionLevelFilter] = useState(ALL_FILTER_VALUE);
  const [studyPlanImportPreview, setStudyPlanImportPreview] = useState<ParsedStudyPlanImport | null>(null);
  const [isParsingStudyPlan, setIsParsingStudyPlan] = useState(false);
  const [isImportingStudyPlan, setIsImportingStudyPlan] = useState(false);
  const [isStudyPlanPreviewDialogOpen, setIsStudyPlanPreviewDialogOpen] = useState(false);
  const [academicCalendarPreview, setAcademicCalendarPreview] = useState<ParsedAcademicCalendar | null>(null);
  const [isParsingAcademicCalendar, setIsParsingAcademicCalendar] = useState(false);
  const [isImportingAcademicCalendar, setIsImportingAcademicCalendar] = useState(false);
  const [showClosedAcademicTerms, setShowClosedAcademicTerms] = useState(false);
  const [templateHelpType, setTemplateHelpType] = useState<ImportTemplateHelpType | null>(null);
  const [versionCourses, setVersionCourses] = useState<DbStudyPlanCourse[]>([]);
  const [students, setStudents] = useState<AssignableStudent[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<StudentStudyPlanAssignment[]>([]);
  const [studentAssignmentSearchTerm, setStudentAssignmentSearchTerm] = useState("");
  const [studentAssignmentStatusFilter, setStudentAssignmentStatusFilter] =
    useState<StudentAssignmentStatusFilter>("unassigned");
  const [studentAssignmentProgrammeFilter, setStudentAssignmentProgrammeFilter] = useState(ALL_FILTER_VALUE);
  const [selectedStudentAssignmentVersionId, setSelectedStudentAssignmentVersionId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentAssignmentPage, setStudentAssignmentPage] = useState(1);
  const [studentAssignmentImportPreview, setStudentAssignmentImportPreview] =
    useState<StudentAssignmentImportPreview | null>(null);
  const [isParsingStudentAssignmentImport, setIsParsingStudentAssignmentImport] = useState(false);
  const [isApplyingStudentAssignmentImport, setIsApplyingStudentAssignmentImport] = useState(false);
  const [isAssigningStudents, setIsAssigningStudents] = useState(false);
  const [versionCourseTermFilter, setVersionCourseTermFilter] = useState(ALL_FILTER_VALUE);
  const [lecturers, setLecturers] = useState<LecturerOption[]>([]);
  const [courseTemplates, setCourseTemplates] = useState<CourseTemplateSummary[]>([]);
  const [terms, setTerms] = useState<AcademicTermOption[]>([]);
  const [currentEnrollmentTerm, setCurrentEnrollmentTerm] = useState<CurrentEnrollmentTerm | null>(null);
  const [assignments, setAssignments] = useState<CourseAssignmentSummary[]>([]);
  const [plannedAssignmentCourses, setPlannedAssignmentCourses] = useState<PlannedAssignmentCourse[]>([]);
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<AssignmentStatusFilter>("need");
  const [assignmentProgrammeFilter, setAssignmentProgrammeFilter] = useState(ALL_FILTER_VALUE);
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState("");
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [selectedAssignmentKeys, setSelectedAssignmentKeys] = useState<string[]>([]);
  const [bulkLecturerId, setBulkLecturerId] = useState("");
  const [assignmentRowLecturers, setAssignmentRowLecturers] = useState<Record<string, string>>({});
  const [assignmentImportPreview, setAssignmentImportPreview] = useState<AssignmentImportPreview | null>(null);
  const [isParsingAssignmentImport, setIsParsingAssignmentImport] = useState(false);
  const [isApplyingAssignmentImport, setIsApplyingAssignmentImport] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [assignmentForm, setAssignmentForm] = useState({
    termCode: "",
  });

  useEffect(() => {
    const nextTab = parseAcademicPlanningTab(searchParams.get("tab"));
    setActivePlanningTab(current => (current === nextTab ? current : nextTab));
  }, [searchParams]);

  const handlePlanningTabChange = (value: string) => {
    const nextTab = parseAcademicPlanningTab(value);
    setActivePlanningTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", nextTab);
    setSearchParams(nextParams, { replace: true });
  };
  const selectedVersion = useMemo(
    () => versions.find(version => version.id === selectedVersionId) || null,
    [selectedVersionId, versions],
  );

  const selectedStudentAssignmentVersion = useMemo(
    () => versions.find(version => version.id === selectedStudentAssignmentVersionId) || null,
    [selectedStudentAssignmentVersionId, versions],
  );

  const studentAssignmentByStudentId = useMemo(() => {
    const map = new Map<string, StudentStudyPlanAssignment>();
    for (const assignment of studentAssignments) {
      if (assignment.status === "active") map.set(assignment.student_id, assignment);
    }
    return map;
  }, [studentAssignments]);

  const versionById = useMemo(
    () => new Map(versions.map(version => [version.id, version])),
    [versions],
  );

  const versionByCode = useMemo(
    () => new Map(versions.map(version => [version.version_code.trim().toLowerCase(), version])),
    [versions],
  );

  const studentByIdentifier = useMemo(() => {
    const map = new Map<string, AssignableStudent>();
    for (const student of students) {
      for (const key of studentIdentifierKeys(student)) {
        if (!map.has(key)) map.set(key, student);
      }
    }
    return map;
  }, [students]);

  const versionProgrammeOptions = useMemo(
    () => Array.from(new Set(versions.map(version => version.programme_key))).sort(),
    [versions],
  );

  const versionIntakeOptions = useMemo(
    () => Array.from(new Set(versions.map(versionIntakeLabel))).sort(),
    [versions],
  );

  const versionLevelOptions = useMemo(
    () => Array.from(new Set(versions.map(version => version.level))).sort(),
    [versions],
  );

  const filteredVersions = useMemo(
    () =>
      versions.filter(version => {
        const programmeMatches =
          versionProgrammeFilter === ALL_FILTER_VALUE ||
          version.programme_key === versionProgrammeFilter;
        const intakeMatches =
          versionIntakeFilter === ALL_FILTER_VALUE ||
          versionIntakeLabel(version) === versionIntakeFilter;
        const levelMatches =
          versionLevelFilter === ALL_FILTER_VALUE || version.level === versionLevelFilter;
        return programmeMatches && intakeMatches && levelMatches;
      }),
    [versionIntakeFilter, versionLevelFilter, versionProgrammeFilter, versions],
  );

  const studentProgrammeOptions = useMemo(
    () => Array.from(new Set(students.map(student => student.programme || "No programme"))).sort(),
    [students],
  );

  const studentAssignmentProgrammeKey = useMemo(
    () => studentAssignmentProgrammeFilter === ALL_FILTER_VALUE
      ? null
      : getProgrammeKeyFromProgramme(studentAssignmentProgrammeFilter),
    [studentAssignmentProgrammeFilter],
  );

  const studentAssignmentVersionOptions = useMemo(() => {
    if (studentAssignmentProgrammeFilter === ALL_FILTER_VALUE) return versions;
    if (studentAssignmentProgrammeKey) {
      return versions.filter(version => version.programme_key === studentAssignmentProgrammeKey);
    }

    const normalizedProgramme = studentAssignmentProgrammeFilter.trim().toLowerCase();
    return versions.filter(version => version.programme_name.trim().toLowerCase() === normalizedProgramme);
  }, [studentAssignmentProgrammeFilter, studentAssignmentProgrammeKey, versions]);

  const studentAssignmentRows = useMemo(() => {
    const search = studentAssignmentSearchTerm.trim().toLowerCase();
    return students
      .map(student => {
        const assignment = studentAssignmentByStudentId.get(student.id) || null;
        const assignedVersion = assignment ? versionById.get(assignment.study_plan_version_id) || null : null;
        return { assignment, assignedVersion, student };
      })
      .filter(row => {
        const assigned = Boolean(row.assignment);
        const statusMatches =
          studentAssignmentStatusFilter === "all" ||
          (studentAssignmentStatusFilter === "assigned" && assigned) ||
          (studentAssignmentStatusFilter === "unassigned" && !assigned);
        const programmeMatches =
          studentAssignmentProgrammeFilter === ALL_FILTER_VALUE ||
          (row.student.programme || "No programme") === studentAssignmentProgrammeFilter;
        const searchMatches =
          !search ||
          row.student.full_name.toLowerCase().includes(search) ||
          String(row.student.email || "").toLowerCase().includes(search) ||
          String(row.student.programme || "").toLowerCase().includes(search) ||
          String(row.assignedVersion?.version_code || "").toLowerCase().includes(search);
        return statusMatches && programmeMatches && searchMatches;
      });
  }, [studentAssignmentByStudentId, studentAssignmentProgrammeFilter, studentAssignmentSearchTerm, studentAssignmentStatusFilter, students, versionById]);

  const studentAssignmentPageCount = Math.max(
    1,
    Math.ceil(studentAssignmentRows.length / STUDENT_ASSIGNMENT_PAGE_SIZE),
  );
  const studentAssignmentPageStartIndex = (studentAssignmentPage - 1) * STUDENT_ASSIGNMENT_PAGE_SIZE;
  const paginatedStudentAssignmentRows = studentAssignmentRows.slice(
    studentAssignmentPageStartIndex,
    studentAssignmentPageStartIndex + STUDENT_ASSIGNMENT_PAGE_SIZE,
  );

  const visibleStudentIds = useMemo(
    () => paginatedStudentAssignmentRows.map(row => row.student.id),
    [paginatedStudentAssignmentRows],
  );

  const visibleStudentSelectionState = useMemo(() => {
    if (visibleStudentIds.length === 0) return false;
    const selectedVisibleCount = visibleStudentIds.filter(id => selectedStudentIds.includes(id)).length;
    if (selectedVisibleCount === 0) return false;
    return selectedVisibleCount === visibleStudentIds.length ? true : "indeterminate";
  }, [selectedStudentIds, visibleStudentIds]);

  const studentAssignmentSummary = useMemo(() => {
    const assigned = students.filter(student => studentAssignmentByStudentId.has(student.id)).length;
    return {
      assigned,
      need: Math.max(0, students.length - assigned),
      total: students.length,
    };
  }, [studentAssignmentByStudentId, students]);

  const importTermSummary = useMemo(() => {
    if (!studyPlanImportPreview) return [];
    const termCounts = new Map<string, number>();
    for (const course of studyPlanImportPreview.courses) {
      termCounts.set(course.termCode, (termCounts.get(course.termCode) || 0) + 1);
    }
    return Array.from(termCounts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([termCode, count]) => ({ termCode, count }));
  }, [studyPlanImportPreview]);

  const importPreviewCoursesByTerm = useMemo(() => {
    if (!studyPlanImportPreview) return [];
    const grouped = new Map<string, ParsedStudyPlanImport["courses"]>();

    for (const course of studyPlanImportPreview.courses) {
      const termCourses = grouped.get(course.termCode) || [];
      termCourses.push(course);
      grouped.set(course.termCode, termCourses);
    }

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([termCode, courses]) => ({
        termCode,
        courses: courses.slice().sort((left, right) => left.position - right.position),
      }));
  }, [studyPlanImportPreview]);

  const versionCourseTermOptions = useMemo(
    () => Array.from(new Set(versionCourses.map(course => course.term_code).filter(Boolean))).sort(),
    [versionCourses],
  );

  const filteredVersionCourses = useMemo(
    () =>
      versionCourseTermFilter === ALL_FILTER_VALUE
        ? versionCourses
        : versionCourses.filter(course => course.term_code === versionCourseTermFilter),
    [versionCourseTermFilter, versionCourses],
  );

  const versionCourseGroups = useMemo(() => {
    const grouped = new Map<string, DbStudyPlanCourse[]>();

    for (const course of filteredVersionCourses) {
      const termCode = course.term_code || "Unassigned";
      const courses = grouped.get(termCode) || [];
      courses.push(course);
      grouped.set(termCode, courses);
    }

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([termCode, courses]) => {
        const sortedCourses = courses.slice().sort((left, right) => {
          const positionDiff = (left.position || 0) - (right.position || 0);
          return positionDiff || left.course_name.localeCompare(right.course_name);
        });
        const totalCredits = sortedCourses.reduce(
          (sum, course) => sum + (Number(course.credit_hours) || 0),
          0,
        );

        return { courses: sortedCourses, termCode, totalCredits };
      });
  }, [filteredVersionCourses]);





  const courseById = useMemo(
    () => new Map(courseTemplates.map(course => [course.id, course])),
    [courseTemplates],
  );
  const termById = useMemo(
    () => new Map(terms.map(term => [term.id, term])),
    [terms],
  );
  const lecturerById = useMemo(
    () => new Map(lecturers.map(lecturer => [lecturer.id, lecturer])),
    [lecturers],
  );

  const lecturerByEmail = useMemo(() => {
    const map = new Map<string, LecturerOption>();
    for (const lecturer of lecturers) {
      const email = String(lecturer.email || "").trim().toLowerCase();
      if (email) map.set(email, lecturer);
    }
    return map;
  }, [lecturers]);
  const lecturerByName = useMemo(() => {
    const map = new Map<string, LecturerOption>();
    for (const lecturer of lecturers) {
      const name = lecturer.full_name.trim().toLowerCase();
      if (name) map.set(name, lecturer);
    }
    return map;
  }, [lecturers]);

  const courseByCode = useMemo(() => {
    const map = new Map<string, CourseTemplateSummary>();
    for (const course of courseTemplates) {
      for (const code of [...courseCodeAliases(course.course_code), ...courseCodeAliases(course.code)]) {
        if (!map.has(code)) map.set(code, course);
      }
    }
    return map;
  }, [courseTemplates]);

  const calendarTerms = useMemo(
    () => terms.filter(isCalendarBackedAcademicTerm),
    [terms],
  );

  const visibleCalendarTerms = useMemo(
    () => calendarTerms.filter(term => showClosedAcademicTerms || resolveAcademicTermStatus(term) !== "closed"),
    [calendarTerms, showClosedAcademicTerms],
  );

  const latestCalendarTerm = useMemo(
    () => calendarTerms.slice().sort((left, right) => compareTermCodes(left.code, right.code)).at(-1) || null,
    [calendarTerms],
  );

  const isAcademicCalendarExpired = Boolean(
    latestCalendarTerm && resolveAcademicTermStatus(latestCalendarTerm) === "closed",
  );

  const assignmentTermOptions = useMemo(
    () => buildAssignmentTermOptions(calendarTerms, currentEnrollmentTerm?.code),
    [calendarTerms, currentEnrollmentTerm?.code],
  );

  const selectedAssignmentTermOption = useMemo(
    () => assignmentTermOptions.find(term => term.code === assignmentForm.termCode) || null,
    [assignmentForm.termCode, assignmentTermOptions],
  );

  const selectedAssignmentTerm = selectedAssignmentTermOption?.academicTerm || null;

  const assignmentItems = useMemo<AssignmentListItem[]>(() => {
    const assignmentsByCourseId = new Map<string, CourseAssignmentSummary[]>();
    for (const assignment of assignments) {
      if (!assignment.course_id) continue;
      const rows = assignmentsByCourseId.get(assignment.course_id) || [];
      rows.push(assignment);
      assignmentsByCourseId.set(assignment.course_id, rows);
    }

    const grouped = new Map<string, AssignmentListItem & { categorySet: Set<string>; programmeSet: Set<string> }>();

    for (const plannedCourse of plannedAssignmentCourses) {
      const matchingCourse = courseCodeAliases(plannedCourse.course_code)
        .map(code => courseByCode.get(code))
        .find(Boolean);
      const key = matchingCourse?.id ? `course:${matchingCourse.id}` : `plan:${plannedCourse.id}`;
      const courseCode = normalizeAssignmentCourseCode(plannedCourse.course_code || matchingCourse?.course_code || matchingCourse?.code) || "No code";
      const existing = grouped.get(key);

      if (existing) {
        existing.plannedRows.push(plannedCourse);
        existing.programmeSet.add(plannedCourse.programme_key);
        if (plannedCourse.category) existing.categorySet.add(plannedCourse.category);
        continue;
      }

      const courseAssignments = matchingCourse?.id
        ? assignmentsByCourseId.get(matchingCourse.id) || []
        : [];
      const programmeSet = new Set<string>([plannedCourse.programme_key]);
      const categorySet = new Set<string>();
      if (plannedCourse.category) categorySet.add(plannedCourse.category);
      const issue = !plannedCourse.course_code
        ? "No course code in study plan"
        : plannedCourse.is_placeholder
          ? "Placeholder course"
          : !matchingCourse
            ? "Course catalog match missing"
            : null;

      grouped.set(key, {
        assignedLecturerIds: courseAssignments.map(assignment => assignment.owner_id).filter(Boolean) as string[],
        assignments: courseAssignments,
        assignable: Boolean(matchingCourse?.id && !plannedCourse.is_placeholder),
        categories: [],
        categorySet,
        courseCode,
        courseId: matchingCourse?.id || null,
        courseName: matchingCourse?.name || plannedCourse.course_name,
        creditHours: matchingCourse?.credit_hours ?? matchingCourse?.credits ?? plannedCourse.credit_hours,
        issue,
        key,
        plannedRows: [plannedCourse],
        programmeGroup: plannedCourse.programme_key,
        programmeLabel: plannedCourse.programme_key,
        programmes: [],
        programmeSet,
      });
    }

    return Array.from(grouped.values())
      .map(item => {
        const programmes = Array.from(item.programmeSet).sort();
        return {
          ...item,
          categories: Array.from(item.categorySet).sort(),
          programmeGroup: programmes.length > 1 ? "Shared Courses" : programmes[0] || "Unmapped",
          programmeLabel: programmes.join(" / ") || "Unmapped",
          programmes,
        };
      })
      .sort((left, right) =>
        left.programmeGroup.localeCompare(right.programmeGroup) ||
        left.courseCode.localeCompare(right.courseCode) ||
        left.courseName.localeCompare(right.courseName),
      );
  }, [assignments, courseByCode, plannedAssignmentCourses]);

  const assignmentItemByCourseId = useMemo(() => {
    const map = new Map<string, AssignmentListItem>();
    for (const item of assignmentItems) {
      if (item.courseId && !map.has(item.courseId)) map.set(item.courseId, item);
    }
    return map;
  }, [assignmentItems]);

  const assignmentProgrammeOptions = useMemo(
    () => Array.from(new Set(assignmentItems.map(item => item.programmeGroup))).sort(),
    [assignmentItems],
  );

  const filteredAssignmentItems = useMemo(() => {
    const search = assignmentSearchTerm.trim().toLowerCase();
    return assignmentItems.filter(item => {
      const assigned = item.assignments.length > 0;
      const statusMatches =
        assignmentStatusFilter === "all" ||
        (assignmentStatusFilter === "assigned" && assigned) ||
        (assignmentStatusFilter === "need" && item.assignable && !assigned);
      const programmeMatches =
        assignmentProgrammeFilter === ALL_FILTER_VALUE || item.programmeGroup === assignmentProgrammeFilter;
      const searchMatches =
        !search ||
        item.courseCode.toLowerCase().includes(search) ||
        item.courseName.toLowerCase().includes(search) ||
        item.programmeLabel.toLowerCase().includes(search);
      return statusMatches && programmeMatches && searchMatches;
    });
  }, [assignmentItems, assignmentProgrammeFilter, assignmentSearchTerm, assignmentStatusFilter]);

  const assignmentPageCount = Math.max(
    1,
    Math.ceil(filteredAssignmentItems.length / ASSIGNMENT_COURSES_PAGE_SIZE),
  );
  const assignmentPageStartIndex = (assignmentPage - 1) * ASSIGNMENT_COURSES_PAGE_SIZE;
  const paginatedAssignmentItems = filteredAssignmentItems.slice(
    assignmentPageStartIndex,
    assignmentPageStartIndex + ASSIGNMENT_COURSES_PAGE_SIZE,
  );

  const groupedAssignmentItems = useMemo(() => {
    const groups = new Map<string, AssignmentListItem[]>();
    for (const item of paginatedAssignmentItems) {
      const rows = groups.get(item.programmeGroup) || [];
      rows.push(item);
      groups.set(item.programmeGroup, rows);
    }
    return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
  }, [paginatedAssignmentItems]);

  const assignmentSummary = useMemo(() => {
    const assignable = assignmentItems.filter(item => item.assignable);
    const assigned = assignable.filter(item => item.assignments.length > 0);
    return {
      assigned: assigned.length,
      need: assignable.length - assigned.length,
      planned: assignmentItems.length,
    };
  }, [assignmentItems]);

  const selectedAssignmentItems = useMemo(
    () => assignmentItems.filter(item => selectedAssignmentKeys.includes(item.key) && item.assignable),
    [assignmentItems, selectedAssignmentKeys],
  );

  const visibleAssignableKeys = useMemo(
    () => paginatedAssignmentItems.filter(item => item.assignable).map(item => item.key),
    [paginatedAssignmentItems],
  );

  const visibleSelectionState = useMemo(() => {
    if (visibleAssignableKeys.length === 0) return false;
    const selectedVisibleCount = visibleAssignableKeys.filter(key => selectedAssignmentKeys.includes(key)).length;
    if (selectedVisibleCount === 0) return false;
    return selectedVisibleCount === visibleAssignableKeys.length ? true : "indeterminate";
  }, [selectedAssignmentKeys, visibleAssignableKeys]);
  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    if (!session) {
      setVersions([]);
      setLecturers([]);
      setCourseTemplates([]);
      setTerms([]);
      setCurrentEnrollmentTerm(null);
      setAssignments([]);
      setPlannedAssignmentCourses([]);
      setStudents([]);
      setStudentAssignments([]);
      setLoadError(
        "No authenticated Supabase session was found. Please sign out and sign in again on the same localhost/127.0.0.1 address you are using now.",
      );
      setIsLoading(false);
      return;
    }

    try {
      const [
        versionsResult,
        lecturersResult,
        templatesResult,
        termsResult,
        currentTermResult,
        studentsResult,
        studentAssignmentsResult,
      ] = await Promise.allSettled([
        listStudyPlanVersions(),
        listLecturerOptions(),
        getCourseCatalogTemplates(),
        getAcademicTermOptions(),
        getCurrentEnrollmentTerm(),
        listAssignableStudents(),
        listStudentStudyPlanAssignments(),
      ]);
      const errors: string[] = [];

      if (versionsResult.status === "fulfilled") {
        const nextVersions = versionsResult.value;
        setVersions(nextVersions);
        setSelectedVersionId(current => current || nextVersions[0]?.id || "");
        setSelectedStudentAssignmentVersionId(current =>
          current && nextVersions.some(version => version.id === current) ? current : nextVersions[0]?.id || "",
        );
      } else {
        console.error("Failed to load study plan versions", versionsResult.reason);
        errors.push("study plans");
      }

      if (lecturersResult.status === "fulfilled") {
        const nextLecturers = lecturersResult.value;
        setLecturers(nextLecturers);
        setBulkLecturerId(current => current && nextLecturers.some(lecturer => lecturer.id === current) ? current : "");
      } else {
        console.error("Failed to load lecturers", lecturersResult.reason);
        errors.push("lecturers");
      }

      if (templatesResult.status === "fulfilled") {
        setCourseTemplates(templatesResult.value);
      } else {
        console.error("Failed to load course catalog", templatesResult.reason);
        errors.push("course catalog");
      }

      if (termsResult.status === "fulfilled") {
        const nextTerms = termsResult.value.slice().sort((left, right) => compareTermCodes(left.code, right.code));
        setTerms(nextTerms);
      } else {
        console.error("Failed to load academic terms", termsResult.reason);
        errors.push("semesters");
      }

      if (currentTermResult.status === "fulfilled") {
        setCurrentEnrollmentTerm(currentTermResult.value);
      } else {
        console.warn("Failed to load current enrollment term", currentTermResult.reason);
        setCurrentEnrollmentTerm(null);
      }

      if (studentsResult.status === "fulfilled") {
        setStudents(studentsResult.value);
      } else {
        console.error("Failed to load students", studentsResult.reason);
        errors.push("students");
      }

      if (studentAssignmentsResult.status === "fulfilled") {
        setStudentAssignments(studentAssignmentsResult.value);
      } else {
        console.error("Failed to load student study plan assignments", studentAssignmentsResult.reason);
        errors.push("student study plan assignments");
      }

      if (errors.length > 0) {
        setLoadError(`Could not load ${errors.join(", ")}. Open DevTools Console for the exact Supabase error.`);
      }
    } catch (error) {
      console.error("Failed to load AARO dashboard", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "AARO academic planning data could not be loaded.";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);
  const loadVersionCourses = useCallback(async (versionId: string) => {
    if (!versionId) {
      setVersionCourses([]);
      return;
    }
    try {
      setVersionCourses(await listStudyPlanCourses(versionId));
    } catch (error) {
      console.error("Failed to load study plan courses", error);
      notify.error(error, "Failed to load study plan courses.");
      setVersionCourses([]);
    }
  }, []);

  const loadAssignmentWorkbench = useCallback(async (termCode: string) => {
    const normalizedTermCode = normalizeTermCode(termCode);
    if (!normalizedTermCode) {
      setPlannedAssignmentCourses([]);
      setAssignments([]);
      return;
    }

    const termOption = assignmentTermOptions.find(item => item.code === normalizedTermCode) || null;
    const academicTerm = termOption?.academicTerm || null;

    setIsLoadingAssignments(true);
    try {
      const [nextPlannedCourses, nextAssignments] = await Promise.all([
        listPlannedCoursesForTerm(normalizedTermCode),
        academicTerm?.id ? listCourseAssignmentsForTerm(academicTerm.id) : Promise.resolve([]),
      ]);
      setPlannedAssignmentCourses(nextPlannedCourses);
      setAssignments(nextAssignments);
      setSelectedAssignmentKeys([]);
    } catch (error) {
      notify.error(error, "Failed to load class assignment data.");
      setPlannedAssignmentCourses([]);
      setAssignments([]);
    } finally {
      setIsLoadingAssignments(false);
    }
  }, [assignmentTermOptions]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setVersionCourseTermFilter(ALL_FILTER_VALUE);
    void loadVersionCourses(selectedVersionId);
  }, [loadVersionCourses, selectedVersionId]);



  useEffect(() => {
    setAssignmentPage(1);
  }, [assignmentForm.termCode, assignmentProgrammeFilter, assignmentSearchTerm, assignmentStatusFilter]);

  useEffect(() => {
    setAssignmentPage(current => Math.max(1, Math.min(current, assignmentPageCount)));
  }, [assignmentPageCount]);

  useEffect(() => {
    setStudentAssignmentPage(1);
  }, [studentAssignmentProgrammeFilter, studentAssignmentSearchTerm, studentAssignmentStatusFilter]);

  useEffect(() => {
    setStudentAssignmentPage(current => Math.max(1, Math.min(current, studentAssignmentPageCount)));
  }, [studentAssignmentPageCount]);

  useEffect(() => {
    setSelectedStudentIds(current => current.filter(id => students.some(student => student.id === id)));
  }, [students]);

  useEffect(() => {
    setStudentAssignmentProgrammeFilter(current =>
      current === ALL_FILTER_VALUE || studentProgrammeOptions.includes(current)
        ? current
        : ALL_FILTER_VALUE,
    );
  }, [studentProgrammeOptions]);

  useEffect(() => {
    setSelectedStudentAssignmentVersionId(current => {
      if (studentAssignmentVersionOptions.length === 0) return "";
      return current && studentAssignmentVersionOptions.some(version => version.id === current)
        ? current
        : studentAssignmentVersionOptions[0].id;
    });
  }, [studentAssignmentVersionOptions]);


  useEffect(() => {
    if (versions.length === 0) return;
    if (selectedVersionId && filteredVersions.some(version => version.id === selectedVersionId)) return;
    setSelectedVersionId(filteredVersions[0]?.id || "");
  }, [filteredVersions, selectedVersionId, versions.length]);

  useEffect(() => {
    if (!assignmentForm.termCode) return;
    void loadAssignmentWorkbench(assignmentForm.termCode);
  }, [assignmentForm.termCode, loadAssignmentWorkbench]);

  useEffect(() => {
    setAssignmentForm(current => {
      if (current.termCode && assignmentTermOptions.some(term => term.code === current.termCode)) return current;
      return { termCode: assignmentTermOptions[0]?.code || "" };
    });
    setCourseForm(current => ({
      ...current,
      termCode: current.termCode || assignmentTermOptions[0]?.code || "",
    }));
  }, [assignmentTermOptions]);

  useEffect(() => {
    setSelectedAssignmentKeys(current =>
      current.filter(key => assignmentItems.some(item => item.key === key)),
    );
  }, [assignmentItems]);

  useEffect(() => {
    setAssignmentProgrammeFilter(current =>
      current === ALL_FILTER_VALUE || assignmentProgrammeOptions.includes(current)
        ? current
        : ALL_FILTER_VALUE,
    );
  }, [assignmentProgrammeOptions]);

  const handleStudyPlanFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    setIsParsingStudyPlan(true);
    try {
      const preview = await parseStudyPlanFiles(selectedFiles);
      setStudyPlanImportPreview(preview);
      setIsStudyPlanPreviewDialogOpen(false);
      notify.success(`Study plan preview is ready from ${preview.fileNames.length} file(s).`);
    } catch (error) {
      setStudyPlanImportPreview(null);
      setIsStudyPlanPreviewDialogOpen(false);
      notify.error(error, "Failed to parse study plan file.");
    } finally {
      setIsParsingStudyPlan(false);
    }
  };

  const handleConfirmStudyPlanImport = async () => {
    if (!studyPlanImportPreview || studyPlanImportPreview.courses.length === 0) return;

    setIsImportingStudyPlan(true);
    try {
      const importedVersion = await importStudyPlanVersion(studyPlanImportPreview);
      setVersionProgrammeFilter(studyPlanImportPreview.programmeKey);
      setVersionIntakeFilter(`${studyPlanImportPreview.intakeYear}${studyPlanImportPreview.intakeSemester} ${studyPlanImportPreview.trackCode}`);
      setVersionLevelFilter(studyPlanImportPreview.level);
      setSelectedVersionId(importedVersion.id);
      setStudyPlanImportPreview(null);
      await loadAll();
      await loadVersionCourses(importedVersion.id);
      if (assignmentForm.termCode) {
        await loadAssignmentWorkbench(assignmentForm.termCode);
      }
      notify.success("Study plan imported and made available to matching students.");
    } catch (error) {
      notify.error(error, "Failed to import study plan.");
    } finally {
      setIsImportingStudyPlan(false);
    }
  };

  const handleAcademicCalendarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsParsingAcademicCalendar(true);
    try {
      const preview = await parseAcademicCalendarPdf(file);
      setAcademicCalendarPreview(preview);
      notify.success(`Academic calendar preview is ready for ${preview.terms.length} semester${preview.terms.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setAcademicCalendarPreview(null);
      notify.error(error, "Failed to parse academic calendar PDF.");
    } finally {
      setIsParsingAcademicCalendar(false);
    }
  };

  const handleConfirmAcademicCalendarImport = async () => {
    if (!academicCalendarPreview || academicCalendarPreview.terms.length === 0) return;

    setIsImportingAcademicCalendar(true);
    try {
      await upsertAcademicTermsFromCalendar(academicCalendarPreview.terms.map(term => ({
        code: term.code,
        endsAt: term.endsAt,
        enrollmentEndsAt: term.enrollmentEndsAt,
        enrollmentStartsAt: term.enrollmentStartsAt,
        name: term.name,
        startsAt: term.startsAt,
        status: term.status,
        teachingEndsAt: term.teachingEndsAt,
        teachingStartsAt: term.teachingStartsAt,
      })));
      setAcademicCalendarPreview(null);
      await loadAll();
      notify.success("Academic calendar semesters were updated.");
    } catch (error) {
      notify.error(error, "Failed to import academic calendar.");
    } finally {
      setIsImportingAcademicCalendar(false);
    }
  };
  const handleAddCourse = async () => {
    if (!selectedVersionId || !courseForm.courseName.trim()) return;
    const nextPosition =
      versionCourses
        .filter(course => course.term_code === courseForm.termCode)
        .reduce((maxPosition, course) => Math.max(maxPosition, Number(course.position) || 0), 0) + 1;

    setIsSavingCourse(true);
    try {
      await addStudyPlanCourse({
        category: courseForm.category,
        courseCode: courseForm.courseCode,
        courseName: courseForm.courseName,
        creditHours: courseForm.creditHours ? Number(courseForm.creditHours) : null,
        isPlaceholder: courseForm.isPlaceholder === "true",
        position: nextPosition,
        studyPlanVersionId: selectedVersionId,
        termCode: courseForm.termCode,
      });
      notify.success("Study plan course added.");
      setCourseForm(current => ({ ...emptyCourseForm, termCode: current.termCode }));
      await loadVersionCourses(selectedVersionId);
    } catch (error) {
      notify.error(error, "Failed to add study plan course.");
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await deleteStudyPlanCourse(courseId);
      notify.success("Study plan course removed.");
      await loadVersionCourses(selectedVersionId);
    } catch (error) {
      notify.error(error, "Failed to remove study plan course.");
    }
  };

  const refreshStudentAssignments = async () => {
    try {
      setStudentAssignments(await listStudentStudyPlanAssignments());
    } catch (error) {
      notify.error(error, "Failed to refresh student study plan assignments.");
    }
  };

  const setStudentSelected = (studentId: string, checked: boolean | "indeterminate") => {
    setSelectedStudentIds(current => {
      const next = new Set(current);
      if (checked === true) {
        next.add(studentId);
      } else {
        next.delete(studentId);
      }
      return Array.from(next);
    });
  };

  const toggleVisibleStudentSelection = (checked: boolean | "indeterminate") => {
    setSelectedStudentIds(current => {
      const next = new Set(current);
      for (const studentId of visibleStudentIds) {
        if (checked === true) {
          next.add(studentId);
        } else {
          next.delete(studentId);
        }
      }
      return Array.from(next);
    });
  };

  const handleAssignStudents = async (studentIds = selectedStudentIds) => {
    if (!selectedStudentAssignmentVersionId || studentIds.length === 0) {
      notify.info("Select a study plan version and at least one student first.");
      return;
    }

    setIsAssigningStudents(true);
    try {
      for (const studentId of studentIds) {
        await assignStudentStudyPlan({
          studentId,
          studyPlanVersionId: selectedStudentAssignmentVersionId,
        });
      }
      notify.success(`Assigned ${studentIds.length} student${studentIds.length === 1 ? "" : "s"} to ${selectedStudentAssignmentVersion?.version_code || "the selected study plan"}.`);
      setSelectedStudentIds([]);
      await refreshStudentAssignments();
    } catch (error) {
      notify.error(error, "Failed to assign student study plan.");
    } finally {
      setIsAssigningStudents(false);
    }
  };

  const handleUnassignStudents = async (studentIds = selectedStudentIds) => {
    if (studentIds.length === 0) {
      notify.info("Select at least one student first.");
      return;
    }

    setIsAssigningStudents(true);
    try {
      for (const studentId of studentIds) {
        await unassignStudentStudyPlan(studentId);
      }
      notify.success(`Removed study plan assignment for ${studentIds.length} student${studentIds.length === 1 ? "" : "s"}.`);
      setSelectedStudentIds([]);
      await refreshStudentAssignments();
    } catch (error) {
      notify.error(error, "Failed to remove student study plan assignment.");
    } finally {
      setIsAssigningStudents(false);
    }
  };

  const buildStudentAssignmentImportPreview = (
    parsedRows: ParsedStudentStudyPlanAssignmentRow[],
    warnings: string[],
    fileName: string,
  ): StudentAssignmentImportPreview => {
    const rows: StudentAssignmentImportPreviewRow[] = parsedRows.map(row => {
      const student = row.studentIdentifier
        ? studentByIdentifier.get(normalizeStudentIdentifierForAssignment(row.studentIdentifier))
        : undefined;
      const versionFromCode = row.studyPlanVersionCode
        ? versionByCode.get(row.studyPlanVersionCode.trim().toLowerCase())
        : undefined;
      const selectedVersion = selectedStudentAssignmentVersion || undefined;
      const studyPlanVersion = versionFromCode || selectedVersion;
      const currentAssignment = student ? studentAssignmentByStudentId.get(student.id) || null : null;

      if (!student) {
        return { ...row, message: "Student email or student ID was not found.", status: "invalid" };
      }
      if (!studyPlanVersion) {
        return { ...row, student, message: "Select a study plan version or provide version_code in the Excel file.", status: "invalid" };
      }
      if (row.programmeKey && studyPlanVersion.programme_key !== row.programmeKey) {
        return { ...row, student, studyPlanVersion, message: "Programme does not match the selected study plan version.", status: "invalid" };
      }
      if (row.trackCode && studyPlanVersion.track_code && studyPlanVersion.track_code !== row.trackCode) {
        return { ...row, student, studyPlanVersion, message: "Track code does not match the selected study plan version.", status: "invalid" };
      }
      if (currentAssignment?.study_plan_version_id === studyPlanVersion.id) {
        return { ...row, student, studyPlanVersion, message: "Already assigned to this study plan.", status: "already-assigned" };
      }
      return { ...row, student, studyPlanVersion, message: "Ready to assign.", status: "ready" };
    });

    return { fileName, rows, warnings };
  };

  const handleStudentAssignmentImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsParsingStudentAssignmentImport(true);
    try {
      const parsed = await parseStudentStudyPlanAssignmentFile(file);
      const preview = buildStudentAssignmentImportPreview(parsed.rows, parsed.warnings, parsed.fileName);
      setStudentAssignmentImportPreview(preview);
      notify.success(`Parsed ${parsed.rows.length} student assignment row${parsed.rows.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setStudentAssignmentImportPreview(null);
      notify.error(error, "Failed to parse student study plan assignment file.");
    } finally {
      setIsParsingStudentAssignmentImport(false);
    }
  };

  const handleApplyStudentAssignmentImport = async () => {
    if (!studentAssignmentImportPreview) return;
    const readyRows = studentAssignmentImportPreview.rows.filter(
      row => row.status === "ready" && row.student?.id && row.studyPlanVersion?.id,
    );
    if (readyRows.length === 0) {
      notify.info("No ready rows to apply.");
      return;
    }

    setIsApplyingStudentAssignmentImport(true);
    try {
      for (const row of readyRows) {
        await assignStudentStudyPlan({
          notes: row.notes,
          studentId: row.student!.id,
          studyPlanVersionId: row.studyPlanVersion!.id,
        });
      }
      notify.success(`Applied ${readyRows.length} student study plan assignment${readyRows.length === 1 ? "" : "s"}.`);
      setStudentAssignmentImportPreview(null);
      await refreshStudentAssignments();
    } catch (error) {
      notify.error(error, "Failed to apply student study plan assignment import.");
    } finally {
      setIsApplyingStudentAssignmentImport(false);
    }
  };

  const refreshAssignmentWorkbench = async () => {
    if (!assignmentForm.termCode) return;
    await loadAssignmentWorkbench(assignmentForm.termCode);
  };

  const setAssignmentKeySelected = (key: string, checked: boolean | "indeterminate") => {
    setSelectedAssignmentKeys(current => {
      const next = new Set(current);
      if (checked === true) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return Array.from(next);
    });
  };

  const toggleVisibleAssignmentSelection = (checked: boolean | "indeterminate") => {
    setSelectedAssignmentKeys(current => {
      const next = new Set(current);
      for (const key of visibleAssignableKeys) {
        if (checked === true) {
          next.add(key);
        } else {
          next.delete(key);
        }
      }
      return Array.from(next);
    });
  };

  const handleAssignCourse = async (item: AssignmentListItem, lecturerId: string) => {
    if (!selectedAssignmentTerm?.id || !item.courseId || !lecturerId) {
      notify.info("This semester needs an academic term before lecturer assignments can be saved.");
      return;
    }
    setIsAssigning(true);
    try {
      await assignCourseOfferingToLecturer({
        courseId: item.courseId,
        lecturerId,
        termId: selectedAssignmentTerm.id,
      });
      notify.success(`${item.courseCode} assigned to ${lecturerLabel(lecturerById.get(lecturerId))}.`);
      await refreshAssignmentWorkbench();
    } catch (error) {
      notify.error(error, "Failed to assign course to lecturer.");
    } finally {
      setIsAssigning(false);
    }
  };


  const handleBulkAssign = async () => {
    if (!selectedAssignmentTerm?.id || !bulkLecturerId || selectedAssignmentItems.length === 0) {
      notify.info("This semester needs an academic term before lecturer assignments can be saved.");
      return;
    }
    setIsAssigning(true);
    try {
      let assignedCount = 0;
      for (const item of selectedAssignmentItems) {
        if (!item.courseId) continue;
        await assignCourseOfferingToLecturer({
          courseId: item.courseId,
          lecturerId: bulkLecturerId,
          termId: selectedAssignmentTerm.id,
        });
        assignedCount += 1;
      }
      notify.success(`Assigned ${assignedCount} course${assignedCount === 1 ? "" : "s"} to ${lecturerLabel(lecturerById.get(bulkLecturerId))}.`);
      setBulkLecturerId("");
      setSelectedAssignmentKeys([]);
      setAssignmentRowLecturers({});
      await refreshAssignmentWorkbench();
    } catch (error) {
      notify.error(error, "Failed to bulk assign courses.");
    } finally {
      setIsAssigning(false);
    }
  };

  const buildAssignmentImportPreview = (
    parsedRows: ParsedLecturerAssignmentRow[],
    warnings: string[],
    fileName: string,
  ): AssignmentImportPreview => {
    const selectedTermCode = assignmentForm.termCode || "";
    const existingAssignmentKeys = new Set(
      assignments
        .filter(assignment => assignment.course_id && assignment.owner_id)
        .map(assignment => `${assignment.course_id}:${assignment.owner_id}`),
    );

    const rows: AssignmentImportPreviewRow[] = parsedRows.map(row => {
      const course = courseCodeAliases(row.courseCode)
        .map(code => courseByCode.get(code))
        .find(Boolean);
      const lecturerLookup = String(row.lecturerEmail || "").trim().toLowerCase();
      const lecturer = lecturerByEmail.get(lecturerLookup) || lecturerByName.get(lecturerLookup);
      const plannedItem = course?.id ? assignmentItemByCourseId.get(course.id) : null;

      if (!selectedTermCode) {
        return { ...row, course, lecturer, message: "Select a semester before importing.", status: "invalid" };
      }
      if (!row.semesterCode || row.semesterCode !== selectedTermCode) {
        return { ...row, course, lecturer, message: `Semester must be ${selectedTermCode}.`, status: "invalid" };
      }
      if (!course) {
        return { ...row, course, lecturer, message: "Course code was not found in the catalog.", status: "invalid" };
      }
      if (!plannedItem) {
        return { ...row, course, lecturer, message: "Course is not in the selected semester study plan.", status: "invalid" };
      }
      if (!plannedItem.assignable) {
        return { ...row, course, lecturer, message: plannedItem.issue || "Course is not assignable.", status: "invalid" };
      }
      if (!lecturer) {
        return { ...row, course, lecturer, message: "Lecturer email or name was not found.", status: "invalid" };
      }
      if (existingAssignmentKeys.has(`${course.id}:${lecturer.id}`)) {
        return { ...row, course, lecturer, message: "Already assigned to this lecturer.", status: "already-assigned" };
      }
      return { ...row, course, lecturer, message: "Ready to assign.", status: "ready" };
    });

    return { fileName, rows, warnings };
  };

  const handleAssignmentImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsParsingAssignmentImport(true);
    try {
      const parsed = await parseLecturerAssignmentFile(file);
      const preview = buildAssignmentImportPreview(parsed.rows, parsed.warnings, parsed.fileName);
      setAssignmentImportPreview(preview);
      notify.success(`Parsed ${parsed.rows.length} lecturer assignment row${parsed.rows.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setAssignmentImportPreview(null);
      notify.error(error, "Failed to parse lecturer assignment file.");
    } finally {
      setIsParsingAssignmentImport(false);
    }
  };

  const handleApplyAssignmentImport = async () => {
    if (!assignmentImportPreview || !selectedAssignmentTerm?.id) return;
    const readyRows = assignmentImportPreview.rows.filter(row => row.status === "ready" && row.course?.id && row.lecturer?.id);
    if (readyRows.length === 0) {
      notify.info("No ready rows to apply.");
      return;
    }

    setIsApplyingAssignmentImport(true);
    try {
      for (const row of readyRows) {
        await assignCourseOfferingToLecturer({
          courseId: row.course!.id,
          lecturerId: row.lecturer!.id,
          termId: selectedAssignmentTerm.id,
        });
      }
      notify.success(`Applied ${readyRows.length} lecturer assignment${readyRows.length === 1 ? "" : "s"}.`);
      setAssignmentImportPreview(null);
      await refreshAssignmentWorkbench();
    } catch (error) {
      notify.error(error, "Failed to apply lecturer assignment import.");
    } finally {
      setIsApplyingAssignmentImport(false);
    }
  };

  const academicPlanningContextValue = {
    ALL_FILTER_VALUE,
    ASSIGNMENT_COURSES_PAGE_SIZE,
    STUDENT_ASSIGNMENT_PAGE_SIZE,
    activeSegmentClassName,
    academicCalendarStatusClassName,
    assignmentStatusLabel,
    studentAssignmentStatusLabel,
    versions,
    selectedVersionId,
    setSelectedVersionId,
    selectedVersion,
    versionProgrammeFilter,
    setVersionProgrammeFilter,
    versionProgrammeOptions,
    versionIntakeFilter,
    setVersionIntakeFilter,
    versionIntakeOptions,
    versionLevelFilter,
    setVersionLevelFilter,
    versionLevelOptions,
    filteredVersions,
    versionLabel,
    studyPlanImportPreview,
    setStudyPlanImportPreview,
    isParsingStudyPlan,
    isImportingStudyPlan,
    isStudyPlanPreviewDialogOpen,
    setIsStudyPlanPreviewDialogOpen,
    handleStudyPlanFileChange,
    handleConfirmStudyPlanImport,
    importTermSummary,
    importPreviewCoursesByTerm,
    versionCourses,
    versionCourseTermOptions,
    versionCourseTermFilter,
    setVersionCourseTermFilter,
    filteredVersionCourses,
    versionCourseGroups,
    courseForm,
    setCourseForm,
    isSavingCourse,
    handleAddCourse,
    handleDeleteCourse,
    academicCalendarPreview,
    setAcademicCalendarPreview,
    isParsingAcademicCalendar,
    isImportingAcademicCalendar,
    showClosedAcademicTerms,
    setShowClosedAcademicTerms,
    handleAcademicCalendarFileChange,
    handleConfirmAcademicCalendarImport,
    calendarTerms,
    visibleCalendarTerms,
    isAcademicCalendarExpired,
    latestCalendarTerm,
    nextAcademicCalendarYearLabel,
    formatDateLabel,
    resolveAcademicTermStatus,
    students,
    studentAssignmentSummary,
    studentAssignmentVersionOptions,
    selectedStudentAssignmentVersionId,
    setSelectedStudentAssignmentVersionId,
    selectedStudentAssignmentVersion,
    studentAssignmentProgrammeFilter,
    setStudentAssignmentProgrammeFilter,
    studentProgrammeOptions,
    studentAssignmentStatusFilter,
    setStudentAssignmentStatusFilter,
    studentAssignmentSearchTerm,
    setStudentAssignmentSearchTerm,
    isParsingStudentAssignmentImport,
    handleStudentAssignmentImportFileChange,
    selectedStudentIds,
    visibleStudentIds,
    visibleStudentSelectionState,
    toggleVisibleStudentSelection,
    isAssigningStudents,
    handleAssignStudents,
    handleUnassignStudents,
    paginatedStudentAssignmentRows,
    studentAssignmentRows,
    studentAssignmentPageStartIndex,
    studentAssignmentPage,
    studentAssignmentPageCount,
    setStudentAssignmentPage,
    setStudentSelected,
    studentAssignmentImportPreview,
    setStudentAssignmentImportPreview,
    isApplyingStudentAssignmentImport,
    handleApplyStudentAssignmentImport,
    versionById,
    assignmentSummary,
    assignmentTermOptions,
    selectedAssignmentTermOption,
    selectedAssignmentTerm,
    assignmentForm,
    setAssignmentForm,
    assignmentProgrammeFilter,
    setAssignmentProgrammeFilter,
    assignmentProgrammeOptions,
    assignmentStatusFilter,
    setAssignmentStatusFilter,
    assignmentSearchTerm,
    setAssignmentSearchTerm,
    selectedAssignmentKeys,
    selectedAssignmentItems,
    visibleSelectionState,
    visibleAssignableKeys,
    toggleVisibleAssignmentSelection,
    bulkLecturerId,
    setBulkLecturerId,
    lecturers,
    lecturerById,
    isAssigning,
    handleBulkAssign,
    isParsingAssignmentImport,
    handleAssignmentImportFileChange,
    isLoadingAssignments,
    filteredAssignmentItems,
    groupedAssignmentItems,
    assignmentPageStartIndex,
    assignmentPage,
    assignmentPageCount,
    setAssignmentPage,
    setAssignmentKeySelected,
    assignmentRowLecturers,
    setAssignmentRowLecturers,
    handleAssignCourse,
    assignmentImportPreview,
    setAssignmentImportPreview,
    isApplyingAssignmentImport,
    handleApplyAssignmentImport,
    courseTemplateLabel,
    lecturerLabel,
    setTemplateHelpType,
    templateHelpType,
  };

  return (
    <StaffAcademicPlanningProvider value={academicPlanningContextValue}>
      <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AARO Staff Dashboard</h1>
          <p className="text-muted-foreground">
            Manage study plan versions, course structures and lecturer class assignment.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadAll()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {loadError && (
        <Alert>
          <AlertDescription>
            {loadError}. If this is the first setup, run the Staff/AARO academic planning migration in Supabase SQL Editor first.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <BookOpen className="h-9 w-9 rounded-lg bg-blue-100 p-2 text-blue-700" />
            <div>
              <p className="text-sm text-muted-foreground">Study Plans</p>
              <p className="text-2xl font-bold">{versions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ClipboardList className="h-9 w-9 rounded-lg bg-green-100 p-2 text-green-700" />
            <div>
              <p className="text-sm text-muted-foreground">Selected Courses</p>
              <p className="text-2xl font-bold">{versionCourses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <GraduationCap className="h-9 w-9 rounded-lg bg-purple-100 p-2 text-purple-700" />
            <div>
              <p className="text-sm text-muted-foreground">Lecturers</p>
              <p className="text-2xl font-bold">{lecturers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarDays className="h-9 w-9 rounded-lg bg-orange-100 p-2 text-orange-700" />
            <div>
              <p className="text-sm text-muted-foreground">Semesters</p>
              <p className="text-2xl font-bold">{calendarTerms.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs value={activePlanningTab} onValueChange={handlePlanningTabChange} className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 p-1 sm:grid-cols-4">
            <TabsTrigger value="study-plans" className="text-xs sm:text-sm">Study Plans</TabsTrigger>
            <TabsTrigger value="academic-calendar" className="text-xs sm:text-sm">Academic Calendar</TabsTrigger>
            <TabsTrigger value="student-study-plans" className="text-xs sm:text-sm">Student Study Plans</TabsTrigger>
            <TabsTrigger value="assignments" className="text-xs sm:text-sm">Class Assignment</TabsTrigger>
          </TabsList>

          <TabsContent value="study-plans" className="space-y-4">
            {activePlanningTab === "study-plans" && (
              <Suspense fallback={<AcademicPlanningTabFallback />}>
                <StudyPlansTabContent />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="academic-calendar" className="space-y-4">
            {activePlanningTab === "academic-calendar" && (
              <Suspense fallback={<AcademicPlanningTabFallback />}>
                <AcademicCalendarTabContent />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="student-study-plans" className="space-y-4">
            {activePlanningTab === "student-study-plans" && (
              <Suspense fallback={<AcademicPlanningTabFallback />}>
                <StudentStudyPlansTabContent />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            {activePlanningTab === "assignments" && (
              <Suspense fallback={<AcademicPlanningTabFallback />}>
                <ClassAssignmentTabContent />
              </Suspense>
            )}
          </TabsContent>
        </Tabs>
      )}
      <ImportTemplateHelpDialog />
      </div>
    </StaffAcademicPlanningProvider>
  );
}
