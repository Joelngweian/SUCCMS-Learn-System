import { useEffect, useState } from "react";
import { Download, FileText, Sparkles } from "lucide-react";
import { withSignedStorageUrls } from "@/lib/storageUrls";
import type {
  CourseAssignment,
  CourseResourceFile,
} from "./coursePageTypes";
import { getCourseContentStoragePath } from "./courseStorage";

function isCourseResourceFile(value: unknown): value is CourseResourceFile {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  const file = value as Record<string, unknown>;
  return typeof file.name === "string" && typeof file.path === "string";
}

const parseRubricFiles = (rubric: string | null) => {
  if (!rubric) return null;
  try {
    const parsed: unknown = JSON.parse(rubric);
    return Array.isArray(parsed)
      ? parsed.filter(isCourseResourceFile)
      : null;
  } catch {
    return null;
  }
};

const signCourseResourceFiles = async (files: CourseResourceFile[]) => {
  const storagePaths = files.map(getCourseContentStoragePath);
  const signableFiles = files.flatMap((file, index) => {
    const storagePath = storagePaths[index];
    return storagePath ? [{ ...file, path: storagePath }] : [];
  });
  const signedFiles = await withSignedStorageUrls(
    "course_content",
    signableFiles,
  );
  const signedUrlByPath = new Map(
    signedFiles.map(file => [file.path, file.url]),
  );

  return files.map((file, index) => {
    const storagePath = storagePaths[index];
    const legacyUrl = file.path.startsWith("http://")
      || file.path.startsWith("https://")
      ? file.path
      : undefined;
    return {
      ...file,
      url: (storagePath && signedUrlByPath.get(storagePath))
        || file.url
        || legacyUrl,
    };
  });
};

const getResourceHref = (file: CourseResourceFile) =>
  file.url
  || (file.path.startsWith("http://") || file.path.startsWith("https://")
    ? file.path
    : undefined);

export function CourseAssignmentResources({
  assignment,
}: {
  assignment: CourseAssignment;
}) {
  const [rubricFiles, setRubricFiles] = useState<CourseResourceFile[] | null>(
    () => parseRubricFiles(assignment.rubric),
  );
  const [materialFiles, setMaterialFiles] = useState<CourseResourceFile[]>(
    assignment.attachments,
  );

  useEffect(() => {
    let active = true;
    const nextRubricFiles = parseRubricFiles(assignment.rubric);
    setRubricFiles(nextRubricFiles);
    setMaterialFiles(assignment.attachments);

    void Promise.all([
      nextRubricFiles
        ? signCourseResourceFiles(nextRubricFiles)
        : Promise.resolve(null),
      signCourseResourceFiles(assignment.attachments),
    ]).then(([signedRubrics, signedMaterials]) => {
      if (!active) return;
      setRubricFiles(signedRubrics);
      setMaterialFiles(signedMaterials);
    });

    return () => {
      active = false;
    };
  }, [assignment.attachments, assignment.id, assignment.rubric]);

  const rubricContent = rubricFiles
    ? rubricFiles.map((file, index) => (
        <a
          key={file.path + "-" + index}
          href={getResourceHref(file)}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!getResourceHref(file)}
          onClick={event => {
            if (!getResourceHref(file)) event.preventDefault();
          }}
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

      {materialFiles.length > 0 && (
        <div className="mt-6 grid gap-2">
          {materialFiles.map((file, index) => (
            <a
              key={file.path + "-" + index}
              href={getResourceHref(file)}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!getResourceHref(file)}
              onClick={event => {
                if (!getResourceHref(file)) event.preventDefault();
              }}
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
