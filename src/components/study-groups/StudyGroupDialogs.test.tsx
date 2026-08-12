import { describe, expect, it, vi } from "vitest";
import {
  STUDY_SESSION_DATE_DISPLAY_PLACEHOLDER,
  STUDY_SESSION_NATIVE_DATE_INPUT_TYPE,
  StudySessionDialog,
} from "./StudyGroupDialogs";
import type { NewStudySession } from "./StudyGroupTypes";
import {
  combineStudySessionDateTimeValue,
  hasCompleteStudySessionDateTimeValue,
} from "./studySessionDateTime";

const baseSession: NewStudySession = {
  title: "Final Exam Revision",
  description: "",
  startsAt: "",
  endsAt: "",
  locationType: "in_person",
  locationText: "Library Room 3",
};

describe("StudySessionDialog", () => {
  it("preserves date and time when either side is selected first", () => {
    expect(combineStudySessionDateTimeValue("2026-08-04", "")).toBe(
      "2026-08-04T",
    );
    expect(combineStudySessionDateTimeValue("", "14:30")).toBe("T14:30");
    expect(combineStudySessionDateTimeValue("2026-08-04", "14:30")).toBe(
      "2026-08-04T14:30",
    );
  });

  it("requires both date and time before a study session datetime is complete", () => {
    expect(hasCompleteStudySessionDateTimeValue("2026-08-04T14:30")).toBe(
      true,
    );
    expect(hasCompleteStudySessionDateTimeValue("2026-08-04T")).toBe(false);
    expect(hasCompleteStudySessionDateTimeValue("T14:30")).toBe(false);
    expect(hasCompleteStudySessionDateTimeValue("")).toBe(false);
  });

  it("keeps the visible date format stable while using native calendar pickers", () => {
    expect(STUDY_SESSION_DATE_DISPLAY_PLACEHOLDER).toBe("yyyy-mm-dd");
    expect(STUDY_SESSION_DATE_DISPLAY_PLACEHOLDER).not.toContain("日");
    expect(STUDY_SESSION_NATIVE_DATE_INPUT_TYPE).toBe("date");

    const dialog = (
      <StudySessionDialog
        open
        onOpenChange={vi.fn()}
        value={baseSession}
        onChange={vi.fn()}
        error=""
        isSaving={false}
        onSubmit={vi.fn()}
      />
    );

    expect(dialog.props.value).toBe(baseSession);
  });
});
