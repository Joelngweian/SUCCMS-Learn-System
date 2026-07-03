export const academicPlanningTabs = [
  "study-plans",
  "academic-calendar",
  "student-study-plans",
  "assignments",
] as const;

export type AcademicPlanningTab = (typeof academicPlanningTabs)[number];

export const parseAcademicPlanningTab = (
  value?: string | null,
): AcademicPlanningTab =>
  academicPlanningTabs.includes(value as AcademicPlanningTab)
    ? (value as AcademicPlanningTab)
    : "study-plans";
