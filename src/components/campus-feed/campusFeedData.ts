import type { Database } from "@/lib/database.types";
import { withSignedStorageUrls } from "@/lib/storageUrls";
import {
  normalizeCampusPostAttachments,
  type CampusPost,
  type CampusPostComment,
} from "./campusFeedTypes";

export const CAMPUS_POST_PAGE_SIZE = 10;

export type CampusPostPageRow =
  Database["public"]["Functions"]["get_campus_posts_page"]["Returns"][number];

export type CampusPostCursor = {
  createdAt: string;
  id: string;
};

export type CampusCommentRow =
  Database["public"]["Tables"]["campus_post_comments"]["Row"];

export const signCampusPostMedia = async (
  posts: CampusPost[],
): Promise<CampusPost[]> => {
  const signedAttachments = await withSignedStorageUrls(
    "campus-posts",
    posts.flatMap(post => post.attachments),
  );
  const signedUrlByPath = new Map(
    signedAttachments.map(attachment => [attachment.path, attachment.url]),
  );

  return posts.map(post => ({
    ...post,
    attachments: post.attachments.map(attachment => ({
      ...attachment,
      url: signedUrlByPath.get(attachment.path) || attachment.url,
    })),
  }));
};

export const signCampusCommentMedia = async (
  comments: CampusPostComment[],
): Promise<CampusPostComment[]> => {
  const signedAttachments = await withSignedStorageUrls(
    "campus-posts",
    comments.flatMap(comment => comment.attachments),
  );
  const signedUrlByPath = new Map(
    signedAttachments.map(attachment => [attachment.path, attachment.url]),
  );

  return comments.map(comment => ({
    ...comment,
    attachments: comment.attachments.map(attachment => ({
      ...attachment,
      url: signedUrlByPath.get(attachment.path) || attachment.url,
    })),
  }));
};

export const normalizeCampusPost = (row: CampusPostPageRow): CampusPost => ({
  id: row.id,
  authorId: row.author_id,
  authorName: row.author_name,
  authorAvatarUrl: row.author_avatar_url,
  authorRole: row.author_role,
  content: row.content,
  attachments: normalizeCampusPostAttachments(row.attachments),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  reactionCount: Number(row.reaction_count) || 0,
  commentCount: Number(row.comment_count) || 0,
  viewerReaction:
    row.viewer_reaction === "like"
    || row.viewer_reaction === "love"
    || row.viewer_reaction === "celebrate"
    || row.viewer_reaction === "support"
      ? row.viewer_reaction
      : null,
});
