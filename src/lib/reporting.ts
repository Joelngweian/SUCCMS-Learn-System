export const REPORT_REASON_OPTIONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "threats", label: "Threats or dangerous behavior" },
  { value: "impersonation", label: "Impersonation or fraud" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "spam", label: "Spam or misleading content" },
  { value: "other", label: "Other" },
] as const;

export const getReportReasonLabel = (reason: string) =>
  REPORT_REASON_OPTIONS.find((option) => option.value === reason)?.label || reason;
