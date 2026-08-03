"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import {
  BookOpen,
  BookOpenCheck,
  Building2,
  Camera,
  FileText,
  Flag,
  Loader2,
  Pencil,
  Save,
  Trash2,
  UserRoundPlus,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { StoryAvatarRing } from "../stories/StoryAvatarRing"

interface ProfileHeaderProps {
  name: string
  role: "student" | "lecturer" | "staff" | "admin"
  profileImage?: string
  backgroundImage?: string
  bio: string
  faculty?: string
  programme?: string
  stats: {
    posts: number
    followers: number
    following: number
    courses: number
  }
  isEditing?: boolean
  isOwnProfile?: boolean
  isSaving?: boolean
  isFollowing?: boolean
  isFollowLoading?: boolean
  onAvatarChange?: (file: File) => void
  onCoverChange?: (file: File) => void
  onAvatarRemove?: () => void
  onCoverRemove?: () => void
  onEditClick?: () => void
  onCancelEdit?: () => void
  onSaveClick?: () => void
  onFollowClick?: () => void
  onReportClick?: () => void
  hasActiveStory?: boolean
  onStoryClick?: () => void
}

const roleLabel: Record<ProfileHeaderProps["role"], string> = {
  admin: "Admin",
  lecturer: "Lecturer",
  staff: "AARO Staff",
  student: "Student",
}

export function ProfileHeader({
  name,
  role,
  profileImage,
  backgroundImage,
  bio,
  faculty,
  programme,
  stats,
  isEditing = false,
  isOwnProfile = false,
  isSaving = false,
  isFollowing = false,
  isFollowLoading = false,
  onAvatarChange,
  onCoverChange,
  onAvatarRemove,
  onCoverRemove,
  onEditClick,
  onCancelEdit,
  onSaveClick,
  onFollowClick,
  onReportClick,
  hasActiveStory = false,
  onStoryClick,
}: ProfileHeaderProps) {
  const [isHoveringBg, setIsHoveringBg] = useState(false)
  const [isHoveringProfile, setIsHoveringProfile] = useState(false)
  const displayProgramme = programme || faculty || "General"
  const displayFaculty = faculty && faculty !== displayProgramme ? faculty : ""
  const statItems = [
    { label: "Posts", value: stats.posts, icon: FileText },
    { label: "Followers", value: stats.followers, icon: Users },
    { label: "Following", value: stats.following, icon: UserRoundPlus },
    { label: "Courses", value: stats.courses, icon: BookOpenCheck },
  ]

  const handleCoverClick = () => {
    if (!isEditing || !onCoverChange) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) onCoverChange(file)
    }
    input.click()
  }

  const handleAvatarClick = () => {
    if (!isEditing || !onAvatarChange) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) onAvatarChange(file)
    }
    input.click()
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-card shadow-sm dark:border-border dark:bg-card">
      <div
        className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 sm:h-40 lg:h-44"
        onMouseEnter={() => setIsHoveringBg(true)}
        onMouseLeave={() => setIsHoveringBg(false)}
      >
        {backgroundImage ? (
          <img
            src={backgroundImage}
            alt="Cover"
            className="h-full w-full object-cover"
          />
        ) : null}
        
        {isEditing && isHoveringBg && (onCoverChange || onCoverRemove) && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 transition-all">
            {onCoverChange && (
              <Button variant="secondary" size="sm" onClick={handleCoverClick}>
                <Camera className="mr-2 h-4 w-4" />
                Change Cover
              </Button>
            )}
            {backgroundImage && onCoverRemove && (
              <Button variant="destructive" size="sm" onClick={onCoverRemove}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="px-6 pb-6 sm:px-8">
        <div className="-mt-10 flex flex-col gap-5 sm:-mt-12 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div
              role={hasActiveStory && !isEditing ? "button" : undefined}
              tabIndex={hasActiveStory && !isEditing ? 0 : undefined}
              className={`relative w-fit shrink-0 rounded-full ${hasActiveStory && !isEditing ? "cursor-pointer" : "cursor-default"}`}
              onMouseEnter={() => setIsHoveringProfile(true)}
              onMouseLeave={() => setIsHoveringProfile(false)}
              onClick={() => {
                if (!isEditing && hasActiveStory) onStoryClick?.()
              }}
              onKeyDown={(event) => {
                if (!hasActiveStory || isEditing) return
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onStoryClick?.()
                }
              }}
              aria-label={hasActiveStory && !isEditing ? `View ${name}'s story` : undefined}
            >
              <StoryAvatarRing active={hasActiveStory && !isEditing}>
                <Avatar className="h-24 w-24 border-[5px] border-background shadow-xl sm:h-28 sm:w-28">
                  {profileImage && (
                    <AvatarImage src={profileImage} className="object-cover" />
                  )}
                  <AvatarFallback className="text-3xl font-bold text-slate-500 sm:text-4xl">
                    {name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </StoryAvatarRing>
              <span className="absolute bottom-2 right-1 h-4 w-4 rounded-full border-[3px] border-background bg-emerald-500" />

              {isEditing && isHoveringProfile && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      className="rounded-full bg-white/90 p-2 text-slate-900 transition-transform hover:scale-110"
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                    {onAvatarRemove && (
                      <button
                        type="button"
                        onClick={onAvatarRemove}
                        className="rounded-full bg-white/90 p-2 text-red-500 transition-transform hover:scale-110"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-10 sm:pt-12">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {roleLabel[role]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {displayProgramme}
                </span>
                {displayFaculty && (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {displayFaculty}
                  </span>
                )}
              </div>
              {bio && (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {bio}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 md:self-end md:justify-end">
            {isOwnProfile ? (
              isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancelEdit}
                    className="rounded-xl"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={onSaveClick}
                    disabled={isSaving}
                    className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Profile
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={onEditClick}
                  className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              )
            ) : (
              <>
                <Button
                  type="button"
                  onClick={onFollowClick}
                  disabled={isFollowLoading}
                  variant={isFollowing ? "outline" : "default"}
                  className={isFollowing ? "rounded-xl" : "rounded-xl bg-blue-600 text-white hover:bg-blue-700"}
                >
                  {isFollowLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                {onReportClick && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onReportClick}
                    className="rounded-xl"
                    title="Report user"
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <p className="mt-5 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Hover over your avatar or cover image to update it.
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border bg-muted/20 sm:grid-cols-4">
          {statItems.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 border-b px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold leading-none">
                  {Number(value).toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
