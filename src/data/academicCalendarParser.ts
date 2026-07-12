type PdfTextItem = {
  str?: string;
};

type PdfJsModule = typeof import("pdfjs-dist");

let pdfJsLoadPromise: Promise<PdfJsModule> | null = null;

const loadPdfJs = () => {
  pdfJsLoadPromise ??= Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]).then(([pdfjsLib, workerModule]) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
    return pdfjsLib;
  });
  return pdfJsLoadPromise;
};

export type ParsedAcademicCalendarTerm = {
  code: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  enrollmentStartsAt: string | null;
  enrollmentEndsAt: string | null;
  teachingStartsAt: string | null;
  teachingEndsAt: string | null;
  examStartsAt: string | null;
  examEndsAt: string | null;
  status: "planned" | "active" | "closed";
  warnings: string[];
};

export type ParsedAcademicCalendar = {
  fileName: string;
  terms: ParsedAcademicCalendarTerm[];
  warnings: string[];
};

const monthNumbers: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const monthPattern = "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sept?|September|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

type DateRange = {
  end: Date;
  start: Date;
};

const toIsoDate = (date: Date | null | undefined) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseYear = (value?: string | null) => {
  const match = String(value || "").match(/(?:^|\D)(20\d{2})(?!\d)/);
  return match ? Number(match[1]) : null;
};

const parseMonth = (value: string) => monthNumbers[value.trim().toLowerCase()] || null;

const inferYear = ({
  baseYear,
  month,
  semester,
  explicitYear,
}: {
  baseYear: number;
  explicitYear?: number | null;
  month: number;
  semester: "A" | "B" | "C";
}) => {
  if (explicitYear) return explicitYear;
  if (semester === "C" && month <= 2) return baseYear + 1;
  return baseYear;
};

const makeDate = ({
  baseYear,
  day,
  explicitYear,
  month,
  semester,
}: {
  baseYear: number;
  day: number;
  explicitYear?: number | null;
  month: number;
  semester: "A" | "B" | "C";
}) => new Date(inferYear({ baseYear, explicitYear, month, semester }), month - 1, day);

const parseDateRange = (
  text: string,
  baseYear: number,
  semester: "A" | "B" | "C",
): DateRange | null => {
  const normalized = text
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const sameMonth = new RegExp(
    `\\b(\\d{1,2})\\s*-\\s*(\\d{1,2})\\s+${monthPattern}(?:\\s+(20\\d{2}))?\\b`,
    "i",
  ).exec(normalized);
  if (sameMonth) {
    const month = parseMonth(sameMonth[3]);
    if (!month) return null;
    const explicitYear = sameMonth[4] ? Number(sameMonth[4]) : null;
    const start = makeDate({
      baseYear,
      day: Number(sameMonth[1]),
      explicitYear,
      month,
      semester,
    });
    const end = makeDate({
      baseYear,
      day: Number(sameMonth[2]),
      explicitYear,
      month,
      semester,
    });
    return { end, start };
  }

  const monthToMonth = new RegExp(
    `\\b(\\d{1,2})\\s+${monthPattern}(?:\\s+(20\\d{2}))?\\s*-\\s*(\\d{1,2})\\s+${monthPattern}(?:\\s+(20\\d{2}))?\\b`,
    "i",
  ).exec(normalized);
  if (monthToMonth) {
    const startMonth = parseMonth(monthToMonth[2]);
    const endMonth = parseMonth(monthToMonth[5]);
    if (!startMonth || !endMonth) return null;
    const start = makeDate({
      baseYear,
      day: Number(monthToMonth[1]),
      explicitYear: monthToMonth[3] ? Number(monthToMonth[3]) : null,
      month: startMonth,
      semester,
    });
    const end = makeDate({
      baseYear,
      day: Number(monthToMonth[4]),
      explicitYear: monthToMonth[6] ? Number(monthToMonth[6]) : null,
      month: endMonth,
      semester,
    });
    return { end, start };
  }

  return null;
};

const extractPdfText = async (file: File) => {
  const data = await file.arrayBuffer();
  const pdfjsLib = await loadPdfJs();
  const task = pdfjsLib.getDocument({ data });

  try {
    const pdf = await task.promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map(item => (item as PdfTextItem).str || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push(text);
    }

    return pages.join("\n");
  } finally {
    await task.destroy();
  }
};

const semesterHeaderPattern = (semester: "A" | "B" | "C") =>
  new RegExp(`\\bSem\\s+${semester}\\s+Mon\\s*-\\s*Fri\\s+Remark\\b`, "i");

const sectionForSemester = (fullText: string, semester: "A" | "B" | "C") => {
  const current = semesterHeaderPattern(semester).exec(fullText);
  if (!current) return "";

  const remainingText = fullText.slice(current.index + current[0].length);
  const next = /\bSem\s+[ABC]\s+Mon\s*-\s*Fri\s+Remark\b/i.exec(remainingText);
  const endIndex = next
    ? current.index + current[0].length + next.index
    : fullText.length;

  return fullText.slice(current.index, endIndex);
};

const rangesByPattern = (
  section: string,
  pattern: RegExp,
  baseYear: number,
  semester: "A" | "B" | "C",
) => {
  const ranges: DateRange[] = [];
  let match: RegExpExecArray | null;
  pattern.lastIndex = 0;

  while ((match = pattern.exec(section)) !== null) {
    const range = parseDateRange(match[0], baseYear, semester);
    if (range) ranges.push(range);
  }

  return ranges;
};

const earliestDate = (ranges: DateRange[]) =>
  ranges.reduce<Date | null>((earliest, range) => (!earliest || range.start < earliest ? range.start : earliest), null);

const latestDate = (ranges: DateRange[]) =>
  ranges.reduce<Date | null>((latest, range) => (!latest || range.end > latest ? range.end : latest), null);

const parseSemester = (
  fullText: string,
  baseYear: number,
  semester: "A" | "B" | "C",
): ParsedAcademicCalendarTerm | null => {
  const section = sectionForSemester(fullText, semester);
  if (!section) return null;

  const warnings: string[] = [];
  const weekRanges = rangesByPattern(
    section,
    new RegExp(`\\bWeek\\s+\\d+\\s+\\d{1,2}(?:\\s+${monthPattern}(?:\\s+20\\d{2})?)?\\s*-\\s*\\d{1,2}\\s+${monthPattern}(?:\\s+20\\d{2})?`, "gi"),
    baseYear,
    semester,
  );
  const examRanges = rangesByPattern(
    section,
    new RegExp(`\\b\\d{1,2}(?:\\s+${monthPattern})?\\s*-\\s*\\d{1,2}\\s+${monthPattern}(?:\\s+20\\d{2})?\\s*:?\\s*Final\\s+Examination`, "gi"),
    baseYear,
    semester,
  );
  const enrollmentRanges = rangesByPattern(
    section,
    new RegExp(`\\b\\d{1,2}(?:\\s+${monthPattern})?\\s*-\\s*\\d{1,2}\\s+${monthPattern}(?:\\s+20\\d{2})?[^\\n.]{0,120}(?:Subject Registration|Validation of subjects enrolment|Adding and\\/or dropping subject)`, "gi"),
    baseYear,
    semester,
  );

  if (weekRanges.length === 0) warnings.push(`Could not detect teaching weeks for Sem ${semester}.`);
  if (examRanges.length === 0) warnings.push(`Could not detect final examination dates for Sem ${semester}.`);
  if (enrollmentRanges.length === 0) warnings.push(`Could not detect enrollment dates for Sem ${semester}.`);

  const teachingStart = earliestDate(weekRanges);
  const teachingEnd = latestDate(weekRanges);
  const examStart = earliestDate(examRanges);
  const examEnd = latestDate(examRanges);
  const enrollmentStart = earliestDate(enrollmentRanges);
  const enrollmentEnd = latestDate(enrollmentRanges);
  const today = new Date();
  const termEnd = examEnd || teachingEnd;

  return {
    code: `${baseYear}${semester}`,
    name: `Semester ${semester} ${baseYear}`,
    startsAt: toIsoDate(teachingStart),
    endsAt: toIsoDate(termEnd),
    enrollmentStartsAt: toIsoDate(enrollmentStart),
    enrollmentEndsAt: toIsoDate(enrollmentEnd),
    teachingStartsAt: toIsoDate(teachingStart),
    teachingEndsAt: toIsoDate(termEnd),
    examStartsAt: toIsoDate(examStart),
    examEndsAt: toIsoDate(examEnd),
    status: termEnd && termEnd < today ? "closed" : teachingStart && teachingStart <= today ? "active" : "planned",
    warnings,
  };
};

export async function parseAcademicCalendarPdf(file: File): Promise<ParsedAcademicCalendar> {
  if (!/\.pdf$/i.test(file.name)) {
    throw new Error("Only PDF academic calendar files are supported.");
  }

  const text = await extractPdfText(file);
  const year = parseYear(file.name) || parseYear(text);
  if (!year) {
    throw new Error("Could not identify the academic calendar year from this PDF.");
  }

  const terms = (["A", "B", "C"] as const)
    .map(semester => parseSemester(text, year, semester))
    .filter((term): term is ParsedAcademicCalendarTerm => Boolean(term));
  const warnings: string[] = [];

  if (terms.length === 0) {
    throw new Error("Could not identify Sem A, Sem B or Sem C in this academic calendar.");
  }
  if (terms.length < 3) {
    warnings.push("Only some semester sections were detected. Review the preview carefully before importing.");
  }

  for (const term of terms) warnings.push(...term.warnings);

  return {
    fileName: file.name,
    terms,
    warnings,
  };
}
