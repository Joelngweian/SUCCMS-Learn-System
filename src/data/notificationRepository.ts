import { supabase } from "@/lib/supabase";
import { cachedRequest, invalidateRequestCache } from "./requestCache";

export async function getNotificationBaseData(userId: string) {
  return cachedRequest(`notification:base:${userId}`, async () => {
    const [notificationResult, announcementResult, readResult, settingsResult] =
      await Promise.all([
        supabase
          .from("notifications")
          .select("id, type, title, message, action_url, is_read, created_at")
          .eq("recipient_id", userId)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("announcements")
          .select("id, title, content, priority, created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("user_id", userId),
        supabase
          .from("user_settings")
          .select("course_announcements, assignment_reminders")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

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
