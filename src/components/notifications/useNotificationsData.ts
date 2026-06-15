import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCourseOfferings,
  getStudentCourseIds,
} from "@/data/courseRepository";
import {
  getNotificationBaseData,
  invalidateNotificationCache,
} from "@/data/notificationRepository";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import type {
  AnnouncementNotification,
  AssignmentNotification,
  UserNotification,
} from "./notificationTypes";

const asPriority = (
  value: string,
): AnnouncementNotification["priority"] =>
  value === "high" || value === "medium" ? value : "low";

export function useNotificationsData({
  role,
  userId,
}: {
  role?: string | null;
  userId?: string | null;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [announcements, setAnnouncements] = useState<
    AnnouncementNotification[]
  >([]);
  const [assignments, setAssignments] = useState<AssignmentNotification[]>([]);

  const loadNotifications = useCallback(
    async (showLoader = true) => {
      if (!userId) return;
      if (showLoader) setIsLoading(true);

      try {
        const {
          notificationResult,
          announcementResult,
          readResult,
          settingsResult,
        } = await getNotificationBaseData(userId);

        if (notificationResult.error) {
          const tableMissing =
            notificationResult.error.code === "PGRST205" ||
            notificationResult.error.message.includes("schema cache");
          if (!tableMissing) throw notificationResult.error;
          setNotifications([]);
        } else {
          setNotifications(
            (notificationResult.data || []).map(notification => ({
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              actionUrl: notification.action_url,
              createdAt: notification.created_at,
              isRead: notification.is_read,
            })),
          );
        }

        if (announcementResult.error) throw announcementResult.error;
        if (readResult.error) throw readResult.error;
        if (settingsResult.error) throw settingsResult.error;

        const readAnnouncementIds = new Set(
          (readResult.data || []).map(row => row.announcement_id),
        );
        const showAnnouncements =
          role === "student" &&
          settingsResult.data?.course_announcements !== false;

        setAnnouncements(
          showAnnouncements
            ? (announcementResult.data || []).map(announcement => ({
                id: announcement.id,
                title: announcement.title,
                content: announcement.content,
                priority: asPriority(announcement.priority),
                createdAt: announcement.created_at,
                isRead: readAnnouncementIds.has(announcement.id),
              }))
            : [],
        );

        if (
          role !== "student" ||
          settingsResult.data?.assignment_reminders === false
        ) {
          setAssignments([]);
          return;
        }

        const courseIds = await getStudentCourseIds(userId);
        if (courseIds.length === 0) {
          setAssignments([]);
          return;
        }

        const now = new Date();
        const reminderLimit = new Date(
          now.getTime() + 48 * 60 * 60 * 1000,
        );
        const [assignmentResult, courseRows] = await Promise.all([
          supabase
            .from("assignments")
            .select("id, course_id, title, due_date")
            .in("course_id", courseIds)
            .gt("due_date", now.toISOString())
            .lte("due_date", reminderLimit.toISOString())
            .order("due_date", { ascending: true }),
          getCourseOfferings(courseIds),
        ]);
        if (assignmentResult.error) throw assignmentResult.error;

        const assignmentIds = (assignmentResult.data || []).map(
          assignment => assignment.id,
        );
        let submittedAssignmentIds = new Set<string>();
        if (assignmentIds.length > 0) {
          const submissionResult = await supabase
            .from("assignment_submissions")
            .select("assignment_id")
            .eq("student_id", userId)
            .in("assignment_id", assignmentIds);
          if (submissionResult.error) throw submissionResult.error;
          submittedAssignmentIds = new Set(
            (submissionResult.data || []).map(row => row.assignment_id),
          );
        }

        const courseNames = new Map(
          courseRows.map(course => [course.id, course.name] as const),
        );
        setAssignments(
          (assignmentResult.data || [])
            .filter(
              assignment => !submittedAssignmentIds.has(assignment.id),
            )
            .map(assignment => ({
              id: assignment.id,
              title: assignment.title,
              courseName:
                courseNames.get(assignment.course_id) || "Course",
              dueDate: assignment.due_date,
            })),
        );
      } catch (error) {
        console.error("Failed to load notifications:", error);
        if (showLoader) {
          notify.error(error, "Notifications could not be loaded.");
        }
      } finally {
        if (showLoader) setIsLoading(false);
      }
    },
    [role, userId],
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`user-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          invalidateNotificationCache(userId);
          void loadNotifications(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadNotifications, userId]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(notification => !notification.isRead).length +
      announcements.filter(announcement => !announcement.isRead).length +
      assignments.length,
    [announcements, assignments, notifications],
  );

  const markNotificationRead = async (notificationId: string) => {
    if (!userId) return;
    const notification = notifications.find(
      item => item.id === notificationId,
    );
    if (!notification || notification.isRead) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("recipient_id", userId);
    if (error) {
      notify.error(error, "Notification could not be marked as read.");
      return;
    }
    invalidateNotificationCache(userId);
    setNotifications(current =>
      current.map(item =>
        item.id === notificationId ? { ...item, isRead: true } : item,
      ),
    );
  };

  const markAnnouncementRead = async (announcementId: string) => {
    if (!userId) return;
    const announcement = announcements.find(
      item => item.id === announcementId,
    );
    if (!announcement || announcement.isRead) return;

    const { error } = await supabase.from("announcement_reads").insert({
      announcement_id: announcementId,
      user_id: userId,
    });
    if (error && error.code !== "23505") {
      notify.error(error, "Announcement could not be marked as read.");
      return;
    }
    invalidateNotificationCache(userId);
    setAnnouncements(current =>
      current.map(item =>
        item.id === announcementId ? { ...item, isRead: true } : item,
      ),
    );
  };

  const markAllRead = async () => {
    if (!userId) return;
    const unreadAnnouncements = announcements.filter(
      announcement => !announcement.isRead,
    );
    const [notificationResult, announcementResult] = await Promise.all([
      notifications.some(notification => !notification.isRead)
        ? supabase
            .from("notifications")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("recipient_id", userId)
            .eq("is_read", false)
        : Promise.resolve({ error: null }),
      unreadAnnouncements.length > 0
        ? supabase.from("announcement_reads").upsert(
            unreadAnnouncements.map(announcement => ({
              announcement_id: announcement.id,
              user_id: userId,
            })),
            { onConflict: "announcement_id,user_id" },
          )
        : Promise.resolve({ error: null }),
    ]);

    const error = notificationResult.error || announcementResult.error;
    if (error) {
      notify.error(error, "Notifications could not be marked as read.");
      return;
    }

    invalidateNotificationCache(userId);
    setNotifications(current =>
      current.map(notification => ({ ...notification, isRead: true })),
    );
    setAnnouncements(current =>
      current.map(announcement => ({ ...announcement, isRead: true })),
    );
    notify.success("Notifications marked as read.");
  };

  return {
    announcements,
    assignments,
    isLoading,
    loadNotifications,
    markAllRead,
    markAnnouncementRead,
    markNotificationRead,
    notifications,
    unreadCount,
  };
}
