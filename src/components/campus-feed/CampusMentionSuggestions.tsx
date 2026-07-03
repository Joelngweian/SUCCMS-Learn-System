import { Loader2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { getCampusMemberInitials } from "./campusFeedPresentation";
import type {
  ActiveCampusMention,
  CampusMentionSuggestion,
  CampusMentionTarget,
} from "./campusMentions";

type CampusMentionSuggestionsProps = {
  activeMention: ActiveCampusMention | null;
  isLoading: boolean;
  onSelect: (suggestion: CampusMentionSuggestion) => void;
  suggestions: CampusMentionSuggestion[];
  target: CampusMentionTarget;
};

export function CampusMentionSuggestions({
  activeMention,
  isLoading,
  onSelect,
  suggestions,
  target,
}: CampusMentionSuggestionsProps) {
  if (!activeMention || activeMention.target !== target) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
      <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        Mention someone or a taught course
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching mentions...
        </div>
      ) : suggestions.length > 0 ? (
        <div className="max-h-72 overflow-y-auto py-1">
          {suggestions.map(suggestion => (
            <button
              key={`${suggestion.type}-${suggestion.id}`}
              type="button"
              onMouseDown={event => {
                event.preventDefault();
                onSelect(suggestion);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/70"
            >
              {suggestion.type === "user" ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={suggestion.avatarUrl || ""} />
                  <AvatarFallback>
                    {getCampusMemberInitials(suggestion.title)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  @{suggestion.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {suggestion.subtitle}
                </span>
              </span>
              {suggestion.badge && (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {suggestion.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-3 text-sm text-muted-foreground">
          No users or taught courses found for @{activeMention.query || "..."}.
        </div>
      )}
    </div>
  );
}
