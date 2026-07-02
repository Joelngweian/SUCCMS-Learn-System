"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { ProfileInfo } from "./profile-info"
import { CoursesSection } from "./courses-section"
import { Grid3x3, UserCheck, Users, ImageIcon } from "lucide-react"

interface Course {
  id: string
  name: string
  code: string
}

interface ProfileConnection {
  user_id: string
  user_profiles: {
    id: string
    full_name: string
    avatar_url: string | null
    role: string
  }
}

interface ProfileTabsProps {
  bio: string
  email?: string
  faculty: string
  programme: string
  courses: Course[]
  followers?: ProfileConnection[]
  following?: ProfileConnection[]
  onUserSelect?: (userId: string) => void
  isEditing?: boolean
  draftBio?: string
  onBioChange?: (bio: string) => void
}

function ConnectionsList({
  connections,
  emptyMessage,
  onUserSelect,
}: {
  connections: ProfileConnection[]
  emptyMessage: string
  onUserSelect?: (userId: string) => void
}) {
  if (connections.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {connections.map((connection) => (
        <button
          key={connection.user_id}
          type="button"
          className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/50"
          onClick={() => onUserSelect?.(connection.user_id)}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
            {connection.user_profiles.avatar_url ? (
              <img
                src={connection.user_profiles.avatar_url}
                alt={connection.user_profiles.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold">
                {connection.user_profiles.full_name?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">
              {connection.user_profiles.full_name}
            </h3>
            <p className="text-sm capitalize text-muted-foreground">
              {connection.user_profiles.role}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}

export function ProfileTabs({ bio, email, faculty, programme, courses, followers = [], following = [], onUserSelect, isEditing = false, draftBio = "", onBioChange }: ProfileTabsProps) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <div className="-mx-3 overflow-x-auto border-t bg-card px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:overflow-visible sm:px-0">
        <TabsList
          className="grid h-12 min-w-max grid-cols-[repeat(4,max-content)] rounded-none bg-transparent sm:w-full sm:min-w-0 sm:grid-cols-4"
        >
          <TabsTrigger value="profile" className="min-w-24 gap-2 px-4 sm:min-w-0">
            <Grid3x3 className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="courses" className="min-w-24 gap-2 px-4 sm:min-w-0">
            <ImageIcon className="h-4 w-4" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="followers" className="min-w-28 gap-2 px-4 sm:min-w-0">
            <UserCheck className="h-4 w-4" />
            Followers
          </TabsTrigger>
          <TabsTrigger value="following" className="min-w-28 gap-2 px-4 sm:min-w-0">
            <Users className="h-4 w-4" />
            Following
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="profile" className="mt-4 sm:mt-6">
        <ProfileInfo bio={bio} email={email} faculty={faculty} programme={programme} isEditing={isEditing} draftBio={draftBio} onBioChange={onBioChange} />
      </TabsContent>

      <TabsContent value="courses" className="mt-4 sm:mt-6">
        <CoursesSection courses={courses} />
      </TabsContent>

      <TabsContent value="followers" className="mt-4 sm:mt-6">
        <div className="rounded-lg border bg-card">
          <ConnectionsList
            connections={followers}
            emptyMessage="No followers yet"
            onUserSelect={onUserSelect}
          />
        </div>
      </TabsContent>

      <TabsContent value="following" className="mt-4 sm:mt-6">
        <div className="rounded-lg border bg-card">
          <ConnectionsList
            connections={following}
            emptyMessage="Not following anyone yet"
            onUserSelect={onUserSelect}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}
