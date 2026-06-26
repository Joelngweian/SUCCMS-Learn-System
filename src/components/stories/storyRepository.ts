import { supabase } from "@/lib/supabase";

export type StoryTargetUser = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  initials?: string;
  role: string;
};

export async function getStoryNetworkUserIds(currentUserId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id, following_id")
    .or(
      `follower_id.eq.${currentUserId},following_id.eq.${currentUserId}`,
    );

  if (error) throw error;

  const userIds = new Set<string>([currentUserId]);
  (data || []).forEach(connection => {
    userIds.add(connection.follower_id);
    userIds.add(connection.following_id);
  });
  return [...userIds];
}

export async function getActiveStoryUserIds(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return new Set<string>();

  const { data, error } = await supabase
    .from("stories")
    .select("user_id")
    .in("user_id", uniqueUserIds)
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString());

  if (error) throw error;
  return new Set((data || []).map(story => story.user_id));
}
