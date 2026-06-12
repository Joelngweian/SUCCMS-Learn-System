import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext.tsx"
import { supabase } from "@/lib/supabase.ts"
import { REPORT_REASON_OPTIONS } from "@/lib/reporting"
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings"

import { ProfileHeader } from "./profile/profile-header"
import { ProfileTabs } from "./profile/profile-tags"

import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Loader2, Pencil, Save, Flag } from "lucide-react"

type Role = "student" | "lecturer"

interface ConnectedProfile {
  user_id: string
  user_profiles: {
    id: string
    full_name: string
    avatar_url: string | null
    role: string
  }
}

export const UserProfile = () => {
  const { userId: routeUserId } = useParams()
  const navigate = useNavigate()
  const { user: me, refreshProfile } = useAuth()

  const viewId = routeUserId || me?.id || null
  const isOwnProfile = me?.id === viewId

  // Data state
  const [profileData, setProfileData] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followers, setFollowers] = useState<ConnectedProfile[]>([])
  const [following, setFollowing] = useState<ConnectedProfile[]>([])

  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [isReporting, setIsReporting] = useState(false)

  // Edit drafts
  const [draftBio, setDraftBio] = useState("")
  const [draftAvatarFile, setDraftAvatarFile] = useState<File | null>(null)
  const [draftCoverFile, setDraftCoverFile] = useState<File | null>(null)
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)
  const [previewCover, setPreviewCover] = useState<string | null>(null)
  const [deleteAvatar, setDeleteAvatar] = useState(false)
  const [deleteCover, setDeleteCover] = useState(false)
  const [imageHash, setImageHash] = useState(Date.now())

  useEffect(() => {
    if (!viewId) return
    setIsFollowing(false)
    setFollowers([])
    setFollowing([])
    fetchFullProfile()
  }, [viewId, me?.id])

  const fetchFollowData = async () => {
    if (!viewId) return

    const [followersResult, followingResult, currentFollowResult] =
      await Promise.all([
        supabase
          .from("follows")
          .select(
            "follower_id, user_profiles!follows_follower_id_fkey(id, full_name, avatar_url, role)",
            { count: "exact" }
          )
          .eq("following_id", viewId)
          .order("created_at", { ascending: false }),
        supabase
          .from("follows")
          .select(
            "following_id, user_profiles!follows_following_id_fkey(id, full_name, avatar_url, role)",
            { count: "exact" }
          )
          .eq("follower_id", viewId)
          .order("created_at", { ascending: false }),
        !isOwnProfile && me
          ? supabase
              .from("follows")
              .select("id")
              .eq("follower_id", me.id)
              .eq("following_id", viewId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

    if (followersResult.error) throw followersResult.error
    if (followingResult.error) throw followingResult.error
    if (currentFollowResult.error) throw currentFollowResult.error

    const getRelatedProfile = (value: any) =>
      Array.isArray(value) ? value[0] : value

    setFollowersCount(followersResult.count || 0)
    setFollowingCount(followingResult.count || 0)
    setFollowers(
      (followersResult.data || [])
        .map((row: any) => ({
          user_id: row.follower_id,
          user_profiles: getRelatedProfile(row.user_profiles),
        }))
        .filter((row: ConnectedProfile) => Boolean(row.user_profiles))
    )
    setFollowing(
      (followingResult.data || [])
        .map((row: any) => ({
          user_id: row.following_id,
          user_profiles: getRelatedProfile(row.user_profiles),
        }))
        .filter((row: ConnectedProfile) => Boolean(row.user_profiles))
    )
    setIsFollowing(Boolean(currentFollowResult.data))
  }

  const fetchFullProfile = async () => {
    setIsLoading(true)
    try {
      const { data: userProfile } = await supabase.from("user_profiles").select("*").eq("id", viewId).single()

      // Check visibility
      if (!isOwnProfile) {
        const { data: visibility } = await supabase.rpc("get_profile_visibility", { target_user_id: viewId });
        const currentVisibility = visibility || "everyone";

        if (currentVisibility === "nobody") {
          setIsLoading(false);
          setProfileData({ ...userProfile, _isPrivate: true });
          return;
        }
        // Basic 'enrolled' check could be added here if needed
      }

      setProfileData(userProfile)
      setDraftBio(userProfile?.bio || "")
      setPreviewAvatar(userProfile?.avatar_url || null)
      setPreviewCover(userProfile?.cover_url || null)

      // Courses
      if (userProfile?.role === "lecturer") {
        const { data: taught } = await supabase
          .from("course_instructors")
          .select(`course_offerings(${COURSE_OFFERING_SELECT})`)
          .eq("user_id", viewId)
        setCourses(
          taught
            ?.map((row: any) => normalizeCourseOffering(row.course_offerings))
            .filter((course: any) => course.id) || []
        )
      } else {
        const { data: enrolled } = await supabase
          .from("course_enrollments")
          .select(`course_offerings(${COURSE_OFFERING_SELECT})`)
          .eq("student_id", viewId)
        setCourses(
          enrolled
            ?.map((row: any) => normalizeCourseOffering(row.course_offerings))
            .filter((course: any) => course.id) || []
        )
      }

      // Posts
      const { data: userPosts } = await supabase
        .from("course_posts")
        .select(`*, course_offerings(${COURSE_OFFERING_SELECT})`)
        .eq("author_id", viewId)
        .order("created_at", { ascending: false })
      setPosts(
        (userPosts || []).map((post: any) => ({
          ...post,
          courses: normalizeCourseOffering(post.course_offerings),
        }))
      )

      await fetchFollowData()
    } catch (e) {
      console.error("Error fetching profile", e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!me || !viewId || isOwnProfile || isFollowLoading) return
    if (profileData?.role === "admin") {
      alert("Admin accounts cannot be followed.")
      return
    }

    setIsFollowLoading(true)
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
          })

      if (result.error && result.error.code !== "23505") {
        throw result.error
      }

      await fetchFollowData()
    } catch (error: any) {
      console.error("Failed to update follow:", error)
      alert(`Failed to update follow: ${error?.message || "Please try again."}`)
    } finally {
      setIsFollowLoading(false)
    }
  }

  const handleAvatarSelect = (file: File) => {
    const previewUrl = URL.createObjectURL(file)
    setDraftAvatarFile(file)
    setPreviewAvatar(previewUrl)
    setDeleteAvatar(false)
  }

  const handleCoverSelect = (file: File) => {
    const previewUrl = URL.createObjectURL(file)
    setDraftCoverFile(file)
    setPreviewCover(previewUrl)
    setDeleteCover(false)
  }

  const handleRemoveAvatar = () => {
    setDraftAvatarFile(null)
    setPreviewAvatar(null)
    setDeleteAvatar(true)
  }

  const handleRemoveCover = () => {
    setDraftCoverFile(null)
    setPreviewCover(null)
    setDeleteCover(true)
  }

  const handleCancelEdit = () => {
    setDraftBio(profileData?.bio || "")
    setPreviewAvatar(profileData?.avatar_url || null)
    setPreviewCover(profileData?.cover_url || null)
    setDraftAvatarFile(null)
    setDraftCoverFile(null)
    setDeleteAvatar(false)
    setDeleteCover(false)
    setIsEditing(false)
  }

  const handleSaveProfile = async () => {
    if (!me) return
    setIsSaving(true)
    try {
      let finalAvatarUrl = profileData?.avatar_url || null
      let finalCoverUrl = profileData?.cover_url || null

      if (draftAvatarFile) {
        const fileExt = draftAvatarFile.name.split(".").pop()
        const filePath = `${me.id}/avatar_${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from("public_profiles")
          .upload(filePath, draftAvatarFile, { contentType: draftAvatarFile.type })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from("public_profiles").getPublicUrl(filePath)
        finalAvatarUrl = data.publicUrl
      } else if (deleteAvatar) {
        finalAvatarUrl = null
      }

      if (draftCoverFile) {
        const fileExt = draftCoverFile.name.split(".").pop()
        const filePath = `${me.id}/cover_${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from("public_profiles")
          .upload(filePath, draftCoverFile, { contentType: draftCoverFile.type })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from("public_profiles").getPublicUrl(filePath)
        finalCoverUrl = data.publicUrl
      } else if (deleteCover) {
        finalCoverUrl = null
      }

      const { error } = await supabase
        .from("user_profiles")
        .update({ bio: draftBio, avatar_url: finalAvatarUrl, cover_url: finalCoverUrl })
        .eq("id", me.id)

      if (error) throw error

      setProfileData((prev: any) => ({ ...prev, bio: draftBio, avatar_url: finalAvatarUrl, cover_url: finalCoverUrl }))
      await refreshProfile()
      setImageHash(Date.now())
      setIsEditing(false)
      setDraftAvatarFile(null)
      setDraftCoverFile(null)
      setDeleteAvatar(false)
      setDeleteCover(false)
    } catch (e: any) {
      alert("Error saving profile: " + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReport = async () => {
    if (!reportReason || !me || !viewId || isOwnProfile || isReporting) return
    if (profileData?.role === "admin") {
      alert("Admin accounts cannot be reported here.")
      return
    }

    setIsReporting(true)
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: me.id,
        reported_user_id: viewId,
        report_type: "user",
        story_id: null,
        reason: reportReason,
        details: reportDetails.trim() || null,
      })

      if (error) throw error

      setShowReportDialog(false)
      setReportReason("")
      setReportDetails("")
      alert("Report submitted for administrator review.")
    } catch (error: any) {
      console.error("Failed to submit report:", error)
      alert(
        error?.code === "23505"
          ? "You already have a pending report for this user."
          : `Failed to submit report: ${error?.message || "Please try again."}`
      )
    } finally {
      setIsReporting(false)
    }
  }

  const getDisplayUrl = (url: string | null) => {
    if (!url) return undefined
    if (url.startsWith("blob:")) return url
    return `${url}?t=${imageHash}`
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>
  if (!profileData) return <div className="p-8 text-center text-red-500">User not found.</div>

  if (profileData._isPrivate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4 p-8 bg-background rounded-xl border shadow-sm max-w-md text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 className="text-xl font-semibold">This profile is private</h2>
          <p className="text-sm text-muted-foreground">The user has chosen to hide their profile activity from others.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const headerProps = {
    name: profileData.full_name || profileData.email,
    role: (profileData.role as Role) || "student",
    profileImage: getDisplayUrl(previewAvatar) || "/placeholder.svg",
    backgroundImage: getDisplayUrl(previewCover) || "/placeholder.svg",
    bio: profileData.bio || "",
    stats: {
      posts: posts.length,
      followers: followersCount,
      following: followingCount,
    },
  }

  const coursesProps = (courses || []).map((c: any) => ({ id: c.id, name: c.name, code: c.course_code }))
  const activitiesProps = (posts || []).map((p: any) => ({ id: p.id, type: "post", content: p.content, time: new Date(p.created_at).toLocaleString() }))

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-4xl">
        {/* Back */}
        <div className="pt-4 pb-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
        </div>

        <ProfileHeader 
          {...headerProps} 
          isEditing={isEditing}
          onAvatarChange={handleAvatarSelect}
          onCoverChange={handleCoverSelect}
          onAvatarRemove={handleRemoveAvatar}
          onCoverRemove={handleRemoveCover}
        />

        {/* Actions row: edit/follow/report */}
        <div className="flex justify-between items-center gap-2 py-4">
          <div>
            {isEditing && (
              <p className="text-sm text-muted-foreground">Hover over your avatar or cover image to change it</p>
            )}
          </div>
          <div className="flex gap-2">
            {isOwnProfile ? (
              isEditing ? (
                <>
                  <Button variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                  <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-black text-white hover:bg-black/90">
                    {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save Changes
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}><Pencil className="h-4 w-4 mr-2" /> Edit Profile</Button>
              )
            ) : (
              <>
                {profileData.role !== "admin" && (
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                    aria-pressed={isFollowing}
                  >
                    {isFollowLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
                {profileData.role !== "admin" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowReportDialog(true)}
                    title="Report user"
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <ProfileTabs
          bio={profileData.bio || ""}
          email={profileData.email}
          faculty={profileData.faculty || ""}
          programme={profileData.programme || ""}
          courses={coursesProps}
          recentActivity={activitiesProps}
          followers={followers}
          following={following}
          onUserSelect={(userId) => navigate(`/profile/${userId}`)}
          isEditing={isEditing}
          draftBio={draftBio}
          onBioChange={setDraftBio}
        />

        {/* Report dialog */}
        <Dialog
          open={showReportDialog}
          onOpenChange={(open) => {
            if (isReporting) return
            setShowReportDialog(open)
            if (!open) {
              setReportReason("")
              setReportDetails("")
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report User</DialogTitle>
              <DialogDescription>
                Reports are sent privately to platform administrators for review.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASON_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-user-details">Details (Optional)</Label>
              <Textarea
                id="report-user-details"
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                placeholder="Explain what happened..."
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
                onClick={() => setShowReportDialog(false)}
                disabled={isReporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReport}
                disabled={!reportReason || isReporting}
              >
                {isReporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
