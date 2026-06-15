import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { cachedRequest, invalidateRequestCache } from "./requestCache";

type ProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];
export type ProfileDirectoryRow = Pick<
  ProfileRow,
  | "id"
  | "full_name"
  | "username"
  | "role"
  | "program_or_department"
  | "avatar_url"
  | "bio"
  | "created_at"
  | "updated_at"
  | "is_active"
  | "cover_url"
  | "faculty"
  | "programme"
>;
export type ProfileSummary = Pick<
  ProfileRow,
  "id" | "full_name" | "avatar_url"
>;
export type MentionProfile = Pick<
  ProfileRow,
  "id" | "full_name" | "role" | "avatar_url"
>;

const PROFILE_SELECT =
  "id, full_name, username, role, program_or_department, avatar_url, bio, created_at, updated_at, is_active, cover_url, faculty, programme";

const normalizeIds = (ids: string[]) =>
  Array.from(new Set(ids.filter(Boolean))).sort();

export async function getProfilesByIds(
  ids: string[],
): Promise<ProfileDirectoryRow[]> {
  const profileIds = normalizeIds(ids);
  if (profileIds.length === 0) return [];

  return cachedRequest(`profile:full:${profileIds.join(",")}`, async () => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(PROFILE_SELECT)
      .in("id", profileIds);

    if (error) throw error;
    return data || [];
  });
}

export async function getProfileSummaries(
  ids: string[],
): Promise<ProfileSummary[]> {
  const profileIds = normalizeIds(ids);
  if (profileIds.length === 0) return [];

  return cachedRequest(`profile:summary:${profileIds.join(",")}`, async () => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, full_name, avatar_url")
      .in("id", profileIds);

    if (error) throw error;
    return data || [];
  });
}

export async function getMentionProfiles(
  ids?: string[],
): Promise<MentionProfile[]> {
  const profileIds = ids ? normalizeIds(ids) : [];
  const cacheKey =
    profileIds.length > 0
      ? `profile:mentions:${profileIds.join(",")}`
      : "profile:mentions:active";

  return cachedRequest(cacheKey, async () => {
    let query = supabase
      .from("user_profiles")
      .select("id, full_name, role, avatar_url")
      .in("role", ["student", "lecturer"])
      .or("is_active.eq.true,is_active.is.null")
      .order("full_name", { ascending: true });

    if (profileIds.length > 0) {
      query = query.in("id", profileIds);
    } else {
      query = query.limit(80);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, 10_000);
}

export function invalidateProfileCache() {
  invalidateRequestCache("profile:");
}
