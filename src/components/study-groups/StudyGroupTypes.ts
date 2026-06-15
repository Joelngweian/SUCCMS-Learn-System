export interface EnrolledCourse {
  id: string;
  code: string;
  name: string;
}

export interface StudyGroupSummary {
  id: string;
  course_id: string;
  name: string;
  description: string;
  max_members: number;
  status: string;
  created_at: string;
  creator_id: string;
  creator_name: string;
  creator_avatar_url: string | null;
  course_code: string;
  course_name: string;
  member_count: number;
  is_member: boolean;
  is_owner: boolean;
  next_session_start: string | null;
  next_session_title: string | null;
}

export interface StudyGroupMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface StudySession {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  location_type: string;
  location_text: string | null;
  meeting_url: string | null;
  max_attendees: number | null;
  attendeeCount: number;
  isGoing: boolean;
}

export interface StudyGroupPost {
  id: string;
  group_id: string;
  author_id: string;
  post_type: string;
  title: string | null;
  content: string;
  resource_url: string | null;
  attachment_name: string | null;
  attachment_path: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  created_at: string;
  downloadUrl?: string;
  author: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface NewStudyGroup {
  courseId: string;
  name: string;
  description: string;
  maxMembers: number;
}

export interface NewStudySession {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  locationType: string;
  locationText: string;
  meetingUrl: string;
  maxAttendees: string;
}
