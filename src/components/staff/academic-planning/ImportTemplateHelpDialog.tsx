import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { useStaffAcademicPlanningContext } from "./AcademicPlanningContext";

export function ImportTemplateHelpDialog() {
  const { templateHelpType, setTemplateHelpType } = useStaffAcademicPlanningContext();

  return (
      <Dialog open={templateHelpType !== null} onOpenChange={open => !open && setTemplateHelpType(null)}>
        <DialogContent className="max-h-[92vh] w-[min(100vw-2rem,64rem)] max-w-none overflow-y-auto overflow-x-hidden sm:max-w-none">
          <DialogHeader>
            <DialogTitle>
              {templateHelpType === "study-plan"
                ? "Study Plan Excel Template Guide"
                : templateHelpType === "student-assignment"
                  ? "Student Study Plan Assignment Template"
                  : "Lecturer Assignment Excel Template"}
            </DialogTitle>
            <DialogDescription>
              {templateHelpType === "study-plan"
                ? "Use the standard SUC study plan workbook format so the system can detect programme, intake, track and semester course blocks."
                : "Create an Excel file with the columns below before importing."}
            </DialogDescription>
          </DialogHeader>

          {templateHelpType === "study-plan" ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium">Expected file format</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>Use the official study plan layout from the department, not a custom simple list.</li>
                  <li>The file name or sheet text should include programme and intake, for example <span className="font-medium text-foreground">CS 2025A A1</span>, <span className="font-medium text-foreground">IT 2026B B2</span>, or <span className="font-medium text-foreground">BoSE 2024C C1</span>.</li>
                  <li>Semester blocks should contain columns such as <span className="font-medium text-foreground">Code</span>, <span className="font-medium text-foreground">Category</span>, and <span className="font-medium text-foreground">Credit</span>.</li>
                  <li>Import only one programme and one intake group at a time. Multiple files are okay only for matching A1/A2/B1/B2/C1/C2 variants.</li>
                </ul>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium">Example file names</p>
                <div className="mt-2 grid gap-2 text-muted-foreground sm:grid-cols-2">
                  <code className="rounded bg-muted px-2 py-1">CS_2025A_A1.xlsx</code>
                  <code className="rounded bg-muted px-2 py-1">IT_2026B_B2.xlsx</code>
                  <code className="rounded bg-muted px-2 py-1">BOSE_2024C_C1.xlsx</code>
                  <code className="rounded bg-muted px-2 py-1">BoSE Study Plan 2025A A2.xlsx</code>
                </div>
              </div>
            </div>
          ) : templateHelpType === "student-assignment" ? (
            <div className="space-y-4 text-sm">
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="break-words px-2 py-2 sm:px-3">student_email</th>
                      <th className="break-words px-2 py-2 sm:px-3">programme</th>
                      <th className="break-words px-2 py-2 sm:px-3">track</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="break-all px-2 py-2 sm:px-3">d240106b@student.sc.edu.my</td>
                      <td className="break-words px-2 py-2 sm:px-3">CS</td>
                      <td className="break-words px-2 py-2 sm:px-3">B1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground">
                Template columns are the minimum fields staff need to assign students to a study plan. Use one row per student.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="break-words px-2 py-2 sm:px-3">semester</th>
                      <th className="break-words px-2 py-2 sm:px-3">course_code</th>
                      <th className="break-words px-2 py-2 sm:px-3">lecturer_name</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="break-words px-2 py-2 sm:px-3">2026C</td>
                      <td className="break-words px-2 py-2 sm:px-3">ACCT1003</td>
                      <td className="break-all px-2 py-2 sm:px-3">John Ng</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground">
                Template columns are the minimum fields staff need to assign a lecturer. Use one row per course.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" onClick={() => setTemplateHelpType(null)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
