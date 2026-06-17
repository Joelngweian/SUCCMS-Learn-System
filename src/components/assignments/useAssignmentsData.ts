import { useCallback, useEffect, useState } from "react";
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings";
import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import type {
  AssignmentListItem,
  AssignmentSubmission,
  LecturerAssignmentBuckets,
  StudentAssignmentBuckets,
} from "./assignmentTypes";

type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];

type AssignmentQueryRow = AssignmentRow & {
  course_offerings?: unknown;
};

const ASSIGNMENT_SELECT =
  "id, course_id, title, description, created_by, due_date, max_score, created_at, updated_at, attachments, rubric";

const SUBMISSION_SELECT =
  "id, assignment_id, student_id, submission_file_url, submission_text, submitted_at, is_late, grade, feedback, files";

const emptyStudentBuckets: StudentAssignmentBuckets = {
  upcoming: [],
  pastDue: [],
  completed: [],
  crucialCount: 0,
};

const emptyLecturerBuckets: LecturerAssignmentBuckets = {
  all: [],
  needsGrading: [],
  graded: [],
};

const uniqueIds = (rows: Array<{ course_id: string }>) =>
  Array.from(new Set(rows.map(row => row.course_id).filter(Boolean)));

const normalizeAssignment = (
  assignment: AssignmentQueryRow,
): AssignmentListItem => ({
  ...assignment,
  courses: normalizeCourseOffering(assignment.course_offerings),
});

export function useAssignmentsData({
  isLecturer,
  profileId,
  userId,
}: {
  isLecturer: boolean;
  profileId?: string | null;
  userId?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [studentBuckets, setStudentBuckets] =
    useState<StudentAssignmentBuckets>(emptyStudentBuckets);
  const [lecturerBuckets, setLecturerBuckets] =
    useState<LecturerAssignmentBuckets>(emptyLecturerBuckets);

  const fetchStudentAssignments = useCallback(async () => {
    if (!userId) return;

    const { data: enrollments, error: enrollmentError } = await supabase
      .from("course_enrollments")
      .select("course_id")
      .eq("student_id", userId);

    if (enrollmentError) throw enrollmentError;

    const courseIds = uniqueIds(enrollments || []);
    if (courseIds.length === 0) {
      setStudentBuckets(emptyStudentBuckets);
      return;
    }

    const [{ data: assignments, error }, { data: submissions, error: submissionError }] =
      await Promise.all([
        supabase
          .from("assignments")
          .select(`${ASSIGNMENT_SELECT}, course_offerings(${COURSE_OFFERING_SELECT})`)
          .in("course_id", courseIds)
          .order("due_date", { ascending: true }),
        supabase
          .from("assignment_submissions")
          .select(SUBMISSION_SELECT)
          .eq("student_id", userId),
      ]);

    if (error) throw error;
    if (submissionError) throw submissionError;

    const submissionsByAssignment = new Map(
      (submissions || []).map(submission => [
        submission.assignment_id,
        submission,
      ]),
    );
    const now = new Date();
    const dueSoonLimit = new Date(now);
    dueSoonLimit.setDate(dueSoonLimit.getDate() + 2);
    const nextBuckets: StudentAssignmentBuckets = {
      upcoming: [],
      pastDue: [],
      completed: [],
      crucialCount: 0,
    };

    (assignments as AssignmentQueryRow[] | null)?.forEach(rawAssignment => {
      const assignment = normalizeAssignment(rawAssignment);
      const submission = submissionsByAssignment.get(assignment.id);
      const item: AssignmentListItem = { ...assignment, submission };
      const dueDate = new Date(assignment.due_date);

      if (submission) {
        nextBuckets.completed.push(item);
      } else if (dueDate < now) {
        nextBuckets.pastDue.push(item);
      } else {
        nextBuckets.upcoming.push(item);
        if (dueDate <= dueSoonLimit) nextBuckets.crucialCount += 1;
      }
    });

    nextBuckets.completed.sort(
      (left, right) =>
        new Date(right.submission?.submitted_at || 0).getTime() -
        new Date(left.submission?.submitted_at || 0).getTime(),
    );
    setStudentBuckets(nextBuckets);
  }, [userId]);

  const fetchLecturerAssignments = useCallback(async () => {
    const lecturerId = profileId || userId;
    if (!lecturerId) return;

    const { data: teachingRows, error: teachingError } = await supabase
      .from("course_instructors")
      .select("course_id")
      .eq("user_id", lecturerId);

    if (teachingError) throw teachingError;

    const courseIds = uniqueIds(teachingRows || []);
    if (courseIds.length === 0) {
      setLecturerBuckets(emptyLecturerBuckets);
      return;
    }

    const { data: assignments, error } = await supabase
      .from("assignments")
      .select(`${ASSIGNMENT_SELECT}, course_offerings(${COURSE_OFFERING_SELECT})`)
      .in("course_id", courseIds)
      .order("due_date", { ascending: true });

    if (error) throw error;
    if (!assignments?.length) {
      setLecturerBuckets(emptyLecturerBuckets);
      return;
    }

    const normalizedAssignments = (assignments as AssignmentQueryRow[]).map(
      normalizeAssignment,
    );
    const { data: submissions, error: submissionError } = await supabase
      .from("assignment_submissions")
      .select(SUBMISSION_SELECT)
      .in(
        "assignment_id",
        normalizedAssignments.map(assignment => assignment.id),
      );

    if (submissionError) throw submissionError;

    const submissionsByAssignment = new Map<string, AssignmentSubmission[]>();
    (submissions || []).forEach(submission => {
      const existing = submissionsByAssignment.get(submission.assignment_id);
      if (existing) existing.push(submission);
      else submissionsByAssignment.set(submission.assignment_id, [submission]);
    });

    const all = normalizedAssignments.map(assignment => {
      const assignmentSubmissions =
        submissionsByAssignment.get(assignment.id) || [];
      const ungradedCount = assignmentSubmissions.filter(
        submission => submission.grade == null && submission.submitted_at,
      ).length;
      const gradedCount = assignmentSubmissions.filter(
        submission => submission.grade != null,
      ).length;

      return {
        ...assignment,
        metrics: {
          totalSubmissions: assignmentSubmissions.length,
          ungradedCount,
          gradedCount,
        },
      };
    });

    setLecturerBuckets({
      all,
      needsGrading: all.filter(
        assignment =>
          assignment.metrics.ungradedCount > 0 ||
          assignment.metrics.totalSubmissions === 0,
      ),
      graded: all.filter(
        assignment =>
          assignment.metrics.totalSubmissions > 0 &&
          assignment.metrics.ungradedCount === 0,
      ),
    });
  }, [profileId, userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const load = isLecturer
      ? fetchLecturerAssignments
      : fetchStudentAssignments;

    void load()
      .catch(error => {
        console.error("Error fetching assignments:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    fetchLecturerAssignments,
    fetchStudentAssignments,
    isLecturer,
    userId,
  ]);

  return {
    loading,
    studentBuckets,
    lecturerBuckets,
  };
}
