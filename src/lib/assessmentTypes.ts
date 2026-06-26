export const ASSESSMENT_TYPE_OPTIONS = [
  {
    value: "tutorial",
    label: "Tutorial",
    description: "Practice work, exercises or tutorial submissions.",
  },
  {
    value: "individual_assignment",
    label: "Individual Assignment",
    description: "Coursework completed and submitted by one student.",
  },
  {
    value: "group_project",
    label: "Group Project",
    description: "Collaborative coursework completed by a student group.",
  },
  {
    value: "mini_project",
    label: "Mini Project",
    description: "A smaller project with a focused deliverable.",
  },
] as const;

export type AssessmentType =
  (typeof ASSESSMENT_TYPE_OPTIONS)[number]["value"];

export type AssessmentDraft = {
  assessment_type: AssessmentType | "";
  title: string;
  description: string;
  rubric: string;
  points: string;
  due_date: string;
};

export const getAssessmentTypeLabel = (
  value: string | null | undefined,
) =>
  ASSESSMENT_TYPE_OPTIONS.find(option => option.value === value)?.label
  || "Assessment";

export const getAssessmentTitlePlaceholder = (
  value: AssessmentDraft["assessment_type"],
) => {
  if (!value) return "Assessment Title";
  return `${getAssessmentTypeLabel(value)} Title`;
};

export const matchesAssessmentFilters = ({
  assessmentType,
  typeFilter,
}: {
  assessmentType: string | null | undefined;
  typeFilter: string;
}) => typeFilter === "all" || assessmentType === typeFilter;
