import { supabase } from "@/lib/supabase";
import type { Database, Json } from "@/lib/database.types";

export type CourseAssessmentItem =
  Database["public"]["Tables"]["course_assessment_items"]["Row"];

export type AssessmentItemType =
  | "test"
  | "individual_assignment"
  | "group_project"
  | "final_exam";

export interface CourseAssessmentItemValue {
  clientId: string;
  itemType: AssessmentItemType;
  title: string;
  maxMarks: number;
  weightPercentage: number;
}

export type CourseAssessmentValues = CourseAssessmentItemValue[];

const createClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export const DEFAULT_COURSE_ASSESSMENT: CourseAssessmentValues = [
  {
    clientId: createClientId(),
    itemType: "test",
    title: "Test 1",
    maxMarks: 10,
    weightPercentage: 5,
  },
  {
    clientId: createClientId(),
    itemType: "test",
    title: "Test 2",
    maxMarks: 20,
    weightPercentage: 15,
  },
  {
    clientId: createClientId(),
    itemType: "individual_assignment",
    title: "Individual Assignment 1",
    maxMarks: 50,
    weightPercentage: 10,
  },
  {
    clientId: createClientId(),
    itemType: "individual_assignment",
    title: "Individual Assignment 2",
    maxMarks: 100,
    weightPercentage: 20,
  },
  {
    clientId: createClientId(),
    itemType: "group_project",
    title: "Group Project",
    maxMarks: 100,
    weightPercentage: 20,
  },
  {
    clientId: createClientId(),
    itemType: "final_exam",
    title: "Final Examination",
    maxMarks: 100,
    weightPercentage: 30,
  },
];

export const cloneAssessmentValues = (
  values: CourseAssessmentValues,
): CourseAssessmentValues =>
  values.map(item => ({
    ...item,
    clientId: createClientId(),
  }));

const normalizeIds = (ids: string[]) =>
  [...new Set(ids.filter(Boolean))].sort();

export const assessmentRowsToValues = (
  rows: CourseAssessmentItem[],
): CourseAssessmentValues =>
  rows
    .slice()
    .sort((left, right) => left.position - right.position)
    .map(row => ({
      clientId: row.id,
      itemType: row.item_type as AssessmentItemType,
      title: row.title,
      maxMarks: row.max_marks,
      weightPercentage: row.weight_percentage,
    }));

const toRpcItems = (values: CourseAssessmentValues): Json =>
  values.map((item, index) => ({
    item_type: item.itemType,
    title: item.title.trim(),
    max_marks: item.maxMarks,
    weight_percentage: item.weightPercentage,
    position: index + 1,
  }));

export async function getCourseAssessmentStructures(courseIds: string[]) {
  const ids = normalizeIds(courseIds);
  const grouped = new Map<string, CourseAssessmentItem[]>();
  if (ids.length === 0) return grouped;

  for (let index = 0; index < ids.length; index += 80) {
    const { data, error } = await supabase
      .from("course_assessment_items")
      .select(
        "id, course_id, item_type, title, max_marks, weight_percentage, position, created_by, updated_by, created_at, updated_at",
      )
      .in("course_id", ids.slice(index, index + 80))
      .order("position", { ascending: true });

    if (error) throw error;
    (data || []).forEach(item => {
      const current = grouped.get(item.course_id) || [];
      current.push(item);
      grouped.set(item.course_id, current);
    });
  }

  return grouped;
}

export async function createCourseOfferingWithAssessment({
  courseTemplateId,
  values,
}: {
  courseTemplateId: string;
  values: CourseAssessmentValues;
}) {
  const { data, error } = await supabase.rpc(
    "create_course_offering_with_assessment",
    {
      p_course_id: courseTemplateId,
      p_items: toRpcItems(values),
    },
  );

  if (error) throw error;
  return data;
}

export async function saveCourseAssessmentStructure({
  courseId,
  values,
}: {
  courseId: string;
  values: CourseAssessmentValues;
}) {
  const { data, error } = await supabase.rpc(
    "save_course_assessment_structure",
    {
      p_course_id: courseId,
      p_items: toRpcItems(values),
    },
  );

  if (error) throw error;
  return data;
}
