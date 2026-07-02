"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Pencil, Camera, Trash2 } from "lucide-react"
import { StoryAvatarRing } from "../stories/StoryAvatarRing"

interface ProfileHeaderProps {
  name: string
  role: "student" | "lecturer" | "staff" | "admin"
  profileImage?: string
  backgroundImage?: string
  bio: string
  stats: {
    posts: number
    followers: number
    following: number
  }
  isEditing?: boolean
  onAvatarChange?: (file: File) => void
  onCoverChange?: (file: File) => void
  onAvatarRemove?: () => void
  onCoverRemove?: () => void
  hasActiveStory?: boolean
  onStoryClick?: () => void
}

export function ProfileHeader({ name, role, profileImage, backgroundImage, bio, stats, isEditing = false, onAvatarChange, onCoverChange, onAvatarRemove, onCoverRemove, hasActiveStory = false, onStoryClick }: ProfileHeaderProps) {
  const [isHoveringBg, setIsHoveringBg] = useState(false)
  const [isHoveringProfile, setIsHoveringProfile] = useState(false)

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
    <div className="mb-0 overflow-hidden rounded-xl bg-card shadow-sm border">
      {/* Background Image */}
      <div
        className="relative h-24 w-full bg-gradient-to-br from-blue-100 to-purple-100 sm:h-32"
        onMouseEnter={() => setIsHoveringBg(true)}
        onMouseLeave={() => setIsHoveringBg(false)}
      >
        {backgroundImage ? (
          <img
            src={backgroundImage}
            alt="Cover"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100" />
        )}
        
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

      {/* Profile Section with proper spacing */}
      <div className="relative px-4 pb-4 sm:px-6">
        {/* Profile Picture - positioned with enough top padding */}
        <div className="flex items-end justify-between -mt-10 sm:-mt-12">
          <div
            className={`relative ${hasActiveStory && !isEditing ? "cursor-pointer" : ""}`}
            onMouseEnter={() => setIsHoveringProfile(true)}
            onMouseLeave={() => setIsHoveringProfile(false)}
            onClick={() => {
              if (!isEditing && hasActiveStory) onStoryClick?.()
            }}
            role={hasActiveStory && !isEditing ? "button" : undefined}
            tabIndex={hasActiveStory && !isEditing ? 0 : undefined}
            onKeyDown={event => {
              if (
                !isEditing &&
                hasActiveStory &&
                (event.key === "Enter" || event.key === " ")
              ) {
                event.preventDefault()
                onStoryClick?.()
              }
            }}
          >
            <StoryAvatarRing active={hasActiveStory && !isEditing}>
              <Avatar className="h-24 w-24 border-4 border-card shadow-xl sm:h-32 sm:w-32">
                {profileImage && (
                  <AvatarImage src={profileImage} className="object-cover" />
                )}
                <AvatarFallback className="text-3xl font-bold sm:text-4xl">
                  {name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </StoryAvatarRing>
            
            {isEditing && isHoveringProfile && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                <div className="flex flex-col items-center gap-1">
                  <button onClick={handleAvatarClick} className="text-white hover:scale-110 transition-transform">
                    <Camera className="h-8 w-8" />
                  </button>
                  <button onClick={onAvatarRemove} className="text-red-500 hover:scale-110 transition-transform mt-2 bg-white rounded-full p-1 z-50">
                    <Trash2 className="h-6 w-6" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Info - positioned below avatar with proper spacing */}
        <div className="mt-3">
          <h1 className="text-xl font-bold sm:text-2xl">{name}</h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{role}</p>

          {/* Stats Row */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 sm:flex sm:gap-6">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold">{stats.posts}</span>
              <span className="text-sm text-muted-foreground">posts</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold">{stats.followers.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">followers</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold">{stats.following.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">following</span>
            </div>
          </div>

          {/* Bio */}
          {bio && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{bio}</p>}
        </div>
      </div>
    </div>
  )
}
