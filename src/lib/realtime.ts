import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type BroadcastHandler = (payload: unknown) => void;

export function subscribeToPrivateBroadcast({
  event = "*",
  onMessage,
  topic,
}: {
  event?: string;
  onMessage: BroadcastHandler;
  topic: string;
}) {
  let channel: RealtimeChannel | null = null;
  let disposed = false;

  void supabase.realtime
    .setAuth()
    .then(() => {
      if (disposed) return;
      channel = supabase
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event }, onMessage)
        .subscribe();
    })
    .catch((error) => {
      console.warn(`Realtime subscription failed for ${topic}:`, error);
    });

  return () => {
    disposed = true;
    if (channel) void supabase.removeChannel(channel);
  };
}

export function getBroadcastNewRecord<T>(message: unknown): T | null {
  if (!message || typeof message !== "object") return null;
  const payload = (message as { payload?: unknown }).payload;
  if (!payload || typeof payload !== "object") return null;
  const record = (payload as { new?: unknown; record?: unknown }).new
    ?? (payload as { record?: unknown }).record;
  return record && typeof record === "object" ? record as T : null;
}

export function getBroadcastOldRecord<T>(message: unknown): T | null {
  if (!message || typeof message !== "object") return null;
  const payload = (message as { payload?: unknown }).payload;
  if (!payload || typeof payload !== "object") return null;
  const record = (payload as { old?: unknown; old_record?: unknown }).old
    ?? (payload as { old_record?: unknown }).old_record;
  return record && typeof record === "object" ? record as T : null;
}

export function getBroadcastChangeType(message: unknown) {
  if (!message || typeof message !== "object") return null;
  const outer = message as { event?: unknown; payload?: unknown };
  const payload = outer.payload;
  const value = payload && typeof payload === "object"
    ? (payload as { type?: unknown; operation?: unknown }).type
      ?? (payload as { operation?: unknown }).operation
      ?? outer.event
    : outer.event;
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return ["INSERT", "UPDATE", "DELETE"].includes(normalized)
    ? normalized as "INSERT" | "UPDATE" | "DELETE"
    : null;
}
