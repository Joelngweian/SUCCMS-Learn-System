import { AtSign } from "lucide-react";
import { getActiveMentionQuery } from "./forumUtils";

export type ForumMentionOption = {
  detail: string;
  id: string;
  label: string;
  token: string;
};

type ForumMentionSuggestionsProps = {
  options: ForumMentionOption[];
  onSelect: (token: string) => void;
  value: string;
};

export function ForumMentionSuggestions({
  options,
  onSelect,
  value,
}: ForumMentionSuggestionsProps) {
  const query = getActiveMentionQuery(value);
  if (query === null) return null;

  const filteredOptions = options
    .filter(option =>
      !query
      || option.label.toLowerCase().includes(query)
      || option.token.toLowerCase().includes(query),
    )
    .slice(0, 8);

  if (filteredOptions.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
      {filteredOptions.map(option => (
        <button
          key={option.id}
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
          onClick={() => onSelect(option.token)}
        >
          <AtSign className="h-4 w-4 text-blue-500" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {option.label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {option.detail}
          </span>
        </button>
      ))}
    </div>
  );
}
