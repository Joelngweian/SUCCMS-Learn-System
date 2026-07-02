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
  role: "student" | "lecturer" | "staff" | "admin";
  avatarUrl?: string;
  onlineAt: string;
}

type OnlinePresenceValue = {
  onlineUsers: OnlineUser[];
  onlineCount: number;
};

type PresenceSummaryRow = {
  online_count: number;
  sample_users: unknown;
};

const HEARTBEAT_INTERVAL_MS = 60_000;
const SUMMARY_INTERVAL_MS = 60_000;
const OnlinePresenceContext = createContext<OnlinePresenceValue | null>(null);

const normalizeSampleUsers = (value: unknown): OnlineUser[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const user = candidate as Record<string, unknown>;
    if (
      typeof user.id !== "string"
      || typeof user.name !== "string"
      || !["student", "lecturer", "staff", "admin"].includes(String(user.role))
    ) return [];

    return [{
      id: user.id,
      name: user.name,
      role: user.role as OnlineUser["role"],
      avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl : undefined,
      onlineAt:
        typeof user.onlineAt === "string"
          ? user.onlineAt
          : new Date().toISOString(),
    }];
  }).slice(0, 4);
};

export function OnlinePresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setOnlineUsers([]);
      setOnlineCount(0);
      return;
    }

    let active = true;
    let heartbeatTimer: number | null = null;
    let summaryTimer: number | null = null;

    const loadSummary = async () => {
      const { data, error } = await supabase
        .from("presence_summary_cache")
        .select("online_count, sample_users")
        .eq("singleton", true)
        .maybeSingle();
      if (!active || error || !data) return;

      const summary = data as PresenceSummaryRow;
      setOnlineCount(Math.max(0, Number(summary.online_count) || 0));
      setOnlineUsers(normalizeSampleUsers(summary.sample_users));
    };

    const sendHeartbeat = async () => {
      if (document.visibilityState !== "visible") return;
      await supabase.from("user_presence").upsert(
        { user_id: userId, last_seen_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    };

    const initialize = async () => {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("show_online_status")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;

      if (settings?.show_online_status === false) {
        await supabase.from("user_presence").delete().eq("user_id", userId);
      } else {
        await sendHeartbeat();
        heartbeatTimer = window.setInterval(
          () => void sendHeartbeat(),
          HEARTBEAT_INTERVAL_MS,
        );
      }

      await loadSummary();
      summaryTimer = window.setInterval(
        () => void loadSummary(),
        SUMMARY_INTERVAL_MS,
      );
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      void sendHeartbeat();
      void loadSummary();
    };

    void initialize();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
      if (summaryTimer !== null) window.clearInterval(summaryTimer);
    };
  }, [userId]);

  return createElement(
    OnlinePresenceContext.Provider,
    { value: { onlineUsers, onlineCount } },
    children,
  );
}

export function useOnlinePresence() {
  const context = useContext(OnlinePresenceContext);
  if (!context) {
    throw new Error(
      "useOnlinePresence must be used within an OnlinePresenceProvider",
    );
  }
  return context;
}
