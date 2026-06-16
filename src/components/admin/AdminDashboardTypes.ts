export interface ReportedItem {
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

export interface AnnouncementAttachment {
  name: string;
  path: string;
  url: string;
  type: string;
  size: number;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  attachments: AnnouncementAttachment[];
  created_at: string;
  expires_at: string | null;
}

export interface CourseCreationRequest {
  id: string;
  requestedBy: string;
  requesterName: string;
  subjectCode: string;
  subjectName: string;
  faculty: string | null;
  programme: string | null;
  credits: number | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  adminNotes: string | null;
  reviewedAt: string | null;
  generatedCourseId: string | null;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeReports: number;
  resolvedToday: number;
  suspendedUsers: number;
  totalStories: number;
  announcements: number;
  pendingCourseRequests: number;
}

export const EMPTY_ADMIN_STATS: AdminStats = {
  totalUsers: 0,
  activeReports: 0,
  resolvedToday: 0,
  suspendedUsers: 0,
  totalStories: 0,
  announcements: 0,
  pendingCourseRequests: 0,
};
