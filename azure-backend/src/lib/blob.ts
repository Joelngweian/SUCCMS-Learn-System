import { randomUUID } from "crypto";
import { getConfig } from "./config";

export type CreateUploadUrlInput = {
  ownerId: string;
  domain: "course-content" | "assignment-submissions" | "public-profiles" | "announcement-attachments" | "forum-images" | "stories" | "campus-posts" | "study-group-files";
  fileName: string;
  contentType: string;
};

let storageBlobModule: typeof import("@azure/storage-blob") | null = null;

const legacyBucketDomainMap: Record<string, string> = {
  course_content: "course-content",
  public_profiles: "public-profiles"
};

const azureStorageDomains = new Set([
  "announcement-attachments",
  "assignment-submissions",
  "campus-posts",
  "course-content",
  "forum-images",
  "public-profiles",
  "stories",
  "study-group-files"
]);

async function getStorageBlobModule() {
  if (storageBlobModule) return storageBlobModule;
  storageBlobModule = await import("@azure/storage-blob");
  return storageBlobModule;
}

export async function createUploadUrl(input: CreateUploadUrlInput) {
  const config = getConfig();
  const {
    BlobSASPermissions,
    BlobServiceClient,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters
  } = await getStorageBlobModule();
  const credential = new StorageSharedKeyCredential(
    config.azureStorageAccountName,
    config.azureStorageAccountKey
  );
  const blobService = new BlobServiceClient(
    `https://${config.azureStorageAccountName}.blob.core.windows.net`,
    credential
  );
  const containerClient = blobService.getContainerClient(config.azureStorageContainer);
  const blobName = createBlobName(input);
  const blobClient = containerClient.getBlockBlobClient(blobName);
  const startsOn = new Date(Date.now() - 60_000);
  const expiresOn = new Date(Date.now() + 10 * 60_000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName: config.azureStorageContainer,
      blobName,
      permissions: BlobSASPermissions.parse("cw"),
      startsOn,
      expiresOn,
      contentType: input.contentType
    },
    credential
  ).toString();

  return {
    blobName,
    uploadUrl: `${blobClient.url}?${sas}`,
    expiresAt: expiresOn.toISOString()
  };
}

export async function deleteBlobPaths(paths: string[]) {
  const config = getConfig();
  const { BlobServiceClient, StorageSharedKeyCredential } = await getStorageBlobModule();
  const credential = new StorageSharedKeyCredential(
    config.azureStorageAccountName,
    config.azureStorageAccountKey
  );
  const blobService = new BlobServiceClient(
    `https://${config.azureStorageAccountName}.blob.core.windows.net`,
    credential
  );
  const containerClient = blobService.getContainerClient(config.azureStorageContainer);
  let deleted = 0;

  for (const path of paths) {
    const blobName = normalizeBlobPath(path);
    if (!blobName) continue;
    const result = await containerClient.getBlobClient(blobName).deleteIfExists();
    if (result.succeeded) deleted += 1;
  }

  return { deleted };
}

export async function createReadUrl(path: string, expiresInSeconds = 300) {
  const config = getConfig();
  const {
    BlobSASPermissions,
    BlobServiceClient,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters
  } = await getStorageBlobModule();
  const credential = new StorageSharedKeyCredential(
    config.azureStorageAccountName,
    config.azureStorageAccountKey
  );
  const blobService = new BlobServiceClient(
    `https://${config.azureStorageAccountName}.blob.core.windows.net`,
    credential
  );
  const blobName = normalizeBlobPath(path);
  const blobClient = blobService
    .getContainerClient(config.azureStorageContainer)
    .getBlobClient(blobName);
  const startsOn = new Date(Date.now() - 60_000);
  const expiresOn = new Date(Date.now() + expiresInSeconds * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: config.azureStorageContainer,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn
    },
    credential
  ).toString();

  return {
    url: `${blobClient.url}?${sas}`,
    expiresAt: expiresOn.toISOString()
  };
}

function normalizeBlobPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) return "";

  for (const [bucket, domain] of Object.entries(legacyBucketDomainMap)) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = trimmed.indexOf(marker);
    if (markerIndex >= 0) {
      const legacyPath = decodeURIComponent(
        trimmed.slice(markerIndex + marker.length).split("?")[0]
      ).replace(/^\/+/, "");
      return legacyPath ? `${domain}/${legacyPath}` : "";
    }
  }

  const genericLegacyMatch = trimmed.match(/\/storage\/v1\/object\/public\/([^/]+)\/([^?]+)/);
  if (genericLegacyMatch) {
    const bucket = genericLegacyMatch[1];
    const domain = legacyBucketDomainMap[bucket] || bucket.replace(/_/g, "-");
    return `${domain}/${decodeURIComponent(genericLegacyMatch[2]).replace(/^\/+/, "")}`;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.endsWith(".blob.core.windows.net")) {
      const [, ...blobParts] = url.pathname.split("/").filter(Boolean);
      return decodeURIComponent(blobParts.join("/")).replace(/^\/+/, "");
    }
  } catch {
    // Plain blob paths are handled below.
  }

  const cleanPath = trimmed.replace(/^\/+/, "");
  const firstSegment = cleanPath.split("/")[0];
  if (azureStorageDomains.has(firstSegment)) return cleanPath;
  return cleanPath;
}

function createBlobName(input: CreateUploadUrlInput) {
  const requestedPath = input.fileName
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (requestedPath.includes("/")) {
    const cleanPath = requestedPath
      .split("/")
      .map(safeBlobPathSegment)
      .filter(Boolean)
      .join("/");
    if (cleanPath) {
      const firstSegment = cleanPath.split("/")[0];
      return azureStorageDomains.has(firstSegment)
        ? cleanPath
        : `${input.domain}/${cleanPath}`;
    }
  }

  return `${input.domain}/${input.ownerId}/${randomUUID()}-${safeBlobFileName(input.fileName)}`;
}

function safeBlobPathSegment(segment: string) {
  const safeSegment = safeBlobFileName(segment);
  return safeSegment === "." || safeSegment === ".." ? "" : safeSegment;
}

function safeBlobFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "file";
}
