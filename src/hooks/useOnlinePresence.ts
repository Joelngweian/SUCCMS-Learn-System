import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export interface OnlineUser {
  id: string;
  name: string;
  role: "student" | "lecturer" | "admin";
  avatarUrl?: string;
  onlineAt: string;
}

type OnlinePresenceValue = {
  onlineUsers: OnlineUser[];
  onlineCount: number;
};

const OnlinePresenceContext = createContext<OnlinePresenceValue | null>(null);

type PresencePayload = {
  user_id?: string;
  full_name?: string;
  role?: OnlineUser["role"];
  avatar_url?: string | null;
  online_at?: string;
};

const isPresencePayload = (value: unknown): value is PresencePayload =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export function OnlinePresenceProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const userEmail = user?.email;
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!userId) {
      setOnlineUsers([]);
      return;
    }

    let isActive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let refreshTimer: number | null = null;

    const connectPresence = async () => {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("show_online_status")
        .eq("user_id", userId)
        .maybeSingle();

      if (!isActive) return;

      const showOnlineStatus = settings?.show_online_status !== false;

      channel = supabase.channel("campus-presence", {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      const syncPresenceState = () => {
        if (!channel || !isActive) return;

        const presenceState = channel.presenceState();
        const uniqueUsers = new Map<string, OnlineUser>();

        Object.entries(presenceState).forEach(([presenceKey, presences]) => {
          presences.forEach((presence) => {
            if (!isPresencePayload(presence)) return;
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
      };

      channel
        .on("presence", { event: "sync" }, () => {
          syncPresenceState();
        })
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED" || !showOnlineStatus) return;

          await channel?.track({
            user_id: userId,
            full_name: profile?.full_name || userEmail || "SUCCMS User",
            role: profile?.role || "student",
            avatar_url: profile?.avatar_url || null,
            online_at: new Date().toISOString(),
          });

          if (refreshTimer == null) {
            refreshTimer = window.setInterval(syncPresenceState, 3000);
          }
        });
    };

    connectPresence();

    return () => {
      isActive = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (refreshTimer != null) {
        window.clearInterval(refreshTimer);
      }
    };
  }, [
    userId,
    userEmail,
    profile?.full_name,
    profile?.role,
    profile?.avatar_url,
  ]);

  return createElement(
    OnlinePresenceContext.Provider,
    { value: { onlineUsers, onlineCount: onlineUsers.length } },
    children
  );
}

export function useOnlinePresence() {
  const context = useContext(OnlinePresenceContext);

  if (!context) {
    throw new Error(
      "useOnlinePresence must be used within an OnlinePresenceProvider"
    );
  }

  return context;
}
