import { Users, Video } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { StudyGroupSummary } from "./StudyGroupTypes";

interface StudyGroupCardProps {
  group: StudyGroupSummary;
  onOpen: (group: StudyGroupSummary) => void;
  onOpenRoom: (group: StudyGroupSummary) => void;
  formatDateTime: (value: string) => string;
}

export function StudyGroupCard({
  group,
  onOpen,
  onOpenRoom,
  formatDateTime,
}: StudyGroupCardProps) {
  const courseCode = group.course_code || "General";
  const courseName = group.course_name || "Open to everyone";

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onOpen(group)}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="outline">{courseCode}</Badge>
          <Badge variant={group.is_member ? "default" : "secondary"}>
            {group.is_owner ? "Owner" : group.is_member ? "Joined" : "Open"}
          </Badge>
        </div>
        <div>
          <CardTitle className="text-lg">{group.name}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {courseName}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {group.description || "No description provided."}
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {group.member_count}/{group.max_members}
          </span>
          <span className="text-xs text-muted-foreground">
            Created by {group.creator_name}
          </span>
        </div>
        {group.is_member && group.next_session_start && (
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p className="font-medium">{group.next_session_title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(group.next_session_start)}
            </p>
          </div>
        )}
        {group.is_member && group.has_online_session && (
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
            onClick={(event) => {
              event.stopPropagation();
              onOpenRoom(group);
            }}
          >
            <Video className="h-4 w-4" />
            Open Meeting Room
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
