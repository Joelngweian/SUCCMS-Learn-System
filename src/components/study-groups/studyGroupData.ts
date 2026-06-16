import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings";
import { supabase } from "@/lib/supabase";
import type {
  EnrolledCourse,
  StudyGroupMember,
  StudyGroupPost,
  StudyGroupSummary,
  StudySession,
} from "./StudyGroupTypes";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getRelatedRecord = (value: unknown) =>
  asRecord(Array.isArray(value) ? value[0] : value);

const getString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const getNullableString = (value: unknown) =>
  typeof value === "string" ? value : null;

const getNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" ? value : fallback;

export async function loadEnrolledStudyGroupCourses(
  userId: string,
): Promise<EnrolledCourse[]> {
  const { data, error } = await supabase
    .from("course_enrollments")
    .select(`course_id, course_offerings(${COURSE_OFFERING_SELECT})`)
    .eq("student_id", userId);
  if (error) throw error;

  return (data || [])
    .map(row => normalizeCourseOffering(row.course_offerings))
    .filter(course => Boolean(course.id))
    .map(course => ({
      id: course.id,
      code: course.code,
      name: course.name,
    }));
}

export async function loadStudyGroupPage({
  before,
  courseFilter,
  joinedOnly,
  limit,
  search,
}: {
  before: { createdAt: string; id: string } | null;
  courseFilter: string;
  joinedOnly: boolean;
  limit: number;
  search: string;
}) {
  const { data, error } = await supabase.rpc("get_study_groups", {
    p_limit: limit + 1,
    p_before_created_at: before?.createdAt || null,
    p_before_id: before?.id || null,
    p_course_id: courseFilter === "all" ? null : courseFilter,
    p_search: search.trim() || null,
    p_joined_only: joinedOnly,
  });
  if (error) throw error;

  const rows = (data || []) as StudyGroupSummary[];
  return {
    page: rows.slice(0, limit),
    hasMore: rows.length > limit,
  };
}

export async function dispatchStudySessionReminders() {
  const { error } = await supabase.rpc("dispatch_study_session_reminders");
  if (error) throw error;
}

export async function createStudyGroup({
  courseId,
  description,
  maxMembers,
  name,
}: {
  courseId: string;
  description: string;
  maxMembers: number;
  name: string;
}) {
  const { error } = await supabase.rpc("create_study_group", {
    p_course_id: courseId,
    p_name: name,
    p_description: description,
    p_max_members: maxMembers,
  });
  if (error) throw error;
}

export async function joinStudyGroup(groupId: string) {
  const { error } = await supabase.rpc("join_study_group", {
    p_group_id: groupId,
  });
  if (error) throw error;
}

export async function leaveStudyGroup(groupId: string) {
  const { error } = await supabase.rpc("leave_study_group", {
    p_group_id: groupId,
  });
  if (error) throw error;
}

export async function deleteStudyGroup(groupId: string) {
  const { data: attachmentRows, error: attachmentError } = await supabase
    .from("study_group_posts")
    .select("attachment_path")
    .eq("group_id", groupId)
    .not("attachment_path", "is", null);

  if (attachmentError) throw attachmentError;

  const attachmentPaths = (attachmentRows || [])
    .map((row) => row.attachment_path)
    .filter((path): path is string => Boolean(path));

  if (attachmentPaths.length > 0) {
    const { error } = await supabase.storage
      .from("study-group-files")
      .remove(attachmentPaths);
    if (error) throw error;
  }

  const { error } = await supabase
    .from("study_groups")
    .delete()
    .eq("id", groupId);
  if (error) throw error;
}

export async function removeStudyGroupMember({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const { error } = await supabase.rpc("remove_study_group_member", {
    p_group_id: groupId,
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function createStudySession({
  createdBy,
  description,
  endsAt,
  groupId,
  locationText,
  locationType,
  maxAttendees,
  meetingUrl,
  startsAt,
  title,
}: {
  createdBy: string;
  description: string;
  endsAt: string;
  groupId: string;
  locationText: string | null;
  locationType: string;
  maxAttendees: number | null;
  meetingUrl: string | null;
  startsAt: string;
  title: string;
}) {
  const { error } = await supabase.from("study_group_sessions").insert({
    group_id: groupId,
    created_by: createdBy,
    title,
    description,
    starts_at: startsAt,
    ends_at: endsAt,
    location_type: locationType,
    location_text: locationText,
    meeting_url: meetingUrl,
    max_attendees: maxAttendees,
  });

  if (error) throw error;
}

export async function setStudySessionAttendance({
  attending,
  sessionId,
}: {
  attending: boolean;
  sessionId: string;
}) {
  const { error } = await supabase.rpc("set_study_session_attendance", {
    p_session_id: sessionId,
    p_attending: attending,
  });
  if (error) throw error;
}

export async function deleteStudySession(sessionId: string) {
  const { error } = await supabase
    .from("study_group_sessions")
    .delete()
    .eq("id", sessionId);
  if (error) throw error;
}

export async function createStudyGroupPost({
  authorId,
  content,
  file,
  groupId,
  postType,
  resourceUrl,
  title,
}: {
  authorId: string;
  content: string;
  file: File | null;
  groupId: string;
  postType: string;
  resourceUrl: string | null;
  title: string | null;
}) {
  let uploadedPath: string | null = null;

  try {
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      uploadedPath = `${groupId}/${authorId}/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage
        .from("study-group-files")
        .upload(uploadedPath, file);
      if (error) throw error;
    }

    const { error } = await supabase.from("study_group_posts").insert({
      group_id: groupId,
      author_id: authorId,
      post_type: postType,
      title,
      content,
      resource_url: resourceUrl,
      attachment_name: file?.name || null,
      attachment_path: uploadedPath,
      attachment_type: file?.type || null,
      attachment_size: file?.size || null,
    });

    if (error) throw error;
  } catch (error) {
    if (uploadedPath) {
      await supabase.storage
        .from("study-group-files")
        .remove([uploadedPath]);
    }
    throw error;
  }
}

export async function deleteStudyGroupPost(post: StudyGroupPost) {
  const { error } = await supabase
    .from("study_group_posts")
    .delete()
    .eq("id", post.id);
  if (error) throw error;

  if (post.attachment_path) {
    await supabase.storage
      .from("study-group-files")
      .remove([post.attachment_path]);
  }
}

export async function loadStudyGroupDetails(
  groupId: string,
  userId: string,
): Promise<{
  members: StudyGroupMember[];
  sessions: StudySession[];
  posts: StudyGroupPost[];
}> {
  const [memberResult, sessionResult, postResult] = await Promise.all([
    supabase
      .from("study_group_members")
      .select(
        "id, user_id, role, joined_at, user_profiles!study_group_members_user_id_fkey(id, full_name, avatar_url)",
      )
      .eq("group_id", groupId)
      .order("joined_at"),
    supabase
      .from("study_group_sessions")
      .select("*")
      .eq("group_id", groupId)
      .order("starts_at"),
    supabase
      .from("study_group_posts")
      .select(
        "*, user_profiles!study_group_posts_author_id_fkey(id, full_name, avatar_url)",
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (memberResult.error) throw memberResult.error;
  if (sessionResult.error) throw sessionResult.error;
  if (postResult.error) throw postResult.error;

  const sessionRows = sessionResult.data || [];
  const sessionIds = sessionRows.map(session => session.id);
  const attendanceRows =
    sessionIds.length > 0
      ? await supabase
          .from("study_group_session_attendees")
          .select("session_id, user_id, status")
          .in("session_id", sessionIds)
      : { data: [], error: null };
  if (attendanceRows.error) throw attendanceRows.error;

  const members = (memberResult.data || []).flatMap(row => {
    const profile = getRelatedRecord(row.user_profiles);
    if (
      typeof profile.id !== "string" ||
      typeof profile.full_name !== "string"
    ) {
      return [];
    }

    return [{
      id: row.id,
      user_id: row.user_id,
      role: row.role,
      joined_at: row.joined_at,
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: getNullableString(profile.avatar_url),
      },
    }];
  });

  const sessions = sessionRows.map(session => ({
    ...session,
    attendeeCount: (attendanceRows.data || []).filter(
      attendance =>
        attendance.session_id === session.id &&
        attendance.status === "going",
    ).length,
    isGoing: (attendanceRows.data || []).some(
      attendance =>
        attendance.session_id === session.id &&
        attendance.user_id === userId &&
        attendance.status === "going",
    ),
  }));

  const posts = await Promise.all(
    (postResult.data || []).map(async row => {
      const profile = getRelatedRecord(row.user_profiles);
      let downloadUrl: string | undefined;
      if (row.attachment_path) {
        const { data } = await supabase.storage
          .from("study-group-files")
          .createSignedUrl(row.attachment_path, 3600);
        downloadUrl = data?.signedUrl;
      }

      return {
        id: row.id,
        group_id: row.group_id,
        author_id: row.author_id,
        post_type: row.post_type,
        title: row.title,
        content: row.content,
        resource_url: row.resource_url,
        attachment_name: row.attachment_name,
        attachment_path: row.attachment_path,
        attachment_type: row.attachment_type,
        attachment_size: row.attachment_size,
        created_at: row.created_at,
        downloadUrl,
        author: {
          id: getString(profile.id, row.author_id),
          full_name: getString(profile.full_name, "Unknown User"),
          avatar_url: getNullableString(profile.avatar_url),
        },
      } satisfies StudyGroupPost;
    }),
  );

  return {
    members,
    sessions: sessions.map(session => ({
      id: session.id,
      group_id: session.group_id,
      created_by: session.created_by,
      title: session.title,
      description: session.description,
      starts_at: session.starts_at,
      ends_at: session.ends_at,
      location_type: session.location_type,
      location_text: session.location_text,
      meeting_url: session.meeting_url,
      max_attendees: session.max_attendees,
      attendeeCount: getNumber(session.attendeeCount),
      isGoing: session.isGoing,
    })),
    posts,
  };
}
