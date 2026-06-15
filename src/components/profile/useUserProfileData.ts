import { useCallback, useEffect, useState } from "react";
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings";
import { supabase } from "@/lib/supabase";
import type {
  ConnectedProfile,
  ProfileCourse,
  ProfileData,
  ProfilePost,
} from "./profileTypes";

type RelationProfile = ConnectedProfile["user_profiles"];

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getRelatedProfile = (value: unknown): RelationProfile | null => {
  const related = Array.isArray(value) ? value[0] : value;
  const record = asRecord(related);

  if (
    typeof record.id !== "string" ||
    typeof record.full_name !== "string" ||
    typeof record.role !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    full_name: record.full_name,
    avatar_url:
      typeof record.avatar_url === "string" ? record.avatar_url : null,
    role: record.role,
  };
};

const normalizeConnections = (
  rows: unknown[] | null,
  idKey: "follower_id" | "following_id",
): ConnectedProfile[] =>
  (rows || [])
    .map(row => {
      const record = asRecord(row);
      const userId = record[idKey];
      const relatedProfile = getRelatedProfile(record.user_profiles);
      return typeof userId === "string" && relatedProfile
        ? { user_id: userId, user_profiles: relatedProfile }
        : null;
    })
    .filter((row): row is ConnectedProfile => row !== null);

export function useUserProfileData({
  currentUserId,
  isOwnProfile,
  viewId,
}: {
  currentUserId?: string | null;
  isOwnProfile: boolean;
  viewId: string | null;
}) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [courses, setCourses] = useState<ProfileCourse[]>([]);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState<ConnectedProfile[]>([]);
  const [following, setFollowing] = useState<ConnectedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFollowData = useCallback(async () => {
    if (!viewId) return;

    const [followersResult, followingResult, currentFollowResult] =
      await Promise.all([
        supabase
          .from("follows")
          .select(
            "follower_id, user_profiles!follows_follower_id_fkey(id, full_name, avatar_url, role)",
            { count: "exact" },
          )
          .eq("following_id", viewId)
          .order("created_at", { ascending: false }),
        supabase
          .from("follows")
          .select(
            "following_id, user_profiles!follows_following_id_fkey(id, full_name, avatar_url, role)",
            { count: "exact" },
          )
          .eq("follower_id", viewId)
          .order("created_at", { ascending: false }),
        !isOwnProfile && currentUserId
          ? supabase
              .from("follows")
              .select("id")
              .eq("follower_id", currentUserId)
              .eq("following_id", viewId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (followersResult.error) throw followersResult.error;
    if (followingResult.error) throw followingResult.error;
    if (currentFollowResult.error) throw currentFollowResult.error;

    setFollowersCount(followersResult.count || 0);
    setFollowingCount(followingResult.count || 0);
    setFollowers(
      normalizeConnections(
        followersResult.data as unknown[] | null,
        "follower_id",
      ),
    );
    setFollowing(
      normalizeConnections(
        followingResult.data as unknown[] | null,
        "following_id",
      ),
    );
    setIsFollowing(Boolean(currentFollowResult.data));
  }, [currentUserId, isOwnProfile, viewId]);

  const fetchFullProfile = useCallback(async () => {
    if (!viewId) return;
    setIsLoading(true);

    try {
      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", viewId)
        .single();

      if (profileError) throw profileError;

      if (!isOwnProfile) {
        const { data: visibility, error: visibilityError } =
          await supabase.rpc("get_profile_visibility", {
            target_user_id: viewId,
          });

        if (visibilityError) throw visibilityError;
        if ((visibility || "everyone") === "nobody") {
          setProfileData({ ...userProfile, _isPrivate: true });
          setCourses([]);
          setPosts([]);
          setFollowers([]);
          setFollowing([]);
          setFollowersCount(0);
          setFollowingCount(0);
          setIsFollowing(false);
          return;
        }
      }

      setProfileData(userProfile);

      const courseQuery =
        userProfile.role === "lecturer"
          ? supabase
              .from("course_instructors")
              .select(`course_offerings(${COURSE_OFFERING_SELECT})`)
              .eq("user_id", viewId)
          : supabase
              .from("course_enrollments")
              .select(`course_offerings(${COURSE_OFFERING_SELECT})`)
              .eq("student_id", viewId);

      const [{ data: courseRows, error: courseError }, postResult] =
        await Promise.all([
          courseQuery,
          supabase
            .from("course_posts")
            .select(`*, course_offerings(${COURSE_OFFERING_SELECT})`)
            .eq("author_id", viewId)
            .order("created_at", { ascending: false }),
        ]);

      if (courseError) throw courseError;
      if (postResult.error) throw postResult.error;

      setCourses(
        (courseRows || [])
          .map(row => normalizeCourseOffering(row.course_offerings))
          .filter(course => Boolean(course.id)),
      );
      setPosts(
        (postResult.data || []).map(post => ({
          ...post,
          courses: normalizeCourseOffering(post.course_offerings),
        })),
      );
      await fetchFollowData();
    } catch (error) {
      console.error("Error fetching profile", error);
      setProfileData(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFollowData, isOwnProfile, viewId]);

  useEffect(() => {
    if (!viewId) {
      setIsLoading(false);
      return;
    }

    setIsFollowing(false);
    setFollowers([]);
    setFollowing([]);
    void fetchFullProfile();
  }, [fetchFullProfile, viewId]);

  return {
    courses,
    fetchFollowData,
    followers,
    followersCount,
    following,
    followingCount,
    isFollowing,
    isLoading,
    posts,
    profileData,
    setProfileData,
  };
}
