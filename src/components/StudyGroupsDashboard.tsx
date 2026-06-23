import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  CalendarDays,
  ChevronRight,
  Loader2,
  MapPin,
  Users,
  Video,
} from "lucide-react";

interface UpcomingStudySession {
  id: string;
  group_id: string;
  group_name: string;
  course_code: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location_type: string;
  location_text: string | null;
  meeting_url: string | null;
  attendee_count: number;
  is_going: boolean;
}

const formatSessionTime = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function StudyGroupsDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<UpcomingStudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc(
          "get_my_upcoming_study_sessions",
          { p_limit: 3 }
        );

        if (error) throw error;
        setSessions((data || []) as UpcomingStudySession[]);
      } catch (error) {
        console.warn("Upcoming study sessions could not be loaded:", error);
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSessions();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Study Groups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex min-h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length > 0 ? (
          sessions.map((session) => (
            <button
              type="button"
              key={session.id}
              onClick={() => navigate("/study-groups")}
              className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {session.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {session.course_code} · {session.group_name}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatSessionTime(session.starts_at)}
                </p>
                <p className="flex items-center gap-2">
                  {session.location_type === "online" ? (
                    <Video className="h-3.5 w-3.5" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                  {session.location_type === "online"
                    ? "Online"
                    : session.location_text}
                  <span aria-hidden="true">·</span>
                  {session.attendee_count} attending
                </p>
              </div>
            </button>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No upcoming study sessions.
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate("/study-groups")}
        >
          View Study Groups
        </Button>
      </CardContent>
    </Card>
  );
}
