import { Download, FileText, Sparkles } from "lucide-react";
import type {
  CourseAssignment,
  CourseResourceFile,
} from "./coursePageTypes";

function isCourseResourceFile(value: unknown): value is CourseResourceFile {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  const file = value as Record<string, unknown>;
  return typeof file.name === "string" && typeof file.path === "string";
}

export function CourseAssignmentResources({
  assignment,
}: {
  assignment: CourseAssignment;
}) {
  let rubricContent = null;

  if (assignment.rubric) {
    try {
      const parsedRubrics = JSON.parse(assignment.rubric);
      rubricContent = Array.isArray(parsedRubrics)
        ? parsedRubrics.filter(isCourseResourceFile).map((file, index) => (
            <a
              key={`${file.path}-${index}`}
              href={file.path}
              target="_blank"
              rel="noreferrer"
              className="flex items-center p-3 bg-white border rounded-lg hover:border-blue-400 transition-colors shadow-sm"
            >
              <div className="bg-blue-100 p-2 rounded mr-3 text-blue-700">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium truncate flex-1 text-blue-900">
                {file.name}
              </span>
              <Download className="h-4 w-4 text-blue-400" />
            </a>
          ))
        : null;
    } catch {
      rubricContent = null;
    }
  }

  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
      <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-gray-500" /> Instructions
      </h4>
      <p className="whitespace-pre-wrap leading-relaxed text-gray-700">
        {assignment.description || "No instructions provided."}
      </p>

      {assignment.rubric && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
          <h3 className="font-semibold text-lg mb-3 text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Grading Rubric
          </h3>
          <div className="grid gap-2">
            {rubricContent || (
              <p className="whitespace-pre-wrap text-sm text-blue-700 dark:text-blue-400">
                {assignment.rubric}
              </p>
            )}
          </div>
        </div>
      )}

      {assignment.attachments?.length > 0 && (
        <div className="mt-6 grid gap-2">
          {assignment.attachments.map((file, index) => (
            <a
              key={`${file.path}-${index}`}
              href={file.path}
              target="_blank"
              rel="noreferrer"
              className="flex items-center p-3 bg-white border rounded-lg hover:border-blue-300 transition-colors group shadow-sm"
            >
              <div className="bg-blue-50 p-2 rounded mr-3 text-blue-600">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium truncate flex-1 text-gray-700">
                {file.name}
              </span>
              <Download className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
