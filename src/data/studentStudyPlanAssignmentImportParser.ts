import JSZip from "jszip";
import type { StudyPlanProgrammeKey } from "./studyPlanUtils";
import type { StudyPlanTrackCode } from "./studyPlanImportParser";

export type ParsedStudentStudyPlanAssignmentRow = {
  notes: string | null;
  programmeKey: StudyPlanProgrammeKey | null;
  rowNumber: number;
  studentIdentifier: string | null;
  studyPlanVersionCode: string | null;
  trackCode: StudyPlanTrackCode | null;
};

export type ParsedStudentStudyPlanAssignmentImport = {
  fileName: string;
  rows: ParsedStudentStudyPlanAssignmentRow[];
  warnings: string[];
};

type WorksheetRow = string[];

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

const normalizeHeader = (value: string) =>
  normalizeCell(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const normalizeStudentIdentifier = (value: unknown) => {
  const normalized = normalizeCell(value).toLowerCase();
  return normalized || null;
};

const normalizeProgrammeKey = (value: unknown): StudyPlanProgrammeKey | null => {
  const normalized = normalizeCell(value).toUpperCase();
  if (!normalized) return null;
  if (normalized.includes("SOFTWARE ENGINEERING") || normalized.includes("BOSE") || normalized.includes("BOS")) return "BOSE";
  if (normalized.includes("COMPUTER SCIENCE") || normalized === "CS") return "CS";
  if (normalized.includes("INFORMATION TECHNOLOGY") || normalized === "IT") return "IT";
  return null;
};

const normalizeTrackCode = (value: unknown): StudyPlanTrackCode | null => {
  const normalized = normalizeCell(value).toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^([ABC][12])$/) || normalized.match(/\b([ABC][12])\b/);
  return match ? (match[1] as StudyPlanTrackCode) : null;
};

const normalizeVersionCode = (value: unknown) => {
  const normalized = normalizeCell(value);
  return normalized || null;
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
    .map(([index, row]) => ({ index, row }))
    .filter(({ row }) => row.some(Boolean));
};

const parseWorkbookRows = async (file: File) => {
  if (!/\.xlsx$/i.test(file.name) && !/\.xlsm$/i.test(file.name)) {
    throw new Error("Only .xlsx or .xlsm student study plan assignment files are supported.");
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const sharedStrings = parseSharedStrings(await zip.file("xl/sharedStrings.xml")?.async("string"));
  const worksheetFiles = Object.keys(zip.files)
    .filter(path => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const rows: Array<{ index: number; row: WorksheetRow }> = [];
  for (const worksheetPath of worksheetFiles) {
    const worksheetXml = await zip.file(worksheetPath)?.async("string");
    if (!worksheetXml) continue;
    rows.push(...parseWorksheetRows(worksheetXml, sharedStrings));
  }

  return rows;
};

const findColumn = (headers: string[], aliases: string[]) =>
  headers.findIndex(header => aliases.includes(header));

export async function parseStudentStudyPlanAssignmentFile(
  file: File,
): Promise<ParsedStudentStudyPlanAssignmentImport> {
  const workbookRows = await parseWorkbookRows(file);
  const warnings: string[] = [];

  const headerRow = workbookRows.find(({ row }) => {
    const headers = row.map(normalizeHeader);
    return (
      findColumn(headers, ["studentemail", "email", "studentid", "student", "studentnumber"]) >= 0 &&
      findColumn(headers, ["programme", "program", "programmekey", "programmekey"]) >= 0 &&
      findColumn(headers, ["track", "trackcode", "studyplantrack", "entrytrack"]) >= 0
    );
  });

  let studentIndex = 0;
  let programmeIndex = 1;
  let trackIndex = 2;
  let versionCodeIndex = 3;
  let notesIndex = 4;
  let dataRows = workbookRows;

  if (headerRow) {
    const headers = headerRow.row.map(normalizeHeader);
    studentIndex = findColumn(headers, ["studentemail", "email", "studentid", "student", "studentnumber"]);
    programmeIndex = findColumn(headers, ["programme", "program", "programmekey", "programmekey"]);
    trackIndex = findColumn(headers, ["track", "trackcode", "studyplantrack", "entrytrack"]);
    versionCodeIndex = findColumn(headers, ["studyplanversion", "versioncode", "studyplan", "version"]);
    notesIndex = findColumn(headers, ["notes", "note", "remark", "remarks"]);
    dataRows = workbookRows.filter(({ index }) => index > headerRow.index);
  } else {
    warnings.push("No header row detected. The parser used the first columns as student_email/student_id, programme, track_code, version_code and notes.");
  }

  const rows = dataRows
    .map(({ index, row }) => ({
      notes: notesIndex >= 0 ? normalizeCell(row[notesIndex]) || null : null,
      programmeKey: normalizeProgrammeKey(row[programmeIndex]),
      rowNumber: index + 1,
      studentIdentifier: normalizeStudentIdentifier(row[studentIndex]),
      studyPlanVersionCode: versionCodeIndex >= 0 ? normalizeVersionCode(row[versionCodeIndex]) : null,
      trackCode: normalizeTrackCode(row[trackIndex]),
    }))
    .filter(row => row.studentIdentifier || row.programmeKey || row.trackCode || row.studyPlanVersionCode);

  if (rows.length === 0) {
    throw new Error("No student study plan assignment rows were found. Expected columns: student_email/student_id, programme, track_code, optional version_code.");
  }

  return {
    fileName: file.name,
    rows,
    warnings,
  };
}
