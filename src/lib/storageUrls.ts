import { supabase } from "@/lib/supabase";
import { azureApiFetch, isAzureAuthEnabled } from "@/lib/azureApi";
import { normalizeStoragePathForBucket } from "@/lib/storagePath";

type StorageItemWithPath = {
  path: string;
  url?: string;
};

export const withSignedStorageUrls = async <T extends StorageItemWithPath>(
  bucket: string,
  items: T[],
  expiresInSeconds = 3600,
): Promise<T[]> => {
  const itemPaths = items.map(item => ({
    itemPath: item.path,
    storagePath: isAzureAuthEnabled()
      ? normalizeStoragePathForBucket(item.path, bucket)
      : item.path,
  }));
  const paths = Array.from(
    new Set(itemPaths.map(item => item.storagePath).filter(Boolean)),
  ) as string[];
  if (paths.length === 0) return items;

  if (isAzureAuthEnabled()) {
    const signedUrls = new Map<string, string>();
    await Promise.all(
      paths.map(async path => {
        const data = await azureApiFetch<{ url: string }>(
          "/api/storage/read-url",
          {
            method: "POST",
            body: JSON.stringify({ path, expiresInSeconds }),
          },
        );
        signedUrls.set(path, data.url);
      }),
    );

    return items.map(item => ({
      ...item,
      url:
        signedUrls.get(normalizeStoragePathForBucket(item.path, bucket) || "")
        || item.url
        || "",
    }));
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expiresInSeconds);

  if (error) {
    // Keep existing public URLs working until the private-bucket migration is
    // applied. Once private, a signing failure leaves the item unavailable.
    console.warn(`Failed to sign ${bucket} URLs:`, error);
    return items;
  }

  const signedUrls = new Map(
    (data || [])
      .filter(item => item.signedUrl)
      .map(item => [item.path, item.signedUrl]),
  );

  return items.map(item => ({
    ...item,
    url: signedUrls.get(item.path) || item.url || "",
  }));
};
