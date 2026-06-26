import {
  useState,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { supabase } from "@/lib/supabase.ts";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import type { Database } from "@/lib/database.types";
import { Stories } from "./Stories";
import { StoryAvatarRing } from "./stories/StoryAvatarRing";
import { useActiveStoryStatus } from "./stories/useActiveStoryStatus";
import type { StoryTargetUser } from "./stories/storyRepository";

type SearchUser = Pick<
  Database["public"]["Tables"]["user_profiles"]["Row"],
  "id" | "full_name" | "avatar_url" | "role"
>;

export function TopBarSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [storyUser, setStoryUser] = useState<StoryTargetUser | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const latestRequestRef = useRef(0);
  const navigate = useNavigate();
  const { profile, user: currentUser } = useAuth();
  const activeStoryUserIds = useActiveStoryStatus(
    results.map(result => result.id),
  );

  useEffect(() => {
    // Click outside to close dropdown
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();
    const requestId = ++latestRequestRef.current;
    const abortController = new AbortController();

    const searchUsers = async () => {
      if (normalizedQuery.length < 3) {
        setResults([]);
        setIsLoading(false);
        setIsOpen(normalizedQuery.length > 0);
        return;
      }

      setIsLoading(true);
      setIsOpen(true);

      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, full_name, avatar_url, role")
          .or("is_active.eq.true,is_active.is.null")
          .ilike("full_name", `%${normalizedQuery}%`)
          .order("full_name", { ascending: true })
          .abortSignal(abortController.signal)
          .limit(5);

        if (error) throw error;
        if (requestId === latestRequestRef.current) {
          setResults(data || []);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("Error searching users:", err);
        }
      } finally {
        if (requestId === latestRequestRef.current) {
          setIsLoading(false);
        }
      }
    };

    const debounceTimer = setTimeout(searchUsers, 350);
    return () => {
      clearTimeout(debounceTimer);
      abortController.abort();
    };
  }, [query]);

  const handleSelectUser = (userId: string) => {
    setIsOpen(false);
    setQuery("");
    navigate(`/profile/${userId}`);
  };

  const handleStoryClick = (
    event: ReactMouseEvent,
    result: SearchUser,
  ) => {
    event.stopPropagation();
    if (!activeStoryUserIds.has(result.id)) return;
    setIsOpen(false);
    setStoryUser({
      id: result.id,
      name: result.full_name || "User",
      avatarUrl: result.avatar_url,
      initials: result.full_name?.charAt(0)?.toUpperCase() || "U",
      role: result.role,
    });
  };

  return (
    <div ref={wrapperRef} className="relative hidden sm:block">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search users..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        className="pl-10 pr-4 py-2 bg-muted rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-ring text-sm w-64"
      />

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-popover rounded-md shadow-md border overflow-hidden z-50">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Searching...</span>
            </div>
          ) : query.trim().length < 3 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Type at least 3 characters.
            </div>
          ) : results.length > 0 ? (
            <ul className="max-h-[300px] overflow-auto py-1">
              {results.map((user) => (
                <li
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  className="px-4 py-2 hover:bg-accent cursor-pointer flex items-center gap-3 transition-colors"
                >
                  <button
                    type="button"
                    onClick={event => handleStoryClick(event, user)}
                    className={
                      activeStoryUserIds.has(user.id)
                        ? "rounded-full"
                        : "cursor-default rounded-full"
                    }
                    aria-label={
                      activeStoryUserIds.has(user.id)
                        ? `View ${user.full_name}'s story`
                        : `${user.full_name} has no active story`
                    }
                  >
                    <StoryAvatarRing
                      active={activeStoryUserIds.has(user.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback>
                          {user.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </StoryAvatarRing>
                  </button>
                  <div className="flex flex-col overflow-hidden w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{user.full_name}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0 capitalize shrink-0 font-normal">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No users found.
            </div>
          )}
        </div>
      )}

      <Stories
        currentUserName={profile?.full_name || "Your Story"}
        currentUserInitials={(profile?.full_name || currentUser?.email || "YS")
          .split(" ")
          .map(part => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
        currentUserAvatar={profile?.avatar_url}
        currentUserRole={profile?.role}
        mode="viewer"
        targetUser={storyUser}
        open={Boolean(storyUser)}
        onOpenChange={nextOpen => {
          if (!nextOpen) setStoryUser(null);
        }}
      />
    </div>
  );
}
