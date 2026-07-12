import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Smile } from "lucide-react";
import { useTheme } from "../ThemeProvider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";

interface ForumEmojiPickerProps {
  onSelect: (emoji: string) => void;
}

interface EmojiMartSelection {
  native?: string;
}

export function ForumEmojiPicker({ onSelect }: ForumEmojiPickerProps) {
  const { resolvedTheme } = useTheme();

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
        sideOffset={8}
        className="h-[min(420px,70vh)] w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white p-0 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onWheel={event => event.stopPropagation()}
      >
        <Picker
          data={data}
          theme={resolvedTheme}
          previewPosition="none"
          skinTonePosition="none"
          navPosition="bottom"
          maxFrequentRows={1}
          perLine={8}
          style={{
            display: "block",
            height: "100%",
          }}
          onEmojiSelect={(emoji: EmojiMartSelection) => {
            if (emoji.native) onSelect(emoji.native);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
