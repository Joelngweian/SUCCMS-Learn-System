-- Return privacy-safe assignment performance benchmarks for the signed-in
-- student. Individual peer grades and identities are never exposed.

CREATE OR REPLACE FUNCTION public.get_assignment_peer_benchmarks()
RETURNS TABLE (
  course_id UUID,
  course_code TEXT,
  course_name TEXT,
  student_average NUMERIC,
  class_average NUMERIC,
  percentile INTEGER,
  compared_students INTEGER,
  graded_assignments INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH student_course_averages AS (
    SELECT
      assignment.course_id,
      submission.student_id,
      AVG(
        (submission.grade::NUMERIC /
          NULLIF(COALESCE(assignment.max_score, 100), 0)::NUMERIC) * 100
      ) AS average_percentage,
      COUNT(*)::INTEGER AS graded_count
    FROM public.assignment_submissions submission
    JOIN public.assignments assignment
      ON assignment.id = submission.assignment_id
    JOIN public.course_enrollments enrolled_student
      ON enrolled_student.course_id = assignment.course_id
     AND enrolled_student.student_id = submission.student_id
    WHERE submission.grade IS NOT NULL
    GROUP BY assignment.course_id, submission.student_id
  ),
  actor_courses AS (
    SELECT
      actor_average.course_id,
      actor_average.student_id,
      actor_average.average_percentage,
      actor_average.graded_count
    FROM student_course_averages actor_average
    JOIN public.course_enrollments enrollment
      ON enrollment.course_id = actor_average.course_id
     AND enrollment.student_id = actor_average.student_id
    WHERE actor_average.student_id = auth.uid()
  )
  SELECT
    actor.course_id,
    COALESCE(course.course_code, course.code, 'N/A')::TEXT AS course_code,
    COALESCE(course.name, 'Course')::TEXT AS course_name,
    ROUND(actor.average_percentage, 1) AS student_average,
    ROUND(AVG(peer.average_percentage), 1) AS class_average,
    CASE
      WHEN COUNT(peer.student_id) < 2 THEN NULL
      ELSE ROUND(
        100 * (
          COUNT(*) FILTER (
            WHERE peer.student_id <> actor.student_id
              AND peer.average_percentage < actor.average_percentage
          )
          + 0.5 * COUNT(*) FILTER (
            WHERE peer.student_id <> actor.student_id
              AND ABS(peer.average_percentage - actor.average_percentage) < 0.0001
          )
        ) / NULLIF(COUNT(peer.student_id) - 1, 0)
      )::INTEGER
    END AS percentile,
    COUNT(peer.student_id)::INTEGER AS compared_students,
    actor.graded_count AS graded_assignments
  FROM actor_courses actor
  JOIN student_course_averages peer
    ON peer.course_id = actor.course_id
  JOIN public.course_offerings offering
    ON offering.id = actor.course_id
  JOIN public.courses course
    ON course.id = offering.course_id
  GROUP BY
    actor.course_id,
    actor.student_id,
    actor.average_percentage,
    actor.graded_count,
    course.course_code,
    course.code,
    course.name
  ORDER BY 2;
$$;

REVOKE ALL ON FUNCTION public.get_assignment_peer_benchmarks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignment_peer_benchmarks()
  TO authenticated;
