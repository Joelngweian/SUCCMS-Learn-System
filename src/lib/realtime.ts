import {
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import { azureApiFetch, azureAuth } from "@/lib/azureApi";

type BroadcastHandler = (payload: unknown) => void;
type AzureRealtimeMessage = {
  event?: string;
  payload?: unknown;
  topic?: string;
};
type AzureSubscription = {
  event: string;
  handler: BroadcastHandler;
  topic: string;
};
const azureSubscriptions = new Set<AzureSubscription>();
let azureConnection: HubConnection | null = null;
let azureConnectionPromise: Promise<HubConnection> | null = null;

export function subscribeToPrivateBroadcast({
  event = "*",
  onMessage,
  topic,
}: {
  event?: string;
  onMessage: BroadcastHandler;
  topic: string;
}) {
  return subscribeToAzureBroadcast({ event, onMessage, topic });
}

export async function broadcastToPrivateTopic({
  event = "UPDATE",
  payload,
  topic,
}: {
  event?: string;
  payload?: unknown;
  topic: string;
}) {
  return azureApiFetch<{ sent: boolean }>("/api/signalr/broadcast", {
    method: "POST",
    body: JSON.stringify({ event, payload, topic }),
  });
}

function subscribeToAzureBroadcast({
  event,
  onMessage,
  topic,
}: {
  event: string;
  onMessage: BroadcastHandler;
  topic: string;
}) {
  const subscription = {
    event,
    handler: onMessage,
    topic,
  };
  azureSubscriptions.add(subscription);

  void getAzureRealtimeConnection().catch((error) => {
    console.warn(`Azure realtime subscription failed for ${topic}:`, error);
  });

  return () => {
    azureSubscriptions.delete(subscription);
  };
}

async function getAzureRealtimeConnection() {
  if (azureConnection?.state === HubConnectionState.Connected) {
    return azureConnection;
  }
  if (azureConnectionPromise) return azureConnectionPromise;

  azureConnectionPromise = startAzureRealtimeConnection();
  try {
    azureConnection = await azureConnectionPromise;
    return azureConnection;
  } finally {
    azureConnectionPromise = null;
  }
}

async function startAzureRealtimeConnection() {
  const apiUrl = import.meta.env.VITE_AZURE_API_URL?.replace(/\/+$/, "");
  if (!apiUrl) throw new Error("Azure API URL is not configured.");

  const connection = new HubConnectionBuilder()
    .withUrl(`${apiUrl}/api/signalr`, {
      accessTokenFactory: () => azureAuth.loadSession()?.accessToken || "",
      transport: HttpTransportType.WebSockets,
      withCredentials: false,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  connection.on("broadcast", (message: AzureRealtimeMessage) => {
    if (!message?.topic) return;
    azureSubscriptions.forEach(subscription => {
      if (subscription.topic !== message.topic) return;
      if (subscription.event !== "*" && subscription.event !== message.event) return;
      subscription.handler({
        event: message.event,
        payload: message.payload,
      });
    });
  });

  connection.onclose(() => {
    azureConnection = null;
  });

  await connection.start();
  return connection;
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
