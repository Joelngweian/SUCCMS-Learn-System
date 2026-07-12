import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { notify } from "@/lib/notify";
import {
  assignCourseOfferingToLecturer,
  assignStudentStudyPlan,
  importStudyPlanVersion,
  listCourseAssignmentsForTerm,
  listLecturerOptions,
  listAssignableStudents,
  listPlannedCoursesForTerm,
  listStudentStudyPlanAssignments,
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
import type { ParsedStudyPlanImport } from "@/data/studyPlanImportParser";
import type { ParsedLecturerAssignmentRow } from "@/data/lecturerAssignmentImportParser";
import type { ParsedStudentStudyPlanAssignmentRow } from "@/data/studentStudyPlanAssignmentImportParser";
import type { ParsedAcademicCalendar } from "@/data/academicCalendarParser";
import {
  getAcademicTermOptions,
  getCourseCatalogTemplates,
  getCurrentEnrollmentTerm,
  upsertAcademicTermsFromCalendar,
  type AcademicTermOption,
  type CourseTemplateSummary,
  type CurrentEnrollmentTerm,
} from "@/data/courseRepository";
import { Alert, AlertDescription } from "../ui/alert";
import { StaffAcademicPlanningProvider } from "./academic-planning/AcademicPlanningProvider";
import { AcademicPlanningOverviewCards } from "./academic-planning/AcademicPlanningOverviewCards";
import { AcademicPlanningPageHeader } from "./academic-planning/AcademicPlanningPageHeader";
import { AcademicPlanningTabsShell } from "./academic-planning/AcademicPlanningTabsShell";
import type {
  AssignmentImportPreview,
  AssignmentImportPreviewRow,
  ImportTemplateHelpType,
  StaffAcademicPlanningContextValue,
  StudentAssignmentImportPreview,
  StudentAssignmentImportPreviewRow,
} from "./academic-planning/AcademicPlanningContext";
import { ImportTemplateHelpDialog } from "./academic-planning/ImportTemplateHelpDialog";
import {
  ALL_FILTER_VALUE,
  ASSIGNMENT_COURSES_PAGE_SIZE,
  STUDENT_ASSIGNMENT_PAGE_SIZE,
  academicCalendarStatusClassName,
  activeSegmentClassName,
  assignmentStatusLabel,
  compareTermCodes,
  courseCodeAliases,
  courseTemplateLabel,
  formatDateLabel,
  lecturerLabel,
  nextAcademicCalendarYearLabel,
  normalizeStudentIdentifierForAssignment,
  normalizeTermCode,
  resolveAcademicTermStatus,
  studentAssignmentStatusLabel,
  termLabelFromCode,
  versionLabel,
  type AssignmentStatusFilter,
  type StudentAssignmentStatusFilter,
} from "./academic-planning/academicPlanningUtils";
import {
  useAcademicCalendarView,
  useAcademicPlanningLookups,
  useClassAssignmentView,
  useStudentStudyPlanAssignmentView,
  useStudyPlanVersionView,
} from "./academic-planning/useAcademicPlanningViews";
import { useAcademicPlanningTabState } from "./academic-planning/useAcademicPlanningTabState";
import {
  emptyCourseForm,
  useStudyPlanCourseHandlers,
} from "./academic-planning/useStudyPlanCourseHandlers";
import { useVisibleSelection } from "./academic-planning/useVisibleSelection";
import { useStudentStudyPlanAssignmentHandlers } from "./academic-planning/useStudentStudyPlanAssignmentHandlers";
import { useClassAssignmentHandlers } from "./academic-planning/useClassAssignmentHandlers";

export function StaffAcademicPlanning() {
  const { session } = useAuth();
  const { activePlanningTab, handlePlanningTabChange } =
    useAcademicPlanningTabState();
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
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [assignmentForm, setAssignmentForm] = useState({
    termCode: "",
  });

  const {
    courseByCode,
    courseById,
    lecturerByEmail,
    lecturerById,
    lecturerByName,
    studentAssignmentByStudentId,
    studentByIdentifier,
    termById,
    versionByCode,
    versionById,
  } = useAcademicPlanningLookups({
    courseTemplates,
    lecturers,
    studentAssignments,
    students,
    terms,
    versions,
  });

  const {
    filteredVersionCourses,
    filteredVersions,
    importPreviewCoursesByTerm,
    importTermSummary,
    selectedVersion,
    versionCourseGroups,
    versionCourseTermOptions,
    versionIntakeOptions,
    versionLevelOptions,
    versionProgrammeOptions,
  } = useStudyPlanVersionView({
    selectedVersionId,
    studyPlanImportPreview,
    versionCourseTermFilter,
    versionCourses,
    versionIntakeFilter,
    versionLevelFilter,
    versionProgrammeFilter,
    versions,
  });

  const {
    paginatedStudentAssignmentRows,
    selectedStudentAssignmentVersion,
    studentAssignmentPageCount,
    studentAssignmentPageStartIndex,
    studentAssignmentRows,
    studentAssignmentSummary,
    studentAssignmentVersionOptions,
    studentProgrammeOptions,
    visibleStudentIds,
    visibleStudentSelectionState,
  } = useStudentStudyPlanAssignmentView({
    selectedStudentAssignmentVersionId,
    selectedStudentIds,
    studentAssignmentByStudentId,
    studentAssignmentPage,
    studentAssignmentProgrammeFilter,
    studentAssignmentSearchTerm,
    studentAssignmentStatusFilter,
    students,
    versionById,
    versions,
  });

  const {
    assignmentTermOptions,
    calendarTerms,
    isAcademicCalendarExpired,
    latestCalendarTerm,
    selectedAssignmentTerm,
    selectedAssignmentTermOption,
    visibleCalendarTerms,
  } = useAcademicCalendarView({
    assignmentTermCode: assignmentForm.termCode,
    currentEnrollmentTermCode: currentEnrollmentTerm?.code,
    showClosedAcademicTerms,
    terms,
  });

  const {
    assignmentItemByCourseId,
    assignmentItems,
    assignmentPageCount,
    assignmentPageStartIndex,
    assignmentProgrammeOptions,
    assignmentSummary,
    filteredAssignmentItems,
    groupedAssignmentItems,
    selectedAssignmentItems,
    visibleAssignableKeys,
    visibleSelectionState,
  } = useClassAssignmentView({
    assignmentPage,
    assignmentProgrammeFilter,
    assignmentSearchTerm,
    assignmentStatusFilter,
    assignments,
    courseByCode,
    plannedAssignmentCourses,
    selectedAssignmentKeys,
  });
  const {
    setSelected: setStudentSelected,
    toggleVisibleSelection: toggleVisibleStudentSelection,
  } = useVisibleSelection(visibleStudentIds, setSelectedStudentIds);
  const {
    setSelected: setAssignmentKeySelected,
    toggleVisibleSelection: toggleVisibleAssignmentSelection,
  } = useVisibleSelection(visibleAssignableKeys, setSelectedAssignmentKeys);
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
  const {
    handleAddCourse,
    handleDeleteCourse,
    isSavingCourse,
  } = useStudyPlanCourseHandlers({
    courseForm,
    loadVersionCourses,
    selectedVersionId,
    setCourseForm,
    versionCourses,
  });

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
      const { parseStudyPlanFiles } = await import("@/data/studyPlanImportParser");
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
      const { parseAcademicCalendarPdf } = await import("@/data/academicCalendarParser");
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
  const refreshStudentAssignments = async () => {
    try {
      setStudentAssignments(await listStudentStudyPlanAssignments());
    } catch (error) {
      notify.error(error, "Failed to refresh student study plan assignments.");
    }
  };
  const {
    handleAssignStudents,
    handleUnassignStudents,
    isAssigningStudents,
  } = useStudentStudyPlanAssignmentHandlers({
    refreshStudentAssignments,
    selectedStudentAssignmentVersion,
    selectedStudentAssignmentVersionId,
    selectedStudentIds,
    setSelectedStudentIds,
  });

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
      const { parseStudentStudyPlanAssignmentFile } = await import("@/data/studentStudyPlanAssignmentImportParser");
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
  const {
    handleAssignCourse,
    handleBulkAssign,
    isAssigning,
  } = useClassAssignmentHandlers({
    bulkLecturerId,
    lecturerById,
    refreshAssignmentWorkbench,
    selectedAssignmentItems,
    selectedAssignmentTerm,
    setAssignmentRowLecturers,
    setBulkLecturerId,
    setSelectedAssignmentKeys,
  });

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
      const { parseLecturerAssignmentFile } = await import("@/data/lecturerAssignmentImportParser");
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
  } satisfies StaffAcademicPlanningContextValue;

  return (
    <StaffAcademicPlanningProvider value={academicPlanningContextValue}>
      <div className="min-w-0 space-y-6 overflow-x-hidden">
      <AcademicPlanningPageHeader
        isLoading={isLoading}
        onRefresh={() => void loadAll()}
      />

      {loadError && (
        <Alert>
          <AlertDescription>
            {loadError}. If this is the first setup, run the Staff/AARO academic planning migration in Supabase SQL Editor first.
          </AlertDescription>
        </Alert>
      )}

      <AcademicPlanningOverviewCards
        lecturersCount={lecturers.length}
        semestersCount={calendarTerms.length}
        selectedCoursesCount={versionCourses.length}
        studyPlansCount={versions.length}
      />

      {isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <AcademicPlanningTabsShell
          activePlanningTab={activePlanningTab}
          onTabChange={handlePlanningTabChange}
        />
      )}
      <ImportTemplateHelpDialog />
      </div>
    </StaffAcademicPlanningProvider>
  );
}
