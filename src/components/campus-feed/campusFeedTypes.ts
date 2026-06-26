import type { Json } from "@/lib/database.types";

export type CampusPostReaction =
  | "like"
  | "love"
  | "celebrate"
  | "support";

export type CampusPostAttachment = {
  name: string;
  path: string;
  size: number;
  type: string;
  url?: string;
};

export type CampusPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorRole: string;
  content: string;
  attachments: CampusPostAttachment[];
  createdAt: string;
  updatedAt: string;
  reactionCount: number;
  commentCount: number;
  viewerReaction: CampusPostReaction | null;
};

export type CampusPostComment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorRole: string;
  content: string;
  attachments: CampusPostAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type SelectedCampusMedia = {
  id: string;
  file: File;
  previewUrl: string;
};

const isAttachment = (
  value: Json,
): value is {
  name: string;
  path: string;
  size?: number;
  type?: string;
  url?: string;
} =>
  Boolean(
    value
    && !Array.isArray(value)
    && typeof value === "object"
    && typeof value.name === "string"
    && typeof value.path === "string",
  );

export const normalizeCampusPostAttachments = (
  value: Json,
): CampusPostAttachment[] =>
  Array.isArray(value)
    ? value.filter(isAttachment).map(attachment => ({
        name: attachment.name,
        path: attachment.path,
        size: typeof attachment.size === "number" ? attachment.size : 0,
        type: typeof attachment.type === "string" ? attachment.type : "",
        url: typeof attachment.url === "string" ? attachment.url : undefined,
      }))
    : [];
