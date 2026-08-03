"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { ProfileInfo } from "./profile-info"
import { CoursesSection } from "./courses-section"
import { Clock, FilePenLine, Grid3x3, MessageSquare, UserCheck, Users, ImageIcon } from "lucide-react"
import type { ProfilePost } from "./profileTypes"

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
  posts?: ProfilePost[]
  followers?: ProfileConnection[]
  following?: ProfileConnection[]
  onUserSelect?: (userId: string) => void
  isEditing?: boolean
  draftBio?: string
  onBioChange?: (bio: string) => void
}

const tabClassName =
  "h-12 flex-1 gap-2 rounded-none !border-x-0 !border-t-0 border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground !shadow-none !outline-none !ring-0 transition-colors hover:text-foreground focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 data-[state=active]:border-b-blue-600 data-[state=active]:!bg-transparent data-[state=active]:text-blue-600 data-[state=active]:!shadow-none"

function formatPostDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recent"

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function RecentPostsCard({ posts }: { posts: ProfilePost[] }) {
  const recentPosts = posts.slice(0, 3)

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          Recent Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentPosts.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/10 p-8 text-center">
            <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <FilePenLine className="h-12 w-12" />
            </div>
            <p className="text-xl font-semibold">No posts yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Posts you create or interact with will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentPosts.map(post => (
              <article
                key={post.id}
                className="rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {formatPostDate(post.created_at)}
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  {post.content || "Shared a campus update."}
                </p>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
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

export function ProfileTabs({
  bio,
  email,
  faculty,
  programme,
  courses,
  posts = [],
  followers = [],
  following = [],
  onUserSelect,
  isEditing = false,
  draftBio = "",
  onBioChange,
}: ProfileTabsProps) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <div className="-mx-3 overflow-x-auto bg-background px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:overflow-visible sm:px-0">
        <TabsList className="grid h-auto min-w-max grid-cols-[repeat(4,max-content)] rounded-none border-b bg-transparent p-0 shadow-none sm:w-full sm:min-w-0 sm:grid-cols-4">
          <TabsTrigger value="profile" className={tabClassName}>
            <Grid3x3 className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="courses" className={tabClassName}>
            <ImageIcon className="h-4 w-4" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="followers" className={tabClassName}>
            <UserCheck className="h-4 w-4" />
            Followers
          </TabsTrigger>
          <TabsTrigger value="following" className={tabClassName}>
            <Users className="h-4 w-4" />
            Following
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="profile" className="mt-6">
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
          <RecentPostsCard posts={posts} />
          <ProfileInfo
            bio={bio}
            email={email}
            faculty={faculty}
            programme={programme}
            isEditing={isEditing}
            draftBio={draftBio}
            onBioChange={onBioChange}
          />
        </div>
      </TabsContent>

      <TabsContent value="courses" className="mt-5">
        <CoursesSection courses={courses} />
      </TabsContent>

      <TabsContent value="followers" className="mt-5">
        <Card className="overflow-hidden rounded-2xl shadow-sm">
          <ConnectionsList
            connections={followers}
            emptyMessage="No followers yet"
            onUserSelect={onUserSelect}
          />
        </Card>
      </TabsContent>

      <TabsContent value="following" className="mt-5">
        <Card className="overflow-hidden rounded-2xl shadow-sm">
          <ConnectionsList
            connections={following}
            emptyMessage="Not following anyone yet"
            onUserSelect={onUserSelect}
          />
        </Card>
      </TabsContent>
    </Tabs>
  )
}
