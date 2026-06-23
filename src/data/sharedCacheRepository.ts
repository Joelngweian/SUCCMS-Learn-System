import { supabase } from "@/lib/supabase";

type SharedCacheResponse<T> = {
  cache?: "database" | "origin" | "redis" | "stale";
  data?: T;
};

export async function getSharedCachedData<T>(key: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke<SharedCacheResponse<T>>(
    "shared-read-cache",
    { body: { key } },
  );

  if (error) throw error;
  if (data?.data === undefined) {
    throw new Error(`Shared cache returned no data for "${key}".`);
  }
  return data.data;
}
