import { supabase } from "@/lib/supabase";
import { isAzureAuthEnabled } from "@/lib/azureApi";
import { normalizeStoragePathForBucket } from "@/lib/storagePath";
import type { CoursePostFile } from "./coursePageTypes";

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
};

export const getCourseContentStoragePath = (file: CoursePostFile) => {
  return normalizeStoragePathForBucket(file.path, "course_content");
};

export const removeCourseContentPaths = async (
  paths: Array<string | null>,
) => {
  const uniquePaths = Array.from(
    new Set(paths.filter((path): path is string => Boolean(path))),
  );
  if (uniquePaths.length === 0) return null;
  if (isAzureAuthEnabled()) return null;

  const { error } = await supabase.storage
    .from("course_content")
    .remove(uniquePaths);
  return error;
};
