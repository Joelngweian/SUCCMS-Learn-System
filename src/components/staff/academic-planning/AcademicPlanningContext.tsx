import {
  createContext,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  AssignableStudent,
  DbStudyPlanCourse,
  LecturerOption,
  StudentStudyPlanAssignment,
  StudyPlanVersion,
} from "@/data/academicPlanningRepository";
import type { ParsedAcademicCalendar } from "@/data/academicCalendarParser";
import type {
  ParsedLecturerAssignmentRow,
} from "@/data/lecturerAssignmentImportParser";
import type {
  ParsedStudentStudyPlanAssignmentRow,
} from "@/data/studentStudyPlanAssignmentImportParser";
import type { ParsedStudyPlanImport } from "@/data/studyPlanImportParser";
import type { AcademicTermOption, CourseTemplateSummary } from "@/data/courseRepository";
import type {
  AcademicCalendarStatus,
  AssignmentStatusFilter,
  AssignmentTermOption,
  StudentAssignmentStatusFilter,
} from "./academicPlanningUtils";
import type { AssignmentListItem } from "./useAcademicPlanningViews";

export type ImportTemplateHelpType = "study-plan" | "student-assignment" | "lecturer-assignment";

export type AssignmentImportPreviewRow = ParsedLecturerAssignmentRow & {
  course?: CourseTemplateSummary;
  lecturer?: LecturerOption;
  message: string;
  status: "ready" | "invalid" | "already-assigned";
};

export type AssignmentImportPreview = {
  fileName: string;
  rows: AssignmentImportPreviewRow[];
  warnings: string[];
};

export type StudentAssignmentImportPreviewRow = ParsedStudentStudyPlanAssignmentRow & {
  message: string;
  status: "ready" | "invalid" | "already-assigned";
  student?: AssignableStudent;
  studyPlanVersion?: StudyPlanVersion;
};

export type StudentAssignmentImportPreview = {
  fileName: string;
  rows: StudentAssignmentImportPreviewRow[];
  warnings: string[];
};

export type StudyPlanCourseForm = {
  category: string;
  courseCode: string;
  courseName: string;
  creditHours: string;
  isPlaceholder: string;
  termCode: string;
};

export type AssignmentForm = {
  termCode: string;
};

export type StudentAssignmentRow = {
  assignment: StudentStudyPlanAssignment | null;
  assignedVersion: StudyPlanVersion | null;
  student: AssignableStudent;
};

type CheckboxState = boolean | "indeterminate";

export type StaffAcademicPlanningContextValue = {
  ALL_FILTER_VALUE: string;
  ASSIGNMENT_COURSES_PAGE_SIZE: number;
  STUDENT_ASSIGNMENT_PAGE_SIZE: number;
  activeSegmentClassName: string;
  academicCalendarStatusClassName: Record<AcademicCalendarStatus, string>;
  assignmentStatusLabel: Record<AssignmentStatusFilter, string>;
  studentAssignmentStatusLabel: Record<StudentAssignmentStatusFilter, string>;
  versions: StudyPlanVersion[];
  selectedVersionId: string;
  setSelectedVersionId: Dispatch<SetStateAction<string>>;
  selectedVersion: StudyPlanVersion | null;
  versionProgrammeFilter: string;
  setVersionProgrammeFilter: Dispatch<SetStateAction<string>>;
  versionProgrammeOptions: string[];
  versionIntakeFilter: string;
  setVersionIntakeFilter: Dispatch<SetStateAction<string>>;
  versionIntakeOptions: string[];
  versionLevelFilter: string;
  setVersionLevelFilter: Dispatch<SetStateAction<string>>;
  versionLevelOptions: string[];
  filteredVersions: StudyPlanVersion[];
  versionLabel: (version: StudyPlanVersion) => string;
  studyPlanImportPreview: ParsedStudyPlanImport | null;
  setStudyPlanImportPreview: Dispatch<SetStateAction<ParsedStudyPlanImport | null>>;
  isParsingStudyPlan: boolean;
  isImportingStudyPlan: boolean;
  isStudyPlanPreviewDialogOpen: boolean;
  setIsStudyPlanPreviewDialogOpen: Dispatch<SetStateAction<boolean>>;
  handleStudyPlanFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleConfirmStudyPlanImport: () => Promise<void>;
  importTermSummary: { count: number; termCode: string }[];
  importPreviewCoursesByTerm: { courses: ParsedStudyPlanImport["courses"]; termCode: string }[];
  versionCourses: DbStudyPlanCourse[];
  versionCourseTermOptions: string[];
  versionCourseTermFilter: string;
  setVersionCourseTermFilter: Dispatch<SetStateAction<string>>;
  filteredVersionCourses: DbStudyPlanCourse[];
  versionCourseGroups: { courses: DbStudyPlanCourse[]; termCode: string; totalCredits: number }[];
  courseForm: StudyPlanCourseForm;
  setCourseForm: Dispatch<SetStateAction<StudyPlanCourseForm>>;
  isSavingCourse: boolean;
  handleAddCourse: () => Promise<void>;
  handleDeleteCourse: (courseId: string) => Promise<void>;
  academicCalendarPreview: ParsedAcademicCalendar | null;
  setAcademicCalendarPreview: Dispatch<SetStateAction<ParsedAcademicCalendar | null>>;
  isParsingAcademicCalendar: boolean;
  isImportingAcademicCalendar: boolean;
  showClosedAcademicTerms: boolean;
  setShowClosedAcademicTerms: Dispatch<SetStateAction<boolean>>;
  handleAcademicCalendarFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleConfirmAcademicCalendarImport: () => Promise<void>;
  calendarTerms: AcademicTermOption[];
  visibleCalendarTerms: AcademicTermOption[];
  isAcademicCalendarExpired: boolean;
  latestCalendarTerm: AcademicTermOption | null;
  nextAcademicCalendarYearLabel: (term?: AcademicTermOption | null) => string;
  formatDateLabel: (value?: string | null) => string;
  resolveAcademicTermStatus: (term: AcademicTermOption) => AcademicCalendarStatus;
  students: AssignableStudent[];
  studentAssignmentSummary: { assigned: number; need: number; total: number };
  studentAssignmentVersionOptions: StudyPlanVersion[];
  selectedStudentAssignmentVersionId: string;
  setSelectedStudentAssignmentVersionId: Dispatch<SetStateAction<string>>;
  selectedStudentAssignmentVersion: StudyPlanVersion | null;
  studentAssignmentProgrammeFilter: string;
  setStudentAssignmentProgrammeFilter: Dispatch<SetStateAction<string>>;
  studentProgrammeOptions: string[];
  studentAssignmentStatusFilter: StudentAssignmentStatusFilter;
  setStudentAssignmentStatusFilter: Dispatch<SetStateAction<StudentAssignmentStatusFilter>>;
  studentAssignmentSearchTerm: string;
  setStudentAssignmentSearchTerm: Dispatch<SetStateAction<string>>;
  isParsingStudentAssignmentImport: boolean;
  handleStudentAssignmentImportFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  selectedStudentIds: string[];
  visibleStudentIds: string[];
  visibleStudentSelectionState: CheckboxState;
  toggleVisibleStudentSelection: (checked: CheckboxState) => void;
  isAssigningStudents: boolean;
  handleAssignStudents: (studentIds?: string[]) => Promise<void>;
  handleUnassignStudents: (studentIds?: string[]) => Promise<void>;
  paginatedStudentAssignmentRows: StudentAssignmentRow[];
  studentAssignmentRows: StudentAssignmentRow[];
  studentAssignmentPageStartIndex: number;
  studentAssignmentPage: number;
  studentAssignmentPageCount: number;
  setStudentAssignmentPage: Dispatch<SetStateAction<number>>;
  setStudentSelected: (studentId: string, checked: CheckboxState) => void;
  studentAssignmentImportPreview: StudentAssignmentImportPreview | null;
  setStudentAssignmentImportPreview: Dispatch<SetStateAction<StudentAssignmentImportPreview | null>>;
  isApplyingStudentAssignmentImport: boolean;
  handleApplyStudentAssignmentImport: () => Promise<void>;
  versionById: Map<string, StudyPlanVersion>;
  assignmentSummary: { assigned: number; need: number; planned: number };
  assignmentTermOptions: AssignmentTermOption[];
  selectedAssignmentTermOption: AssignmentTermOption | null;
  selectedAssignmentTerm: AcademicTermOption | null;
  assignmentForm: AssignmentForm;
  setAssignmentForm: Dispatch<SetStateAction<AssignmentForm>>;
  assignmentProgrammeFilter: string;
  setAssignmentProgrammeFilter: Dispatch<SetStateAction<string>>;
  assignmentProgrammeOptions: string[];
  assignmentStatusFilter: AssignmentStatusFilter;
  setAssignmentStatusFilter: Dispatch<SetStateAction<AssignmentStatusFilter>>;
  assignmentSearchTerm: string;
  setAssignmentSearchTerm: Dispatch<SetStateAction<string>>;
  selectedAssignmentKeys: string[];
  selectedAssignmentItems: AssignmentListItem[];
  visibleSelectionState: CheckboxState;
  visibleAssignableKeys: string[];
  toggleVisibleAssignmentSelection: (checked: CheckboxState) => void;
  bulkLecturerId: string;
  setBulkLecturerId: Dispatch<SetStateAction<string>>;
  lecturers: LecturerOption[];
  lecturerById: Map<string, LecturerOption>;
  isAssigning: boolean;
  handleBulkAssign: () => Promise<void>;
  isParsingAssignmentImport: boolean;
  handleAssignmentImportFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  isLoadingAssignments: boolean;
  filteredAssignmentItems: AssignmentListItem[];
  groupedAssignmentItems: { group: string; items: AssignmentListItem[] }[];
  assignmentPageStartIndex: number;
  assignmentPage: number;
  assignmentPageCount: number;
  setAssignmentPage: Dispatch<SetStateAction<number>>;
  setAssignmentKeySelected: (key: string, checked: CheckboxState) => void;
  assignmentRowLecturers: Record<string, string>;
  setAssignmentRowLecturers: Dispatch<SetStateAction<Record<string, string>>>;
  handleAssignCourse: (item: AssignmentListItem, lecturerId: string) => Promise<void>;
  assignmentImportPreview: AssignmentImportPreview | null;
  setAssignmentImportPreview: Dispatch<SetStateAction<AssignmentImportPreview | null>>;
  isApplyingAssignmentImport: boolean;
  handleApplyAssignmentImport: () => Promise<void>;
  courseTemplateLabel: (course?: CourseTemplateSummary) => string;
  lecturerLabel: (lecturer?: LecturerOption) => string;
  setTemplateHelpType: Dispatch<SetStateAction<ImportTemplateHelpType | null>>;
  templateHelpType: ImportTemplateHelpType | null;
};

export const StaffAcademicPlanningContext = createContext<StaffAcademicPlanningContextValue | null>(null);
