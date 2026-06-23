import { supabase } from "@/lib/supabase";
import { cachedRequest, invalidateRequestCache } from "./requestCache";
import { getSharedCachedData } from "./sharedCacheRepository";

type ActiveAnnouncement = {
  content: string;
  created_at: string;
  id: string;
  priority: string;
  title: string;
};

async function getActiveAnnouncements() {
  try {
    const data = await getSharedCachedData<ActiveAnnouncement[]>(
      "active-announcements",
    );
    return { data, error: null };
  } catch (cacheError) {
    console.warn("Shared announcement cache unavailable; using direct query:", cacheError);
    return supabase
      .from("announcements")
      .select("id, title, content, priority, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20);
  }
}

export async function getNotificationBaseData(userId: string) {
  return cachedRequest(`notification:base:${userId}`, async () => {
    const [notificationResult, announcementResult, settingsResult] =
      await Promise.all([
        supabase
          .from("notifications")
          .select("id, type, title, message, action_url, is_read, created_at")
          .eq("recipient_id", userId)
          .order("created_at", { ascending: false })
          .limit(40),
        getActiveAnnouncements(),
        supabase
          .from("user_settings")
          .select("course_announcements, assignment_reminders")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

    const announcementIds = (announcementResult.data || [])
      .map(announcement => announcement.id)
      .filter(Boolean);
    const readResult = announcementIds.length > 0
      ? await supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("user_id", userId)
          .in("announcement_id", announcementIds)
      : { data: [], error: null };

    return {
      announcementResult,
      notificationResult,
      readResult,
      settingsResult,
    };
  }, 3_000);
}

export function invalidateNotificationCache(userId: string) {
  invalidateRequestCache(`notification:base:${userId}`);
}
