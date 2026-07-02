import JSZip from "jszip";
import type { StudyPlanLevel, StudyPlanProgrammeKey } from "./studyPlanUtils";

type IntakeSemester = "A" | "B" | "C";
export type StudyPlanTrackCode = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type StudyPlanEntryType = "normal" | "direct_year_2";
export type StudyPlanMpuLevel = "diploma" | "bachelor";
export type StudyPlanMpuUnit = "U1" | "U2" | "U3" | "U4";
export type StudyPlanMpuStudentType = "local" | "international" | "all";

export type ParsedStudyPlanCourse = {
  category: string | null;
  courseCode: string | null;
  courseName: string;
  creditHours: number | null;
  isPlaceholder: boolean;
  mpuLevel: StudyPlanMpuLevel | null;
  mpuStudentType: StudyPlanMpuStudentType | null;
  mpuUnit: StudyPlanMpuUnit | null;
  offerUntilTermCode: string | null;
  planCourseKey: string;
  position: number;
  sourceFiles: string[];
  termCode: string;
};

export type ParsedStudyPlanImport = {
  courses: ParsedStudyPlanCourse[];
  fileNames: string[];
  intakeSemester: IntakeSemester;
  intakeYear: number;
  entryType: StudyPlanEntryType;
  level: StudyPlanLevel;
  programmeKey: StudyPlanProgrammeKey;
  programmeName: string;
  sourceLabel: string;
  trackCode: StudyPlanTrackCode;
  versionCode: string;
  warnings: string[];
};

type WorksheetRow = string[];

const PROGRAMME_INFO: Record<
  StudyPlanProgrammeKey,
  { level: StudyPlanLevel; programmeName: string }
> = {
  BOSE: {
    level: "Bachelor",
    programmeName: "Bachelor of Software Engineering (Honours)",
  },
  CS: {
    level: "Diploma",
    programmeName: "Diploma in Computer Science",
  },
  IT: {
    level: "Diploma",
    programmeName: "Diploma in Information Technology",
  },
};

const SEMESTERS: IntakeSemester[] = ["A", "B", "C"];

const decodeXmlEntities = (value: string) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const normalizeCell = (value: unknown) =>
  String(value ?? "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeCourseCode = (value: string | null | undefined) => {
  const normalized = normalizeCell(value)
    .toUpperCase()
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, "");
  return normalized || null;
};

const normalizePlanKey = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getProgrammeFromText = (text: string): StudyPlanProgrammeKey | null => {
  const normalized = text.toUpperCase();
  if (normalized.includes("SOFTWARE ENGINEERING") || normalized.includes("BOSE") || normalized.includes("BOS")) {
    return "BOSE";
  }
  if (normalized.includes("COMPUTER SCIENCE") || /\bCS\b/.test(normalized)) {
    return "CS";
  }
  if (normalized.includes("INFORMATION TECHNOLOGY") || /\bIT\b/.test(normalized)) {
    return "IT";
  }
  return null;
};

const getIntakeFromText = (text: string) => {
  const normalized = text.toUpperCase();
  const match = normalized.match(/(?:^|[^A-Z0-9])((?:20)?\d{2})\s*[-_ ]?\s*([ABC])\s*([12])?(?=[^A-Z0-9]|$)/);
  if (!match) return null;

  const yearText = match[1];
  const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
  const semester = match[2] as IntakeSemester;
  const trackNumber = (match[3] || "1") as "1" | "2";
  const trackCode = `${semester}${trackNumber}` as StudyPlanTrackCode;
  if (!year || !SEMESTERS.includes(semester)) return null;
  return {
    entryType: (trackNumber === "2" ? "direct_year_2" : "normal") as StudyPlanEntryType,
    intakeYear: year,
    intakeSemester: semester,
    trackCode,
    usedDefaultTrack: !match[3],
  };
};

const getTermCode = (intakeYear: number, intakeSemester: IntakeSemester, offset: number) => {
  const startIndex = SEMESTERS.indexOf(intakeSemester);
  const absoluteIndex = startIndex + offset;
  const year = intakeYear + Math.floor(absoluteIndex / SEMESTERS.length);
  const semester = SEMESTERS[absoluteIndex % SEMESTERS.length];
  return `${year}${semester}`;
};

const columnIndexFromRef = (cellRef: string) => {
  const letters = cellRef.match(/^[A-Z]+/)?.[0] || "";
  return letters.split("").reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
};

const rowIndexFromRef = (cellRef: string) => Number(cellRef.match(/\d+/)?.[0] || "0") - 1;

const parseSharedStrings = (xml: string | undefined) => {
  if (!xml) return [] as string[];
  const sharedStrings: string[] = [];
  const sharedStringMatches = xml.matchAll(/<si[\s\S]*?<\/si>/g);
  for (const match of sharedStringMatches) {
    const itemXml = match[0];
    const text = Array.from(itemXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g))
      .map(textMatch => decodeXmlEntities(textMatch[1] || ""))
      .join("");
    sharedStrings.push(normalizeCell(text));
  }
  return sharedStrings;
};

const getCellValue = (cellXml: string, attrs: string, sharedStrings: string[]) => {
  const type = attrs.match(/\bt="([^"]+)"/)?.[1] || "";
  if (type === "inlineStr") {
    return normalizeCell(
      Array.from(cellXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g))
        .map(match => decodeXmlEntities(match[1] || ""))
        .join(""),
    );
  }

  const rawValue = cellXml.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] || "";
  if (type === "s") {
    return normalizeCell(sharedStrings[Number(rawValue)] || "");
  }
  return normalizeCell(decodeXmlEntities(rawValue));
};

const parseWorksheetRows = (worksheetXml: string, sharedStrings: string[]) => {
  const rowMap = new Map<number, WorksheetRow>();
  const cellMatches = worksheetXml.matchAll(/<c\s+([^>]*)>([\s\S]*?)<\/c>/g);

  for (const cellMatch of cellMatches) {
    const attrs = cellMatch[1] || "";
    const cellXml = cellMatch[2] || "";
    const cellRef = attrs.match(/\br="([^"]+)"/)?.[1] || "";
    if (!cellRef) continue;

    const rowIndex = rowIndexFromRef(cellRef);
    const columnIndex = columnIndexFromRef(cellRef);
    if (rowIndex < 0 || columnIndex < 0) continue;

    const row = rowMap.get(rowIndex) || [];
    row[columnIndex] = getCellValue(cellXml, attrs, sharedStrings);
    rowMap.set(rowIndex, row);
  }

  return Array.from(rowMap.entries())
    .sort(([left], [right]) => left - right)
    .map(([, row]) => row)
    .filter(row => row.some(Boolean));
};

const parseWorkbookRows = async (file: File) => {
  if (!/\.xlsx$/i.test(file.name) && !/\.xlsm$/i.test(file.name)) {
    throw new Error("Only .xlsx or .xlsm study plan files are supported.");
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const sharedStrings = parseSharedStrings(await zip.file("xl/sharedStrings.xml")?.async("string"));
  const worksheetFiles = Object.keys(zip.files)
    .filter(path => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const rows: WorksheetRow[] = [];
  for (const worksheetPath of worksheetFiles) {
    const worksheetXml = await zip.file(worksheetPath)?.async("string");
    if (!worksheetXml) continue;
    rows.push(...parseWorksheetRows(worksheetXml, sharedStrings));
  }

  return rows;
};

const looksLikeHeaderRow = (row: WorksheetRow) => {
  const normalized = row.map(value => normalizeCell(value).toLowerCase());
  return normalized.includes("code") && normalized.includes("category") && normalized.includes("credit");
};

const getHeaderBlocks = (row: WorksheetRow) =>
  row
    .map((value, index) => ({ index, value: normalizeCell(value).toLowerCase() }))
    .filter(cell => cell.value === "code")
    .map(cell => Math.max(cell.index - 2, 0));

const looksLikeRealCourseCode = (value: string) => /^[A-Z]{2,}[A-Z0-9]*\d{3,}[A-Z0-9]*$/.test(value);

const isChoiceCourseCode = (courseCode: string | null) => {
  if (!courseCode?.includes("/")) return false;
  const parts = courseCode.split("/").map(part => part.trim()).filter(Boolean);
  return parts.length > 1 && parts.every(looksLikeRealCourseCode);
};

const splitChoiceText = (value: string) =>
  normalizeCell(value)
    .split(/\s*\/\s*/g)
    .map(part => part.trim())
    .filter(Boolean);

const expandChoiceCourses = (courseCode: string | null, courseName: string) => {
  if (!isChoiceCourseCode(courseCode)) {
    return [{ courseCode, courseName }];
  }

  const codeParts = String(courseCode)
    .split("/")
    .map(part => part.trim())
    .filter(Boolean);
  const nameParts = splitChoiceText(courseName);

  return codeParts.map((code, index) => ({
    courseCode: code,
    courseName: nameParts.length === codeParts.length ? nameParts[index] : courseName,
  }));
};

const isPlaceholderCourse = (courseCode: string | null, courseName: string, category: string | null) => {
  const text = `${courseCode || ""} ${courseName} ${category || ""}`.toUpperCase();
  if (!courseCode) return true;
  if (isChoiceCourseCode(courseCode)) return false;
  if (looksLikeRealCourseCode(courseCode)) return false;
  return (
    /^U[1-4]$/.test(courseCode) ||
    text.includes("MPU SUBJECT") ||
    text.includes("ELECTIVE")
  );
};

const getMpuMetadata = ({
  category,
  courseCode,
  courseName,
  level,
}: {
  category: string | null;
  courseCode: string | null;
  courseName: string;
  level: StudyPlanLevel;
}) => {
  const code = String(courseCode || "").toUpperCase();
  const text = `${code} ${courseName} ${category || ""}`.toUpperCase();
  const isMpu = /\b(?:B?MPU|[A-Z]?MPU)\b/.test(text) || /\bU[1-4]\b/.test(text);

  if (!isMpu) {
    return {
      mpuLevel: null,
      mpuStudentType: null,
      mpuUnit: null,
      offerUntilTermCode: null,
    };
  }

  const digits = code.match(/(\d{4})/)?.[1] || "";
  const mpuLevel: StudyPlanMpuLevel =
    code.startsWith("BMPU") || digits.startsWith("3")
      ? "bachelor"
      : digits.startsWith("2")
        ? "diploma"
        : level === "Bachelor"
          ? "bachelor"
          : "diploma";
  const unit = text.match(/\bU([1-4])\b/)?.[1];
  const isLocal = /\bLOCAL\b/.test(text);
  const isInternational = /\bINTERNATIONAL\b/.test(text);
  const mpuStudentType: StudyPlanMpuStudentType =
    isLocal && !isInternational
      ? "local"
      : isInternational && !isLocal
        ? "international"
        : "all";

  return {
    mpuLevel,
    mpuStudentType,
    mpuUnit: unit ? (`U${unit}` as StudyPlanMpuUnit) : null,
    offerUntilTermCode: code === "LMPU2412" || text.includes("LIFE 20") ? "2025A" : null,
  };
};

const getPlanCourseKey = ({
  courseCode,
  courseName,
  creditHours,
  isPlaceholder,
}: {
  courseCode: string | null;
  courseName: string;
  creditHours: number | null;
  isPlaceholder: boolean;
}) => {
  if (courseCode && !isPlaceholder) return courseCode;
  const normalizedName = normalizePlanKey(courseName) || "REQUIREMENT";
  return `PLACEHOLDER-${normalizedName}-${creditHours || 0}`;
};

const parseStudyPlanRows = ({
  fileName,
  intakeSemester,
  intakeYear,
  level,
  rows,
}: {
  fileName: string;
  intakeSemester: IntakeSemester;
  intakeYear: number;
  level: StudyPlanLevel;
  rows: WorksheetRow[];
}) => {
  const courses: ParsedStudyPlanCourse[] = [];
  const termPositions = new Map<string, number>();
  let termOffset = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const headerRow = rows[rowIndex];
    if (!looksLikeHeaderRow(headerRow)) continue;

    const blocks = getHeaderBlocks(headerRow);
    const blockTerms = blocks.map((blockStart, blockIndex) => ({
      blockStart,
      termCode: getTermCode(intakeYear, intakeSemester, termOffset + blockIndex),
    }));
    termOffset += blocks.length;

    for (let dataRowIndex = rowIndex + 1; dataRowIndex < rows.length; dataRowIndex += 1) {
      const row = rows[dataRowIndex];
      if (looksLikeHeaderRow(row)) break;

      for (const block of blockTerms) {
        const courseName = normalizeCell(row[block.blockStart + 1]);
        const courseCode = normalizeCourseCode(row[block.blockStart + 2]);
        const category = normalizeCell(row[block.blockStart + 3]) || null;
        const creditValue = normalizeCell(row[block.blockStart + 4]);
        const creditHours = /^\d+$/.test(creditValue) ? Number(creditValue) : null;

        if (!courseName && !courseCode) continue;
        if (!courseName || courseName.length <= 1) continue;
        if (!courseCode && /^\d+(?:\.\d+)?$/.test(courseName)) continue;

        for (const choice of expandChoiceCourses(courseCode, courseName)) {
          if (!choice.courseName || choice.courseName.length <= 1) continue;

          const isPlaceholder = isPlaceholderCourse(choice.courseCode, choice.courseName, category);
          const mpuMetadata = getMpuMetadata({
            category,
            courseCode: choice.courseCode,
            courseName: choice.courseName,
            level,
          });
          const position = (termPositions.get(block.termCode) || 0) + 1;
          termPositions.set(block.termCode, position);
          const planCourseKey = getPlanCourseKey({
            courseCode: choice.courseCode,
            courseName: choice.courseName,
            creditHours,
            isPlaceholder,
          });

          courses.push({
            category,
            courseCode: choice.courseCode,
            courseName: choice.courseName,
            creditHours,
            isPlaceholder,
            ...mpuMetadata,
            planCourseKey,
            position,
            sourceFiles: [fileName],
            termCode: block.termCode,
          });
        }
      }
    }
  }

  return courses;
};

const mergeParsedCourses = (courses: ParsedStudyPlanCourse[]) => {
  const merged = new Map<string, ParsedStudyPlanCourse>();
  for (const course of courses) {
    const key = `${course.termCode}::${course.planCourseKey}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...course, sourceFiles: Array.from(new Set(course.sourceFiles)) });
      continue;
    }

    merged.set(key, {
      ...existing,
      category: existing.category || course.category,
      courseCode: existing.courseCode || course.courseCode,
      courseName: existing.courseName || course.courseName,
      creditHours: existing.creditHours || course.creditHours,
      isPlaceholder: existing.isPlaceholder && course.isPlaceholder,
      mpuLevel: existing.mpuLevel || course.mpuLevel,
      mpuStudentType: existing.mpuStudentType || course.mpuStudentType,
      mpuUnit: existing.mpuUnit || course.mpuUnit,
      offerUntilTermCode: existing.offerUntilTermCode || course.offerUntilTermCode,
      position: Math.min(existing.position, course.position),
      sourceFiles: Array.from(new Set([...existing.sourceFiles, ...course.sourceFiles])),
    });
  }

  const sorted = Array.from(merged.values()).sort((left, right) => {
    if (left.termCode !== right.termCode) return left.termCode.localeCompare(right.termCode);
    if (left.position !== right.position) return left.position - right.position;
    return left.courseName.localeCompare(right.courseName);
  });

  const positionByTerm = new Map<string, number>();
  return sorted.map(course => {
    const nextPosition = (positionByTerm.get(course.termCode) || 0) + 1;
    positionByTerm.set(course.termCode, nextPosition);
    return { ...course, position: nextPosition };
  });
};

export async function parseStudyPlanFiles(files: File[]): Promise<ParsedStudyPlanImport> {
  if (files.length === 0) {
    throw new Error("Please select at least one study plan Excel file.");
  }

  const parsedFiles = await Promise.all(
    files.map(async file => {
      const rows = await parseWorkbookRows(file);
      const allText = `${file.name} ${rows.flat().filter(Boolean).join(" ")}`;
      const programmeKey = getProgrammeFromText(allText);
      const intake = getIntakeFromText(allText);

      if (!programmeKey) {
        throw new Error(`Could not identify programme for ${file.name}.`);
      }
      if (!intake) {
        throw new Error(`Could not identify intake semester for ${file.name}.`);
      }

      return {
        courses: parseStudyPlanRows({
          fileName: file.name,
          intakeSemester: intake.intakeSemester,
          intakeYear: intake.intakeYear,
          level: PROGRAMME_INFO[programmeKey].level,
          rows,
        }),
        fileName: file.name,
        intake,
        programmeKey,
      };
    }),
  );

  const first = parsedFiles[0];
  const mismatch = parsedFiles.find(
    file =>
      file.programmeKey !== first.programmeKey ||
      file.intake.intakeYear !== first.intake.intakeYear ||
      file.intake.intakeSemester !== first.intake.intakeSemester ||
      file.intake.trackCode !== first.intake.trackCode,
  );
  if (mismatch) {
    throw new Error("Please import only one programme/intake group at a time.");
  }

  const programme = PROGRAMME_INFO[first.programmeKey];
  const courses = mergeParsedCourses(parsedFiles.flatMap(file => file.courses));
  const fileNames = parsedFiles.map(file => file.fileName);
  const sourceLabel = fileNames.join(", ");
  const versionCode = `${first.programmeKey}-${first.intake.intakeYear}${first.intake.intakeSemester}-${first.intake.trackCode}-imported`;
  const warnings: string[] = [];

  if (first.intake.usedDefaultTrack) {
    warnings.push("No A1/A2/B1/B2/C1/C2 track was detected, so the parser defaulted this study plan to track 1 / normal entry.");
  }

  if (courses.length === 0) {
    warnings.push("No course rows were found. Please confirm this file uses the standard SUCCMS study plan template.");
  }

  const termCount = new Set(courses.map(course => course.termCode)).size;
  if (termCount < 3) {
    warnings.push("Only a few semester blocks were detected. Please review the preview before importing.");
  }

  return {
    courses,
    fileNames,
    intakeSemester: first.intake.intakeSemester,
    intakeYear: first.intake.intakeYear,
    entryType: first.intake.entryType,
    level: programme.level,
    programmeKey: first.programmeKey,
    programmeName: programme.programmeName,
    sourceLabel,
    trackCode: first.intake.trackCode,
    versionCode,
    warnings,
  };
}
