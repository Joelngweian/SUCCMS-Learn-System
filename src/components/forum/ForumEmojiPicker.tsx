import { Smile } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { COMMENT_EMOJIS } from "./forumUtils";

interface ForumEmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function ForumEmojiPicker({ onSelect }: ForumEmojiPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20 dark:hover:text-yellow-400"
          title="Add emoji"
          aria-label="Add emoji"
        >
          <Smile className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="grid w-52 grid-cols-6 gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        {COMMENT_EMOJIS.map(emoji => (
          <button
            key={emoji}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
            onClick={() => onSelect(emoji)}
            aria-label={`Add ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
