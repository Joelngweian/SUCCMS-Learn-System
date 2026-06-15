import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { NotificationPanel } from "./notifications/NotificationPanel";
import type {
  AnnouncementNotification,
  AssignmentNotification,
  UserNotification,
} from "./notifications/notificationTypes";
import { useNotificationsData } from "./notifications/useNotificationsData";

export function NotificationButton() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const notificationRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const {
    announcements,
    assignments,
    isLoading,
    loadNotifications,
    markAllRead,
    markAnnouncementRead,
    markNotificationRead,
    notifications,
    unreadCount,
  } = useNotificationsData({
    role: profile?.role,
    userId: user?.id,
  });

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
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const openNotification = async (notification: UserNotification) => {
    await markNotificationRead(notification.id);
    setIsOpen(false);
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  const openAnnouncement = async (
    announcement: AnnouncementNotification,
  ) => {
    await markAnnouncementRead(announcement.id);
  };

  const openAssignment = (_assignment: AssignmentNotification) => {
    setIsOpen(false);
    navigate("/assignments");
  };

  const toggleNotifications = () => {
    setIsOpen(current => {
      const next = !current;
      if (next) void loadNotifications();
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
        <Bell className="relative z-[1] h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-px top-px z-[2] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <NotificationPanel
          announcements={announcements}
          assignments={assignments}
          isLoading={isLoading}
          notifications={notifications}
          unreadCount={unreadCount}
          onAnnouncementOpen={openAnnouncement}
          onAssignmentOpen={openAssignment}
          onMarkAllRead={() => void markAllRead()}
          onNotificationOpen={openNotification}
        />
      )}
    </div>
  );
}
