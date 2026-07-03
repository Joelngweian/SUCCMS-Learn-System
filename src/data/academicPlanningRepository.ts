import { supabase } from "@/lib/supabase";
import type { Database, Json } from "@/lib/database.types";
import type { AcademicTermOption, CourseTemplateSummary } from "./courseRepository";
import type {
  ParsedStudyPlanImport,
  StudyPlanEntryType,
  StudyPlanMpuLevel,
  StudyPlanMpuStudentType,
  StudyPlanMpuUnit,
  StudyPlanTrackCode,
} from "./studyPlanImportParser";
import {
  getProgrammeKeyFromProgramme,
  parseStudentIdFromEmail,
  type StudyPlanCourseEntry,
  type StudyPlanLevel,
  type StudyPlanProgrammeKey,
} from "./studyPlanUtils";

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

type CourseCatalogInsert = Database["public"]["Tables"]["courses"]["Insert"];
type CourseCatalogRow = Pick<Database["public"]["Tables"]["courses"]["Row"], "course_code" | "id">;
type StudyPlanCourseRow = Database["public"]["Tables"]["study_plan_courses"]["Row"];
type StudyPlanVersionRow = Database["public"]["Tables"]["study_plan_versions"]["Row"];
type SelectedStudyPlanCourseRow = Pick<
  StudyPlanCourseRow,
  | "category"
  | "course_code"
  | "course_name"
  | "credit_hours"
  | "id"
  | "is_placeholder"
  | "mpu_level"
  | "mpu_student_type"
  | "mpu_unit"
  | "offer_until_term_code"
  | "plan_course_key"
  | "position"
  | "source_files"
  | "study_plan_version_id"
  | "term_code"
>;
type SelectedStudyPlanVersionRow = Pick<
  StudyPlanVersionRow,
  | "created_at"
  | "effective_from_term_code"
  | "entry_type"
  | "id"
  | "intake_semester"
  | "intake_year"
  | "level"
  | "notes"
  | "programme_key"
  | "programme_name"
  | "source_label"
  | "status"
  | "track_code"
  | "updated_at"
  | "version_code"
>;
type PlannedCourseJoinRow = SelectedStudyPlanCourseRow & {
  study_plan_versions: Pick<
    StudyPlanVersionRow,
    | "entry_type"
    | "id"
    | "intake_semester"
    | "intake_year"
    | "level"
    | "programme_key"
    | "programme_name"
    | "status"
    | "track_code"
  > | Array<Pick<
    StudyPlanVersionRow,
    | "entry_type"
    | "id"
    | "intake_semester"
    | "intake_year"
    | "level"
    | "programme_key"
    | "programme_name"
    | "status"
    | "track_code"
  >>;
};
type AssignedStudyPlanJoinRow = {
  id: string;
  study_plan_version_id: string;
  study_plan_versions: SelectedStudyPlanVersionRow | SelectedStudyPlanVersionRow[] | null;
};

const isAcademicPlanningSchemaMissing = (error: SupabaseLikeError | null | undefined) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("study_plan") && message.includes("schema cache") ||
    message.includes("could not find the table")
  );
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const normalizeCatalogCourseCode = (value?: string | null) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s*\/\s*/g, "/");

const looksLikeCatalogCourseCode = (value?: string | null) =>
  /^[A-Z]{2,}[A-Z0-9]*\d{3,}[A-Z0-9]*$/.test(normalizeCatalogCourseCode(value));

const catalogCourseCodes = (value?: string | null) => {
  const normalized = normalizeCatalogCourseCode(value);
  if (!normalized) return [];
  return Array.from(new Set(normalized.split("/").map(code => code.trim()).filter(looksLikeCatalogCourseCode)));
};

const facultyForProgramme = (programmeKey: string) =>
  ["IT", "CS", "BOSE"].includes(programmeKey)
    ? "Faculty of Engineering and Information Technology"
    : "All Faculties";

const courseTypeFromStudyPlanCategory = (category?: string | null, mpuUnit?: string | null) => {
  const text = String(category || "").toUpperCase();
  if (mpuUnit || text.includes("MPU")) return "common_core";
  if (text.includes("FREE ELECTIVE")) return "elective_open";
  if (text.includes("ELECTIVE")) return "elective_core";
  if (text.includes("COMMON") || text.includes("COMPULSORY")) return "common_core";
  if (text.includes("CORE")) return "discipline_core";
  return "discipline_core";
};

const syncCourseCatalogFromStudyPlan = async (preview: ParsedStudyPlanImport) => {
  const coursesByCode = new Map<string, CourseCatalogInsert>();

  for (const course of preview.courses) {
    if (course.isPlaceholder) continue;
    if (!course.courseName || /^\d+(?:\.\d+)?$/.test(course.courseName.trim())) continue;

    for (const courseCode of catalogCourseCodes(course.courseCode)) {
      if (coursesByCode.has(courseCode)) continue;
      coursesByCode.set(courseCode, {
        code: courseCode,
        course_code: courseCode,
        course_type: courseTypeFromStudyPlanCategory(course.category, course.mpuUnit),
        credit_hours: course.creditHours,
        credits: course.creditHours,
        faculty: facultyForProgramme(preview.programmeKey),
        name: course.courseName.trim(),
        programme: preview.programmeName,
        status: "open",
      });
    }
  }

  const courseRows = Array.from(coursesByCode.values());
  const courseCodes = courseRows.map(course => course.course_code);
  const existingCourses = new Map<string, { id: string }>();

  for (let index = 0; index < courseCodes.length; index += 100) {
    const { data, error } = await supabase
      .from("courses")
      .select("id, course_code")
      .in("course_code", courseCodes.slice(index, index + 100));

    if (error) throw error;
    for (const course of (data || []) as CourseCatalogRow[]) {
      if (course.course_code) existingCourses.set(course.course_code, { id: course.id });
    }
  }

  const coursesToInsert: CourseCatalogInsert[] = [];

  for (const course of courseRows) {
    const existingCourse = existingCourses.get(course.course_code);
    if (!existingCourse) {
      coursesToInsert.push(course);
      continue;
    }

    const { error } = await supabase
      .from("courses")
      .update({
        course_type: course.course_type,
        credit_hours: course.credit_hours,
        credits: course.credits,
        faculty: course.faculty,
        name: course.name,
        programme: course.programme,
        status: course.status,
      })
      .eq("id", existingCourse.id);

    if (error) throw error;
  }

  for (let index = 0; index < coursesToInsert.length; index += 100) {
    const { error } = await supabase
      .from("courses")
      .insert(coursesToInsert.slice(index, index + 100));

    if (error) throw error;
  }
};

export type StudyPlanVersion = {
  id: string;
  programme_key: StudyPlanProgrammeKey;
  programme_name: string;
  level: StudyPlanLevel;
  intake_year: number | null;
  intake_semester: "A" | "B" | "C" | null;
  track_code: StudyPlanTrackCode | null;
  entry_type: StudyPlanEntryType | null;
  version_code: string;
  status: "draft" | "active" | "archived";
  effective_from_term_code: string | null;
  source_label: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DbStudyPlanCourse = {
  id: string;
  study_plan_version_id: string;
  term_code: string;
  course_code: string | null;
  course_name: string;
  category: string | null;
  credit_hours: number | null;
  is_placeholder: boolean;
  mpu_level: StudyPlanMpuLevel | null;
  mpu_student_type: StudyPlanMpuStudentType | null;
  mpu_unit: StudyPlanMpuUnit | null;
  offer_until_term_code: string | null;
  position: number;
  plan_course_key: string;
  source_files: string[];
};


export type LecturerOption = {
  avatar_url: string | null;
  email: string | null;
  faculty: string | null;
  full_name: string;
  id: string;
  programme: string | null;
};

export type CourseAssignmentSummary = {
  academic_term_id: string | null;
  course_id: string | null;
  created_at: string | null;
  enrollment_key: string | null;
  id: string;
  owner_id: string | null;
  section_code: string | null;
  status: string | null;
};

export type PlannedAssignmentCourse = {
  category: string | null;
  course_code: string | null;
  course_name: string;
  credit_hours: number | null;
  id: string;
  intake_semester: "A" | "B" | "C" | null;
  intake_year: number | null;
  track_code: StudyPlanTrackCode | null;
  entry_type: StudyPlanEntryType | null;
  is_placeholder: boolean;
  level: StudyPlanLevel;
  plan_course_key: string;
  position: number;
  programme_key: StudyPlanProgrammeKey;
  programme_name: string;
  mpu_level: StudyPlanMpuLevel | null;
  mpu_student_type: StudyPlanMpuStudentType | null;
  mpu_unit: StudyPlanMpuUnit | null;
  offer_until_term_code: string | null;
  study_plan_version_id: string;
  term_code: string;
};

export type AssignableStudent = {
  avatar_url: string | null;
  email: string | null;
  faculty: string | null;
  full_name: string;
  id: string;
  programme: string | null;
  role: string | null;
};

export type StudentStudyPlanAssignment = {
  assigned_by: string | null;
  created_at: string;
  id: string;
  notes: string | null;
  status: "active" | "inactive";
  student_id: string;
  study_plan_version_id: string;
  updated_at: string;
};

const STUDY_PLAN_COURSE_SELECT =
  "id, study_plan_version_id, term_code, course_code, course_name, category, credit_hours, is_placeholder, mpu_level, mpu_student_type, mpu_unit, offer_until_term_code, position, plan_course_key, source_files";

const STUDY_PLAN_VERSION_SELECT =
  "id, programme_key, programme_name, level, intake_year, intake_semester, track_code, entry_type, version_code, status, effective_from_term_code, source_label, notes, created_at, updated_at";

const mapCoursesToEntries = ({
  courses,
  version,
}: {
  courses: SelectedStudyPlanCourseRow[];
  version: SelectedStudyPlanVersionRow;
}): StudyPlanCourseEntry[] =>
  (courses || []).map(row => ({
    programmeKey: version.programme_key,
    programmeName: version.programme_name,
    level: version.level,
    intakeYear: version.intake_year,
    intakeSemester: version.intake_semester,
    termCode: row.term_code,
    courseCode: row.course_code,
    courseName: row.course_name,
    category: row.category,
    creditHours: row.credit_hours,
    isPlaceholder: Boolean(row.is_placeholder),
    sourceFiles: asStringArray(row.source_files),
    position: Number(row.position) || 1,
    planCourseKey: row.plan_course_key,
  }));

export async function getDbStudyPlanCoursesForStudent({
  email,
  programme,
  studentProfileId,
  termCode,
}: {
  email?: string | null;
  programme?: string | null;
  studentProfileId?: string | null;
  termCode: string;
}) {
  const programmeKey = getProgrammeKeyFromProgramme(programme);
  const parsedStudentId = parseStudentIdFromEmail(email);

  if (studentProfileId) {
    const { data: assignment, error: assignmentError } = await supabase
      .from("student_study_plan_assignments")
      .select(`id, study_plan_version_id, study_plan_versions!inner(${STUDY_PLAN_VERSION_SELECT})`)
      .eq("student_id", studentProfileId)
      .eq("status", "active")
      .maybeSingle();

    if (assignmentError) {
      if (isAcademicPlanningSchemaMissing(assignmentError)) return null;
      console.warn("Failed to load student study plan assignment.", assignmentError);
      return null;
    }

    if (assignment?.study_plan_versions) {
      const version = Array.isArray(assignment.study_plan_versions)
        ? assignment.study_plan_versions[0]
        : assignment.study_plan_versions;
      const { data: courses, error: coursesError } = await supabase
        .from("study_plan_courses")
        .select(STUDY_PLAN_COURSE_SELECT)
        .eq("study_plan_version_id", version.id)
        .eq("term_code", termCode)
        .order("position", { ascending: true })
        .order("course_code", { ascending: true, nullsFirst: false });

      if (coursesError) {
        if (isAcademicPlanningSchemaMissing(coursesError)) return null;
        console.warn("Failed to load assigned DB study plan courses.", coursesError);
        return null;
      }

      return {
        entries: mapCoursesToEntries({ courses: courses || [], version }),
        programmeKey: version.programme_key as StudyPlanProgrammeKey,
        studentId: parsedStudentId,
        isExactMatch: true,
        message: null as string | null,
      };
    }

    return {
      entries: [] as StudyPlanCourseEntry[],
      programmeKey,
      studentId: parsedStudentId,
      isExactMatch: false,
      message: "AARO has not assigned your study plan track yet. Please contact AARO or your department if this is unexpected.",
    };
  }

  if (!programmeKey || !parsedStudentId) return null;

  const { data: version, error: versionError } = await supabase
    .from("study_plan_versions")
    .select(STUDY_PLAN_VERSION_SELECT)
    .eq("programme_key", programmeKey)
    .eq("level", parsedStudentId.level)
    .eq("intake_year", parsedStudentId.intakeYear)
    .eq("intake_semester", parsedStudentId.intakeSemester)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionError) {
    if (isAcademicPlanningSchemaMissing(versionError)) return null;
    console.warn("Failed to load DB study plan version.", versionError);
    return null;
  }

  if (!version?.id) return null;

  const { data: courses, error: coursesError } = await supabase
    .from("study_plan_courses")
    .select(STUDY_PLAN_COURSE_SELECT)
    .eq("study_plan_version_id", version.id)
    .eq("term_code", termCode)
    .order("position", { ascending: true })
    .order("course_code", { ascending: true, nullsFirst: false });

  if (coursesError) {
    if (isAcademicPlanningSchemaMissing(coursesError)) return null;
    console.warn("Failed to load DB study plan courses.", coursesError);
    return null;
  }

  return {
    entries: mapCoursesToEntries({ courses: courses || [], version }),
    programmeKey,
    studentId: parsedStudentId,
    isExactMatch: true,
    message: null as string | null,
  };
}


export async function listStudyPlanVersions(): Promise<StudyPlanVersion[]> {
  const { data, error } = await supabase
    .from("study_plan_versions")
    .select(
      STUDY_PLAN_VERSION_SELECT,
    )
    .order("programme_key", { ascending: true })
    .order("intake_year", { ascending: true, nullsFirst: false })
    .order("intake_semester", { ascending: true, nullsFirst: false })
    .order("version_code", { ascending: true });

  if (error) throw error;
  return (data || []) as StudyPlanVersion[];
}

export async function listStudyPlanCourses(versionId: string): Promise<DbStudyPlanCourse[]> {
  if (!versionId) return [];
  const { data, error } = await supabase
    .from("study_plan_courses")
    .select(
      STUDY_PLAN_COURSE_SELECT,
    )
    .eq("study_plan_version_id", versionId)
    .order("term_code", { ascending: true })
    .order("position", { ascending: true })
    .order("course_code", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return ((data || []) as SelectedStudyPlanCourseRow[]).map(row => ({
    ...row,
    source_files: asStringArray(row.source_files),
  })) as DbStudyPlanCourse[];
}

export async function addStudyPlanCourse(input: {
  category?: string | null;
  courseCode?: string | null;
  courseName: string;
  creditHours?: number | null;
  isPlaceholder?: boolean;
  planCourseKey?: string | null;
  position?: number | null;
  studyPlanVersionId: string;
  termCode: string;
}) {
  const courseCode = input.courseCode?.trim().toUpperCase() || null;
  const courseName = input.courseName.trim();
  const planCourseKey =
    input.planCourseKey?.trim() ||
    courseCode ||
    courseName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "REQUIREMENT";

  const { error } = await supabase.from("study_plan_courses").insert({
    category: input.category?.trim() || null,
    course_code: courseCode,
    course_name: courseName,
    credit_hours: input.creditHours ?? null,
    is_placeholder: Boolean(input.isPlaceholder || !courseCode),
    plan_course_key: planCourseKey,
    position: input.position || 1,
    source_files: [],
    study_plan_version_id: input.studyPlanVersionId,
    term_code: input.termCode.trim().toUpperCase(),
  });

  if (error) throw error;
}

export async function deleteStudyPlanCourse(courseId: string) {
  const { error } = await supabase.from("study_plan_courses").delete().eq("id", courseId);
  if (error) throw error;
}

export async function importStudyPlanVersion(preview: ParsedStudyPlanImport): Promise<StudyPlanVersion> {
  const { data: version, error: versionError } = await supabase
    .from("study_plan_versions")
    .upsert(
      {
        effective_from_term_code: String(preview.intakeYear) + preview.intakeSemester,
        intake_semester: preview.intakeSemester,
        intake_year: preview.intakeYear,
        level: preview.level,
        track_code: preview.trackCode,
        entry_type: preview.entryType,
        notes: "Imported from " + preview.sourceLabel,
        programme_key: preview.programmeKey,
        programme_name: preview.programmeName,
        source_label: preview.sourceLabel,
        status: "active",
        updated_at: new Date().toISOString(),
        version_code: preview.versionCode,
      },
      { onConflict: "programme_key,intake_year,intake_semester,version_code" },
    )
    .select(
      STUDY_PLAN_VERSION_SELECT,
    )
    .single();

  if (versionError) throw versionError;

  await syncCourseCatalogFromStudyPlan(preview);

  const importedVersion = version as StudyPlanVersion;
  const courseRows = preview.courses.map(course => ({
    category: course.category,
    course_code: course.courseCode,
    course_name: course.courseName,
    credit_hours: course.creditHours,
    is_placeholder: course.isPlaceholder,
    mpu_level: course.mpuLevel,
    mpu_student_type: course.mpuStudentType,
    mpu_unit: course.mpuUnit,
    offer_until_term_code: course.offerUntilTermCode,
    plan_course_key: course.planCourseKey,
    position: course.position,
    source_files: course.sourceFiles,
    study_plan_version_id: importedVersion.id,
    term_code: course.termCode,
  }));
  const importedCourseKeys = new Set(
    courseRows.map(row => row.term_code + "::" + row.plan_course_key + "::" + row.position),
  );

  for (let index = 0; index < courseRows.length; index += 100) {
    const { error: upsertCoursesError } = await supabase
      .from("study_plan_courses")
      .upsert(courseRows.slice(index, index + 100), {
        onConflict: "study_plan_version_id,term_code,plan_course_key,position",
      });
    if (upsertCoursesError) throw upsertCoursesError;
  }

  const { data: existingCourses, error: existingCoursesError } = await supabase
    .from("study_plan_courses")
    .select("id, term_code, plan_course_key, position")
    .eq("study_plan_version_id", importedVersion.id);

  if (existingCoursesError) throw existingCoursesError;

  const staleCourseIds = ((existingCourses || []) as Pick<
    StudyPlanCourseRow,
    "id" | "plan_course_key" | "position" | "term_code"
  >[])
    .filter(course =>
      !importedCourseKeys.has(course.term_code + "::" + course.plan_course_key + "::" + course.position),
    )
    .map(course => course.id)
    .filter(Boolean);

  for (let index = 0; index < staleCourseIds.length; index += 100) {
    const { error: deleteStaleCoursesError } = await supabase
      .from("study_plan_courses")
      .delete()
      .in("id", staleCourseIds.slice(index, index + 100));
    if (deleteStaleCoursesError) throw deleteStaleCoursesError;
  }


  return importedVersion;
}


export async function listAssignableStudents(): Promise<AssignableStudent[]> {
  const { data, error } = await supabase.rpc("staff_list_assignable_students");

  if (error) throw error;
  return (data || []) as AssignableStudent[];
}

export async function listStudentStudyPlanAssignments(): Promise<StudentStudyPlanAssignment[]> {
  const { data, error } = await supabase
    .from("student_study_plan_assignments")
    .select("id, student_id, study_plan_version_id, assigned_by, status, notes, created_at, updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []) as StudentStudyPlanAssignment[];
}

export async function assignStudentStudyPlan({
  notes,
  studentId,
  studyPlanVersionId,
}: {
  notes?: string | null;
  studentId: string;
  studyPlanVersionId: string;
}) {
  const { data, error } = await supabase.rpc("staff_assign_student_study_plan", {
    p_notes: notes || null,
    p_student_id: studentId,
    p_study_plan_version_id: studyPlanVersionId,
  });

  if (error) throw error;
  return data as string;
}

export async function unassignStudentStudyPlan(studentId: string) {
  const { data, error } = await supabase.rpc("staff_unassign_student_study_plan", {
    p_student_id: studentId,
  });

  if (error) throw error;
  return Number(data || 0);
}


export async function listLecturerOptions(): Promise<LecturerOption[]> {
  const { data, error } = await supabase.rpc("staff_list_lecturer_options");

  if (error) throw error;
  return (data || []) as LecturerOption[];
}

export async function listPlannedCoursesForTerm(termCode: string): Promise<PlannedAssignmentCourse[]> {
  const normalizedTermCode = termCode.trim().toUpperCase();
  if (!normalizedTermCode) return [];

  const { data, error } = await supabase
    .from("study_plan_courses")
    .select(
      "id, study_plan_version_id, term_code, course_code, course_name, category, credit_hours, is_placeholder, mpu_level, mpu_student_type, mpu_unit, offer_until_term_code, position, plan_course_key, study_plan_versions!inner(id, programme_key, programme_name, level, intake_year, intake_semester, track_code, entry_type, status)",
    )
    .eq("term_code", normalizedTermCode)
    .eq("study_plan_versions.status", "active")
    .order("course_code", { ascending: true, nullsFirst: false })
    .order("course_name", { ascending: true });

  if (error) throw error;

  return ((data || []) as PlannedCourseJoinRow[]).map(row => {
    const version = Array.isArray(row.study_plan_versions)
      ? row.study_plan_versions[0]
      : row.study_plan_versions;

    return {
      category: row.category,
      course_code: row.course_code,
      course_name: row.course_name,
      credit_hours: row.credit_hours,
      id: row.id,
      intake_semester: version?.intake_semester ?? null,
      intake_year: version?.intake_year ?? null,
      track_code: version?.track_code ?? null,
      entry_type: version?.entry_type ?? null,
      is_placeholder: Boolean(row.is_placeholder),
      level: version?.level,
      plan_course_key: row.plan_course_key,
      position: Number(row.position) || 1,
      programme_key: version?.programme_key,
      programme_name: version?.programme_name,
      mpu_level: row.mpu_level,
      mpu_student_type: row.mpu_student_type,
      mpu_unit: row.mpu_unit,
      offer_until_term_code: row.offer_until_term_code,
      study_plan_version_id: row.study_plan_version_id,
      term_code: row.term_code,
    };
  }) as PlannedAssignmentCourse[];
}

export async function listCourseAssignmentsForTerm(termId: string): Promise<CourseAssignmentSummary[]> {
  if (!termId) return [];

  const { data, error } = await supabase
    .from("course_offerings")
    .select("id, course_id, academic_term_id, owner_id, section_code, enrollment_key, status, created_at")
    .eq("academic_term_id", termId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as CourseAssignmentSummary[];
}

export async function listRecentCourseAssignments(): Promise<CourseAssignmentSummary[]> {
  const { data, error } = await supabase
    .from("course_offerings")
    .select("id, course_id, academic_term_id, owner_id, section_code, enrollment_key, status, created_at")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw error;
  return (data || []) as CourseAssignmentSummary[];
}

export async function assignCourseOfferingToLecturer({
  courseId,
  lecturerId,
  termId,
}: {
  courseId: string;
  lecturerId: string;
  termId: string;
}) {
  const { data, error } = await supabase.rpc("staff_assign_course_offering", {
    p_academic_term_id: termId,
    p_course_id: courseId,
    p_lecturer_id: lecturerId,
  });

  if (error) throw error;
  return data as string;
}




export type { AcademicTermOption, CourseTemplateSummary };
