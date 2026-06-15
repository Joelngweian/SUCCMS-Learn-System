export interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  createdAt: string;
  isRead: boolean;
}

export interface AnnouncementNotification {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  isRead: boolean;
}

export interface AssignmentNotification {
  id: string;
  title: string;
  courseName: string;
  dueDate: string;
}

export const formatNotificationTime = (value: string) => {
  const date = new Date(value);
  const difference = date.getTime() - Date.now();
  const absoluteMinutes = Math.max(
    1,
    Math.round(Math.abs(difference) / 60000),
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
