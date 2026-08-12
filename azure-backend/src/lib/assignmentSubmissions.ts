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

type AssignmentCourseRow = {
  id: string;
  course_id: string;
};

type ProfileRow = {
  role: string;
  is_active: boolean | null;
};

const submissionColumns = `
  id, assignment_id, student_id, submission_file_url, submission_text,
  submitted_at, is_late, grade, feedback, files, rubric_grades
`;

const qualifiedSubmissionColumns = `
  submission.id, submission.assignment_id, submission.student_id,
  submission.submission_file_url, submission.submission_text,
  submission.submitted_at, submission.is_late, submission.grade,
  submission.feedback, submission.files, submission.rubric_grades
`;

export async function listCourseSubmissions(courseId: string, requester: AuthenticatedUser) {
  const profile = await getActiveProfile(requester.id);
  await assertCanViewCourse(courseId, requester.id, profile);

  if (["lecturer", "admin", "staff"].includes(profile.role)) {
    const result = await getPool().query(
      `
        SELECT ${qualifiedSubmissionColumns}
        FROM public.assignment_submissions submission
        JOIN public.assignments assignment ON assignment.id = submission.assignment_id
        WHERE assignment.course_id = $1
        ORDER BY submission.submitted_at DESC
      `,
      [courseId]
    );
    return result.rows;
  }

  const result = await getPool().query(
    `
      SELECT ${qualifiedSubmissionColumns}
      FROM public.assignment_submissions submission
      JOIN public.assignments assignment ON assignment.id = submission.assignment_id
      WHERE assignment.course_id = $1
        AND submission.student_id = $2
      ORDER BY submission.submitted_at DESC
    `,
    [courseId, requester.id]
  );
  return result.rows;
}

export async function submitAssignment(
  assignmentId: string,
  files: UploadedFile[],
  requester: AuthenticatedUser
) {
  const profile = await getActiveProfile(requester.id);
  if (profile.role !== "student") {
    throw httpError(403, "Student access is required.");
  }

  const assignment = await getAssignmentCourse(assignmentId);
  await assertCanViewCourse(assignment.course_id, requester.id, profile);

  const existing = await getPool().query<{ id: string }>(
    `
      SELECT id
      FROM public.assignment_submissions
      WHERE assignment_id = $1 AND student_id = $2
      LIMIT 1
    `,
    [assignmentId, requester.id]
  );

  const submittedAt = new Date().toISOString();
  if (existing.rows[0]?.id) {
    const updated = await getPool().query(
      `
        UPDATE public.assignment_submissions
        SET files = $2::jsonb,
            submitted_at = $3
        WHERE id = $1
        RETURNING ${submissionColumns}
      `,
      [existing.rows[0].id, JSON.stringify(files), submittedAt]
    );
    return updated.rows[0];
  }

  const inserted = await getPool().query(
    `
      INSERT INTO public.assignment_submissions (
        assignment_id,
        student_id,
        files,
        submitted_at
      )
      VALUES ($1, $2, $3::jsonb, $4)
      RETURNING ${submissionColumns}
    `,
    [assignmentId, requester.id, JSON.stringify(files), submittedAt]
  );
  return inserted.rows[0];
}

export async function deleteOwnSubmission(
  assignmentId: string,
  requester: AuthenticatedUser
) {
  const profile = await getActiveProfile(requester.id);
  if (profile.role !== "student") {
    throw httpError(403, "Student access is required.");
  }

  const assignment = await getAssignmentCourse(assignmentId);
  await assertCanViewCourse(assignment.course_id, requester.id, profile);

  await getPool().query(
    `
      DELETE FROM public.assignment_submissions
      WHERE assignment_id = $1 AND student_id = $2
    `,
    [assignmentId, requester.id]
  );
  return { deleted: true };
}

export async function saveSubmissionGrade(
  submissionId: string,
  grade: number,
  feedback: string,
  rubricGrades: unknown[],
  requester: AuthenticatedUser
) {
  const profile = await getActiveProfile(requester.id);
  if (!["lecturer", "admin", "staff"].includes(profile.role)) {
    throw httpError(403, "Lecturer access is required.");
  }

  const submission = await getPool().query<{ course_id: string }>(
    `
      SELECT assignment.course_id
      FROM public.assignment_submissions submission
      JOIN public.assignments assignment ON assignment.id = submission.assignment_id
      WHERE submission.id = $1
      LIMIT 1
    `,
    [submissionId]
  );
  const row = submission.rows[0];
  if (!row) throw httpError(404, "Submission not found.");

  await assertCanViewCourse(row.course_id, requester.id, profile);

  const updated = await getPool().query(
    `
      UPDATE public.assignment_submissions
      SET grade = $2,
          feedback = $3,
          rubric_grades = $4::jsonb
      WHERE id = $1
      RETURNING ${submissionColumns}
    `,
    [submissionId, grade, feedback, JSON.stringify(rubricGrades)]
  );
  return updated.rows[0];
}

async function getAssignmentCourse(assignmentId: string) {
  const result = await getPool().query<AssignmentCourseRow>(
    `SELECT id, course_id FROM public.assignments WHERE id = $1 LIMIT 1`,
    [assignmentId]
  );
  const assignment = result.rows[0];
  if (!assignment) throw httpError(404, "Assignment not found.");
  return assignment;
}

async function getActiveProfile(userId: string) {
  const result = await getPool().query<ProfileRow>(
    `SELECT role, is_active FROM public.user_profiles WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const profile = result.rows[0];
  if (!profile || profile.is_active === false) {
    throw httpError(403, "User access is required.");
  }
  return profile;
}

async function assertCanViewCourse(courseId: string, userId: string, profile: ProfileRow) {
  const course = await getPool().query<{ id: string }>(
    `SELECT id FROM public.course_offerings WHERE id = $1 LIMIT 1`,
    [courseId]
  );
  if ((course.rowCount || 0) === 0) throw httpError(404, "Course not found.");
  if (["admin", "staff"].includes(profile.role)) return;

  if (profile.role === "lecturer") {
    const instructor = await getPool().query(
      `SELECT user_id FROM public.course_instructors WHERE course_id = $1 AND user_id = $2 LIMIT 1`,
      [courseId, userId]
    );
    if ((instructor.rowCount || 0) > 0) return;
  }

  const enrollment = await getPool().query(
    `SELECT student_id FROM public.course_enrollments WHERE course_id = $1 AND student_id = $2 LIMIT 1`,
    [courseId, userId]
  );
  if ((enrollment.rowCount || 0) === 0) {
    throw httpError(403, "You are not enrolled in this course.");
  }
}

function httpError(status: number, message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}
