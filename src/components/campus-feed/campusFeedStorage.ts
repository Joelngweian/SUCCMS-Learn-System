import { supabase } from "@/lib/supabase";
import type {
  CampusPostAttachment,
  SelectedCampusMedia,
} from "./campusFeedTypes";

const CAMPUS_POSTS_BUCKET = "campus-posts";

const safeFileName = (name: string) => name.replace(/[^\w.-]+/g, "_");

const attachmentFromMedia = (
  media: SelectedCampusMedia,
  path: string,
): CampusPostAttachment => ({
  name: media.file.name,
  path,
  size: media.file.size,
  type: media.file.type,
});

const uploadCampusMedia = async (
  path: string,
  media: SelectedCampusMedia,
) => {
  const { error } = await supabase.storage
    .from(CAMPUS_POSTS_BUCKET)
    .upload(path, media.file);
  if (error) throw error;

  return attachmentFromMedia(media, path);
};

export const uploadCampusPostMedia = async (
  userId: string,
  media: SelectedCampusMedia,
) => {
  const path = `${userId}/${crypto.randomUUID()}_${safeFileName(
    media.file.name,
  )}`;
  return uploadCampusMedia(path, media);
};

export const uploadCampusCommentMedia = async (
  userId: string,
  postId: string,
  media: SelectedCampusMedia,
) => {
  const path = `${userId}/comments/${postId}/${crypto.randomUUID()}_${safeFileName(
    media.file.name,
  )}`;
  return uploadCampusMedia(path, media);
};

export const removeCampusPostFiles = (paths: string[]) => {
  if (paths.length === 0) return Promise.resolve({ error: null });
  return supabase.storage.from(CAMPUS_POSTS_BUCKET).remove(paths);
};
