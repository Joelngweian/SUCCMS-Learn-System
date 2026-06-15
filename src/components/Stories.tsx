import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { supabase } from "@/lib/supabase.ts";
import { getNotifyMessage, notify } from "@/lib/notify";
import { confirmAction } from "@/lib/confirm";
import { REPORT_REASON_OPTIONS } from "@/lib/reporting";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { X, Plus, ChevronLeft, ChevronRight, Flag, Loader2, Pause, Play, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import type { StoryUser } from "./stories/storyTypes";
import { useStoriesData } from "./stories/useStoriesData";

export function Stories({ 
  currentUserAvatar, 
  currentUserName, 
  currentUserInitials 
}: { 
  currentUserAvatar?: string, 
  currentUserName: string, 
  currentUserInitials: string 
}) {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<StoryUser | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const STORY_DURATION = 5000; // 5 seconds per story
  const PROGRESS_INTERVAL = 50; // Update progress every 50ms

  const {
    deleteStory,
    isDeleting,
    isUploading,
    markAsViewed,
    storyUsers,
    uploadStory,
    viewedStoryIds,
  } = useStoriesData({
    currentUserAvatar,
    currentUserInitials,
    currentUserId: user?.id,
  });

  const handleStoryClick = (storyUser: StoryUser) => {
    // Only open viewer if user has stories
    if (!storyUser.hasActiveStories || storyUser.stories.length === 0) {
      return; // Do nothing, let Plus button handle uploads
    }
    
    setSelectedUser(storyUser);
    const firstUnviewedIdx = storyUser.stories.findIndex(s => !viewedStoryIds.has(s.id));
    const idx = firstUnviewedIdx >= 0 ? firstUnviewedIdx : 0;
    setCurrentStoryIndex(idx);
    setProgress(0);
    setImageLoading(true);
    setIsPaused(false);
    
    markAsViewed(storyUser.stories[idx].id);
  };

  const closeStoryViewer = useCallback(() => {
    setSelectedUser(null);
    setCurrentStoryIndex(0);
    setProgress(0);
    setIsPaused(false);
    setImageLoading(true);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const nextStory = useCallback(() => {
    if (!selectedUser) return;
    
    // Reset progress for next story
    setProgress(0);
    setImageLoading(true);
    
    if (currentStoryIndex < selectedUser.stories.length - 1) {
      const nextIdx = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIdx);
      markAsViewed(selectedUser.stories[nextIdx].id);
    } else {
      const currentUserIndex = storyUsers.findIndex(u => u.id === selectedUser.id);
      const nextUnviewedUser = storyUsers
        .slice(currentUserIndex + 1)
        .find(u => u.hasActiveStories && u.stories.length > 0);
      
      if (nextUnviewedUser) {
        setSelectedUser(nextUnviewedUser);
        setCurrentStoryIndex(0);
        markAsViewed(nextUnviewedUser.stories[0].id);
      } else {
        closeStoryViewer();
      }
    }
  }, [selectedUser, currentStoryIndex, storyUsers, markAsViewed, closeStoryViewer]);

  const previousStory = useCallback(() => {
    if (!selectedUser) return;
    
    // Reset progress for previous story
    setProgress(0);
    setImageLoading(true);
    
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else {
      const currentUserIndex = storyUsers.findIndex(u => u.id === selectedUser.id);
      const previousUser = storyUsers
        .slice(0, currentUserIndex)
        .reverse()
        .find(u => u.hasActiveStories && u.stories.length > 0);
      
      if (previousUser) {
        setSelectedUser(previousUser);
        setCurrentStoryIndex(previousUser.stories.length - 1);
      }
    }
  }, [selectedUser, currentStoryIndex, storyUsers]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!selectedUser || reportDialogOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeStoryViewer();
          break;
        case 'ArrowLeft':
          previousStory();
          break;
        case 'ArrowRight':
          nextStory();
          break;
        case ' ':
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedUser, closeStoryViewer, previousStory, nextStory, reportDialogOpen]);

  // Progress timer
  useEffect(() => {
    if (!selectedUser || isPaused || imageLoading || reportDialogOpen) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (PROGRESS_INTERVAL / STORY_DURATION) * 100;
        if (newProgress >= 100) {
          return 100;
        }
        return newProgress;
      });
    }, PROGRESS_INTERVAL);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [selectedUser, isPaused, imageLoading, currentStoryIndex, reportDialogOpen]);

  // Auto advance when progress reaches 100%
  useEffect(() => {
    if (progress >= 100) {
      nextStory();
    }
  }, [progress, nextStory]);

  const currentStory = selectedUser?.stories[currentStoryIndex];

  const handleReportStory = async () => {
    if (
      !user ||
      !selectedUser ||
      !currentStory ||
      !reportReason ||
      isReporting ||
      selectedUser.id === user.id
    ) {
      return;
    }

    setIsReporting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_user_id: selectedUser.id,
        report_type: "story",
        story_id: currentStory.id,
        reason: reportReason,
        details: reportDetails.trim() || null,
      });

      if (error) throw error;

      setReportDialogOpen(false);
      setReportReason("");
      setReportDetails("");
      notify.success("Story report submitted for administrator review.");
    } catch (error: unknown) {
      console.error("Failed to report story:", error);
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: unknown }).code
          : null;
      if (code === "23505") {
        notify.warning("You already have a pending report for this story.");
      } else {
        notify.error(
          error,
          `Failed to report story: ${getNotifyMessage(error, "Please try again.")}`,
        );
      }
    } finally {
      setIsReporting(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory || !user || selectedUser?.id !== user.id || isDeleting) return;

    setIsPaused(true);
    const confirmed = await confirmAction({
        title: "Delete story?",
        description: "This story will be permanently deleted.",
        confirmLabel: "Delete",
        destructive: true,
    });

    if (!confirmed) {
      setIsPaused(false);
      return;
    }

    const deleted = await deleteStory(currentStory);
    if (deleted) {
      closeStoryViewer();
    } else {
      setIsPaused(false);
    }
  };

  return (
    <div className="w-full">
      {/* Stories Carousel */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1">
          {storyUsers.map((user, index) => {
            const isMe = index === 0;
            const ringColor = (isMe && !user.hasActiveStories) 
                ? "bg-gray-200 dark:bg-zinc-800" 
                : user.viewed 
                    ? "bg-gray-300 dark:bg-zinc-700" 
                    : "bg-gradient-to-tr from-blue-500 via-purple-500 to-orange-500";

            return (
              <div
                key={user.id}
                onClick={() => handleStoryClick(user)}
                className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="relative">
                  <div className={`p-[3px] rounded-full transition-all ${ringColor}`}>
                    <div className="bg-white dark:bg-black p-[2px] rounded-full">
                      <Avatar className="h-16 w-16 border-2 border-white dark:border-black">
                        <AvatarImage src={user.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  {isMe && (
                    <div 
                        className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 border-2 border-white dark:border-black hover:scale-110 transition-transform"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                      {isUploading ? <Loader2 className="h-3 w-3 text-white animate-spin" /> : <Plus className="h-3 w-3 text-white" />}
                    </div>
                  )}
                </div>

                <span className="text-xs text-center max-w-[80px] truncate font-medium text-gray-700 dark:text-gray-300">
                  {user.name.split(' ')[0]}
                </span>
              </div>
            );
          })}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={uploadStory} />
        </div>
      </div>

      {/* Story Viewer Modal - Using portal-like fixed positioning */}
      {selectedUser && currentStory && (
        <div 
          className="fixed inset-0 bg-black"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
        >
          {/* Full screen container */}
          <div className="relative w-full h-full flex flex-col">
            
            {/* Header with progress bars - fixed at top */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent" style={{ zIndex: 9999 }}>
              {/* Progress bars */}
              <div className="flex gap-1 mb-4 w-full max-w-[1100px] mx-auto px-2">
                {selectedUser.stories.map((_, index) => (
                  <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white"
                      style={{ 
                        width: index < currentStoryIndex 
                          ? '100%' 
                          : index === currentStoryIndex 
                            ? `${progress}%` 
                            : '0%',
                        transition: index === currentStoryIndex ? 'width 50ms linear' : 'none'
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* User info and controls */}
              <div className="flex items-center justify-between w-full max-w-[1100px] mx-auto px-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white/50">
                    <AvatarImage src={selectedUser.avatar_url} />
                    <AvatarFallback className="bg-blue-600 text-white font-semibold">{selectedUser.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white text-sm font-semibold drop-shadow-md">{selectedUser.name}</p>
                    <p className="text-xs drop-shadow-md" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{currentStory.timestamp}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Pause/Play button */}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-white hover:bg-white/20 rounded-full h-11 w-11 p-0" 
                    onClick={() => setIsPaused(prev => !prev)}
                  >
                    {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                  </Button>
                  
                  {selectedUser.id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-red-500/80 rounded-full h-11 w-11 p-0"
                      onClick={handleDeleteStory}
                      disabled={isDeleting}
                      title="Delete story"
                    >
                      {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5 text-red-400 hover:text-white" />}
                    </Button>
                  )}

                  {selectedUser.id !== user?.id && selectedUser.role !== "admin" && (
                    <Dialog
                      open={reportDialogOpen}
                      onOpenChange={(open) => {
                        if (isReporting) return;
                        setReportDialogOpen(open);
                        if (!open) {
                          setReportReason("");
                          setReportDetails("");
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20 rounded-full h-11 w-11 p-0"
                          title="Report story"
                        >
                          <Flag className="h-5 w-5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="z-[10000]" style={{ zIndex: 100000 }}>
                        <DialogHeader>
                          <DialogTitle>Report Story</DialogTitle>
                          <DialogDescription>
                            Tell administrators why this story should be reviewed.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                          <Label>Reason</Label>
                          <Select value={reportReason} onValueChange={setReportReason}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent className="z-[10001]" style={{ zIndex: 100001 }}>
                              {REPORT_REASON_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="report-story-details">
                            Details (Optional)
                          </Label>
                          <Textarea
                            id="report-story-details"
                            value={reportDetails}
                            onChange={(event) => setReportDetails(event.target.value)}
                            placeholder="Add any useful context..."
                            maxLength={1000}
                            className="min-h-24"
                          />
                          <p className="text-right text-xs text-muted-foreground">
                            {reportDetails.length}/1000
                          </p>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setReportDialogOpen(false)}
                            disabled={isReporting}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleReportStory}
                            disabled={!reportReason || isReporting}
                          >
                            {isReporting && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Submit Report
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={closeStoryViewer} 
                    className="text-white hover:bg-white/20 rounded-full h-11 w-11 p-0"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Image container - centered and constrained */}
            <div className="flex-1 flex items-center justify-center overflow-hidden px-4">
              {/* Loading indicator */}
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <Loader2 className="h-12 w-12 text-white animate-spin" />
                </div>
              )}

              <div className="w-[480px] h-[320px] max-w-[75vw] max-h-[60vh] flex items-center justify-center bg-black">
                <img 
                  key={currentStory.id} 
                  src={currentStory.contentUrl} 
                  alt="Story" 
                  className={`w-full h-full object-contain transition-opacity duration-200 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    console.error("Failed to load story image");
                  }}
                />
              </div>
            </div>

            {/* Click zones for navigation */}
            <div 
              className="absolute top-28 bottom-0 left-0 w-1/3 z-50 cursor-pointer" 
              onClick={previousStory} 
            />
            <div 
              className="absolute top-28 bottom-0 right-0 w-1/3 z-50 cursor-pointer" 
              onClick={nextStory} 
            />

            {/* Navigation buttons for desktop */}
            <Button 
              onClick={previousStory} 
              variant="ghost" 
              size="icon" 
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/40 hover:bg-black/60 text-white flex rounded-full h-12 w-12"
            >
              <ChevronLeft className="h-7 w-7" />
            </Button>
            <Button 
              onClick={nextStory} 
              variant="ghost" 
              size="icon" 
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/40 hover:bg-black/60 text-white flex rounded-full h-12 w-12"
            >
              <ChevronRight className="h-7 w-7" />
            </Button>

            {/* Paused indicator */}
            {isPaused && !imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="bg-black/60 rounded-full p-5">
                  <Pause className="h-14 w-14 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .text-shadow { text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
      `}</style>
    </div>
  );
}
