import { lazy, Suspense } from "react";
import { Smile } from "lucide-react";
import { Button } from "../ui/button";

const ForumEmojiPicker = lazy(() =>
  import("../forum/ForumEmojiPicker").then(module => ({
    default: module.ForumEmojiPicker,
  })),
);

export function LazyForumEmojiPicker({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  return (
    <Suspense
      fallback={(
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled
          aria-label="Loading emoji picker"
        >
          <Smile className="h-4 w-4" />
        </Button>
      )}
    >
      <ForumEmojiPicker onSelect={onSelect} />
    </Suspense>
  );
}
