import type { Database } from "@/lib/database.types";
import type { NormalizedCourseOffering } from "@/lib/courseOfferings";

type ForumThreadRow =
  Database["public"]["Tables"]["forum_threads"]["Row"];
type ForumReplyRow =
  Database["public"]["Tables"]["forum_replies"]["Row"];
type UserProfileRow =
  Database["public"]["Tables"]["user_profiles"]["Row"];

export type ForumAuthor = Pick<
  UserProfileRow,
  "id" | "full_name" | "avatar_url" | "role"
>;

export type ForumMentionMember = Pick<
  UserProfileRow,
  "id" | "full_name" | "role" | "avatar_url"
>;

export type ForumReaction = {
  type: string;
};

export type ForumThread = Omit<ForumThreadRow, "images"> & {
  images: string[];
  author?: ForumAuthor | null;
  reactions?: ForumReaction[];
  replies?: Array<{ count: number }>;
};

export type ForumReply = ForumReplyRow & {
  author?: ForumAuthor | null;
  reactions?: ForumReaction[];
  children: ForumReply[];
  childCount: number;
  childrenLoaded: boolean;
  hasMoreChildren: boolean;
};

export type ForumThreadDetail = ForumThread & {
  structuredReplies: ForumReply[];
  replyCount: number;
  rootReplyCount: number;
};

export type ForumCourse = NormalizedCourseOffering;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export const normalizeForumThread = (
  thread: Omit<ForumThread, "images"> & { images?: unknown },
): ForumThread => ({
  ...thread,
  images: asStringArray(thread.images),
});

export const normalizeForumReply = (
  reply: Omit<
    ForumReply,
    "children" | "childCount" | "childrenLoaded" | "hasMoreChildren"
  >,
  childCount = 0,
): ForumReply => ({
  ...reply,
  children: [],
  childCount,
  childrenLoaded: false,
  hasMoreChildren: childCount > 0,
});
