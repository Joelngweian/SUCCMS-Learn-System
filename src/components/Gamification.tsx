import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Trophy,
  Target,
  Zap,
  Star,
  Flame,
  TrendingUp,
  Calendar,
  Users,
  BookOpen,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface LeaderboardEntry {
  studentId: string;
  name: string;
  avatarUrl?: string;
  rank: number | null;
  averageScore: number;
  completedAssignments: number;
  attendancePercentage: number;
  isUser: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  rarity: "common" | "rare" | "epic" | "legendary";
  earnedDate?: string;
  xpReward: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  xpReward: number;
  status: string;
  type: "streak" | "performance" | "social";
}

interface Milestone {
  id: string;
  title: string;
  date: string;
  type: "course" | "submission" | "grade" | "discussion";
}

const calculateStreak = (dates: string[]) => {
  const uniqueDays = Array.from(
    new Set(
      dates.map((value) => {
        const date = new Date(value);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      })
    )
  ).sort((a, b) => b - a);

  if (uniqueDays.length === 0) return 0;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const oneDay = 86400000;

  if (todayStart - uniqueDays[0] > oneDay) return 0;

  let streak = 1;
  for (let index = 1; index < uniqueDays.length; index += 1) {
    if (uniqueDays[index - 1] - uniqueDays[index] === oneDay) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
};

const formatPercentage = (value: number | null) =>
  value == null ? "--" : `${value.toFixed(0)}%`;

export function Gamification() {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [achievementDates, setAchievementDates] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState({
    enrolledCourses: 0,
    totalAssignments: 0,
    submittedAssignments: 0,
    gradedAssignments: 0,
    perfectScores: 0,
    averageScore: null as number | null,
    attendanceRate: null as number | null,
    discussionCount: 0,
    replyCount: 0,
    attendedClasses: 0,
    streak: 0,
    rank: null as number | null,
  });

  useEffect(() => {
    if (user) loadProgressData();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-achievements:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_achievements",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const achievement = payload.new as {
            achievement_code?: string;
            earned_at?: string;
          };

          if (achievement.achievement_code && achievement.earned_at) {
            setAchievementDates((current) => ({
              ...current,
              [achievement.achievement_code as string]: achievement.earned_at as string,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadProgressData = async () => {
    if (!user) return;

    setIsLoading(true);
    setLoadError("");

    try {
      const [
        enrollmentResult,
        gradeResult,
        attendanceResult,
        threadResult,
        replyResult,
        loginResult,
        leaderboardResult,
      ] = await Promise.all([
        supabase
          .from("course_enrollments")
          .select(`course_id, enrolled_at, course_offerings(${COURSE_OFFERING_SELECT})`)
          .eq("student_id", user.id),
        supabase
          .from("student_grades")
          .select("id, course_id, assignment_id, score, max_score, graded_at")
          .eq("student_id", user.id)
          .order("graded_at", { ascending: false }),
        supabase
          .from("attendance")
          .select("id, course_id, class_date, marked_present")
          .eq("student_id", user.id)
          .order("class_date", { ascending: false }),
        supabase
          .from("forum_threads")
          .select("id, title, created_at")
          .eq("author_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("forum_replies")
          .select("id, created_at")
          .eq("author_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("login_history")
          .select("id, login_time")
          .eq("user_id", user.id)
          .order("login_time", { ascending: false })
          .limit(100),
        supabase
          .from("leaderboard")
          .select(
            "student_id, average_score, rank, total_assignments_completed, attendance_percentage"
          )
          .is("course_id", null)
          .order("rank", { ascending: true })
          .limit(50),
      ]);

      if (enrollmentResult.error) throw enrollmentResult.error;
      if (gradeResult.error) throw gradeResult.error;
      if (attendanceResult.error) throw attendanceResult.error;

      const enrollmentRows = enrollmentResult.data || [];
      const gradeRows = gradeResult.data || [];
      const attendanceRows = attendanceResult.data || [];
      const threadRows = threadResult.data || [];
      const replyRows = replyResult.data || [];
      const loginRows = loginResult.data || [];
      const leaderboardRows = leaderboardResult.data || [];
      const courseIds = enrollmentRows
        .map((row: any) => row.course_id)
        .filter(Boolean);

      let assignmentRows: any[] = [];
      let submissionRows: any[] = [];

      if (courseIds.length > 0) {
        const assignmentResult = await supabase
          .from("assignments")
          .select("id, course_id, title, max_score")
          .in("course_id", courseIds);

        if (assignmentResult.error) throw assignmentResult.error;
        assignmentRows = assignmentResult.data || [];

        const assignmentIds = assignmentRows.map((assignment: any) => assignment.id);
        if (assignmentIds.length > 0) {
          const submissionResult = await supabase
            .from("assignment_submissions")
            .select("id, assignment_id, submitted_at, grade")
            .eq("student_id", user.id)
            .in("assignment_id", assignmentIds)
            .order("submitted_at", { ascending: false });

          if (submissionResult.error) throw submissionResult.error;
          submissionRows = submissionResult.data || [];
        }
      }

      const assignmentById = new Map(
        assignmentRows.map((assignment: any) => [assignment.id, assignment])
      );
      const courseById = new Map(
        enrollmentRows
          .map((row: any) => normalizeCourseOffering(row.course_offerings))
          .filter((course: any) => course.id)
          .map((course: any) => [course.id, course])
      );
      const recordedGradeAssignments = new Set(
        gradeRows
          .map((grade: any) => grade.assignment_id)
          .filter(Boolean)
      );
      const effectiveGradeRows = [
        ...gradeRows,
        ...submissionRows
          .filter(
            (submission: any) =>
              submission.grade != null &&
              !recordedGradeAssignments.has(submission.assignment_id)
          )
          .map((submission: any) => {
            const assignment: any = assignmentById.get(submission.assignment_id);
            return {
              id: `submission-${submission.id}`,
              course_id: assignment?.course_id,
              assignment_id: submission.assignment_id,
              score: submission.grade,
              max_score: assignment?.max_score || 100,
              graded_at: submission.submitted_at,
            };
          }),
      ];

      const overallAverage =
        effectiveGradeRows.length > 0
          ? effectiveGradeRows.reduce((sum: number, grade: any) => {
              const maxScore = Number(grade.max_score) || 100;
              return sum + (Number(grade.score) / maxScore) * 100;
            }, 0) / effectiveGradeRows.length
          : null;
      const perfectScores = effectiveGradeRows.filter((grade: any) => {
        const maxScore = Number(grade.max_score) || 100;
        return (Number(grade.score) / maxScore) * 100 >= 100;
      }).length;
      const overallAttendance =
        attendanceRows.length > 0
          ? (attendanceRows.filter((record: any) => record.marked_present).length /
              attendanceRows.length) *
            100
          : null;
      const activityDates = [
        ...loginRows.map((row: any) => row.login_time),
        ...submissionRows.map((row: any) => row.submitted_at),
        ...threadRows.map((row: any) => row.created_at),
        ...replyRows.map((row: any) => row.created_at),
      ];

      const leaderboardStudentIds = leaderboardRows
        .map((row: any) => row.student_id)
        .filter(Boolean);
      let leaderboardProfiles: any[] = [];

      if (leaderboardStudentIds.length > 0) {
        const profileResult = await supabase
          .from("user_profiles")
          .select("id, full_name, avatar_url")
          .in("id", leaderboardStudentIds);

        if (profileResult.error) throw profileResult.error;
        leaderboardProfiles = profileResult.data || [];
      }

      const profilesById = new Map(
        leaderboardProfiles.map((row: any) => [row.id, row])
      );
      const leaderboardEntries = leaderboardRows.map((row: any) => {
        const student: any = profilesById.get(row.student_id);
        return {
          studentId: row.student_id,
          name:
            row.student_id === user.id
              ? "You"
              : student?.full_name || "Student",
          avatarUrl:
            row.student_id === user.id
              ? profile?.avatar_url || student?.avatar_url
              : student?.avatar_url,
          rank: row.rank == null ? null : Number(row.rank),
          averageScore: Number(row.average_score) || 0,
          completedAssignments: Number(row.total_assignments_completed) || 0,
          attendancePercentage: Number(row.attendance_percentage) || 0,
          isUser: row.student_id === user.id,
        };
      });

      const milestoneRows: Milestone[] = [
        ...enrollmentRows.map((row: any) => ({
          id: `course-${row.course_id}`,
          title: `Enrolled in ${normalizeCourseOffering(row.course_offerings).name || "a course"}`,
          date: row.enrolled_at,
          type: "course" as const,
        })),
        ...submissionRows.map((row: any) => {
          const assignment: any = assignmentById.get(row.assignment_id);
          return {
            id: `submission-${row.id}`,
            title: `Submitted ${assignment?.title || "an assignment"}`,
            date: row.submitted_at,
            type: "submission" as const,
          };
        }),
        ...effectiveGradeRows.map((row: any) => {
          const course: any = courseById.get(row.course_id);
          return {
            id: `grade-${row.id}`,
            title: `Received a grade in ${course?.name || "a course"}`,
            date: row.graded_at,
            type: "grade" as const,
          };
        }),
        ...threadRows.map((row: any) => ({
          id: `thread-${row.id}`,
          title: `Started discussion: ${row.title}`,
          date: row.created_at,
          type: "discussion" as const,
        })),
      ]
        .filter((row) => Boolean(row.date))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);

      const currentLeaderboard = leaderboardEntries.find((entry) => entry.isUser);
      const achievementResult = await supabase
        .from("user_achievements")
        .select("achievement_code, earned_at")
        .eq("user_id", user.id);

      if (!achievementResult.error) {
        setAchievementDates(
          Object.fromEntries(
            (achievementResult.data || []).map((achievement: any) => [
              achievement.achievement_code,
              achievement.earned_at,
            ])
          )
        );
      }

      setLeaderboard(leaderboardEntries);
      setMilestones(milestoneRows);
      setMetrics({
        enrolledCourses: enrollmentRows.length,
        totalAssignments: assignmentRows.length,
        submittedAssignments: submissionRows.length,
        gradedAssignments: effectiveGradeRows.length,
        perfectScores,
        averageScore: overallAverage,
        attendanceRate: overallAttendance,
        discussionCount: threadRows.length + replyRows.length,
        replyCount: replyRows.length,
        attendedClasses: attendanceRows.filter((record: any) => record.marked_present).length,
        streak: calculateStreak(activityDates),
        rank: currentLeaderboard?.rank || null,
      });
    } catch (error: any) {
      console.error("Failed to load progress data:", error);
      setLoadError(error?.message || "Could not load progress data.");
    } finally {
      setIsLoading(false);
    }
  };

  const achievements = useMemo<Achievement[]>(() => {
    const firstSubmission = milestones
      .filter((milestone) => milestone.type === "submission")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    const firstDiscussion = milestones
      .filter((milestone) => milestone.type === "discussion")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    return [
      {
        id: "first-steps",
        name: "First Steps",
        description: "Submit your first assignment",
        icon: "🎯",
        earned: Boolean(achievementDates["first-steps"]) || metrics.submittedAssignments >= 1,
        rarity: "common",
        earnedDate: achievementDates["first-steps"] || firstSubmission?.date,
        xpReward: 50,
      },
      {
        id: "assignment-momentum",
        name: "Assignment Momentum",
        description: "Submit 5 assignments",
        icon: "⚡",
        earned: Boolean(achievementDates["assignment-momentum"]) || metrics.submittedAssignments >= 5,
        rarity: "rare",
        earnedDate: achievementDates["assignment-momentum"],
        xpReward: 200,
      },
      {
        id: "discussion-master",
        name: "Discussion Master",
        description: "Create 5 discussions or replies",
        icon: "💬",
        earned: Boolean(achievementDates["discussion-master"]) || metrics.discussionCount >= 5,
        rarity: "epic",
        earnedDate: achievementDates["discussion-master"] || firstDiscussion?.date,
        xpReward: 500,
      },
      {
        id: "perfect-score",
        name: "Perfect Score",
        description: "Score 100% on 3 graded assignments",
        icon: "🎯",
        earned: Boolean(achievementDates["perfect-score"]) || metrics.perfectScores >= 3,
        rarity: "legendary",
        earnedDate: achievementDates["perfect-score"],
        xpReward: 1000,
      },
      {
        id: "mentor",
        name: "Mentor",
        description: "Contribute 10 replies in discussions",
        icon: "🎓",
        earned: Boolean(achievementDates["mentor"]) || metrics.replyCount >= 10,
        rarity: "epic",
        earnedDate: achievementDates["mentor"],
        xpReward: 750,
      },
    ];
  }, [metrics, milestones, achievementDates]);

  const earnedAchievements = achievements.filter((achievement) => achievement.earned);
  const xp =
    metrics.submittedAssignments * 100 +
    metrics.discussionCount * 20 +
    metrics.attendedClasses * 25 +
    earnedAchievements.reduce(
      (total, achievement) => total + achievement.xpReward,
      0
    );
  const level = Math.floor(xp / 500) + 1;
  const xpToNext = level * 500;
  const completionRate =
    metrics.totalAssignments > 0
      ? Math.round((metrics.submittedAssignments / metrics.totalAssignments) * 100)
      : 0;

  const challenges: Challenge[] = [
    {
      id: "streak",
      title: "7-Day Streak Master",
      description: "Be active for 7 consecutive days",
      progress: Math.min(metrics.streak, 7),
      target: 7,
      xpReward: 500,
      status: metrics.streak >= 7 ? "Completed" : `${7 - metrics.streak} days left`,
      type: "streak",
    },
    {
      id: "assignments",
      title: "Assignment Champion",
      description: "Submit all assignments available in your courses",
      progress: metrics.submittedAssignments,
      target: metrics.totalAssignments,
      xpReward: 300,
      status:
        metrics.totalAssignments > 0 &&
        metrics.submittedAssignments >= metrics.totalAssignments
          ? "Completed"
          : `${Math.max(metrics.totalAssignments - metrics.submittedAssignments, 0)} left`,
      type: "performance",
    },
    {
      id: "community",
      title: "Community Helper",
      description: "Create 10 discussions or replies",
      progress: Math.min(metrics.discussionCount, 10),
      target: 10,
      xpReward: 400,
      status:
        metrics.discussionCount >= 10
          ? "Completed"
          : `${10 - metrics.discussionCount} left`,
      type: "social",
    },
  ];

  const motivation =
    metrics.totalAssignments === 0
      ? "Your progress will appear as lecturers add assignments and grades."
      : metrics.submittedAssignments < metrics.totalAssignments
        ? `You have ${metrics.totalAssignments - metrics.submittedAssignments} assignment${
            metrics.totalAssignments - metrics.submittedAssignments === 1 ? "" : "s"
          } left to submit.`
        : metrics.averageScore != null && metrics.averageScore >= 80
          ? "All current assignments are submitted and your average is above 80%."
          : "All current assignments are submitted. Keep building your academic record.";

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "bg-gray-100 text-gray-800";
      case "rare": return "bg-blue-100 text-blue-800";
      case "epic": return "bg-purple-100 text-purple-800";
      case "legendary": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case "streak": return <Flame className="h-4 w-4" />;
      case "performance": return <Target className="h-4 w-4" />;
      case "social": return <Users className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getLeaderboardXp = (entry: LeaderboardEntry) => {
    if (entry.isUser) return xp;

    return (
      entry.completedAssignments * 100 +
      Math.round(entry.averageScore) * 5 +
      Math.round(entry.attendancePercentage) * 2
    );
  };

  const getMilestoneStyle = (type: Milestone["type"]) => {
    switch (type) {
      case "submission":
        return {
          className: "bg-green-50 border-green-500",
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        };
      case "grade":
        return {
          className: "bg-yellow-50 border-yellow-500",
          icon: <Trophy className="h-5 w-5 text-yellow-600" />,
        };
      default:
        return {
          className: "bg-blue-50 border-blue-500",
          icon: <BookOpen className="h-5 w-5 text-blue-600" />,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>Your Learning Journey</h1>
        <p className="text-muted-foreground">Track progress, earn rewards, and compete with peers</p>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* User Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">Level {level}</div>
              <p className="text-sm text-muted-foreground">Current Level</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{xp} XP</span>
                  <span>{xpToNext} XP</span>
                </div>
                <Progress value={xpToNext > 0 ? (xp / xpToNext) * 100 : 0} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl">🔥</div>
              <div className="text-2xl font-bold">{metrics.streak}</div>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl">🏆</div>
              <div className="text-2xl font-bold">
                {metrics.rank == null ? "--" : `#${metrics.rank}`}
              </div>
              <p className="text-sm text-muted-foreground">Global Rank</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl">⭐</div>
              <div className="text-2xl font-bold">{earnedAchievements.length}</div>
              <p className="text-sm text-muted-foreground">Badges Earned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Motivational Nudge */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-blue-900">Daily Motivation</h3>
              <p className="text-blue-700">{motivation}</p>
            </div>
            <Button variant="outline" className="border-blue-300 text-blue-700">
              Keep Going!
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="achievements">
        <TabsList>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="challenges">Active Challenges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <Card key={achievement.id} className={`${achievement.earned ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' : 'opacity-75'}`}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-3xl">{achievement.icon}</div>
                      <Badge className={getRarityColor(achievement.rarity)}>
                        {achievement.rarity}
                      </Badge>
                    </div>

                    <div>
                      <h4 className={achievement.earned ? 'text-yellow-900' : 'text-muted-foreground'}>
                        {achievement.name}
                      </h4>
                      <p className={`text-sm ${achievement.earned ? 'text-yellow-700' : 'text-muted-foreground'}`}>
                        {achievement.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        <span>{achievement.xpReward} XP</span>
                      </div>
                      {achievement.earned && achievement.earnedDate && (
                        <span className="text-yellow-600 text-xs">
                          Earned {new Date(achievement.earnedDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {achievement.earned && (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>Completed</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="challenges" className="space-y-4">
          {challenges.map((challenge) => (
            <Card key={challenge.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getChallengeIcon(challenge.type)}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4>{challenge.title}</h4>
                        <p className="text-sm text-muted-foreground">{challenge.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span>{challenge.xpReward} XP</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{challenge.status}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{challenge.progress}/{challenge.target}</span>
                      </div>
                      <Progress
                        value={
                          challenge.target > 0
                            ? (Math.min(challenge.progress, challenge.target) /
                                challenge.target) *
                              100
                            : 0
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry) => {
                  const entryXp = getLeaderboardXp(entry);
                  const entryLevel = Math.floor(entryXp / 500) + 1;
                  const badge =
                    entry.rank === 1
                      ? "🏆"
                      : entry.rank === 2
                        ? "🥈"
                        : entry.rank === 3
                          ? "🥉"
                          : "";

                  return (
                    <div
                      key={entry.studentId}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        entry.isUser ? 'bg-primary/10 border border-primary/20' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="text-center w-8">
                        <span className={`text-sm ${entry.rank != null && entry.rank <= 3 ? 'font-bold' : ''}`}>
                          {badge || (entry.rank == null ? "--" : `#${entry.rank}`)}
                        </span>
                      </div>

                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.avatarUrl} />
                        <AvatarFallback>
                          {entry.name === "You" ? "Y" : entry.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <p className={`font-medium ${entry.isUser ? 'text-primary' : ''}`}>
                          {entry.name}
                        </p>
                        <p className="text-sm text-muted-foreground">Level {entryLevel}</p>
                      </div>

                      <div className="text-right">
                        <p className="font-medium">{entryXp.toLocaleString()} XP</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No leaderboard records are available yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Study Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Study Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Daily Study Streak</span>
                      <span>{metrics.streak}/30 days</span>
                    </div>
                    <Progress value={(Math.min(metrics.streak, 30) / 30) * 100} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Assignment Completion</span>
                      <span>{metrics.submittedAssignments}/{metrics.totalAssignments} assignments</span>
                    </div>
                    <Progress value={completionRate} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Courses Enrolled</span>
                      <span>{metrics.enrolledCourses} courses</span>
                    </div>
                    <Progress value={(Math.min(metrics.enrolledCourses, 5) / 5) * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-accent rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                      {formatPercentage(metrics.averageScore)}
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Assignment Score</p>
                  </div>
                  <div className="text-center p-3 bg-accent rounded-lg">
                    <div className="text-xl font-bold text-blue-600">{completionRate}%</div>
                    <p className="text-xs text-muted-foreground">Completion Rate</p>
                  </div>
                  <div className="text-center p-3 bg-accent rounded-lg">
                    <div className="text-xl font-bold text-purple-600">{metrics.discussionCount}</div>
                    <p className="text-xs text-muted-foreground">Forum Contributions</p>
                  </div>
                  <div className="text-center p-3 bg-accent rounded-lg">
                    <div className="text-xl font-bold text-orange-600">
                      {formatPercentage(metrics.attendanceRate)}
                    </div>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Milestone Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Learning Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {milestones.length > 0 ? (
                  milestones.map((milestone) => {
                    const style = getMilestoneStyle(milestone.type);
                    return (
                      <div
                        key={milestone.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border-l-4 ${style.className}`}
                      >
                        {style.icon}
                        <div>
                          <p className="font-medium">{milestone.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(milestone.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Your learning milestones will appear here.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
