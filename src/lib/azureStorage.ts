import { azureApiFetch } from "./azureApi";

type AzureUploadDomain =
  | "course-content"
  | "assignment-submissions"
  | "public-profiles"
  | "announcement-attachments"
  | "forum-images"
  | "stories"
  | "campus-posts"
  | "study-group-files";

type AzureUploadUrlResponse = {
  blobName: string;
  uploadUrl: string;
  expiresAt: string;
};

export type AzureUploadedFile = {
  name: string;
  path: string;
  size: number;
  type: string;
};

export async function uploadFileToAzureBlob(
  domain: AzureUploadDomain,
  file: File,
): Promise<AzureUploadedFile> {
  const contentType = file.type || "application/octet-stream";
  const upload = await azureApiFetch<AzureUploadUrlResponse>(
    "/api/storage/upload-url",
    {
      method: "POST",
      body: JSON.stringify({
        domain,
        fileName: file.name,
        contentType,
      }),
    },
  );

  const response = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": contentType,
      "x-ms-blob-type": "BlockBlob",
    },
    body: file,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message || `Azure Blob upload failed with status ${response.status}.`,
    );
  }

  return {
    name: file.name,
    path: upload.blobName,
    size: file.size,
    type: file.type,
  };
}
