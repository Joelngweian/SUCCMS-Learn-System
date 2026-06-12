import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export interface OnlineUser {
  id: string;
  name: string;
  role: "student" | "lecturer" | "admin";
  avatarUrl?: string;
  onlineAt: string;
}

export function useOnlinePresence() {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!user) {
      setOnlineUsers([]);
      return;
    }

    let isActive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const connectPresence = async () => {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("show_online_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isActive) return;

      const showOnlineStatus = settings?.show_online_status !== false;

      channel = supabase.channel("campus-presence", {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          if (!channel || !isActive) return;

          const presenceState = channel.presenceState();
          const uniqueUsers = new Map<string, OnlineUser>();

          Object.entries(presenceState).forEach(([presenceKey, presences]) => {
            presences.forEach((presence: any) => {
              const userId = presence.user_id || presenceKey;
              if (!userId || uniqueUsers.has(userId)) return;

              uniqueUsers.set(userId, {
                id: userId,
                name: presence.full_name || "SUCCMS User",
                role: presence.role || "student",
                avatarUrl: presence.avatar_url || undefined,
                onlineAt: presence.online_at || new Date().toISOString(),
              });
            });
          });

          setOnlineUsers(Array.from(uniqueUsers.values()));
        })
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED" || !showOnlineStatus) return;

          await channel?.track({
            user_id: user.id,
            full_name: profile?.full_name || user.email || "SUCCMS User",
            role: profile?.role || "student",
            avatar_url: profile?.avatar_url || null,
            online_at: new Date().toISOString(),
          });
        });
    };

    connectPresence();

    return () => {
      isActive = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [
    user?.id,
    user?.email,
    profile?.full_name,
    profile?.role,
    profile?.avatar_url,
  ]);

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
  };
}
