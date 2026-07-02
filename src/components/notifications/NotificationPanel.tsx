import type { ComponentType } from "react";
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
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  formatNotificationTime,
  type AnnouncementNotification,
  type AssignmentNotification,
  type UserNotification,
} from "./notificationTypes";

const getNotificationAppearance = (
  type: string,
): { icon: ComponentType<{ className?: string }>; className: string } => {
  if (type.includes("achievement")) {
    return {
      icon: Trophy,
      className:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    };
  }
  if (type.includes("forum")) {
    return {
      icon: type.includes("reaction") ? Heart : MessageSquare,
      className:
        "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    };
  }
  if (type.includes("grade")) {
    return {
      icon: GraduationCap,
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    };
  }
  if (type.includes("assignment")) {
    return {
      icon: ClipboardList,
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    };
  }
  if (type.includes("material")) {
    return {
      icon: FileUp,
      className:
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    };
  }
  if (type.includes("follow") || type.includes("enrolled")) {
    return {
      icon: UserPlus,
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    };
  }
  if (type.includes("report")) {
    return {
      icon: Flag,
      className:
        "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    };
  }
  if (type.includes("instructor")) {
    return {
      icon: Users,
      className:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    };
  }
  return {
    icon: Megaphone,
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  };
};

interface NotificationPanelProps {
  announcements: AnnouncementNotification[];
  assignments: AssignmentNotification[];
  isLoading: boolean;
  notifications: UserNotification[];
  onAnnouncementOpen: (announcement: AnnouncementNotification) => void;
  onAssignmentOpen: (assignment: AssignmentNotification) => void;
  onMarkAllRead: () => void;
  onNotificationOpen: (notification: UserNotification) => void;
  unreadCount: number;
}

export function NotificationPanel({
  announcements,
  assignments,
  isLoading,
  notifications,
  onAnnouncementOpen,
  onAssignmentOpen,
  onMarkAllRead,
  onNotificationOpen,
  unreadCount,
}: NotificationPanelProps) {
  const hasUnreadPersistentItems =
    notifications.some(notification => !notification.isRead) ||
    announcements.some(announcement => !announcement.isRead);

  return (
    <div
      className="fixed left-3 right-3 top-16 z-[100] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(380px,calc(100vw-24px))]"
      style={{
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
        {hasUnreadPersistentItems && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            className="h-8 px-2 text-xs"
          >
            <Check className="h-3.5 w-3.5" />
            Mark read
          </Button>
        )}
      </div>

      <div className="max-h-[calc(100vh-11rem)] overflow-y-auto sm:h-[360px] sm:max-h-none">
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
            {notifications.map(notification => {
              const appearance = getNotificationAppearance(notification.type);
              const NotificationIcon = appearance.icon;
              return (
                <button
                  key={`activity-${notification.id}`}
                  type="button"
                  onClick={() => onNotificationOpen(notification)}
                  className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${
                    notification.isRead ? "" : "bg-primary/5"
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 self-start rounded-md p-2 ${appearance.className}`}
                  >
                    <NotificationIcon className="h-4 w-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
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
                    <span className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatNotificationTime(notification.createdAt)}
                    </span>
                  </div>
                </button>
              );
            })}

            {assignments.map(assignment => (
              <button
                key={`assignment-${assignment.id}`}
                type="button"
                onClick={() => onAssignmentOpen(assignment)}
                className="flex w-full gap-3 bg-orange-50/60 px-4 py-3 text-left transition-colors hover:bg-orange-50 dark:bg-orange-950/10 dark:hover:bg-orange-950/20"
              >
                <span className="mt-0.5 shrink-0 self-start rounded-md bg-orange-100 p-2 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium">{assignment.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {assignment.courseName}
                  </span>
                  <span className="mt-0.5 text-xs font-medium text-orange-700 dark:text-orange-300">
                    {formatNotificationTime(assignment.dueDate)}
                  </span>
                </div>
              </button>
            ))}

            {announcements.map(announcement => (
              <button
                key={`announcement-${announcement.id}`}
                type="button"
                onClick={() => onAnnouncementOpen(announcement)}
                className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${
                  announcement.isRead ? "" : "bg-primary/5"
                }`}
              >
                <span className="mt-0.5 shrink-0 self-start rounded-md bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
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
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 text-[10px] font-normal capitalize"
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
  );
}
