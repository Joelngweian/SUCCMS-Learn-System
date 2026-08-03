export const ASSESSMENT_RESOURCE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png";

export const SUBMISSION_FILE_ACCEPT =
  ".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png";

export const ASSESSMENT_RESOURCE_BLOCKED_EXTENSIONS = [
  "txt",
  "csv",
  "zip",
  "webp",
  "gif",
] as const;

export const SUBMISSION_FILE_BLOCKED_EXTENSIONS = [
  "txt",
  "webp",
  "heic",
] as const;

export const describeBlockedExtensions = (
  extensions: readonly string[],
) => extensions.map(extension => `.${extension}`).join(", ");

export const getBlockedFileNames = (
  files: File[],
  blockedExtensions: readonly string[],
) => {
  const blockedSet = new Set(
    blockedExtensions.map(extension => extension.toLowerCase()),
  );

  return files
    .filter(file => blockedSet.has(getFileExtension(file.name)))
    .map(file => file.name);
};

const getFileExtension = (fileName: string) => {
  const extension = fileName.split(".").pop();
  return extension ? extension.toLowerCase() : "";
};
