import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { 
  Users, 
  Activity, 
  TrendingUp, 
  MessageCircle,
  Share2,
  Trophy,
  Target,
  Loader2,
  ChevronDown
} from "lucide-react";

interface OnlineActivityProps {
  userRole: 'student' | 'lecturer';
}

export function OnlineActivity({ userRole }: OnlineActivityProps) {
  const { onlineCount, onlineUsers } = useOnlinePresence();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'lecturer': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500" />
          <span>Campus Activity</span>
          <Badge className="bg-green-100 text-green-800 ml-auto">
            {onlineCount} online
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Active now</span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        </div>

        <div className="space-y-3">
          {onlineUsers.length > 0 ? onlineUsers.slice(0, 4).map((onlineUser) => (
            <div key={onlineUser.id} className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={onlineUser.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {onlineUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{onlineUser.name}</p>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getRoleColor(onlineUser.role)}`}>
                    {onlineUser.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">now</span>
                </div>
              </div>
            </div>
          )) : (
            <p className="py-2 text-center text-sm text-muted-foreground">
              No users are sharing their online status.
            </p>
          )}
        </div>

        <Button variant="outline" className="w-full" size="sm">
          <Users className="h-4 w-4 mr-2" />
          View All ({onlineCount})
        </Button>
      </CardContent>
    </Card>
  );
}
export interface AssignmentBenchmark {
  courseId: string;
  courseCode: string;
  courseName: string;
  studentAverage: number;
  classAverage: number;
  percentile: number | null;
  comparedStudents: number;
  gradedAssignments: number;
}

interface PeerBenchmarkingProps {
  benchmarks: AssignmentBenchmark[];
}

export function PeerBenchmarking({ benchmarks }: PeerBenchmarkingProps) {
  const getPercentileMessage = (percentile: number) => {
    if (percentile >= 90) {
      return {
        message: "Top 10% of graded classmates",
        color: "text-green-600",
        icon: Trophy,
      };
    }
    if (percentile >= 75) {
      return {
        message: "Above most graded classmates",
        color: "text-blue-600",
        icon: TrendingUp,
      };
    }
    if (percentile >= 50) {
      return {
        message: "At or above the class midpoint",
        color: "text-yellow-600",
        icon: Target,
      };
    }
    return {
      message: "Below the current class midpoint",
      color: "text-red-600",
      icon: Target,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Assignment Performance Benchmarking
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare your average graded Assignment score within each course.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {benchmarks.length > 0 ? (
          benchmarks.map((benchmark) => {
            const result =
              benchmark.percentile == null
                ? null
                : getPercentileMessage(benchmark.percentile);
            const Icon = result?.icon || Users;

            return (
              <div
                key={benchmark.courseId}
                className="space-y-4 rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{benchmark.courseCode}</Badge>
                      <span className="text-sm font-medium">
                        {benchmark.courseName}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Based on {benchmark.gradedAssignments} graded Assignment
                      {benchmark.gradedAssignments === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold">
                      {benchmark.studentAverage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your average
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">
                      Class Average
                    </p>
                    <p className="mt-1 font-semibold">
                      {benchmark.classAverage.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">
                      Graded Students
                    </p>
                    <p className="mt-1 font-semibold">
                      {benchmark.comparedStudents}
                    </p>
                  </div>
                </div>

                {benchmark.percentile == null ? (
                  <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 shrink-0" />
                    At least two graded students are required for a percentile.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className={`flex items-center gap-2 ${result?.color}`}>
                        <Icon className="h-4 w-4" />
                        {result?.message}
                      </span>
                      <span className={`font-semibold ${result?.color}`}>
                        {benchmark.percentile}th percentile
                      </span>
                    </div>
                    <Progress value={benchmark.percentile} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Your average performed better than approximately{" "}
                      {benchmark.percentile}% of graded classmates in this
                      course offering.
                    </p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border bg-muted/20 py-10 text-center">
            <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium">No graded Assignments yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Benchmarking appears after your lecturer saves an Assignment
              grade.
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Only aggregated class statistics are shown. Individual classmates'
          grades remain private.
        </p>
      </CardContent>
    </Card>
  );
}

const SOCIAL_ACTIVITY_PAGE_SIZE = 10;

interface SocialActivity {
  id: string;
  event_type:
    | "assignment_submission"
    | "course_material"
    | "discussion"
    | "achievement";
  source_id: string;
  title: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_id: string;
  actor_name: string;
  actor_avatar_url: string | null;
  actor_role: string;
  course_id: string | null;
  course_code: string | null;
  course_name: string | null;
}

const formatActivityTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  const differenceSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000)
  );

  if (differenceSeconds < 60) return "Just now";
  if (differenceSeconds < 3600) {
    return `${Math.floor(differenceSeconds / 60)}m ago`;
  }
  if (differenceSeconds < 86400) {
    return `${Math.floor(differenceSeconds / 3600)}h ago`;
  }
  if (differenceSeconds < 604800) {
    return `${Math.floor(differenceSeconds / 86400)}d ago`;
  }
  return new Date(value).toLocaleDateString();
};

export function SocialActivityFeed() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [cursor, setCursor] = useState<{
    createdAt: string;
    id: string;
  } | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadActivityPage = async (
    before: { createdAt: string; id: string } | null,
    replace: boolean
  ) => {
    if (replace) {
      setIsLoading(true);
      setLoadError("");
    } else {
      setIsLoadingMore(true);
    }

    try {
      const { data, error } = await supabase.rpc("get_social_activity_feed", {
        p_limit: SOCIAL_ACTIVITY_PAGE_SIZE + 1,
        p_before_created_at: before?.createdAt || null,
        p_before_id: before?.id || null,
      });

      if (error) throw error;

      const rows = (data || []) as SocialActivity[];
      const page = rows.slice(0, SOCIAL_ACTIVITY_PAGE_SIZE);
      const lastRow = page[page.length - 1];

      setActivities((current) =>
        replace
          ? page
          : [
              ...current,
              ...page.filter(
                (activity) =>
                  !current.some((existing) => existing.id === activity.id)
              ),
            ]
      );
      setHasMore(rows.length > SOCIAL_ACTIVITY_PAGE_SIZE);
      setCursor(
        lastRow
          ? { createdAt: lastRow.created_at, id: lastRow.id }
          : before
      );
    } catch (error: unknown) {
      console.error("Failed to load social activity:", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Recent activity could not be loaded.",
      );
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadActivityPage(null, true);
  }, []);

  const getActivityPresentation = (type: SocialActivity["event_type"]) => {
    switch (type) {
      case "assignment_submission":
        return {
          action: "submitted",
          icon: Target,
          color: "text-green-600",
          background: "bg-green-50 dark:bg-green-950/30",
        };
      case "course_material":
        return {
          action: "shared",
          icon: Share2,
          color: "text-blue-600",
          background: "bg-blue-50 dark:bg-blue-950/30",
        };
      case "discussion":
        return {
          action: "started a discussion",
          icon: MessageCircle,
          color: "text-purple-600",
          background: "bg-purple-50 dark:bg-purple-950/30",
        };
      case "achievement":
        return {
          action: "earned",
          icon: Trophy,
          color: "text-amber-600",
          background: "bg-amber-50 dark:bg-amber-950/30",
        };
      default:
        return {
          action: "updated",
          icon: Activity,
          color: "text-muted-foreground",
          background: "bg-muted",
        };
    }
  };

  const openActivity = (activity: SocialActivity) => {
    if (activity.event_type === "discussion") {
      navigate("/forum");
      return;
    }

    if (activity.event_type === "achievement") {
      navigate("/progress");
      return;
    }

    if (activity.course_id) {
      const assignmentId =
        typeof activity.metadata?.assignment_id === "string"
          ? activity.metadata.assignment_id
          : null;
      const assignmentQuery = assignmentId
        ? `&assignmentId=${encodeURIComponent(assignmentId)}`
        : "";
      navigate(
        `/courses?courseId=${encodeURIComponent(
          activity.course_id
        )}${assignmentQuery}`
      );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Latest activity from your courses and classmates.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            Recent activity is temporarily unavailable.
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-md border border-dashed py-10 text-center">
            <Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium">No recent activity yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Course submissions, shared files, discussions and achievements
              will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {activities.map((activity) => {
              const presentation = getActivityPresentation(activity.event_type);
              const Icon = presentation.icon;

              return (
                <button
                  type="button"
                  key={activity.id}
                  onClick={() => openActivity(activity)}
                  className="flex w-full items-start gap-3 px-1 py-4 text-left transition-colors hover:bg-muted/40"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={activity.actor_avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {activity.actor_name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                      <span className="font-semibold">
                        {activity.actor_name}
                      </span>
                      <span className="text-muted-foreground">
                        {presentation.action}
                      </span>
                      <span className="font-medium">{activity.title}</span>
                      {activity.course_code && (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          {activity.course_code}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={`rounded-md p-1 ${presentation.background}`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${presentation.color}`} />
                      </span>
                      <span>{formatActivityTime(activity.created_at)}</span>
                      {activity.course_name && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{activity.course_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {hasMore && !loadError && (
          <Button
            variant="outline"
            className="mt-4 w-full"
            size="sm"
            disabled={isLoadingMore}
            onClick={() => void loadActivityPage(cursor, false)}
          >
            {isLoadingMore ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="mr-2 h-4 w-4" />
            )}
            Load More
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
