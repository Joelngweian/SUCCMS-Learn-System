const bucketDomainMap: Record<string, string> = {
  course_content: "course-content",
  public_profiles: "public-profiles",
};

const azureStorageDomains = new Set([
  "announcement-attachments",
  "assignment-submissions",
  "campus-posts",
  "course-content",
  "forum-images",
  "public-profiles",
  "stories",
  "study-group-files",
]);

export const toAzureStorageDomain = (bucket: string) =>
  bucketDomainMap[bucket] || bucket;

export function normalizeStoragePathForBucket(
  value: unknown,
  bucket: string,
) {
  if (typeof value !== "string" || !value.trim()) return null;

  const domain = toAzureStorageDomain(bucket);
  const trimmed = value.trim();
  const legacyMarker = `/storage/v1/object/public/${bucket}/`;
  const legacyMarkerIndex = trimmed.indexOf(legacyMarker);
  if (legacyMarkerIndex >= 0) {
    const legacyPath = decodeURIComponent(
      trimmed.slice(legacyMarkerIndex + legacyMarker.length).split("?")[0],
    ).replace(/^\/+/, "");
    return legacyPath ? `${domain}/${legacyPath}` : null;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.endsWith(".blob.core.windows.net")) {
      const [, ...blobParts] = url.pathname.split("/").filter(Boolean);
      const blobPath = decodeURIComponent(blobParts.join("/")).replace(/^\/+/, "");
      return blobPath || null;
    }
  } catch {
    // Plain storage paths are handled below.
  }

  const cleanPath = trimmed.replace(/^\/+/, "");
  if (!cleanPath) return null;
  const firstSegment = cleanPath.split("/")[0];
  return azureStorageDomains.has(firstSegment)
    ? cleanPath
    : `${domain}/${cleanPath}`;
}
