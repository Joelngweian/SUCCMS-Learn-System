import { supabase } from "@/lib/supabase";
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
  const value = typeof file.path === "string" ? file.path : "";
  if (!value) return null;
  if (!value.startsWith("http")) return value;

  const marker = "/storage/v1/object/public/course_content/";
  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) return null;

  return decodeURIComponent(
    value.slice(markerIndex + marker.length).split("?")[0],
  );
};

export const removeCourseContentPaths = async (
  paths: Array<string | null>,
) => {
  const uniquePaths = Array.from(
    new Set(paths.filter((path): path is string => Boolean(path))),
  );
  if (uniquePaths.length === 0) return null;

  const { error } = await supabase.storage
    .from("course_content")
    .remove(uniquePaths);
  return error;
};
