export const MAX_CAMPUS_POST_MEDIA_FILES = 4;
export const MAX_CAMPUS_POST_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_CAMPUS_POST_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_CAMPUS_POST_MEDIA_BYTES = MAX_CAMPUS_POST_IMAGE_BYTES;
export const MAX_CAMPUS_COMMENT_MEDIA_FILES = 1;

export const isCampusImageType = (type?: string) =>
  Boolean(type?.startsWith("image/"));

export const isCampusPostPhotoType = (type?: string) =>
  type === "image/jpeg" || type === "image/png" || type === "image/webp";

export const isCampusCommentPhotoType = isCampusPostPhotoType;

export const isCampusVideoType = (type?: string) =>
  Boolean(type?.startsWith("video/"));

export const isCampusPostMediaType = (type?: string) =>
  isCampusPostPhotoType(type) || isCampusVideoType(type);

export const getCampusPostMediaError = (file: File) => {
  if (!isCampusPostMediaType(file.type)) {
    return "Campus posts support photo and video attachments only.";
  }

  const limit = isCampusVideoType(file.type)
    ? MAX_CAMPUS_POST_VIDEO_BYTES
    : MAX_CAMPUS_POST_IMAGE_BYTES;

  if (file.size > limit) {
    return `${file.name} is larger than ${Math.round(limit / 1024 / 1024)} MB.`;
  }

  return "";
};

export const getCampusCommentMediaError = (file: File) => {
  if (!isCampusCommentPhotoType(file.type)) {
    return "Comments support photo uploads only.";
  }

  if (file.size > MAX_CAMPUS_POST_IMAGE_BYTES) {
    return `${file.name} is larger than 10 MB.`;
  }

  return "";
};
