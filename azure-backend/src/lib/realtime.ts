import { SignJWT } from "jose";
import { getConfig } from "./config";
import type { AuthenticatedUser } from "../types/auth";

const defaultHubName = "succms";
const tokenLifetimeSeconds = 60 * 60;

type SignalRConnection = {
  endpoint: string;
  accessKey: string;
  version?: string;
};

export type RealtimeMessage = {
  topic: string;
  event?: string;
  payload?: unknown;
};

export async function createSignalRNegotiation(user: AuthenticatedUser) {
  const { endpoint } = getSignalRConnection();
  const hub = getSignalRHubName();
  const hubQuery = `hub=${encodeURIComponent(hub)}`;
  const url = `${endpoint}/client/?${hubQuery}`;
  const accessToken = await signSignalRToken([
    url,
    `${endpoint}/client`,
    `${endpoint}/client/negotiate`,
  ], user.id);

  return {
    url,
    accessToken,
  };
}

export async function broadcastRealtimeMessage(message: RealtimeMessage) {
  if (!message.topic) return;
  const connection = getSignalRConnectionOrNull();
  if (!connection) return;

  const hub = getSignalRHubName();
  const baseUrl = `${connection.endpoint}/api/v1/hubs/${encodeURIComponent(hub)}`;
  const userId = getTopicUserId(message.topic);
  const requestUrl = userId
    ? `${baseUrl}/users/${encodeURIComponent(userId)}`
    : baseUrl;
  const accessToken = await signSignalRToken(requestUrl);

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      target: "broadcast",
      arguments: [message],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Azure SignalR broadcast failed with status ${response.status}.`);
  }
}

export async function broadcastTableChanges(
  table: string,
  changeType: "INSERT" | "UPDATE" | "DELETE",
  rows: Record<string, unknown>[],
) {
  await Promise.all(
    rows.flatMap(row =>
      buildTableMessages(table, changeType, row).map(message =>
        broadcastRealtimeMessage(message).catch(error => {
          console.warn("Azure realtime broadcast failed:", error);
        }),
      ),
    ),
  );
}

function buildTableMessages(
  table: string,
  changeType: "INSERT" | "UPDATE" | "DELETE",
  row: Record<string, unknown>,
): RealtimeMessage[] {
  const payload = changeType === "DELETE"
    ? { type: changeType, old: row, old_record: row }
    : { type: changeType, new: row, record: row };

  if (table === "course_posts" && typeof row.course_id === "string") {
    return [{ topic: `course:${row.course_id}:posts`, event: changeType, payload }];
  }

  if (
    (table === "attendance" || table === "attendance_sessions" || table === "attendance_class_meetings")
    && typeof row.course_id === "string"
  ) {
    return [{ topic: `course:${row.course_id}:attendance`, event: changeType, payload }];
  }

  if (table === "notifications" && typeof row.recipient_id === "string") {
    return [{ topic: `user:${row.recipient_id}:notifications`, event: changeType, payload }];
  }

  if (table === "user_achievements" && typeof row.user_id === "string") {
    return [{ topic: `user:${row.user_id}:achievements`, event: changeType, payload }];
  }

  if (table === "course_enrollments" && typeof row.student_id === "string") {
    return [{ topic: `user:${row.student_id}:enrollments`, event: changeType, payload }];
  }

  if (table === "user_profiles" && typeof row.id === "string") {
    return [{ topic: `user:${row.id}:account`, event: changeType, payload }];
  }

  if (table === "reports") {
    return [{ topic: "admin:moderation", event: changeType, payload }];
  }

  if (table.startsWith("campus_post")) {
    return [{
      topic: "campus:feed",
      event: changeType,
      payload: {
        type: changeType,
        post_id: row.post_id || row.id,
        author_id: row.author_id || row.user_id || row.reporter_id,
      },
    }];
  }

  if (table === "ai_grading_jobs" && typeof row.requested_by === "string") {
    return [{ topic: `user:${row.requested_by}:ai-grading`, event: changeType, payload }];
  }

  return [];
}

function getSignalRConnectionOrNull() {
  try {
    return getSignalRConnection();
  } catch {
    return null;
  }
}

function getSignalRConnection() {
  const connectionString = getConfig().azureSignalRConnectionString;
  if (!connectionString) throw new Error("azure_signalr_not_configured");

  const parts = Object.fromEntries(
    connectionString
      .split(";")
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const separator = part.indexOf("=");
        return separator < 0
          ? [part, ""]
          : [part.slice(0, separator), part.slice(separator + 1)];
      }),
  );

  const endpoint = parts.Endpoint?.replace(/\/+$/, "");
  const accessKey = parts.AccessKey;
  if (!endpoint || !accessKey) throw new Error("invalid_azure_signalr_connection_string");

  return {
    endpoint,
    accessKey,
    version: parts.Version,
  } satisfies SignalRConnection;
}

function getSignalRHubName() {
  return process.env.AZURE_SIGNALR_HUB || defaultHubName;
}

function getTopicUserId(topic: string) {
  const match = topic.match(/^user:([^:]+):/);
  return match?.[1] || null;
}

async function signSignalRToken(audience: string | string[], userId?: string) {
  const { accessKey } = getSignalRConnection();
  const secret = Buffer.from(accessKey, "utf8");
  const claims = userId
    ? {
        "asrs.s.uid": userId,
        nameid: userId,
        sub: userId,
      }
    : {};

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${tokenLifetimeSeconds}s`)
    .sign(secret);
}
