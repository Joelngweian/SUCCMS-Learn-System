import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";
import { useAuth } from "@/contexts/AuthContext";
import { getReportReasonLabel } from "@/lib/reporting";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import {
  Shield,
  Flag,
  UserX,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  FileText,
  Megaphone,
  Pencil,
  Eye,
  Ban,
  Paperclip,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from "lucide-react";

interface ReportedItem {
  id: string;
  type: "story" | "user";
  reporterId: string;
  reportedBy: string;
  reportedUserId: string;
  reportedUser: string;
  reportedUserAvatar: string | null;
  reportedUserActive: boolean;
  reason: string;
  details: string | null;
  storyId: string | null;
  storyImageUrl: string | null;
  timestamp: string;
  status: "pending" | "resolved";
  severity: "low" | "medium" | "high";
  resolvedAt: string | null;
}

interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  attachments: AnnouncementAttachment[];
  created_at: string;
  expires_at: string | null;
}

interface AnnouncementAttachment {
  name: string;
  path: string;
  url: string;
  type: string;
  size: number;
}

const getAnnouncementAttachments = (value: Json): AnnouncementAttachment[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((attachment) => {
    if (!attachment || Array.isArray(attachment) || typeof attachment !== "object") {
      return [];
    }

    const isAttachment =
      typeof attachment.name === "string" &&
      typeof attachment.path === "string" &&
      typeof attachment.url === "string" &&
      typeof attachment.type === "string" &&
      typeof attachment.size === "number";

    return isAttachment
      ? [{
          name: attachment.name as string,
          path: attachment.path as string,
          url: attachment.url as string,
          type: attachment.type as string,
          size: attachment.size as number,
        }]
      : [];
  });
};

const formatDateTimeLocal = (value: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
};

const emptyStats = {
  totalUsers: 0,
  activeReports: 0,
  resolvedToday: 0,
  suspendedUsers: 0,
  totalStories: 0,
  announcements: 0
};

export function AdminDashboard() {
  const { user, profile } = useAuth();
  const announcementAttachmentInputRef = useRef<HTMLInputElement>(null);
  const announcementFormRef = useRef<HTMLDivElement>(null);
  const [reports, setReports] = useState<ReportedItem[]>([]);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [stats, setStats] = useState(emptyStats);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [reportPage, setReportPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<ReportedItem | null>(null);
  const [moderatingReportId, setModeratingReportId] = useState<string | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementPriority, setAnnouncementPriority] =
    useState<"low" | "medium" | "high">("medium");
  const [announcementExpiry, setAnnouncementExpiry] = useState("");
  const [announcementFiles, setAnnouncementFiles] = useState<File[]>([]);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(
    null
  );
  const [existingAnnouncementAttachments, setExistingAnnouncementAttachments] =
    useState<AnnouncementAttachment[]>([]);
  const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const now = new Date().toISOString();
      const [
        usersResult,
        suspendedUsersResult,
        storiesResult,
        announcementsResult,
        reportsResult,
      ] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("user_profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_active", false),
        supabase
          .from("stories")
          .select("id", { count: "exact", head: true }),
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

      if (usersResult.error) {
        console.error("Failed to count users:", usersResult.error);
      }
      if (suspendedUsersResult.error) {
        console.error("Failed to count suspended users:", suspendedUsersResult.error);
      }
      if (storiesResult.error) {
        console.error("Failed to count stories:", storiesResult.error);
      }
      if (announcementsResult.error) {
        console.error("Failed to load announcements:", announcementsResult.error);
      }
      if (reportsResult.error) {
        console.error("Failed to load reports:", reportsResult.error);
      }

      const activeAnnouncements: AdminAnnouncement[] = (
        announcementsResult.data || []
      ).map((announcement) => ({
        ...announcement,
        priority: announcement.priority as AdminAnnouncement["priority"],
        attachments: getAnnouncementAttachments(announcement.attachments),
      }));
      const getJoinedRecord = (value: any) =>
        Array.isArray(value) ? value[0] : value;
      const loadedReports: ReportedItem[] = (reportsResult.data || []).map(
        (report: any) => {
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
            details: report.details || null,
            storyId: report.story_id || null,
            storyImageUrl: story?.image_url || null,
            timestamp: report.created_at,
            status: report.status,
            severity: report.severity,
            resolvedAt: report.resolved_at || null,
          };
        }
      );
      const today = new Date().toDateString();

      setAnnouncements(activeAnnouncements);
      setReports(loadedReports);
      setStats({
        totalUsers: usersResult.count || 0,
        activeReports: loadedReports.filter((report) => report.status === "pending")
          .length,
        resolvedToday: loadedReports.filter(
          (report) =>
            report.resolvedAt &&
            new Date(report.resolvedAt).toDateString() === today
        ).length,
        suspendedUsers: suspendedUsersResult.count || 0,
        totalStories: storiesResult.count || 0,
        announcements: activeAnnouncements.length,
      });
    } catch (error) {
      console.error("Failed to load admin dashboard statistics:", error);
      setStats(emptyStats);
    }
  };

  useEffect(() => {
    if (!user || profile?.role !== "admin") return;

    const channel = supabase
      .channel("admin-moderation-reports")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => loadDashboardStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.role]);

  const resetAnnouncementForm = () => {
    setAnnouncementTitle("");
    setAnnouncementContent("");
    setAnnouncementPriority("medium");
    setAnnouncementExpiry("");
    setAnnouncementFiles([]);
    setExistingAnnouncementAttachments([]);
    setEditingAnnouncementId(null);
  };

  const handleEditAnnouncement = (announcement: AdminAnnouncement) => {
    setAnnouncementTitle(announcement.title);
    setAnnouncementContent(announcement.content);
    setAnnouncementPriority(announcement.priority);
    setAnnouncementExpiry(formatDateTimeLocal(announcement.expires_at));
    setAnnouncementFiles([]);
    setExistingAnnouncementAttachments(announcement.attachments || []);
    setEditingAnnouncementId(announcement.id);
    requestAnimationFrame(() => {
      announcementFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handlePublishAnnouncement = async () => {
    if (!user || profile?.role !== "admin") {
      alert("Only administrators can manage announcements.");
      return;
    }
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      alert("Please enter an announcement title and content.");
      return;
    }

    setIsPublishingAnnouncement(true);
    const uploadedPaths: string[] = [];

    try {
      const attachments: AnnouncementAttachment[] = [
        ...existingAnnouncementAttachments,
      ];

      for (const [index, file] of announcementFiles.entries()) {
        const safeFileName = file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );
        const storagePath = `${user.id}/${Date.now()}_${index}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("announcement-attachments")
          .upload(storagePath, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) throw uploadError;
        uploadedPaths.push(storagePath);

        const { data } = supabase.storage
          .from("announcement-attachments")
          .getPublicUrl(storagePath);

        attachments.push({
          name: file.name,
          path: storagePath,
          url: data.publicUrl,
          type: file.type || "application/octet-stream",
          size: file.size,
        });
      }

      const announcementValues = {
        title: announcementTitle.trim(),
        content: announcementContent.trim(),
        priority: announcementPriority,
        expires_at: announcementExpiry
          ? new Date(announcementExpiry).toISOString()
          : null,
        attachments: attachments as unknown as Json,
        is_active: true,
      };

      const { error } = editingAnnouncementId
        ? await supabase
            .from("announcements")
            .update(announcementValues)
            .eq("id", editingAnnouncementId)
        : await supabase.from("announcements").insert({
          admin_id: user.id,
          ...announcementValues,
        });

      if (error) throw error;

      if (editingAnnouncementId) {
        const previousAnnouncement = announcements.find(
          (announcement) => announcement.id === editingAnnouncementId
        );
        const retainedPaths = new Set(
          existingAnnouncementAttachments.map((attachment) => attachment.path)
        );
        const removedPaths = (previousAnnouncement?.attachments || [])
          .filter((attachment) => !retainedPaths.has(attachment.path))
          .map((attachment) => attachment.path);

        if (removedPaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from("announcement-attachments")
            .remove(removedPaths);
          if (storageError) {
            console.error(
              "Announcement updated, but removed attachments could not be cleaned up:",
              storageError
            );
          }
        }
      }

      const wasEditing = Boolean(editingAnnouncementId);
      resetAnnouncementForm();
      await loadDashboardStats();
      alert(
        wasEditing
          ? "Announcement updated successfully."
          : "Announcement published successfully."
      );
    } catch (error: any) {
      if (uploadedPaths.length > 0) {
        await supabase.storage
          .from("announcement-attachments")
          .remove(uploadedPaths);
      }
      console.error("Failed to save announcement:", error);
      alert(
        `Failed to save announcement: ${
          error?.message || "Please try again."
        }`
      );
    } finally {
      setIsPublishingAnnouncement(false);
    }
  };

  const handleAnnouncementFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (files.length === 0) return;
    if (
      existingAnnouncementAttachments.length +
        announcementFiles.length +
        files.length >
      5
    ) {
      alert("You can attach up to 5 files to an announcement.");
      return;
    }

    const unsupportedFile = files.find((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      return !(
        file.type.startsWith("image/") ||
        file.type === "application/pdf" ||
        ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(extension)
      );
    });
    if (unsupportedFile) {
      alert(
        "Attachments must be an image, PDF, Word, Excel, PowerPoint, or text file."
      );
      return;
    }
    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      alert("Each attachment must not exceed 10MB.");
      return;
    }

    setAnnouncementFiles((current) => [...current, ...files]);
  };

  const handleDeleteAnnouncement = async (announcement: AdminAnnouncement) => {
    if (!user || profile?.role !== "admin") {
      alert("Only administrators can delete announcements.");
      return;
    }

    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcement.id);

      if (error) throw error;

      const attachmentPaths = (announcement.attachments || []).map(
        (attachment) => attachment.path
      );
      if (attachmentPaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("announcement-attachments")
          .remove(attachmentPaths);
        if (storageError) {
          console.error(
            "Announcement deleted, but its attachments could not be cleaned up:",
            storageError
          );
        }
      }

      if (editingAnnouncementId === announcement.id) {
        resetAnnouncementForm();
      }
      await loadDashboardStats();
      alert("Announcement deleted successfully.");
    } catch (error: any) {
      console.error("Failed to delete announcement:", error);
      alert(
        `Failed to delete announcement: ${
          error?.message || "Please try again."
        }`
      );
    }
  };

  const filteredReports = reports.filter(report => {
    const statusMatch = filterStatus === "all" || report.status === filterStatus;
    const severityMatch = filterSeverity === "all" || report.severity === filterSeverity;
    return statusMatch && severityMatch;
  });
  const reportsPerPage = 5;
  const totalReportPages = Math.max(
    1,
    Math.ceil(filteredReports.length / reportsPerPage)
  );
  const currentReportPage = Math.min(reportPage, totalReportPages);
  const paginatedReports = filteredReports.slice(
    (currentReportPage - 1) * reportsPerPage,
    currentReportPage * reportsPerPage
  );

  const resolveReportRecord = async (
    reportId: string,
    resolutionNotes: string
  ) => {
    if (!user) throw new Error("Administrator session is unavailable.");

    const { error } = await supabase
      .from("reports")
      .update({
        status: "resolved",
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes,
      })
      .eq("id", reportId);

    if (error) throw error;
  };

  const handleResolveReport = async (report: ReportedItem) => {
    setModeratingReportId(report.id);
    try {
      await resolveReportRecord(report.id, "Reviewed and resolved by administrator.");
      await loadDashboardStats();
      setSelectedReport(null);
    } catch (error: any) {
      console.error("Failed to resolve report:", error);
      alert(`Failed to resolve report: ${error?.message || "Please try again."}`);
    } finally {
      setModeratingReportId(null);
    }
  };

  const getStoryStoragePath = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    const marker = "/storage/v1/object/public/stories/";
    const markerIndex = imageUrl.indexOf(marker);
    return markerIndex >= 0
      ? decodeURIComponent(imageUrl.slice(markerIndex + marker.length))
      : null;
  };

  const handleRemoveStory = async (report: ReportedItem) => {
    if (!report.storyId) {
      alert("This story is no longer available.");
      return;
    }

    setModeratingReportId(report.id);
    try {
      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", report.storyId);
      if (error) throw error;

      const storagePath = getStoryStoragePath(report.storyImageUrl);
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from("stories")
          .remove([storagePath]);
        if (storageError) {
          console.error("Story removed, but image cleanup failed:", storageError);
        }
      }

      await resolveReportRecord(report.id, "Reported story removed by administrator.");
      await loadDashboardStats();
      setSelectedReport(null);
      alert("Story removed and report resolved.");
    } catch (error: any) {
      console.error("Failed to remove reported story:", error);
      alert(
        `Failed to remove reported story: ${
          error?.message || "Please try again."
        }`
      );
    } finally {
      setModeratingReportId(null);
    }
  };

  const handleSuspendUser = async (report: ReportedItem) => {
    setModeratingReportId(report.id);
    try {
      const { error } = await supabase.functions.invoke("admin-user-access", {
        body: {
          action: "suspend",
          targetUserId: report.reportedUserId,
        },
      });
      if (error) {
        let message = error.message;
        try {
          const details = await (error as any)?.context?.json?.();
          if (details?.error) message = details.error;
        } catch {
          // Use the standard function error when no JSON response is available.
        }
        throw new Error(message);
      }

      await resolveReportRecord(
        report.id,
        "Reported user account suspended by administrator."
      );
      await loadDashboardStats();
      setSelectedReport(null);
      alert(`${report.reportedUser}'s account has been suspended.`);
    } catch (error: any) {
      console.error("Failed to suspend user:", error);
      alert(`Failed to suspend user: ${error?.message || "Please try again."}`);
    } finally {
      setModeratingReportId(null);
    }
  };

  const handleRestoreUser = async (report: ReportedItem) => {
    setModeratingReportId(report.id);
    try {
      const { error } = await supabase.functions.invoke("admin-user-access", {
        body: {
          action: "restore",
          targetUserId: report.reportedUserId,
        },
      });
      if (error) {
        let message = error.message;
        try {
          const details = await (error as any)?.context?.json?.();
          if (details?.error) message = details.error;
        } catch {
          // Use the standard function error when no JSON response is available.
        }
        throw new Error(message);
      }

      await loadDashboardStats();
      setSelectedReport(null);
      alert(`${report.reportedUser}'s account has been restored.`);
    } catch (error: any) {
      console.error("Failed to restore user:", error);
      alert(`Failed to restore user: ${error?.message || "Please try again."}`);
    } finally {
      setModeratingReportId(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "story" 
      ? "bg-purple-100 text-purple-800" 
      : "bg-orange-100 text-orange-800";
  };

  return (
    <div className="space-y-6">
      <input
        ref={announcementAttachmentInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        multiple
        className="hidden"
        onChange={handleAnnouncementFiles}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-red-600" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Manage platform content and user safety</p>
        </div>
        <Badge className="bg-red-100 text-red-800">
          <Shield className="h-3 w-3 mr-1" />
          Administrator Access
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl">{stats.activeReports}</p>
                <p className="text-xs text-muted-foreground">Active Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl">{stats.resolvedToday}</p>
                <p className="text-xs text-muted-foreground">Resolved Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl">{stats.suspendedUsers}</p>
                <p className="text-xs text-muted-foreground">Suspended</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl">{stats.totalStories}</p>
                <p className="text-xs text-muted-foreground">Total Stories</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl">{stats.announcements}</p>
                <p className="text-xs text-muted-foreground">Active Announcements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="moderation">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="moderation">
            <Flag className="h-4 w-4 mr-2" />
            Moderation Queue
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Megaphone className="h-4 w-4 mr-2" />
            Announcements
          </TabsTrigger>
        </TabsList>

        {/* Moderation Queue */}
        <TabsContent value="moderation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Reported Content & Users</CardTitle>
                <div className="flex gap-2">
                  <Select
                    value={filterStatus}
                    onValueChange={(value) => {
                      setFilterStatus(value);
                      setReportPage(1);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filterSeverity}
                    onValueChange={(value) => {
                      setFilterSeverity(value);
                      setReportPage(1);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                  <p>No reports matching the selected filters</p>
                </div>
              ) : (
                <>
                {paginatedReports.map((report) => (
                  <div
                    key={report.id}
                    className={`p-4 border rounded-lg ${
                      report.status === "resolved" ? "bg-gray-50" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={report.reportedUserAvatar || undefined}
                            alt={report.reportedUser}
                          />
                          <AvatarFallback>
                            {report.reportedUser.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{report.reportedUser}</span>
                            <Badge className={getTypeColor(report.type)}>
                              {report.type}
                            </Badge>
                            <Badge className={getSeverityColor(report.severity)}>
                              {report.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Reported by {report.reportedBy} |{" "}
                            {new Date(report.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={report.status === "resolved" ? "secondary" : "default"}>
                        {report.status === "pending" ? (
                          <><Clock className="h-3 w-3 mr-1" /> Pending</>
                        ) : (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Resolved</>
                        )}
                      </Badge>
                    </div>

                    <div className="ml-13 space-y-2">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">
                          <strong>Reason:</strong>{" "}
                          {getReportReasonLabel(report.reason)}
                        </p>
                        {report.details && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {report.details}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => setSelectedReport(report)}
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </Button>

                          {report.status === "pending" && (
                            <>
                          {report.type === "story" && report.storyId && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remove Story
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Story</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove the reported story. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleRemoveStory(report)}
                                    disabled={moderatingReportId === report.id}
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {report.reportedUserActive && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="flex items-center gap-2"
                                >
                                  <UserX className="h-4 w-4" />
                                  Suspend User
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Suspend User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will suspend {report.reportedUser}'s
                                    account and resolve this report.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      void handleSuspendUser(report)
                                    }
                                    disabled={
                                      moderatingReportId === report.id
                                    }
                                  >
                                    Suspend
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleResolveReport(report)}
                            disabled={moderatingReportId === report.id}
                            className="flex items-center gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Mark Resolved
                          </Button>
                            </>
                          )}

                          {!report.reportedUserActive && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                                >
                                  <UserCheck className="h-4 w-4" />
                                  Restore User
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Restore User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will reactivate {report.reportedUser}'s
                                    account and allow the user to sign in again.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      void handleRestoreUser(report)
                                    }
                                    disabled={
                                      moderatingReportId === report.id
                                    }
                                  >
                                    Restore
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                    </div>
                  </div>
                ))}

                {filteredReports.length > reportsPerPage && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing{" "}
                      {(currentReportPage - 1) * reportsPerPage + 1}-
                      {Math.min(
                        currentReportPage * reportsPerPage,
                        filteredReports.length
                      )}{" "}
                      of {filteredReports.length} reports
                    </p>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        disabled={currentReportPage === 1}
                        onClick={() =>
                          setReportPage((page) => Math.max(1, page - 1))
                        }
                        title="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {Array.from(
                        { length: totalReportPages },
                        (_, index) => index + 1
                      ).map((page) => (
                        <Button
                          key={page}
                          type="button"
                          variant={
                            currentReportPage === page ? "default" : "ghost"
                          }
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setReportPage(page)}
                          aria-label={`Show report page ${page}`}
                        >
                          {page}
                        </Button>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        disabled={currentReportPage === totalReportPages}
                        onClick={() =>
                          setReportPage((page) =>
                            Math.min(totalReportPages, page + 1)
                          )
                        }
                        title="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements Management */}
        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Campus Announcements</CardTitle>
                  {editingAnnouncementId && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Editing an existing announcement
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editingAnnouncementId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetAnnouncementForm}
                      disabled={isPublishingAnnouncement}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    className="flex items-center gap-2"
                    onClick={handlePublishAnnouncement}
                    disabled={
                      isPublishingAnnouncement ||
                      !announcementTitle.trim() ||
                      !announcementContent.trim()
                    }
                  >
                    {editingAnnouncementId ? (
                      <Pencil className="h-4 w-4" />
                    ) : (
                      <Megaphone className="h-4 w-4" />
                    )}
                    {isPublishingAnnouncement
                      ? "Saving..."
                      : editingAnnouncementId
                        ? "Save Changes"
                        : "Publish Announcement"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                ref={announcementFormRef}
                className="space-y-4 rounded-lg border p-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="announcement-title">Title</Label>
                  <Input
                    id="announcement-title"
                    value={announcementTitle}
                    onChange={(event) => setAnnouncementTitle(event.target.value)}
                    placeholder="Announcement title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="announcement-content">Content</Label>
                  <Textarea
                    id="announcement-content"
                    value={announcementContent}
                    onChange={(event) => setAnnouncementContent(event.target.value)}
                    placeholder="Write the campus announcement..."
                    className="min-h-28"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Attachments (Optional)</Label>
                  {existingAnnouncementAttachments.length > 0 && (
                    <div className="space-y-2 rounded-lg border p-3">
                      {existingAnnouncementAttachments.map((attachment) => (
                        <div
                          key={attachment.path}
                          className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{attachment.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Existing attachment
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() =>
                              setExistingAnnouncementAttachments((current) =>
                                current.filter(
                                  (item) => item.path !== attachment.path
                                )
                              )
                            }
                            title="Remove attachment"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {announcementFiles.length > 0 && (
                    <div className="space-y-2 rounded-lg border p-3">
                      {announcementFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${file.lastModified}-${index}`}
                          className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() =>
                              setAnnouncementFiles((current) =>
                                current.filter((_, fileIndex) => fileIndex !== index)
                              )
                            }
                            title="Remove attachment"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => announcementAttachmentInputRef.current?.click()}
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    Attach
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Up to 5 images or documents, maximum 10MB each.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={announcementPriority}
                      onValueChange={(value) =>
                        setAnnouncementPriority(value as "low" | "medium" | "high")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="announcement-expiry">Expires At (Optional)</Label>
                    <Input
                      id="announcement-expiry"
                      type="datetime-local"
                      value={announcementExpiry}
                      onChange={(event) => setAnnouncementExpiry(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4>Active Announcements</h4>
                {announcements.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                    No active announcements.
                  </div>
                ) : (
                  announcements.map((announcement) => (
                    <div key={announcement.id} className="rounded-lg border p-4">
                      {announcement.attachments?.length > 0 && (
                        <div className="mb-3 space-y-2">
                          {announcement.attachments.map((attachment) =>
                            attachment.type.startsWith("image/") ? (
                              <a
                                key={attachment.path}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block overflow-hidden rounded-md border"
                              >
                                <img
                                  src={attachment.url}
                                  alt={attachment.name}
                                  className="block object-cover"
                                  style={{
                                    width: 240,
                                    height: 150,
                                    maxWidth: "100%",
                                  }}
                                />
                              </a>
                            ) : (
                              <a
                                key={attachment.path}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                              >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="truncate">{attachment.name}</span>
                              </a>
                            )
                          )}
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium">{announcement.title}</h4>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {announcement.content}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge className={getSeverityColor(announcement.priority)}>
                            {announcement.priority}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditAnnouncement(announcement)}
                            title="Edit announcement"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Delete announcement"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete this announcement?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove the announcement and
                                  all of its attachments.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    void handleDeleteAnnouncement(announcement)
                                  }
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>
                          Published {new Date(announcement.created_at).toLocaleString()}
                        </span>
                        {announcement.expires_at && (
                          <span>
                            Expires {new Date(announcement.expires_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(selectedReport)}
        onOpenChange={(open) => {
          if (!open && !moderatingReportId) setSelectedReport(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              Review the submitted information before taking moderation action.
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar
                  className="h-11 w-11 shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    minWidth: 44,
                    minHeight: 44,
                    maxWidth: 44,
                    maxHeight: 44,
                    overflow: "hidden",
                    borderRadius: "9999px",
                  }}
                >
                  <AvatarImage
                    src={selectedReport.reportedUserAvatar || undefined}
                    alt={selectedReport.reportedUser}
                    className="h-full w-full object-cover"
                    style={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <AvatarFallback>
                    {selectedReport.reportedUser
                      .split(" ")
                      .map((name) => name[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{selectedReport.reportedUser}</p>
                  <p className="text-sm text-muted-foreground">
                    Reported by {selectedReport.reportedBy}
                  </p>
                </div>
                <Badge className={getSeverityColor(selectedReport.severity)}>
                  {selectedReport.severity}
                </Badge>
                <Badge
                  variant={
                    selectedReport.reportedUserActive
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {selectedReport.reportedUserActive ? "Active" : "Suspended"}
                </Badge>
              </div>

              <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                <p className="text-sm">
                  <strong>Type:</strong> {selectedReport.type}
                </p>
                <p className="text-sm">
                  <strong>Reason:</strong>{" "}
                  {getReportReasonLabel(selectedReport.reason)}
                </p>
                <p className="text-sm">
                  <strong>Submitted:</strong>{" "}
                  {new Date(selectedReport.timestamp).toLocaleString()}
                </p>
                {selectedReport.details && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {selectedReport.details}
                  </p>
                )}
              </div>

              {selectedReport.storyImageUrl && (
                <a
                  href={selectedReport.storyImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block overflow-hidden rounded-md border"
                >
                  <img
                    src={selectedReport.storyImageUrl}
                    alt="Reported story"
                    className="block object-cover"
                    style={{ width: 240, height: 150, maxWidth: "100%" }}
                  />
                </a>
              )}

              {!selectedReport.reportedUserActive && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      <UserCheck className="mr-2 h-4 w-4" />
                      Restore User Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Restore User</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will reactivate {selectedReport.reportedUser}'s
                        account and allow the user to sign in again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          void handleRestoreUser(selectedReport)
                        }
                        disabled={moderatingReportId === selectedReport.id}
                      >
                        Restore
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
