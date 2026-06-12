import { useState, useEffect } from "react";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Clock, 
  Heart,
  MessageCircle,
  Share2,
  Zap,
  Eye,
  UserPlus,
  Trophy,
  Target,
  Plus
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

interface PeerBenchmarkingProps {
  currentGrade: string;
  courseProgress: number;
}

export function PeerBenchmarking({ currentGrade, courseProgress }: PeerBenchmarkingProps) {
  const benchmarkData = {
    gradePercentile: 78,
    progressPercentile: 82,
    studyTimePercentile: 65,
    participationPercentile: 90
  };

  const getPercentileMessage = (percentile: number) => {
    if (percentile >= 90) return { message: "Excellent! Top 10%", color: "text-green-600", icon: Trophy };
    if (percentile >= 75) return { message: "Great! Above average", color: "text-blue-600", icon: TrendingUp };
    if (percentile >= 50) return { message: "Good! Keep improving", color: "text-yellow-600", icon: Target };
    return { message: "Room for improvement", color: "text-red-600", icon: Target };
  };

  const benchmarks = [
    {
      label: "Grade Performance",
      value: benchmarkData.gradePercentile,
      description: `Your ${currentGrade} is better than ${benchmarkData.gradePercentile}% of peers`
    },
    {
      label: "Course Progress", 
      value: benchmarkData.progressPercentile,
      description: `You're ahead of ${benchmarkData.progressPercentile}% of classmates`
    },
    {
      label: "Study Consistency",
      value: benchmarkData.studyTimePercentile,
      description: `More consistent than ${benchmarkData.studyTimePercentile}% of students`
    },
    {
      label: "Class Participation",
      value: benchmarkData.participationPercentile,
      description: `More active than ${benchmarkData.participationPercentile}% of peers`
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Peer Benchmarking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {benchmarks.map((benchmark, index) => {
          const result = getPercentileMessage(benchmark.value);
          const Icon = result.icon;
          
          return (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${result.color}`} />
                  <span className="text-sm font-medium">{benchmark.label}</span>
                </div>
                <span className={`text-sm ${result.color}`}>
                  {benchmark.value}%
                </span>
              </div>
              
              <Progress value={benchmark.value} className="h-2" />
              
              <p className="text-xs text-muted-foreground">
                {benchmark.description}
              </p>
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Overall Ranking</span>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">Top 25%</div>
            <div className="text-sm text-blue-700">Among all CS students</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SocialActivityFeed() {
  const activities = [
    {
      user: "Sarah Kim",
      action: "completed",
      target: "Database Design Assignment", 
      course: "CS301",
      time: "5m ago",
      likes: 3,
      comments: 1,
      type: "achievement"
    },
    {
      user: "Mike Chen", 
      action: "shared",
      target: "SQL Tutorial Notes",
      course: "CS301",
      time: "12m ago",
      likes: 7,
      comments: 2,
      type: "share"
    },
    {
      user: "Emma Wilson",
      action: "asked a question in",
      target: "Algorithm Discussion",
      course: "CS205", 
      time: "1h ago",
      likes: 2,
      comments: 5,
      type: "question"
    },
    {
      user: "Alex Johnson",
      action: "earned badge",
      target: "Week 3 Streak",
      course: "",
      time: "2h ago",
      likes: 8,
      comments: 0,
      type: "badge"
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'achievement': return Trophy;
      case 'share': return Share2;
      case 'question': return MessageCircle;
      case 'badge': return Zap;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'achievement': return 'text-green-600';
      case 'share': return 'text-blue-600';
      case 'question': return 'text-purple-600';
      case 'badge': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = getActivityIcon(activity.type);
          const iconColor = getActivityColor(activity.type);
          
          return (
            <div key={index} className="space-y-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {activity.user.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span>{' '}
                      <span className="text-muted-foreground">{activity.action}</span>{' '}
                      <span className="font-medium">{activity.target}</span>
                      {activity.course && (
                        <span className="text-muted-foreground"> in {activity.course}</span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{activity.time}</span>
                    <button className="flex items-center gap-1 hover:text-red-500">
                      <Heart className="h-3 w-3" />
                      {activity.likes}
                    </button>
                    {activity.comments > 0 && (
                      <button className="flex items-center gap-1 hover:text-blue-500">
                        <MessageCircle className="h-3 w-3" />
                        {activity.comments}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <Button variant="outline" className="w-full" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          View All Activity
        </Button>
      </CardContent>
    </Card>
  );
}

export function StudyGroups() {
  const studyGroups = [
    {
      name: "Database Study Group",
      course: "CS301",
      members: 8,
      online: 3,
      nextSession: "Tonight 8 PM",
      topic: "SQL Optimization"
    },
    {
      name: "Algorithm Practice",
      course: "CS205", 
      members: 12,
      online: 5,
      nextSession: "Tomorrow 7 PM",
      topic: "Dynamic Programming"
    },
    {
      name: "Software Engineering Team",
      course: "CS410",
      members: 6,
      online: 2,
      nextSession: "Friday 6 PM", 
      topic: "Design Patterns"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Study Groups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {studyGroups.map((group, index) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-sm">{group.name}</h4>
                <p className="text-xs text-muted-foreground">{group.course}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {group.online}/{group.members} online
              </Badge>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs">
                <Clock className="h-3 w-3 inline mr-1" />
                {group.nextSession}
              </p>
              <p className="text-xs text-muted-foreground">Topic: {group.topic}</p>
            </div>
            
            <Button size="sm" variant="outline" className="w-full text-xs">
              <UserPlus className="h-3 w-3 mr-1" />
              Join Session
            </Button>
          </div>
        ))}

        <Button variant="outline" className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Study Group
        </Button>
      </CardContent>
    </Card>
  );
}
