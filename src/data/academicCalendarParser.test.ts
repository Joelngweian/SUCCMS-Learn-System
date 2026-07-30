import { describe, expect, it } from "vitest";
import { parseAcademicCalendarText } from "./academicCalendarParser";

describe("parseAcademicCalendarText", () => {
  it("uses the PDF year for Sem A, Sem B and Sem C codes", () => {
    const calendarText = `
      Sem A Mon - Fri Remark
      Week 1 02 - 06 Mar
      Week 9 27 - 30 Apr
      22 - 30 Apr Final Examination
      02 - 29 May Subject Registration

      Sem B Mon - Fri Remark
      Week 1 25 - 29 May
      Week 16 08 - 12 Sep
      02 - 12 Sep Final Examination
      25 May - 09 Oct Subject Registration

      Sem C Mon - Fri Remark
      Week 1 05 - 09 Oct
      Week 16 19 - 23 Jan
      19 - 23 Jan Final Examination
      05 Oct - 26 Feb Subject Registration
    `;

    const parsed = parseAcademicCalendarText("ACADEMIC_CALENDAR_2026_(std).pdf", calendarText);

    expect(parsed.terms.map(term => term.code)).toEqual(["2026A", "2026B", "2026C"]);
    expect(parsed.terms.find(term => term.code === "2026C")?.teachingEndsAt).toBe("2027-01-23");
  });
});
