import type { Database } from "@/lib/database.types";
import type { NormalizedCourseOffering } from "@/lib/courseOfferings";

type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type ProfileData = TableRow<"user_profiles"> & {
  _isPrivate?: boolean;
};

export type ProfileCourse = NormalizedCourseOffering;

export type ProfilePost = TableRow<"course_posts"> & {
  courses: NormalizedCourseOffering;
};

export type ConnectedProfile = {
  user_id: string;
  user_profiles: Pick<
    TableRow<"user_profiles">,
    "id" | "full_name" | "avatar_url" | "role"
  >;
};

export type ProfileCourseDisplay = {
  id: string;
  name: string;
  code: string;
};

export type ProfileActivityDisplay = {
  id: string;
  type: string;
  content: string;
  time: string;
};
