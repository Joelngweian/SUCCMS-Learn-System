import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
  type NormalizedCourseOffering,
} from "@/lib/courseOfferings";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { cachedRequest, invalidateRequestCache } from "./requestCache";
import { getSharedCachedData } from "./sharedCacheRepository";

const normalizeIds = (ids: string[]) =>
  Array.from(new Set(ids.filter(Boolean))).sort();

export type CourseInstructorSummary = {
  avatarUrl: string | null;
  courseId: string;
  fullName: string;
  id: string;
};

export type CurrentEnrollmentTerm = {
  code: string;
  ends_at: string | null;
  enrollment_ends_at: string | null;
  enrollment_starts_at: string | null;
  id: string;
  name: string;
  starts_at: string | null;
  status: string | null;
};

export type CourseTemplateSummary = {
  chinese_name: string | null;
  code: string;
  course_code: string | null;
  course_type: string | null;
  credit_hours: number | null;
  credits: number | null;
  faculty: string | null;
  id: string;
  name: string;
  programme: string | null;
  status: string | null;
};

export type AcademicTermOption = {
  code: string;
  ends_at: string | null;
  enrollment_ends_at?: string | null;
  enrollment_starts_at?: string | null;
  id: string;
  is_current_enrollment_term?: boolean | null;
  name: string;
  starts_at: string | null;
  status: string | null;
  teaching_ends_at?: string | null;
  teaching_starts_at?: string | null;
};

export type AvailableCourseOffering = NormalizedCourseOffering & {
  instructors: Array<{
    avatar_url: string | null;
    full_name: string;
    id: string;
  }>;
};

type AvailableCourseRow =
  Database["public"]["Functions"]["get_available_course_offerings"]["Returns"][number];

const asAvailableCourseOffering = (
  row: AvailableCourseRow,
): AvailableCourseOffering => ({
  id: row.id,
  template_id: row.template_id,
  course_code: row.course_code,
  code: row.code,
  name: row.name,
  chinese_name: row.chinese_name,
  faculty: row.faculty,
  programme: row.programme,
  course_type: row.course_type as NormalizedCourseOffering["course_type"],
  credits: row.credit_hours,
  credit_hours: row.credit_hours,
  max_capacity: row.max_capacity,
  enrollment_key: null,
  status: row.status as NormalizedCourseOffering["status"],
  semester: row.semester,
  created_at: row.created_at,
  instructors: Array.isArray(row.instructors)
    ? row.instructors.flatMap(value => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return [];
        const instructor = value as Record<string, unknown>;
        if (
          typeof instructor.id !== "string"
          || typeof instructor.full_name !== "string"
        ) return [];

        return [{
          avatar_url:
            typeof instructor.avatar_url === "string"
              ? instructor.avatar_url
              : null,
          full_name: instructor.full_name,
          id: instructor.id,
        }];
      })
    : [],
});

export async function getAvailableCourseOfferings({
  page,
  pageSize,
  searchTerm,
}: {
  page: number;
  pageSize: number;
  searchTerm: string;
}) {
  const { data, error } = await supabase.rpc("get_available_course_offerings", {
    p_limit: pageSize,
    p_offset: Math.max(0, page - 1) * pageSize,
    p_search: searchTerm.trim() || null,
  });

  if (error) throw error;
  const rows = data || [];
  return {
    courses: rows.map(asAvailableCourseOffering),
    totalCount: Number(rows[0]?.total_count || 0),
  };
}

export async function getCurrentEnrollmentTerm() {
  const { data, error } = await supabase.rpc("get_current_enrollment_term");
  if (error) throw error;
  return ((data || [])[0] || null) as CurrentEnrollmentTerm | null;
}

export async function getAcademicTermOptions(): Promise<AcademicTermOption[]> {
  const { data, error } = await supabase
    .from("academic_terms")
    .select("id, code, name, starts_at, ends_at, enrollment_starts_at, enrollment_ends_at, teaching_starts_at, teaching_ends_at, is_current_enrollment_term, status")
    .order("starts_at", { ascending: false, nullsFirst: false })
    .order("code", { ascending: false });

  if (error) throw error;
  return (data || []) as AcademicTermOption[];
}

export async function upsertAcademicTermsFromCalendar(
  terms: Array<{
    code: string;
    endsAt: string | null;
    enrollmentEndsAt: string | null;
    enrollmentStartsAt: string | null;
    name: string;
    startsAt: string | null;
    status: "planned" | "active" | "closed";
    teachingEndsAt: string | null;
    teachingStartsAt: string | null;
  }>,
): Promise<AcademicTermOption[]> {
  const payload = terms.map(term => ({
    code: term.code,
    ends_at: term.endsAt,
    enrollment_ends_at: term.enrollmentEndsAt,
    enrollment_starts_at: term.enrollmentStartsAt,
    name: term.name,
    starts_at: term.startsAt,
    status: term.status,
    teaching_ends_at: term.teachingEndsAt,
    teaching_starts_at: term.teachingStartsAt,
  }));

  const { data, error } = await (supabase as any).rpc("staff_upsert_academic_terms", {
    p_terms: payload,
  });

  if (error) throw error;
  return (data || []) as AcademicTermOption[];
}

export async function getCourseCatalogTemplates(): Promise<CourseTemplateSummary[]> {
  const { data, error } = await supabase.rpc("get_course_catalog_summary");

  if (!error) {
    return (data || []) as CourseTemplateSummary[];
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("courses")
    .select(
      "id, code, name, course_code, chinese_name, faculty, programme, course_type, credits, credit_hours, status",
    )
    .order("course_code", { ascending: true, nullsFirst: false })
    .order("code", { ascending: true });

  if (fallbackError) throw fallbackError;
  return (fallbackData || []) as CourseTemplateSummary[];
}

export async function getCourseTemplatesByCodes(
  courseCodes: string[],
): Promise<CourseTemplateSummary[]> {
  const codes = normalizeIds(courseCodes.map(code => code.toUpperCase()));
  if (codes.length === 0) return [];

  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, code, name, course_code, chinese_name, faculty, programme, course_type, credits, credit_hours, status",
    )
    .in("course_code", codes)
    .order("course_code", { ascending: true });

  if (error) throw error;
  return (data || []) as CourseTemplateSummary[];
}

export async function getActiveCourseOfferingsByCodes({
  courseCodes,
  termId,
}: {
  courseCodes: string[];
  termId: string;
}): Promise<NormalizedCourseOffering[]> {
  const templates = await getCourseTemplatesByCodes(courseCodes);
  const templateIds = normalizeIds(templates.map(course => course.id));
  if (templateIds.length === 0) return [];

  const { data, error } = await supabase
    .from("course_offerings")
    .select(COURSE_OFFERING_SELECT)
    .eq("academic_term_id", termId)
    .eq("status", "active")
    .in("course_id", templateIds);

  if (error) throw error;
  return (data || []).map(normalizeCourseOffering);
}

export async function getCourseOffering(
  courseId: string,
): Promise<NormalizedCourseOffering | null> {
  return cachedRequest(`course:offering:${courseId}`, async () => {
    const { data, error } = await supabase
      .from("course_offerings")
      .select(COURSE_OFFERING_SELECT)
      .eq("id", courseId)
      .maybeSingle();

    if (error) throw error;
    return data ? normalizeCourseOffering(data) : null;
  });
}

export async function getCourseOfferings(
  courseIds: string[],
): Promise<NormalizedCourseOffering[]> {
  const ids = normalizeIds(courseIds);
  if (ids.length === 0) return [];

  return cachedRequest(`course:offerings:${ids.join(",")}`, async () => {
    const { data, error } = await supabase
      .from("course_offerings")
      .select(COURSE_OFFERING_SELECT)
      .in("id", ids);

    if (error) throw error;
    return (data || []).map(normalizeCourseOffering);
  });
}

export async function getActiveCourseOfferings(): Promise<
  NormalizedCourseOffering[]
> {
  return cachedRequest("course:offerings:active", async () => {
    try {
      const data = await getSharedCachedData<unknown[]>(
        "active-course-offerings",
      );
      return data.map(normalizeCourseOffering);
    } catch (cacheError) {
      console.warn("Shared course cache unavailable; using direct query:", cacheError);
      const { data, error } = await supabase
        .from("course_offerings")
        .select(COURSE_OFFERING_SELECT)
        .eq("status", "active");

      if (error) throw error;
      return (data || []).map(normalizeCourseOffering);
    }
  });
}

export async function getCourseInstructorSummaries(
  courseIds: string[],
): Promise<CourseInstructorSummary[]> {
  const ids = normalizeIds(courseIds);
  if (ids.length === 0) return [];

  return cachedRequest(`course:instructors:${ids.join(",")}`, async () => {
    const batches: string[][] = [];
    for (let index = 0; index < ids.length; index += 80) {
      batches.push(ids.slice(index, index + 80));
    }

    const results = await Promise.all(
      batches.map(batch =>
        supabase
          .from("course_instructors")
          .select("course_id, user_profiles(id, full_name, avatar_url)")
          .in("course_id", batch),
      ),
    );
    const failedResult = results.find(result => result.error);
    if (failedResult?.error) throw failedResult.error;

    return results.flatMap(result =>
      (result.data || []).flatMap(row => {
        const profile = Array.isArray(row.user_profiles)
          ? row.user_profiles[0]
          : row.user_profiles;
        if (!profile) return [];

        return [{
          avatarUrl: profile.avatar_url,
          courseId: row.course_id,
          fullName: profile.full_name,
          id: profile.id,
        }];
      }),
    );
  }, 10_000);
}

export async function getLecturerCourseIds(userId: string): Promise<string[]> {
  return cachedRequest(`course:lecturer:${userId}`, async () => {
    const { data, error } = await supabase
      .from("course_instructors")
      .select("course_id")
      .eq("user_id", userId);

    if (error) throw error;
    return normalizeIds((data || []).map(row => row.course_id));
  });
}

export async function getStudentCourseOfferings(
  userId: string,
): Promise<NormalizedCourseOffering[]> {
  return cachedRequest(`course:student-offerings:${userId}`, async () => {
    const { data, error } = await supabase
      .from("course_enrollments")
      .select(`course_id, course_offerings(${COURSE_OFFERING_SELECT})`)
      .eq("student_id", userId);

    if (error) throw error;
    return (data || [])
      .map(row => normalizeCourseOffering(row.course_offerings))
      .filter(course => Boolean(course.id));
  });
}

export async function getStudentCourseIds(userId: string): Promise<string[]> {
  return cachedRequest(`course:student:${userId}`, async () => {
    const offerings = await getStudentCourseOfferings(userId);
    return normalizeIds(offerings.map(course => course.id));
  });
}

export async function enrollStudentInCourse({
  courseId,
  studentId,
}: {
  courseId: string;
  studentId: string;
}) {
  const { error } = await supabase.from("course_enrollments").insert({
    course_id: courseId,
    student_id: studentId,
  });

  if (error) throw error;
}

export async function enrollStudentInCourseWithKey({
  courseId,
  enrollmentKey,
}: {
  courseId: string;
  enrollmentKey: string;
}) {
  const { error } = await supabase.rpc("enroll_student_in_course", {
    p_course_id: courseId,
    p_enrollment_key: enrollmentKey,
  });

  if (error) throw error;
}

export async function getUserCourseOfferings(
  userId: string,
  role?: string | null,
) {
  const courseIds =
    role === "lecturer"
      ? await getLecturerCourseIds(userId)
      : null;

  return courseIds
    ? getCourseOfferings(courseIds)
    : getStudentCourseOfferings(userId);
}

export async function getCourseMemberIds(courseId: string) {
  return cachedRequest(`course:members:${courseId}`, async () => {
    const [studentResult, instructorResult] = await Promise.all([
      supabase
        .from("course_enrollments")
        .select("student_id")
        .eq("course_id", courseId),
      supabase
        .from("course_instructors")
        .select("user_id")
        .eq("course_id", courseId),
    ]);

    if (studentResult.error) throw studentResult.error;
    if (instructorResult.error) throw instructorResult.error;

    return {
      instructorIds: normalizeIds(
        (instructorResult.data || []).map(row => row.user_id),
      ),
      studentIds: normalizeIds(
        (studentResult.data || []).map(row => row.student_id),
      ),
    };
  }, 5_000);
}

export function invalidateCourseCache({
  courseId,
  userId,
}: {
  courseId?: string;
  userId?: string;
} = {}) {
  if (!courseId && !userId) {
    invalidateRequestCache("course:");
    return;
  }

  if (courseId) {
    invalidateRequestCache(`course:offering:${courseId}`);
    invalidateRequestCache("course:offerings:");
    invalidateRequestCache("course:instructors:");
    invalidateRequestCache(`course:members:${courseId}`);
  }
  if (userId) {
    invalidateRequestCache(`course:lecturer:${userId}`);
    invalidateRequestCache(`course:student:${userId}`);
    invalidateRequestCache(`course:student-offerings:${userId}`);
  }
}
