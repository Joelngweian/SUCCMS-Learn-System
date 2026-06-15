import { SmilePlus, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISPLAY_REACTION_TYPES = [
  { id: "mad", icon: "\u{1F621}", label: "Mad" },
  { id: "question", icon: "\u{1F914}", label: "Confused" },
  { id: "sad", icon: "\u{1F622}", label: "Sad" },
  { id: "laugh", icon: "\u{1F602}", label: "Haha" },
  { id: "love", icon: "\u2764\uFE0F", label: "Love" },
  { id: "hugs", icon: "\u{1F917}", label: "Hugs" },
];

const getDisplayReactionIcon = (type: string) => {
  if (type === "like") return "\u{1F44D}";
  return (
    DISPLAY_REACTION_TYPES.find((reaction) => reaction.id === type)?.icon ||
    "\u{1F44D}"
  );
};

interface ForumReactionBarProps {
  targetId: string;
  reactions: Array<{ type: string }>;
  myReaction?: string;
  targetType: "thread" | "reply";
  openPicker: string | null;
  onOpenPickerChange: (key: string | null) => void;
  onReact: (targetId: string, type: string, isThread: boolean) => void;
}

export function ForumReactionBar({
  targetId,
  reactions,
  myReaction,
  targetType,
  openPicker,
  onOpenPickerChange,
  onReact,
}: ForumReactionBarProps) {
  const counts: Record<string, number> = {};
  reactions.forEach((reaction) => {
    counts[reaction.type] = (counts[reaction.type] || 0) + 1;
  });

  const topTypes = Object.entries(counts)
    .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
    .slice(0, 3)
    .map(([type]) => type);
  const isThread = targetType === "thread";
  const isLiked = myReaction === "like";
  const pickerKey = `${targetType}-${targetId}`;

  return (
    <div
      className="relative flex items-center gap-3"
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="sm"
        className={`gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
          isLiked
            ? "font-bold text-blue-600 dark:text-blue-400"
            : "text-gray-500 dark:text-gray-400"
        }`}
        onClick={(event) => {
          event.stopPropagation();
          onOpenPickerChange(null);
          onReact(targetId, "like", isThread);
        }}
      >
        <ThumbsUp className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
        Like
      </Button>

      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`px-2 ${
            openPicker === pickerKey ||
            (myReaction && myReaction !== "like")
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-gray-400 dark:text-gray-500"
          } hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20 dark:hover:text-yellow-400`}
          onClick={(event) => {
            event.stopPropagation();
            onOpenPickerChange(
              openPicker === pickerKey ? null : pickerKey
            );
          }}
          title="React with an emoji"
        >
          <SmilePlus className="h-5 w-5" />
        </Button>

        {openPicker === pickerKey && (
          <div
            className="absolute left-0 z-[100] grid grid-cols-6 gap-1.5 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
            style={{
              bottom: "calc(100% + 10px)",
              top: "auto",
              width: "280px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {DISPLAY_REACTION_TYPES.map((reaction) => (
              <button
                type="button"
                key={reaction.id}
                className={`flex h-10 w-10 shrink-0 items-center justify-center justify-self-center rounded-full text-2xl transition-transform hover:scale-110 ${
                  myReaction === reaction.id
                    ? "bg-blue-100 ring-2 ring-blue-400 dark:bg-blue-900/30"
                    : "hover:bg-gray-100 dark:hover:bg-zinc-700"
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenPickerChange(null);
                  onReact(targetId, reaction.id, isThread);
                }}
                title={reaction.label}
              >
                {reaction.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {topTypes.length > 0 && (
        <div
          className="ml-2 flex cursor-default items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
          title={`${reactions.length} reactions`}
        >
          <div className="flex -space-x-1">
            {topTypes.map((type) => (
              <span
                key={type}
                className="relative z-10 rounded-full bg-white text-sm drop-shadow-sm dark:bg-zinc-800"
              >
                {getDisplayReactionIcon(type)}
              </span>
            ))}
          </div>
          <span className="font-medium hover:underline">
            {reactions.length}
          </span>
        </div>
      )}
    </div>
  );
}
