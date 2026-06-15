import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import type { Story, StoryUser } from "./storyTypes";

type StoryProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
};

const getStoredViewedIds = () => {
  try {
    const stored = localStorage.getItem("viewed_story_ids");
    return new Set<string>(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set<string>();
  }
};

const getStoryStoragePath = (publicUrl: string) => {
  const marker = "/storage/v1/object/public/stories/";
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex < 0) return null;
  return decodeURIComponent(
    publicUrl.slice(markerIndex + marker.length).split("?")[0],
  );
};

export function useStoriesData({
  currentUserAvatar,
  currentUserId,
  currentUserInitials,
}: {
  currentUserAvatar?: string;
  currentUserId?: string | null;
  currentUserInitials: string;
}) {
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [viewedStoryIds, setViewedStoryIds] =
    useState<Set<string>>(getStoredViewedIds);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStories = useCallback(async () => {
    const yourStory: StoryUser = {
      id: currentUserId || "me",
      name: "Your Story",
      initials: currentUserInitials,
      avatar_url: currentUserAvatar,
      role: "student",
      hasActiveStories: false,
      stories: [],
      viewed: true,
    };

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("stories")
        .select("id, user_id, image_url, created_at, expires_at")
        .eq("is_active", true)
        .gt("expires_at", now)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const userIds = Array.from(
        new Set(
          (data || [])
            .map(story => story.user_id)
            .filter(userId => userId !== currentUserId),
        ),
      );
      const profilesById = new Map<string, StoryProfile>();
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("user_profiles")
          .select("id, full_name, avatar_url, role")
          .in("id", userIds);
        if (profileError) throw profileError;
        (profiles || []).forEach(profile =>
          profilesById.set(profile.id, profile),
        );
      }

      const groups = new Map<string, StoryUser>();
      (data || []).forEach(row => {
        if (!row.image_url) return;
        const profile = profilesById.get(row.user_id);
        const isCurrentUser = row.user_id === currentUserId;
        const userName = isCurrentUser
          ? "You"
          : profile?.full_name || "Unknown";
        const story: Story = {
          id: row.id,
          userId: row.user_id,
          userName,
          userInitials: isCurrentUser
            ? currentUserInitials
            : userName.charAt(0),
          contentUrl: row.image_url,
          type: "image",
          timestamp: new Date(row.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          created_at: row.created_at,
          expires_at: row.expires_at,
          viewed: viewedStoryIds.has(row.id),
        };

        if (isCurrentUser) {
          yourStory.stories.push(story);
          yourStory.hasActiveStories = true;
          return;
        }

        const existing = groups.get(row.user_id);
        if (existing) {
          existing.stories.push(story);
        } else {
          groups.set(row.user_id, {
            id: row.user_id,
            name: userName,
            initials: userName.charAt(0),
            avatar_url: profile?.avatar_url || undefined,
            role: profile?.role || "student",
            hasActiveStories: true,
            stories: [story],
            viewed: true,
          });
        }
      });

      const updateViewedStatus = (storyUser: StoryUser) => ({
        ...storyUser,
        viewed: !storyUser.stories.some(
          story => !viewedStoryIds.has(story.id),
        ),
      });
      setStoryUsers([
        updateViewedStatus(yourStory),
        ...Array.from(groups.values()).map(updateViewedStatus),
      ]);
    } catch (error) {
      console.error("Error loading stories", error);
      setStoryUsers([yourStory]);
    }
  }, [
    currentUserAvatar,
    currentUserId,
    currentUserInitials,
    viewedStoryIds,
  ]);

  useEffect(() => {
    void fetchStories();
  }, [fetchStories]);

  const markAsViewed = useCallback(
    (storyId: string) => {
      if (viewedStoryIds.has(storyId)) return;
      const next = new Set(viewedStoryIds).add(storyId);
      setViewedStoryIds(next);
      localStorage.setItem("viewed_story_ids", JSON.stringify([...next]));
      setStoryUsers(current =>
        current.map(storyUser => {
          const stories = storyUser.stories.map(story =>
            story.id === storyId ? { ...story, viewed: true } : story,
          );
          return {
            ...storyUser,
            stories,
            viewed: !stories.some(story => !story.viewed),
          };
        }),
      );

      if (currentUserId) {
        void supabase
          .from("story_views")
          .upsert(
            {
              story_id: storyId,
              viewed_by: currentUserId,
              viewed_at: new Date().toISOString(),
            },
            { onConflict: "story_id,viewed_by" },
          )
          .then(({ error }) => {
            if (error) {
              console.warn("Story view could not be recorded:", error);
            }
          });
      }
    },
    [currentUserId, viewedStoryIds],
  );

  const uploadStory = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isUploading || !currentUserId) return;

    if (!file.type.startsWith("image/")) {
      notify.warning("Please select an image file.");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify.warning("Story images must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    let uploadedPath: string | null = null;
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      uploadedPath = `${currentUserId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(uploadedPath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("stories").getPublicUrl(uploadedPath);
      const { error: insertError } = await supabase.from("stories").insert({
        user_id: currentUserId,
        image_url: data.publicUrl,
        expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        is_active: true,
      });
      if (insertError) throw insertError;

      notify.success("Story uploaded.");
      await fetchStories();
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage.from("stories").remove([uploadedPath]);
      }
      notify.error(error, "Story upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const deleteStory = async (story: Story) => {
    if (!currentUserId || isDeleting) return false;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", story.id)
        .eq("user_id", currentUserId);
      if (error) throw error;

      const storagePath = getStoryStoragePath(story.contentUrl);
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from("stories")
          .remove([storagePath]);
        if (storageError) {
          console.warn("Story deleted but image cleanup failed:", storageError);
        }
      }

      notify.success("Story deleted.");
      await fetchStories();
      return true;
    } catch (error) {
      notify.error(error, "Failed to delete story. Please try again.");
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteStory,
    fetchStories,
    isDeleting,
    isUploading,
    markAsViewed,
    storyUsers,
    uploadStory,
    viewedStoryIds,
  };
}
