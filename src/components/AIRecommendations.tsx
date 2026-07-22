import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  Brain, 
  ExternalLink, 
  BookOpen, 
  Video, 
  FileText,
  Star,
  Clock,
  TrendingUp,
  Lightbulb,
  Target,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

interface AIRecommendationsProps {
  userRole: 'student' | 'lecturer';
  compact?: boolean;
  currentCourses?: string[];
  performanceData?: {
    courses?: unknown[];
    overview?: Record<string, unknown>;
  };
}

interface Recommendation {
  id: string;
  type: "video" | "article" | "course" | "practice" | "tool";
  title: string;
  platform: string;
  duration: string;
  qualityScore: number;
  relevance: number;
  reason: string;
  url: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "mixed" | "academic" | "tool";
  tags: string[];
  impact: string;
}

interface RecommendationPreference {
  isBookmarked: boolean;
  feedback: "up" | "down" | null;
}

const emptyPreference: RecommendationPreference = {
  isBookmarked: false,
  feedback: null,
};

export function AIRecommendations({
  userRole,
  compact = false,
  currentCourses = [],
  performanceData,
}: AIRecommendationsProps) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [preferences, setPreferences] = useState<Record<string, RecommendationPreference>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [interactionError, setInteractionError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [recommendationPage, setRecommendationPage] = useState(0);
  const [compactOpen, setCompactOpen] = useState(false);

  const recommendationContext = JSON.stringify({
    courses: performanceData?.courses || [],
    overview: performanceData?.overview || {},
    currentCourses,
  });

  const userId = user?.id;

  const loadPreferences = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("ai_recommendation_preferences")
      .select("recommendation_id, is_bookmarked, feedback")
      .eq("user_id", userId);

    if (error) {
      console.warn("Could not load AI recommendation preferences:", error);
      return;
    }

    const nextPreferences: Record<string, RecommendationPreference> = {};
    (data || []).forEach((row) => {
      nextPreferences[row.recommendation_id] = {
        isBookmarked: Boolean(row.is_bookmarked),
        feedback: row.feedback === "up" || row.feedback === "down" ? row.feedback : null,
      };
    });
    setPreferences(nextPreferences);
  }, [userId]);

  const loadRecommendations = useCallback(async (forceRefresh = false) => {
    if (!userId || userRole !== "lecturer") return;

    const courses = performanceData?.courses || [];
    if (courses.length === 0) {
      setRecommendations([]);
      setLoadError("");
      return;
    }

    setIsLoading(true);
    setLoadError("");

    try {
      const cacheKey = `lecturer-ai-recommendations:v3:${userId}`;
      if (!forceRefresh) {
        try {
          const cachedValue = sessionStorage.getItem(cacheKey);
          if (cachedValue) {
            const cached = JSON.parse(cachedValue);
            const isCurrent =
              cached.context === recommendationContext &&
              Date.now() - Number(cached.createdAt || 0) < 30 * 60 * 1000;

            if (isCurrent && Array.isArray(cached.recommendations)) {
              setRecommendations(cached.recommendations);
              return;
            }
          }
        } catch {
          // Continue without cache when browser storage is unavailable or invalid.
        }
      }

      const { data, error } = await supabase.functions.invoke(
        "gemini-lecturer-recommendations",
        {
          body: {
            courses,
            overview: performanceData?.overview || {},
            forceRefresh,
          },
        },
      );

      if (error) {
        let message = error.message;
        try {
          const context =
            error && typeof error === "object" && "context" in error
              ? (error as { context?: { json?: () => Promise<unknown> } }).context
              : undefined;
          const details = await context?.json?.();
          if (
            details &&
            typeof details === "object" &&
            "error" in details &&
            typeof details.error === "string"
          ) {
            message = details.error;
          }
        } catch {
          // The standard function error message is used when no JSON body exists.
        }
        throw new Error(message);
      }

      const generated = Array.isArray(data?.recommendations)
        ? data.recommendations
        : [];
      setRecommendations(generated);
      try {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            context: recommendationContext,
            createdAt: Date.now(),
            recommendations: generated,
          }),
        );
      } catch {
        // Recommendations still work when browser storage is unavailable.
      }
    } catch (error: unknown) {
      console.error("Could not load lecturer AI recommendations:", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : "AI recommendations could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [performanceData, recommendationContext, userId, userRole]);

  useEffect(() => {
    if (!userId || userRole !== "lecturer") return;
    void loadPreferences();
    void loadRecommendations();
  }, [loadPreferences, loadRecommendations, userId, userRole]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'article': return FileText;
      case 'course': return BookOpen;
      case 'practice': return Target;
      case 'tool': return Zap;
      default: return ExternalLink;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-red-100 text-red-800';
      case 'article': return 'bg-blue-100 text-blue-800';
      case 'course': return 'bg-green-100 text-green-800';
      case 'practice': return 'bg-purple-100 text-purple-800';
      case 'tool': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      case 'mixed': return 'bg-blue-100 text-blue-800';
      case 'academic': return 'bg-purple-100 text-purple-800';
      case 'tool': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const savePreference = async (
    item: Recommendation,
    nextPreference: RecommendationPreference,
  ) => {
    if (!user) return;

    const previousPreference = preferences[item.id] || emptyPreference;
    setInteractionError("");
    setPreferences((current) => ({
      ...current,
      [item.id]: nextPreference,
    }));

    const { error } = await supabase
      .from("ai_recommendation_preferences")
      .upsert(
        {
          user_id: user.id,
          recommendation_id: item.id,
          title: item.title,
          url: item.url,
          is_bookmarked: nextPreference.isBookmarked,
          feedback: nextPreference.feedback,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,recommendation_id" },
      );

    if (error) {
      setPreferences((current) => ({
        ...current,
        [item.id]: previousPreference,
      }));
      setInteractionError("Could not save this recommendation preference.");
    }
  };

  const toggleBookmark = (item: Recommendation) => {
    const current = preferences[item.id] || emptyPreference;
    savePreference(item, {
      ...current,
      isBookmarked: !current.isBookmarked,
    });
  };

  const toggleFeedback = (item: Recommendation, feedback: "up" | "down") => {
    const current = preferences[item.id] || emptyPreference;
    savePreference(item, {
      ...current,
      feedback: current.feedback === feedback ? null : feedback,
    });
  };

  const openResource = (url: string) => {
    const resourceWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (resourceWindow) resourceWindow.opener = null;
  };

  const openAllRecommendations = () => {
    setRecommendationPage(0);
    setShowAll(true);
  };

  const changeRecommendationPage = (nextPage: number) => {
    const lastPage = Math.max(recommendations.length - 1, 0);
    setRecommendationPage(Math.min(Math.max(nextPage, 0), lastPage));
  };

  const renderRecommendation = (item: Recommendation) => {
    const TypeIcon = getTypeIcon(item.type);
    const preference = preferences[item.id] || emptyPreference;

    return (
      <div
        key={item.id}
        className="p-4 border rounded-lg space-y-3 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-muted rounded-lg shrink-0">
              <TypeIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-sm leading-tight break-words">
                  {item.title}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleBookmark(item)}
                  className="ml-2 shrink-0"
                  title={preference.isBookmarked ? "Remove bookmark" : "Bookmark resource"}
                >
                  <Bookmark
                    className={`h-4 w-4 ${
                      preference.isBookmarked
                        ? "fill-blue-500 text-blue-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getTypeColor(item.type)} variant="secondary">
                  {item.type}
                </Badge>
                <Badge className={getDifficultyColor(item.difficulty)} variant="secondary">
                  {item.difficulty}
                </Badge>
                <span className="text-xs text-muted-foreground">{item.platform}</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.duration}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {Number(item.qualityScore || 0).toFixed(1)}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {item.impact}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Relevance Match</span>
                  <span className="text-green-600 font-medium">{item.relevance}%</span>
                </div>
                <Progress value={item.relevance} className="h-1" />
              </div>

              <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded break-words">
                <Brain className="h-3 w-3 inline mr-1" />
                {item.reason}
              </p>

              <div className="flex flex-wrap gap-1">
                {(item.tags || []).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button className="flex-1" size="sm" onClick={() => openResource(item.url)}>
            <ExternalLink className="h-3 w-3 mr-1" />
            Open Resource
          </Button>
          <Button
            variant={preference.feedback === "up" ? "secondary" : "outline"}
            size="sm"
            onClick={() => toggleFeedback(item, "up")}
            title="Helpful"
          >
            <ThumbsUp
              className={`h-3 w-3 ${
                preference.feedback === "up" ? "fill-blue-500 text-blue-600" : ""
              }`}
            />
          </Button>
          <Button
            variant={preference.feedback === "down" ? "secondary" : "outline"}
            size="sm"
            onClick={() => toggleFeedback(item, "down")}
            title="Not helpful"
          >
            <ThumbsDown
              className={`h-3 w-3 ${
                preference.feedback === "down" ? "fill-red-500 text-red-600" : ""
              }`}
            />
          </Button>
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <Collapsible open={compactOpen} onOpenChange={setCompactOpen}>
        <Card className="overflow-hidden shadow-sm">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="rounded-lg bg-purple-100 p-2 text-purple-700">
                <Brain className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">AI Teaching Recommendations</p>
                <p className="truncate text-xs text-muted-foreground">
                  Resources based on overall course performance
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                  compactOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 border-t px-4 pb-4 pt-3">
              {isLoading ? (
                <div className="flex min-h-28 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  Finding teaching resources...
                </div>
              ) : loadError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{loadError}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => loadRecommendations(true)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Try Again
                  </Button>
                </div>
              ) : recommendations.length > 0 ? (
                recommendations.slice(0, 3).map(item => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {item.platform} · {item.type}
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {item.reason}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => openResource(item.url)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Resource
                    </Button>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Add a course to receive teaching resources.
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          AI Recommendations
          <Badge className="bg-purple-100 text-purple-800 ml-auto">
            Personalized
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4 inline mr-1" />
          {userRole === 'student' 
            ? "Curated learning resources based on your progress and performance"
            : "Teaching resources and tools tailored to your courses and student needs"
          }
        </div>

        {isLoading ? (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            Gemini is finding teaching resources for your courses...
          </div>
        ) : loadError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{loadError}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => loadRecommendations(true)}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Try Again
            </Button>
          </div>
        ) : recommendations.length > 0 ? (
          recommendations.slice(0, 3).map(renderRecommendation)
        ) : (
          <div className="rounded-lg border p-5 text-center text-sm text-muted-foreground">
            Add a course to receive personalized teaching resources.
          </div>
        )}

        {interactionError && (
          <p className="text-xs text-red-600">{interactionError}</p>
        )}

        {recommendations.length > 3 && (
          <Button variant="outline" className="w-full" onClick={openAllRecommendations}>
            <Brain className="h-4 w-4 mr-2" />
            View All AI Recommendations ({recommendations.length})
          </Button>
        )}
      </CardContent>

      <Dialog
        open={showAll}
        onOpenChange={(open) => {
          setShowAll(open);
          if (!open) setRecommendationPage(0);
        }}
      >
        <DialogContent className="sm:max-w-xl" hideCloseButton={false}>
          <DialogHeader className="pr-12">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              All AI Recommendations
            </DialogTitle>
            <DialogDescription>
              Teaching resources selected for your current courses and course performance.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-[390px]">
            {recommendations[recommendationPage] &&
              renderRecommendation(recommendations[recommendationPage])}
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={recommendationPage === 0}
              onClick={() => changeRecommendationPage(recommendationPage - 1)}
            >
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {recommendations.map((item, index) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={recommendationPage === index ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => changeRecommendationPage(index)}
                  aria-label={`Show recommendation ${index + 1}`}
                >
                  {index + 1}
                </Button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={recommendationPage >= recommendations.length - 1}
              onClick={() => changeRecommendationPage(recommendationPage + 1)}
            >
              Next
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function StudyInsights() {
  const insights = [
    {
      type: "performance",
      title: "Peak Study Time Detected",
      description: "You perform best during 2-4 PM. Consider scheduling difficult topics then.",
      confidence: 92,
      actionable: true,
      icon: Clock
    },
    {
      type: "weakness",
      title: "SQL Joins Need Attention", 
      description: "Recent quiz results show 40% accuracy on complex joins. Practice recommended.",
      confidence: 88,
      actionable: true,
      icon: Target
    },
    {
      type: "strength",
      title: "Excellent Algorithm Intuition",
      description: "Your algorithm problem-solving speed is top 15% in class.",
      confidence: 95,
      actionable: false,
      icon: TrendingUp
    },
    {
      type: "prediction",
      title: "Midterm Performance Forecast",
      description: "Based on current progress, predicted grade: B+ (87%). Focus on databases.",
      confidence: 78,
      actionable: true,
      icon: Brain
    }
  ];

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'performance': return 'border-blue-200 bg-blue-50';
      case 'weakness': return 'border-red-200 bg-red-50';
      case 'strength': return 'border-green-200 bg-green-50';
      case 'prediction': return 'border-purple-200 bg-purple-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getInsightIconColor = (type: string) => {
    switch (type) {
      case 'performance': return 'text-blue-600';
      case 'weakness': return 'text-red-600';
      case 'strength': return 'text-green-600';
      case 'prediction': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          AI Study Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div 
              key={index} 
              className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-white/50`}>
                  <Icon className={`h-4 w-4 ${getInsightIconColor(insight.type)}`} />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {insight.confidence}% confident
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {insight.description}
                  </p>
                  
                  {insight.actionable && (
                    <Button size="sm" variant="outline" className="text-xs">
                      <Lightbulb className="h-3 w-3 mr-1" />
                      Get Action Plan
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
