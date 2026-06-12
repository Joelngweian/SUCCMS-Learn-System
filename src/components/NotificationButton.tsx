import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Bell,
  BookOpen,
  Check,
  ClipboardList,
  FileUp,
  Flag,
  GraduationCap,
  Heart,
  Loader2,
  MessageSquare,
  Megaphone,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";

interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  createdAt: string;
  isRead: boolean;
}

interface AnnouncementNotification {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  isRead: boolean;
}

interface AssignmentNotification {
  id: string;
  title: string;
  courseName: string;
  dueDate: string;
}

const formatNotificationTime = (value: string) => {
  const date = new Date(value);
  const difference = date.getTime() - Date.now();
  const absoluteMinutes = Math.max(
    1,
    Math.round(Math.abs(difference) / 60000)
  );

  if (difference > 0) {
    if (absoluteMinutes < 60) return `Due in ${absoluteMinutes}m`;
    const hours = Math.ceil(absoluteMinutes / 60);
    if (hours < 24) return `Due in ${hours}h`;
    return `Due ${date.toLocaleDateString()}`;
  }

  if (absoluteMinutes < 60) return `${absoluteMinutes}m ago`;
  const hours = Math.floor(absoluteMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

export function NotificationButton() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const notificationRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementNotification[]>([]);
  const [assignments, setAssignments] = useState<AssignmentNotification[]>([]);

  const loadNotifications = useCallback(async (showLoader = true) => {
    if (!user) return;

    if (showLoader) setIsLoading(true);

    try {
      const [notificationResult, announcementResult, readResult, settingsResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, type, title, message, action_url, is_read, created_at")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("announcements")
          .select("id, title, content, priority, created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("user_id", user.id),
        supabase
          .from("user_settings")
          .select("course_announcements, assignment_reminders")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (notificationResult.error) {
        const tableMissing =
          notificationResult.error.code === "PGRST205" ||
          notificationResult.error.message?.includes("schema cache");

        if (!tableMissing) {
          console.error("Failed to load activity notifications:", notificationResult.error);
        }
        setNotifications([]);
      } else {
        setNotifications(
          (notificationResult.data || []).map((notification: any) => ({
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            actionUrl: notification.action_url,
            createdAt: notification.created_at,
            isRead: notification.is_read,
          }))
        );
      }

      if (announcementResult.error) throw announcementResult.error;
      if (readResult.error) throw readResult.error;

      const readAnnouncementIds = new Set(
        (readResult.data || []).map((row: any) => row.announcement_id)
      );
      const showAnnouncements =
        profile?.role === "student" &&
        settingsResult.data?.course_announcements !== false;

      setAnnouncements(
        showAnnouncements
          ? (announcementResult.data || []).map((announcement: any) => ({
              id: announcement.id,
              title: announcement.title,
              content: announcement.content,
              priority: announcement.priority,
              createdAt: announcement.created_at,
              isRead: readAnnouncementIds.has(announcement.id),
            }))
          : []
      );

      if (
        profile?.role !== "student" ||
        settingsResult.data?.assignment_reminders === false
      ) {
        setAssignments([]);
        return;
      }

      const enrollmentResult = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("student_id", user.id);

      if (enrollmentResult.error) throw enrollmentResult.error;

      const courseIds = (enrollmentResult.data || [])
        .map((row: any) => row.course_id)
        .filter(Boolean);

      if (courseIds.length === 0) {
        setAssignments([]);
        return;
      }

      const now = new Date();
      const reminderLimit = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const [assignmentResult, courseResult] = await Promise.all([
        supabase
          .from("assignments")
          .select("id, course_id, title, due_date")
          .in("course_id", courseIds)
          .gt("due_date", now.toISOString())
          .lte("due_date", reminderLimit.toISOString())
          .order("due_date", { ascending: true }),
        supabase
          .from("course_offerings")
          .select(COURSE_OFFERING_SELECT)
          .in("id", courseIds),
      ]);

      if (assignmentResult.error) throw assignmentResult.error;
      if (courseResult.error) throw courseResult.error;

      const assignmentIds = (assignmentResult.data || []).map(
        (assignment: any) => assignment.id
      );
      let submittedAssignmentIds = new Set<string>();

      if (assignmentIds.length > 0) {
        const submissionResult = await supabase
          .from("assignment_submissions")
          .select("assignment_id")
          .eq("student_id", user.id)
          .in("assignment_id", assignmentIds);

        if (submissionResult.error) throw submissionResult.error;
        submittedAssignmentIds = new Set(
          (submissionResult.data || []).map((row: any) => row.assignment_id)
        );
      }

      const courseNames = new Map(
        (courseResult.data || [])
          .map(normalizeCourseOffering)
          .map((course: any) => [course.id, course.name])
      );

      setAssignments(
        (assignmentResult.data || [])
          .filter(
            (assignment: any) => !submittedAssignmentIds.has(assignment.id)
          )
          .map((assignment: any) => ({
            id: assignment.id,
            title: assignment.title,
            courseName: courseNames.get(assignment.course_id) || "Course",
            dueDate: assignment.due_date,
          }))
      );
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [user?.id, profile?.role]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => loadNotifications(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadNotifications]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = useMemo(
    () =>
      notifications.filter((notification) => !notification.isRead).length +
      announcements.filter((announcement) => !announcement.isRead).length +
      assignments.length,
    [notifications, announcements, assignments]
  );

  const markNotificationRead = async (notificationId: string) => {
    if (!user) return;

    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification || notification.isRead) return;

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("recipient_id", user.id);

    if (error) {
      console.error("Failed to mark notification as read:", error);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item
      )
    );
  };

  const markAnnouncementRead = async (announcementId: string) => {
    if (!user) return;

    const announcement = announcements.find(
      (item) => item.id === announcementId
    );
    if (!announcement || announcement.isRead) return;

    const { error } = await supabase.from("announcement_reads").insert({
      announcement_id: announcementId,
      user_id: user.id,
    });

    if (error) {
      console.error("Failed to mark announcement as read:", error);
      return;
    }

    setAnnouncements((current) =>
      current.map((item) =>
        item.id === announcementId ? { ...item, isRead: true } : item
      )
    );
  };

  const markAllRead = async () => {
    if (!user) return;

    const unreadNotifications = notifications.filter(
      (notification) => !notification.isRead
    );
    const unreadAnnouncements = announcements.filter(
      (announcement) => !announcement.isRead
    );

    const results = await Promise.all([
      unreadNotifications.length > 0
        ? supabase
            .from("notifications")
            .update({
              is_read: true,
              read_at: new Date().toISOString(),
            })
            .eq("recipient_id", user.id)
            .eq("is_read", false)
        : Promise.resolve({ error: null }),
      unreadAnnouncements.length > 0
        ? supabase.from("announcement_reads").insert(
            unreadAnnouncements.map((announcement) => ({
              announcement_id: announcement.id,
              user_id: user.id,
            }))
          )
        : Promise.resolve({ error: null }),
    ]);

    const error = results.find((result) => result.error)?.error;
    if (error) {
      console.error("Failed to mark notifications as read:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true }))
    );
    setAnnouncements((current) =>
      current.map((announcement) => ({ ...announcement, isRead: true }))
    );
  };

  const openNotification = async (notification: UserNotification) => {
    await markNotificationRead(notification.id);
    setIsOpen(false);
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  const getNotificationAppearance = (type: string) => {
    if (type.includes("achievement")) {
      return {
        icon: Trophy,
        className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
      };
    }
    if (type.includes("forum")) {
      return {
        icon: type.includes("reaction") ? Heart : MessageSquare,
        className: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
      };
    }
    if (type.includes("grade")) {
      return {
        icon: GraduationCap,
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      };
    }
    if (type.includes("assignment")) {
      return {
        icon: ClipboardList,
        className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
      };
    }
    if (type.includes("material")) {
      return {
        icon: FileUp,
        className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
      };
    }
    if (type.includes("follow")) {
      return {
        icon: UserPlus,
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      };
    }
    if (type.includes("report")) {
      return {
        icon: Flag,
        className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      };
    }
    if (type.includes("enrolled")) {
      return {
        icon: UserPlus,
        className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      };
    }
    if (type.includes("instructor")) {
      return {
        icon: Users,
        className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
      };
    }
    return {
      icon: Megaphone,
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    };
  };

  const toggleNotifications = () => {
    setIsOpen((current) => {
      const next = !current;
      if (next) loadNotifications();
      return next;
    });
  };

  return (
    <div ref={notificationRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        aria-expanded={isOpen}
        title="Notifications"
        onClick={toggleNotifications}
      >
        <Bell className="h-4 w-4" style={{ position: "relative", zIndex: 1 }} />
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
            style={{
              top: 1,
              right: 1,
              zIndex: 2,
              minWidth: 16,
              height: 16,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-[100] mt-2 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg"
          style={{
            width: "min(380px, calc(100vw - 24px))",
            backgroundColor: "var(--popover)",
            color: "var(--popover-foreground)",
          }}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} item${unreadCount === 1 ? "" : "s"} need attention`
                  : "You are all caught up"}
              </p>
            </div>

            {(notifications.some((notification) => !notification.isRead) ||
              announcements.some((announcement) => !announcement.isRead)) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllRead}
                className="h-8 px-2 text-xs"
              >
                <Check className="h-3.5 w-3.5" />
                Mark read
              </Button>
            )}
          </div>

          <div style={{ height: 360, overflowY: "auto" }}>
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 &&
              announcements.length === 0 &&
              assignments.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center px-6 text-center">
                <Bell className="mb-2 h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Replies, grades, course updates and reminders will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => {
                  const appearance = getNotificationAppearance(notification.type);
                  const NotificationIcon = appearance.icon;

                  return (
                    <button
                      key={`activity-${notification.id}`}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${
                        notification.isRead ? "" : "bg-primary/5"
                      }`}
                    >
                      <span className={`mt-0.5 self-start shrink-0 rounded-md p-2 ${appearance.className}`}>
                        <NotificationIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1 flex flex-col gap-1">
                        <div className="flex items-start gap-2">
                          <span className="line-clamp-1 flex-1 text-sm font-medium">
                            {notification.title}
                          </span>
                          {!notification.isRead && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                          )}
                        </div>
                        {notification.message && (
                          <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {notification.message}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {assignments.map((assignment) => (
                  <button
                    key={`assignment-${assignment.id}`}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/assignments");
                    }}
                    className="flex w-full gap-3 bg-orange-50/60 px-4 py-3 text-left transition-colors hover:bg-orange-50 dark:bg-orange-950/10 dark:hover:bg-orange-950/20"
                  >
                    <span className="mt-0.5 self-start shrink-0 rounded-md bg-orange-100 p-2 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <span className="text-sm font-medium">
                        {assignment.title}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {assignment.courseName}
                      </span>
                      <span className="text-xs font-medium text-orange-700 dark:text-orange-300 mt-0.5">
                        {formatNotificationTime(assignment.dueDate)}
                      </span>
                    </div>
                  </button>
                ))}

                {announcements.map((announcement) => (
                  <button
                    key={`announcement-${announcement.id}`}
                    type="button"
                    onClick={() => markAnnouncementRead(announcement.id)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${
                      announcement.isRead ? "" : "bg-primary/5"
                    }`}
                  >
                    <span className="mt-0.5 self-start shrink-0 rounded-md bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <div className="flex items-start gap-2">
                        <span className="line-clamp-1 flex-1 text-sm font-medium">
                          {announcement.title}
                        </span>
                        {!announcement.isRead && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {announcement.content}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-[10px] capitalize font-normal"
                        >
                          {announcement.priority}
                        </Badge>
                        <span>{formatNotificationTime(announcement.createdAt)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
