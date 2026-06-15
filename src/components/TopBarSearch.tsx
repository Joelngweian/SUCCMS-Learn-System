import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase.ts";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import type { Database } from "@/lib/database.types";

type SearchUser = Pick<
  Database["public"]["Tables"]["user_profiles"]["Row"],
  "id" | "full_name" | "email" | "avatar_url" | "role"
>;

export function TopBarSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    const searchUsers = async () => {
      if (!query.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setIsOpen(true);

      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, full_name, email, avatar_url, role")
          .ilike("full_name", `%${query}%`)
          .limit(5);

        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSelectUser = (userId: string) => {
    setIsOpen(false);
    setQuery("");
    navigate(`/profile/${userId}`);
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
          ) : results.length > 0 ? (
            <ul className="max-h-[300px] overflow-auto py-1">
              {results.map((user) => (
                <li
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  className="px-4 py-2 hover:bg-accent cursor-pointer flex items-center gap-3 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || ""} />
                    <AvatarFallback>{user.full_name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden w-full gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{user.full_name}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0 capitalize shrink-0 font-normal">
                        {user.role}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
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
    </div>
  );
}
