import { supabase } from "@/lib/supabase";

type StorageItemWithPath = {
  path: string;
  url?: string;
};

export const withSignedStorageUrls = async <T extends StorageItemWithPath>(
  bucket: string,
  items: T[],
  expiresInSeconds = 3600,
): Promise<T[]> => {
  const paths = Array.from(
    new Set(items.map(item => item.path).filter(Boolean)),
  );
  if (paths.length === 0) return items;

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
