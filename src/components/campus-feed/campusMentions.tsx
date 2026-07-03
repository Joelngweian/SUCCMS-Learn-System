import { supabase } from "@/lib/supabase";

const CAMPUS_MENTION_PATTERN = /@([A-Za-z0-9_-]{2,64})/g;

export type CampusMentionTarget = "composer" | "editPost";

export type ActiveCampusMention = {
  target: CampusMentionTarget;
  query: string;
  start: number;
  end: number;
};

export type CampusMentionSuggestion = {
  id: string;
  type: "course" | "user";
  token: string;
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  badge?: string | null;
};

export type CampusMentionUserRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
};

type DirectCourseMentionRow = {
  id: string;
  owner_id: string | null;
  courses:
    | {
        course_code: string | null;
        code: string | null;
        name: string | null;
        chinese_name: string | null;
      }
    | Array<{
        course_code: string | null;
        code: string | null;
        name: string | null;
        chinese_name: string | null;
      }>
    | null;
  course_instructors?: Array<{ user_id: string | null }> | null;
};

export const renderCampusMentionText = (content: string) => {
  const parts = [];
  let lastIndex = 0;

  content.replace(CAMPUS_MENTION_PATTERN, (match, token, offset) => {
    if (offset > lastIndex) {
      parts.push(content.slice(lastIndex, offset));
    }
    parts.push(
      <span
        key={`${token}-${offset}`}
        className="font-semibold text-primary"
      >
        {match}
      </span>,
    );
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
};

export const getActiveCampusMention = (
  target: CampusMentionTarget,
  value: string,
  cursorPosition: number | null,
): ActiveCampusMention | null => {
  if (cursorPosition === null) return null;

  const beforeCursor = value.slice(0, cursorPosition);
  const match = /(^|\s)@([A-Za-z0-9_-]{0,64})$/.exec(beforeCursor);
  if (!match) return null;

  return {
    target,
    query: match[2],
    start: match.index + match[1].length,
    end: cursorPosition,
  };
};

const getUserMentionToken = (userRow: CampusMentionUserRow) => {
  const username = userRow.username?.trim();
  if (username) return username.replace(/^@+/, "");

  const nameToken = userRow.full_name?.replace(/\s+/g, "");
  return nameToken || userRow.id.slice(0, 8);
};

export const toUserMentionSuggestion = (
  userRow: CampusMentionUserRow,
): CampusMentionSuggestion => ({
  id: userRow.id,
  type: "user",
  token: getUserMentionToken(userRow),
  title: userRow.full_name || userRow.username || "Campus member",
  subtitle: userRow.username ? `@${userRow.username}` : userRow.role || "User",
  avatarUrl: userRow.avatar_url,
  badge: userRow.role,
});

const firstRelation = <T,>(value: T | T[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value;

const toCourseMentionSuggestion = (course: {
  id: string;
  course_code: string;
  name: string | null;
  chinese_name: string | null;
}): CampusMentionSuggestion => ({
  id: course.id,
  type: "course",
  token: course.course_code,
  title: course.course_code,
  subtitle: course.chinese_name
    ? `${course.name || "Course"} 路 ${course.chinese_name}`
    : course.name || "Course",
  badge: "Course",
});

export const searchCampusMentionCourses = async (
  query: string,
): Promise<CampusMentionSuggestion[]> => {
  const { data, error } = await supabase.rpc("search_campus_mention_courses", {
    p_search: query || null,
    p_limit: 5,
  });

  if (!error) {
    return (data || []).map(course =>
      toCourseMentionSuggestion({
        id: course.id,
        course_code: course.course_code,
        name: course.name,
        chinese_name: course.chinese_name,
      }),
    );
  }

  console.warn("Campus mention course RPC unavailable; using fallback query:", error);
  const fallbackResult = await supabase
    .from("course_offerings")
    .select(
      "id, owner_id, courses!inner(course_code, code, name, chinese_name), course_instructors(user_id)",
    )
    .eq("status", "active")
    .limit(120);

  if (fallbackResult.error) throw fallbackResult.error;

  const normalizedQuery = query.trim().toLowerCase();
  const seenCourseCodes = new Set<string>();

  return ((fallbackResult.data || []) as unknown as DirectCourseMentionRow[])
    .flatMap(row => {
      const course = firstRelation(row.courses);
      const courseCode =
        course?.course_code?.trim() || course?.code?.trim() || "";
      const hasTeacher =
        Boolean(row.owner_id) || Boolean(row.course_instructors?.length);
      if (!course || !courseCode || !hasTeacher) return [];

      const normalizedCourseCode = courseCode.toUpperCase();
      if (seenCourseCodes.has(normalizedCourseCode)) return [];

      const searchText = [
        courseCode,
        course.name || "",
        course.chinese_name || "",
      ]
        .join(" ")
        .toLowerCase();
      if (normalizedQuery && !searchText.includes(normalizedQuery)) return [];

      seenCourseCodes.add(normalizedCourseCode);
      return [
        toCourseMentionSuggestion({
          id: row.id,
          course_code: courseCode,
          name: course.name,
          chinese_name: course.chinese_name,
        }),
      ];
    })
    .slice(0, 5);
};
