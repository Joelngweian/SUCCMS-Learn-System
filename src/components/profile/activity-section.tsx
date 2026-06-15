import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Heart, MessageSquare, UserPlus, FileText } from "lucide-react"

interface Activity {
  id: string
  type: string
  content: string
  time: string
}

interface ActivitySectionProps {
  activities: Activity[]
}

export function ActivitySection({ activities }: ActivitySectionProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "post":
        return <FileText className="h-5 w-5" />
      case "like":
        return <Heart className="h-5 w-5" />
      case "comment":
        return <MessageSquare className="h-5 w-5" />
      case "follow":
        return <UserPlus className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm">{activity.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
