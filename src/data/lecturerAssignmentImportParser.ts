import JSZip from "jszip";

export type ParsedLecturerAssignmentRow = {
  courseCode: string | null;
  lecturerEmail: string | null;
  rowNumber: number;
  semesterCode: string | null;
};

export type ParsedLecturerAssignmentImport = {
  fileName: string;
  rows: ParsedLecturerAssignmentRow[];
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

const normalizeCourseCode = (value: unknown) => {
  const normalized = normalizeCell(value).toUpperCase().replace(/\s*\/\s*/g, "/");
  return normalized || null;
};

const normalizeSemesterCode = (value: unknown) => {
  const normalized = normalizeCell(value).toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/(?:20)?(\d{2})([ABC])/);
  if (!match) return null;
  return `20${match[1]}${match[2]}`;
};

const normalizeLecturerIdentifier = (value: unknown) => {
  const normalized = normalizeCell(value).toLowerCase();
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
    throw new Error("Only .xlsx or .xlsm lecturer assignment files are supported.");
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

const uniqueColumnIndexes = (indexes: number[]) =>
  Array.from(new Set(indexes.filter(index => index >= 0)));

export async function parseLecturerAssignmentFile(file: File): Promise<ParsedLecturerAssignmentImport> {
  const workbookRows = await parseWorkbookRows(file);
  const warnings: string[] = [];

  const headerRow = workbookRows.find(({ row }) => {
    const headers = row.map(normalizeHeader);
    return (
      findColumn(headers, ["semester", "sem", "term", "academicterm"]) >= 0 &&
      findColumn(headers, ["coursecode", "course", "subjectcode", "code"]) >= 0 &&
      findColumn(headers, ["lectureremail", "lecturer", "email", "staffemail", "lecturername", "lecturerfullname", "staffname", "stafffullname"]) >= 0
    );
  });

  let semesterIndex = 0;
  let courseCodeIndex = 1;
  let lecturerIdentifierIndexes = [2];
  let dataRows = workbookRows;

  if (headerRow) {
    const headers = headerRow.row.map(normalizeHeader);
    semesterIndex = findColumn(headers, ["semester", "sem", "term", "academicterm"]);
    courseCodeIndex = findColumn(headers, ["coursecode", "course", "subjectcode", "code"]);
    const lecturerEmailIndex = findColumn(headers, ["lectureremail", "email", "staffemail"]);
    const lecturerNameIndex = findColumn(headers, ["lecturername", "lecturerfullname", "staffname", "stafffullname", "lecturer"]);
    lecturerIdentifierIndexes = uniqueColumnIndexes([lecturerEmailIndex, lecturerNameIndex]);
    dataRows = workbookRows.filter(({ index }) => index > headerRow.index);
  } else {
    warnings.push("No header row detected. The parser used the first three columns as semester, course_code and lecturer_email/lecturer_name.");
  }

  const rows = dataRows
    .map(({ index, row }) => ({
      courseCode: normalizeCourseCode(row[courseCodeIndex]),
      lecturerEmail: lecturerIdentifierIndexes
        .map(columnIndex => normalizeLecturerIdentifier(row[columnIndex]))
        .find(Boolean) || null,
      rowNumber: index + 1,
      semesterCode: normalizeSemesterCode(row[semesterIndex]),
    }))
    .filter(row => row.semesterCode || row.courseCode || row.lecturerEmail);

  if (rows.length === 0) {
    throw new Error("No lecturer assignment rows were found. Expected columns: semester, course_code, lecturer_email or lecturer_name.");
  }

  return {
    fileName: file.name,
    rows,
    warnings,
  };
}