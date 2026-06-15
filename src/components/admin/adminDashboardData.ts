import type { Json } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import type {
  AdminAnnouncement,
  AdminStats,
  AnnouncementAttachment,
  ReportedItem,
} from "./AdminDashboardTypes";

type JoinedRecord<T> = T | T[] | null;

interface ReportProfile {
  full_name: string | null;
  avatar_url?: string | null;
  is_active?: boolean | null;
}

interface ReportStory {
  image_url: string | null;
}

interface AdminReportRow {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  report_type: "story" | "user";
  story_id: string | null;
  reason: string;
  details: string | null;
  severity: "low" | "medium" | "high";
  status: "pending" | "resolved";
  created_at: string;
  resolved_at: string | null;
  reporter: JoinedRecord<ReportProfile>;
  reported_user: JoinedRecord<ReportProfile>;
  story: JoinedRecord<ReportStory>;
}

const getJoinedRecord = <T>(value: JoinedRecord<T>) =>
  Array.isArray(value) ? value[0] ?? null : value;

export const getAnnouncementAttachments = (
  value: Json,
): AnnouncementAttachment[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((attachment) => {
    if (!attachment || Array.isArray(attachment) || typeof attachment !== "object") {
      return [];
    }

    if (
      typeof attachment.name !== "string" ||
      typeof attachment.path !== "string" ||
      typeof attachment.url !== "string" ||
      typeof attachment.type !== "string" ||
      typeof attachment.size !== "number"
    ) {
      return [];
    }

    return [{
      name: attachment.name,
      path: attachment.path,
      url: attachment.url,
      type: attachment.type,
      size: attachment.size,
    }];
  });
};

export const formatDateTimeLocal = (value: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
};

export const loadAdminDashboardData = async (): Promise<{
  announcements: AdminAnnouncement[];
  reports: ReportedItem[];
  stats: AdminStats;
}> => {
  const now = new Date().toISOString();
  const [
    usersResult,
    suspendedUsersResult,
    storiesResult,
    announcementsResult,
    reportsResult,
  ] = await Promise.all([
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false),
    supabase.from("stories").select("id", { count: "exact", head: true }),
    supabase
      .from("announcements")
      .select("id, title, content, priority, attachments, created_at, expires_at")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select(`
        id,
        reporter_id,
        reported_user_id,
        report_type,
        story_id,
        reason,
        details,
        severity,
        status,
        created_at,
        resolved_at,
        reporter:user_profiles!reports_reporter_id_fkey(full_name),
        reported_user:user_profiles!reports_reported_user_id_fkey(full_name, avatar_url, is_active),
        story:stories!reports_story_id_fkey(image_url)
      `)
      .order("created_at", { ascending: false }),
  ]);

  const firstError = [
    usersResult.error,
    suspendedUsersResult.error,
    storiesResult.error,
    announcementsResult.error,
    reportsResult.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  const announcements: AdminAnnouncement[] = (
    announcementsResult.data || []
  ).map((announcement) => ({
    ...announcement,
    priority: announcement.priority as AdminAnnouncement["priority"],
    attachments: getAnnouncementAttachments(announcement.attachments),
  }));

  const reportRows = (reportsResult.data || []) as unknown as AdminReportRow[];
  const reports = reportRows.map((report): ReportedItem => {
    const reporter = getJoinedRecord(report.reporter);
    const reportedUser = getJoinedRecord(report.reported_user);
    const story = getJoinedRecord(report.story);

    return {
      id: report.id,
      type: report.report_type,
      reporterId: report.reporter_id,
      reportedBy: reporter?.full_name || "Unknown user",
      reportedUserId: report.reported_user_id,
      reportedUser: reportedUser?.full_name || "Unknown user",
      reportedUserAvatar: reportedUser?.avatar_url || null,
      reportedUserActive: reportedUser?.is_active !== false,
      reason: report.reason,
      details: report.details,
      storyId: report.story_id,
      storyImageUrl: story?.image_url || null,
      timestamp: report.created_at,
      status: report.status,
      severity: report.severity,
      resolvedAt: report.resolved_at,
    };
  });

  const today = new Date().toDateString();
  return {
    announcements,
    reports,
    stats: {
      totalUsers: usersResult.count || 0,
      activeReports: reports.filter((report) => report.status === "pending").length,
      resolvedToday: reports.filter(
        (report) =>
          report.resolvedAt &&
          new Date(report.resolvedAt).toDateString() === today,
      ).length,
      suspendedUsers: suspendedUsersResult.count || 0,
      totalStories: storiesResult.count || 0,
      announcements: announcements.length,
    },
  };
};

export const getEdgeFunctionErrorMessage = async (
  error: unknown,
  fallback: string,
) => {
  if (!error || typeof error !== "object") return fallback;

  let message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : fallback;

  if ("context" in error) {
    const context = error.context as { json?: () => Promise<unknown> } | undefined;
    if (context && typeof context.json === "function") {
      try {
        const payload = await context.json();
        if (
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
        ) {
          message = payload.error;
        }
      } catch {
        // The standard function error remains the fallback.
      }
    }
  }

  return message;
};
