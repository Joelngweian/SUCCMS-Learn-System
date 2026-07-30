import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { parseStudyPlanFiles } from "./studyPlanImportParser";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const columnName = (index: number) => String.fromCharCode("A".charCodeAt(0) + index);

const makeXlsxFile = async (fileName: string, rows: string[][]) => {
  const zip = new JSZip();
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  zip.file("xl/worksheets/sheet1.xml", `<worksheet><sheetData>${sheetRows}</sheetData></worksheet>`);
  const workbook = await zip.generateAsync({ type: "arraybuffer" });
  return new File([workbook], fileName, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

describe("parseStudyPlanFiles", () => {
  it("expands slash-separated choice courses and ignores Requirement summary rows", async () => {
    const file = await makeXlsxFile("CS 2026B1 study plan.xlsx", [
      ["No.", "Course Name", "Code", "Category", "Credit"],
      ["1", "Basic Chinese/Chinese", "CHIN1003/CHIN1033", "Compulsory Elective", "3"],
      ["2", "Requirement", "46", "", ""],
    ]);

    const parsed = await parseStudyPlanFiles([file]);
    const courseNames = parsed.courses.map(course => course.courseName);
    const chineseRows = parsed.courses.filter(course =>
      ["CHIN1003", "CHIN1033"].includes(course.courseCode || ""),
    );

    expect(courseNames).toContain("Basic Chinese");
    expect(courseNames).toContain("Chinese");
    expect(courseNames).not.toContain("Requirement");
    expect(chineseRows).toHaveLength(2);
    expect(new Set(chineseRows.map(course => course.planCourseKey)).size).toBe(1);
  });
});
