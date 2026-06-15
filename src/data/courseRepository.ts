import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
  type NormalizedCourseOffering,
} from "@/lib/courseOfferings";
import { supabase } from "@/lib/supabase";
import { cachedRequest, invalidateRequestCache } from "./requestCache";

const normalizeIds = (ids: string[]) =>
  Array.from(new Set(ids.filter(Boolean))).sort();

export type CourseInstructorSummary = {
  avatarUrl: string | null;
  courseId: string;
  fullName: string;
  id: string;
};

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
    const { data, error } = await supabase
      .from("course_offerings")
      .select(COURSE_OFFERING_SELECT)
      .eq("status", "active");

    if (error) throw error;
    return (data || []).map(normalizeCourseOffering);
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
