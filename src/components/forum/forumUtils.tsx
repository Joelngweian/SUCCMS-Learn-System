import { Badge } from "@/components/ui/badge";
import { Coffee } from "lucide-react";
import type { ForumCourse } from "./forumTypes";

export const COMMENT_EMOJIS = [
  "\u{1F600}",
  "\u{1F602}",
  "\u{1F60A}",
  "\u{1F60D}",
  "\u{1F914}",
  "\u{1F44D}",
  "\u{1F44F}",
  "\u{1F64C}",
  "\u2764\uFE0F",
  "\u{1F389}",
  "\u{1F525}",
  "\u2705",
];

export const getMentionToken = (name: string) =>
  `@${name.trim().replace(/\s+/g, "")}`;

export const getActiveMentionQuery = (value: string) => {
  const match = value.match(/(^|\s)@([^\s@]*)$/);
  return match ? match[2].toLowerCase() : null;
};

export const renderMentionedText = (content: string) => {
  const parts = content.split(/(@everyone|@[\w\u00C0-\uFFFF-]+)/g);

  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith("@")) {
      return (
        <span
          key={`${part}-${index}`}
          className="rounded bg-blue-50 px-1 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        >
          {part}
        </span>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
};

export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const getThreadCategory = (title: string, content: string) => {
  const hashtagRegex = /#(\w+)/;
  const contentMatch = content.match(hashtagRegex);
  const titleMatch = title.match(hashtagRegex);
  return contentMatch ? contentMatch[1] : (titleMatch ? titleMatch[1] : "General");
};

export const formatForumDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

export const renderCourseBadge = (
  courseId: string | null,
  courses: ForumCourse[],
) => {
  if (!courseId) {
    return (
      <Badge
        className="border-none"
        style={{
          backgroundColor: "rgba(147, 51, 234, 0.2)",
          color: "#d8b4fe",
        }}
      >
        <Coffee className="h-3 w-3 mr-1" /> Campus Life
      </Badge>
    );
  }

  const course = courses.find(item => item.id === courseId);
  return (
    <Badge
      variant="outline"
      className="bg-white border-gray-300 text-gray-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-300"
    >
      {course?.name || "Unknown Course"}
    </Badge>
  );
};
