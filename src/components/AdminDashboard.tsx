import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";
import { useAuth } from "@/contexts/AuthContext";
import { notify } from "@/lib/notify";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Shield,
  Flag,
  Megaphone,
} from "lucide-react";
import {
  AdminReportDetailsDialog,
  AdminStatsOverview,
} from "./admin/AdminOverview";
import { AdminModerationPanel } from "./admin/AdminModerationPanel";
import { AdminAnnouncementsPanel } from "./admin/AdminAnnouncementsPanel";
import type {
  AdminAnnouncement,
  AnnouncementAttachment,
  ReportedItem,
} from "./admin/AdminDashboardTypes";
import {
  formatDateTimeLocal,
  getEdgeFunctionErrorMessage,
  loadAdminDashboardData,
} from "./admin/adminDashboardData";
import { EMPTY_ADMIN_STATS } from "./admin/AdminDashboardTypes";

export function AdminDashboard() {
  const { user, profile } = useAuth();
  const announcementAttachmentInputRef = useRef<HTMLInputElement>(null);
  const announcementFormRef = useRef<HTMLDivElement>(null);
  const [reports, setReports] = useState<ReportedItem[]>([]);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [stats, setStats] = useState(EMPTY_ADMIN_STATS);
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

  const loadDashboardStats = useCallback(async () => {
    try {
      const data = await loadAdminDashboardData();
      setAnnouncements(data.announcements);
      setReports(data.reports);
      setStats(data.stats);
    } catch (error) {
      console.error("Failed to load admin dashboard statistics:", error);
      notify.error(error, "Admin dashboard data could not be loaded.");
      setStats(EMPTY_ADMIN_STATS);
    }
  }, []);

  useEffect(() => {
    void loadDashboardStats();
  }, [loadDashboardStats]);

  useEffect(() => {
    if (!user?.id || profile?.role !== "admin") return;

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
  }, [user?.id, profile?.role, loadDashboardStats]);

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
      notify.warning("Only administrators can manage announcements.");
      return;
    }
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      notify.warning("Please enter an announcement title and content.");
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
      notify.success(
        wasEditing
          ? "Announcement updated successfully."
          : "Announcement published successfully."
      );
    } catch (error: unknown) {
      if (uploadedPaths.length > 0) {
        await supabase.storage
          .from("announcement-attachments")
          .remove(uploadedPaths);
      }
      console.error("Failed to save announcement:", error);
      notify.error(error, "Failed to save announcement.");
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
      notify.warning("You can attach up to 5 files to an announcement.");
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
      notify.warning(
        "Attachments must be an image, PDF, Word, Excel, PowerPoint, or text file."
      );
      return;
    }
    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      notify.warning("Each attachment must not exceed 10MB.");
      return;
    }

    setAnnouncementFiles((current) => [...current, ...files]);
  };

  const handleDeleteAnnouncement = async (announcement: AdminAnnouncement) => {
    if (!user || profile?.role !== "admin") {
      notify.warning("Only administrators can delete announcements.");
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
      notify.success("Announcement deleted successfully.");
    } catch (error: unknown) {
      console.error("Failed to delete announcement:", error);
      notify.error(error, "Failed to delete announcement.");
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
    } catch (error: unknown) {
      console.error("Failed to resolve report:", error);
      notify.error(error, "Failed to resolve report.");
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
      notify.warning("This story is no longer available.");
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
      notify.success("Story removed and report resolved.");
    } catch (error: unknown) {
      console.error("Failed to remove reported story:", error);
      notify.error(error, "Failed to remove reported story.");
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
        throw new Error(
          await getEdgeFunctionErrorMessage(error, "Failed to suspend user."),
        );
      }

      await resolveReportRecord(
        report.id,
        "Reported user account suspended by administrator."
      );
      await loadDashboardStats();
      setSelectedReport(null);
      notify.success(`${report.reportedUser}'s account has been suspended.`);
    } catch (error: unknown) {
      console.error("Failed to suspend user:", error);
      notify.error(error, "Failed to suspend user.");
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
        throw new Error(
          await getEdgeFunctionErrorMessage(error, "Failed to restore user."),
        );
      }

      await loadDashboardStats();
      setSelectedReport(null);
      notify.success(`${report.reportedUser}'s account has been restored.`);
    } catch (error: unknown) {
      console.error("Failed to restore user:", error);
      notify.error(error, "Failed to restore user.");
    } finally {
      setModeratingReportId(null);
    }
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

      <AdminStatsOverview stats={stats} />

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
          <AdminModerationPanel
            filteredReports={filteredReports}
            paginatedReports={paginatedReports}
            filterStatus={filterStatus}
            filterSeverity={filterSeverity}
            currentPage={currentReportPage}
            totalPages={totalReportPages}
            reportsPerPage={reportsPerPage}
            moderatingReportId={moderatingReportId}
            onFilterStatusChange={(value) => {
              setFilterStatus(value);
              setReportPage(1);
            }}
            onFilterSeverityChange={(value) => {
              setFilterSeverity(value);
              setReportPage(1);
            }}
            onPageChange={setReportPage}
            onViewDetails={setSelectedReport}
            onRemoveStory={(report) => void handleRemoveStory(report)}
            onSuspendUser={(report) => void handleSuspendUser(report)}
            onResolveReport={(report) => void handleResolveReport(report)}
            onRestoreUser={(report) => void handleRestoreUser(report)}
          />
        </TabsContent>

        {/* Announcements Management */}
        <TabsContent value="announcements" className="space-y-4">
          <AdminAnnouncementsPanel
            announcements={announcements}
            title={announcementTitle}
            content={announcementContent}
            priority={announcementPriority}
            expiry={announcementExpiry}
            files={announcementFiles}
            existingAttachments={existingAnnouncementAttachments}
            editingId={editingAnnouncementId}
            isPublishing={isPublishingAnnouncement}
            formRef={announcementFormRef}
            attachmentInputRef={announcementAttachmentInputRef}
            onTitleChange={setAnnouncementTitle}
            onContentChange={setAnnouncementContent}
            onPriorityChange={setAnnouncementPriority}
            onExpiryChange={setAnnouncementExpiry}
            onRemoveExistingAttachment={(path) =>
              setExistingAnnouncementAttachments((current) =>
                current.filter((item) => item.path !== path)
              )
            }
            onRemoveFile={(index) =>
              setAnnouncementFiles((current) =>
                current.filter((_, fileIndex) => fileIndex !== index)
              )
            }
            onReset={resetAnnouncementForm}
            onPublish={() => void handlePublishAnnouncement()}
            onEdit={handleEditAnnouncement}
            onDelete={(announcement) =>
              void handleDeleteAnnouncement(announcement)
            }
          />
        </TabsContent>
      </Tabs>

      <AdminReportDetailsDialog
        report={selectedReport}
        moderatingReportId={moderatingReportId}
        onClose={() => setSelectedReport(null)}
        onRestoreUser={report => void handleRestoreUser(report)}
      />
    </div>
  );
}
