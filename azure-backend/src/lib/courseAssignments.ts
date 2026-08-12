import { getPool } from "./db";
import type { AuthenticatedUser } from "../types/auth";

type UploadedFile = {
  bucket?: string;
  name: string;
  path: string;
  size?: number;
  type?: string;
  url?: string;
};

type CreateCourseAssignmentInput = {
  courseId: string;
  assessmentType: string;
  title: string;
  description?: string;
  rubric?: string | null;
  maxScore?: number | null;
  dueDate: string;
  attachments: UploadedFile[];
  markingGuide?: string;
};

export async function createCourseAssignment(
  input: CreateCourseAssignmentInput,
  requester: AuthenticatedUser
) {
  await assertCanManageCourse(input.courseId, requester);

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const assignment = await client.query<{ id: string }>(
      `
        INSERT INTO public.assignments (
          course_id,
          assessment_type,
          title,
          description,
          rubric,
          max_score,
          due_date,
          attachments,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        RETURNING id
      `,
      [
        input.courseId,
        input.assessmentType.trim(),
        input.title.trim(),
        cleanNullableText(input.description),
        cleanNullableText(input.rubric),
        input.maxScore ?? null,
        input.dueDate,
        JSON.stringify(input.attachments),
        requester.id
      ]
    );

    const assignmentId = assignment.rows[0]?.id;
    if (!assignmentId) throw new Error("assignment_not_created");

    const markingGuide = cleanNullableText(input.markingGuide);
    if (markingGuide) {
      await client.query(
        `
          INSERT INTO public.assignment_marking_guides (
            assignment_id,
            marking_guide,
            updated_by,
            updated_at
          )
          VALUES ($1, $2, $3, now())
          ON CONFLICT (assignment_id)
          DO UPDATE SET
            marking_guide = EXCLUDED.marking_guide,
            updated_by = EXCLUDED.updated_by,
            updated_at = now()
        `,
        [assignmentId, markingGuide, requester.id]
      );
    }

    await client.query("COMMIT");
    return { id: assignmentId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listCourseAssignments(courseId: string, requester: AuthenticatedUser) {
  await assertCanViewCourse(courseId, requester);

  const result = await getPool().query(
    `
      SELECT id, course_id, assessment_type, title, description, created_by,
             due_date, max_score, created_at, updated_at, attachments, rubric
      FROM public.assignments
      WHERE course_id = $1
      ORDER BY due_date ASC
    `,
    [courseId]
  );

  return result.rows;
}

async function assertCanManageCourse(courseId: string, requester: AuthenticatedUser) {
  const profile = await getPool().query<{ role: string; is_active: boolean | null }>(
    `SELECT role, is_active FROM public.user_profiles WHERE id = $1 LIMIT 1`,
    [requester.id]
  );
  const userProfile = profile.rows[0];
  if (
    !userProfile
    || !["lecturer", "admin"].includes(userProfile.role)
    || userProfile.is_active === false
  ) {
    throw httpError(403, "Lecturer access is required.");
  }

  const course = await getPool().query<{ id: string }>(
    `SELECT id FROM public.course_offerings WHERE id = $1 LIMIT 1`,
    [courseId]
  );
  if (course.rowCount === 0) throw httpError(404, "Course not found.");
  if (userProfile.role === "admin") return;

  const instructor = await getPool().query(
    `SELECT user_id FROM public.course_instructors WHERE course_id = $1 AND user_id = $2 LIMIT 1`,
    [courseId, requester.id]
  );
  if (instructor.rowCount === 0) {
    throw httpError(403, "You are not an instructor for this course.");
  }
}

async function assertCanViewCourse(courseId: string, requester: AuthenticatedUser) {
  const profile = await getPool().query<{ role: string; is_active: boolean | null }>(
    `SELECT role, is_active FROM public.user_profiles WHERE id = $1 LIMIT 1`,
    [requester.id]
  );
  const userProfile = profile.rows[0];
  if (!userProfile || userProfile.is_active === false) {
    throw httpError(403, "Course access is required.");
  }

  const course = await getPool().query<{ id: string }>(
    `SELECT id FROM public.course_offerings WHERE id = $1 LIMIT 1`,
    [courseId]
  );
  if (course.rowCount === 0) throw httpError(404, "Course not found.");
  if (["admin", "staff"].includes(userProfile.role)) return;

  if (userProfile.role === "lecturer") {
    const instructor = await getPool().query(
      `SELECT user_id FROM public.course_instructors WHERE course_id = $1 AND user_id = $2 LIMIT 1`,
      [courseId, requester.id]
    );
    if ((instructor.rowCount || 0) > 0) return;
  }

  const enrollment = await getPool().query(
    `SELECT student_id FROM public.course_enrollments WHERE course_id = $1 AND student_id = $2 LIMIT 1`,
    [courseId, requester.id]
  );
  if (enrollment.rowCount === 0) {
    throw httpError(403, "You are not enrolled in this course.");
  }
}

function cleanNullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function httpError(status: number, message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}
