import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { supabase } from "@/lib/supabase.ts";
import { notify } from "@/lib/notify";
import { ProfileHeader } from "./profile/profile-header";
import { ProfileTabs } from "./profile/profile-tags";
import { ProfileReportDialog } from "./profile/ProfileReportDialog";
import { useUserProfileData } from "./profile/useUserProfileData";
import { Button } from "./ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Stories } from "./Stories";
import { useActiveStoryStatus } from "./stories/useActiveStoryStatus";

const getErrorCode = (error: unknown) => {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
};

const revokeBlobUrl = (value: string | null) => {
  if (value?.startsWith("blob:")) URL.revokeObjectURL(value);
};

export const UserProfile = () => {
  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const { user: me, profile: currentUserProfile, refreshProfile } = useAuth();
  const viewId = routeUserId || me?.id || null;
  const isOwnProfile = me?.id === viewId;
  const {
    courses,
    fetchFollowData,
    followers,
    followersCount,
    following,
    followingCount,
    isFollowing,
    isLoading,
    posts,
    postsCount,
    profileData,
    setProfileData,
  } = useUserProfileData({
    currentUserEmail: me?.email,
    currentUserId: me?.id,
    isOwnProfile,
    viewId,
  });

  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [draftBio, setDraftBio] = useState("");
  const [draftAvatarFile, setDraftAvatarFile] = useState<File | null>(null);
  const [draftCoverFile, setDraftCoverFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [previewCover, setPreviewCover] = useState<string | null>(null);
  const [deleteAvatar, setDeleteAvatar] = useState(false);
  const [deleteCover, setDeleteCover] = useState(false);
  const [imageHash, setImageHash] = useState(Date.now());
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const activeStoryUserIds = useActiveStoryStatus([viewId]);

  useEffect(() => {
    if (!profileData || isEditing) return;
    setDraftBio(profileData.bio || "");
    setPreviewAvatar(profileData.avatar_url);
    setPreviewCover(profileData.cover_url);
  }, [isEditing, profileData]);

  useEffect(
    () => () => {
      revokeBlobUrl(previewAvatar);
      revokeBlobUrl(previewCover);
    },
    [previewAvatar, previewCover],
  );

  const handleFollowToggle = async () => {
    if (!me || !viewId || isOwnProfile || isFollowLoading) return;
    if (profileData?.role === "admin") {
      notify.warning("Admin accounts cannot be followed.");
      return;
    }

    setIsFollowLoading(true);
    try {
      const result = isFollowing
        ? await supabase
            .from("follows")
            .delete()
            .eq("follower_id", me.id)
            .eq("following_id", viewId)
        : await supabase.from("follows").insert({
            follower_id: me.id,
            following_id: viewId,
          });

      if (result.error && result.error.code !== "23505") {
        throw result.error;
      }

      await fetchFollowData();
    } catch (error) {
      console.error("Failed to update follow:", error);
      notify.error(error, "Failed to update follow.");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleAvatarSelect = (file: File) => {
    revokeBlobUrl(previewAvatar);
    setDraftAvatarFile(file);
    setPreviewAvatar(URL.createObjectURL(file));
    setDeleteAvatar(false);
  };

  const handleCoverSelect = (file: File) => {
    revokeBlobUrl(previewCover);
    setDraftCoverFile(file);
    setPreviewCover(URL.createObjectURL(file));
    setDeleteCover(false);
  };

  const handleRemoveAvatar = () => {
    revokeBlobUrl(previewAvatar);
    setDraftAvatarFile(null);
    setPreviewAvatar(null);
    setDeleteAvatar(true);
  };

  const handleRemoveCover = () => {
    revokeBlobUrl(previewCover);
    setDraftCoverFile(null);
    setPreviewCover(null);
    setDeleteCover(true);
  };

  const handleCancelEdit = () => {
    revokeBlobUrl(previewAvatar);
    revokeBlobUrl(previewCover);
    setDraftBio(profileData?.bio || "");
    setPreviewAvatar(profileData?.avatar_url || null);
    setPreviewCover(profileData?.cover_url || null);
    setDraftAvatarFile(null);
    setDraftCoverFile(null);
    setDeleteAvatar(false);
    setDeleteCover(false);
    setIsEditing(false);
  };

  const uploadProfileImage = async (
    file: File,
    type: "avatar" | "cover",
  ) => {
    if (!me) return null;
    const fileExtension = file.name.split(".").pop() || "jpg";
    const filePath = `${me.id}/${type}_${Date.now()}.${fileExtension}`;
    const { error } = await supabase.storage
      .from("public_profiles")
      .upload(filePath, file, { contentType: file.type });
    if (error) throw error;
    return supabase.storage.from("public_profiles").getPublicUrl(filePath).data
      .publicUrl;
  };

  const handleSaveProfile = async () => {
    if (!me || !profileData) return;
    setIsSaving(true);

    try {
      let finalAvatarUrl = profileData.avatar_url;
      let finalCoverUrl = profileData.cover_url;

      if (draftAvatarFile) {
        finalAvatarUrl = await uploadProfileImage(draftAvatarFile, "avatar");
      } else if (deleteAvatar) {
        finalAvatarUrl = null;
      }

      if (draftCoverFile) {
        finalCoverUrl = await uploadProfileImage(draftCoverFile, "cover");
      } else if (deleteCover) {
        finalCoverUrl = null;
      }

      const { error } = await supabase
        .from("user_profiles")
        .update({
          bio: draftBio,
          avatar_url: finalAvatarUrl,
          cover_url: finalCoverUrl,
        })
        .eq("id", me.id);

      if (error) throw error;

      revokeBlobUrl(previewAvatar);
      revokeBlobUrl(previewCover);
      setProfileData(previous =>
        previous
          ? {
              ...previous,
              bio: draftBio,
              avatar_url: finalAvatarUrl,
              cover_url: finalCoverUrl,
            }
          : previous,
      );
      setPreviewAvatar(finalAvatarUrl);
      setPreviewCover(finalCoverUrl);
      await refreshProfile();
      setImageHash(Date.now());
      setIsEditing(false);
      setDraftAvatarFile(null);
      setDraftCoverFile(null);
      setDeleteAvatar(false);
      setDeleteCover(false);
    } catch (error) {
      notify.error(error, "Error saving profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason || !me || !viewId || isOwnProfile || isReporting) return;
    if (profileData?.role === "admin") {
      notify.warning("Admin accounts cannot be reported here.");
      return;
    }

    setIsReporting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: me.id,
        reported_user_id: viewId,
        report_type: "user",
        story_id: null,
        reason: reportReason,
        details: reportDetails.trim() || null,
      });

      if (error) throw error;

      setShowReportDialog(false);
      setReportReason("");
      setReportDetails("");
      notify.success("Report submitted for administrator review.");
    } catch (error) {
      console.error("Failed to submit report:", error);
      if (getErrorCode(error) === "23505") {
        notify.warning("You already have a pending report for this user.");
      } else {
        notify.error(error, "Failed to submit report.");
      }
    } finally {
      setIsReporting(false);
    }
  };

  const handleReportDialogChange = (open: boolean) => {
    if (isReporting) return;
    setShowReportDialog(open);
    if (!open) {
      setReportReason("");
      setReportDetails("");
    }
  };

  const getDisplayUrl = (url: string | null) => {
    if (!url) return undefined;
    if (url.startsWith("blob:")) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${imageHash}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!profileData) {
    return <div className="p-8 text-center text-red-500">User not found.</div>;
  }

  if (profileData._isPrivate) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border bg-background p-8 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">This profile is private</h2>
          <p className="text-sm text-muted-foreground">
            The user has chosen to hide their profile activity from others.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const coursesProps = courses.map(course => ({
    id: course.id,
    name: course.name,
    code: course.course_code,
  }));
  const profileRole = String(profileData.role || "");
  const headerRole =
    profileRole === "lecturer" ||
    profileRole === "admin" ||
    profileRole === "staff"
      ? (profileRole as "lecturer" | "admin" | "staff")
      : "student";

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 xl:px-12 2xl:px-14">
        <div className="mb-4 hidden sm:block">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-9 gap-2 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <ProfileHeader
          name={profileData.full_name || profileData.email}
          role={headerRole}
          profileImage={getDisplayUrl(previewAvatar)}
          backgroundImage={getDisplayUrl(previewCover)}
          bio={profileData.bio || ""}
          faculty={profileData.faculty || ""}
          programme={profileData.programme || ""}
          stats={{
            posts: postsCount,
            followers: followersCount,
            following: followingCount,
            courses: courses.length,
          }}
          isEditing={isEditing}
          isOwnProfile={isOwnProfile}
          isSaving={isSaving}
          isFollowing={isFollowing}
          isFollowLoading={isFollowLoading}
          onAvatarChange={handleAvatarSelect}
          onCoverChange={handleCoverSelect}
          onAvatarRemove={handleRemoveAvatar}
          onCoverRemove={handleRemoveCover}
          onEditClick={() => setIsEditing(true)}
          onCancelEdit={handleCancelEdit}
          onSaveClick={handleSaveProfile}
          onFollowClick={handleFollowToggle}
          onReportClick={
            !isOwnProfile && profileData.role !== "admin"
              ? () => setShowReportDialog(true)
              : undefined
          }
          hasActiveStory={Boolean(viewId && activeStoryUserIds.has(viewId))}
          onStoryClick={() => setStoryViewerOpen(true)}
        />

        <div className="mt-5">
          <ProfileTabs
            bio={profileData.bio || ""}
            email={profileData.email || ""}
            faculty={profileData.faculty || ""}
            programme={profileData.programme || ""}
            courses={coursesProps}
            posts={posts}
            followers={followers}
            following={following}
            onUserSelect={userId => navigate(`/profile/${userId}`)}
            isEditing={isEditing}
            draftBio={draftBio}
            onBioChange={setDraftBio}
          />
        </div>

        <ProfileReportDialog
          open={showReportDialog}
          reason={reportReason}
          details={reportDetails}
          isReporting={isReporting}
          onOpenChange={handleReportDialogChange}
          onReasonChange={setReportReason}
          onDetailsChange={setReportDetails}
          onSubmit={handleReport}
        />

        <Stories
          currentUserName={currentUserProfile?.full_name || "Your Story"}
          currentUserInitials={(
            currentUserProfile?.full_name ||
            me?.email ||
            "YS"
          )
            .split(" ")
            .map(part => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
          currentUserAvatar={currentUserProfile?.avatar_url}
          currentUserRole={currentUserProfile?.role}
          mode="viewer"
          targetUser={{
            id: profileData.id,
            name: profileData.full_name || profileData.email || "User",
            avatarUrl: profileData.avatar_url,
            initials:
              (profileData.full_name || profileData.email || "U")
                .charAt(0)
                .toUpperCase(),
            role: profileData.role,
          }}
          open={storyViewerOpen}
          onOpenChange={setStoryViewerOpen}
        />
      </div>
    </div>
  );
};
