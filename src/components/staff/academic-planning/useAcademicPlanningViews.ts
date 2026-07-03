import { useMemo } from "react";
import {
  type AssignableStudent,
  type CourseAssignmentSummary,
  type DbStudyPlanCourse,
  type LecturerOption,
  type PlannedAssignmentCourse,
  type StudentStudyPlanAssignment,
  type StudyPlanVersion,
} from "@/data/academicPlanningRepository";
import type { ParsedStudyPlanImport } from "@/data/studyPlanImportParser";
import { getProgrammeKeyFromProgramme } from "@/data/studyPlanUtils";
import type { AcademicTermOption, CourseTemplateSummary } from "@/data/courseRepository";
import {
  ALL_FILTER_VALUE,
  ASSIGNMENT_COURSES_PAGE_SIZE,
  STUDENT_ASSIGNMENT_PAGE_SIZE,
  buildAssignmentTermOptions,
  compareTermCodes,
  courseCodeAliases,
  isCalendarBackedAcademicTerm,
  normalizeAssignmentCourseCode,
  resolveAcademicTermStatus,
  studentIdentifierKeys,
  versionIntakeLabel,
  type AssignmentStatusFilter,
  type StudentAssignmentStatusFilter,
} from "./academicPlanningUtils";

export type AssignmentListItem = {
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

export function useAcademicPlanningLookups({
  courseTemplates,
  lecturers,
  studentAssignments,
  students,
  terms,
  versions,
}: {
  courseTemplates: CourseTemplateSummary[];
  lecturers: LecturerOption[];
  studentAssignments: StudentStudyPlanAssignment[];
  students: AssignableStudent[];
  terms: AcademicTermOption[];
  versions: StudyPlanVersion[];
}) {
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

  return {
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
  };
}

export function useStudyPlanVersionView({
  selectedVersionId,
  studyPlanImportPreview,
  versionCourseTermFilter,
  versionCourses,
  versionIntakeFilter,
  versionLevelFilter,
  versionProgrammeFilter,
  versions,
}: {
  selectedVersionId: string | null;
  studyPlanImportPreview: ParsedStudyPlanImport | null;
  versionCourseTermFilter: string;
  versionCourses: DbStudyPlanCourse[];
  versionIntakeFilter: string;
  versionLevelFilter: string;
  versionProgrammeFilter: string;
  versions: StudyPlanVersion[];
}) {
  const selectedVersion = useMemo(
    () => versions.find(version => version.id === selectedVersionId) || null,
    [selectedVersionId, versions],
  );

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

  return {
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
  };
}

export function useStudentStudyPlanAssignmentView({
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
}: {
  selectedStudentAssignmentVersionId: string | null;
  selectedStudentIds: string[];
  studentAssignmentByStudentId: Map<string, StudentStudyPlanAssignment>;
  studentAssignmentPage: number;
  studentAssignmentProgrammeFilter: string;
  studentAssignmentSearchTerm: string;
  studentAssignmentStatusFilter: StudentAssignmentStatusFilter;
  students: AssignableStudent[];
  versionById: Map<string, StudyPlanVersion>;
  versions: StudyPlanVersion[];
}) {
  const selectedStudentAssignmentVersion = useMemo(
    () => versions.find(version => version.id === selectedStudentAssignmentVersionId) || null,
    [selectedStudentAssignmentVersionId, versions],
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
    return selectedVisibleCount === visibleStudentIds.length ? true : "indeterminate" as const;
  }, [selectedStudentIds, visibleStudentIds]);

  const studentAssignmentSummary = useMemo(() => {
    const assigned = students.filter(student => studentAssignmentByStudentId.has(student.id)).length;
    return {
      assigned,
      need: Math.max(0, students.length - assigned),
      total: students.length,
    };
  }, [studentAssignmentByStudentId, students]);

  return {
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
  };
}

export function useAcademicCalendarView({
  assignmentTermCode,
  currentEnrollmentTermCode,
  showClosedAcademicTerms,
  terms,
}: {
  assignmentTermCode: string;
  currentEnrollmentTermCode?: string | null;
  showClosedAcademicTerms: boolean;
  terms: AcademicTermOption[];
}) {
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
    () => buildAssignmentTermOptions(calendarTerms, currentEnrollmentTermCode),
    [calendarTerms, currentEnrollmentTermCode],
  );

  const selectedAssignmentTermOption = useMemo(
    () => assignmentTermOptions.find(term => term.code === assignmentTermCode) || null,
    [assignmentTermCode, assignmentTermOptions],
  );

  const selectedAssignmentTerm = selectedAssignmentTermOption?.academicTerm || null;

  return {
    assignmentTermOptions,
    calendarTerms,
    isAcademicCalendarExpired,
    latestCalendarTerm,
    selectedAssignmentTerm,
    selectedAssignmentTermOption,
    visibleCalendarTerms,
  };
}

export function useClassAssignmentView({
  assignmentPage,
  assignmentProgrammeFilter,
  assignmentSearchTerm,
  assignmentStatusFilter,
  assignments,
  courseByCode,
  plannedAssignmentCourses,
  selectedAssignmentKeys,
}: {
  assignmentPage: number;
  assignmentProgrammeFilter: string;
  assignmentSearchTerm: string;
  assignmentStatusFilter: AssignmentStatusFilter;
  assignments: CourseAssignmentSummary[];
  courseByCode: Map<string, CourseTemplateSummary>;
  plannedAssignmentCourses: PlannedAssignmentCourse[];
  selectedAssignmentKeys: string[];
}) {
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
    return selectedVisibleCount === visibleAssignableKeys.length ? true : "indeterminate" as const;
  }, [selectedAssignmentKeys, visibleAssignableKeys]);

  return {
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
  };
}
