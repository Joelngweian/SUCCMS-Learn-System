import type { StudyGroupMember, StudySession } from "./StudyGroupTypes";

export type StudyGroupMentionSuggestion = {
  id: string;
  label: string;
  name: string;
  avatar_url: string | null;
  description: string;
};

export const getActiveMentionQuery = (value: string) => {
  const match = value.match(/(^|\s)@([^\s@]*)$/);
  return match ? match[2].toLowerCase() : null;
};

export const getStudyGroupMentionSuggestions = (
  content: string,
  members: StudyGroupMember[],
) => {
  const mentionQuery = getActiveMentionQuery(content);
  if (mentionQuery === null) return [];

  const options: StudyGroupMentionSuggestion[] = [
    {
      id: "everyone",
      label: "everyone",
      name: "Everyone",
      avatar_url: null,
      description: `${members.length} members`,
    },
    ...members.map((member) => ({
      id: member.user_id,
      label: member.profile.full_name,
      name: member.profile.full_name,
      avatar_url: member.profile.avatar_url,
      description: member.role,
    })),
  ];

  return options
    .filter((option) => option.label.toLowerCase().includes(mentionQuery))
    .slice(0, 6);
};

export const shouldShowOpenMeetingRoom = (
  sessions: StudySession[],
  now = Date.now(),
) =>
  sessions.some(
    (session) =>
      session.location_type === "online" &&
      new Date(session.ends_at).getTime() >= now,
  );
