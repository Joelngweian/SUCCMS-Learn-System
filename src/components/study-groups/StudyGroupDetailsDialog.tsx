import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import {
  BookOpen,
  CalendarDays,
  Crown,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Paperclip,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
  Video,
} from "lucide-react";
import type {
  StudyGroupMember,
  StudyGroupPost,
  StudyGroupSummary,
  StudySession,
} from "./StudyGroupTypes";

type StudyGroupPostType = "discussion" | "resource";

type StudyGroupDetailsDialogProps = {
  detailError: string;
  formatDateTime: (value: string) => string;
  formatFileSize: (value: number | null) => string;
  isGroupActionLoading: boolean;
  isLoadingDetails: boolean;
  isSavingPost: boolean;
  members: StudyGroupMember[];
  onCreatePost: () => void;
  onDeleteGroup: (group: StudyGroupSummary) => void;
  onDeletePost: (post: StudyGroupPost) => void;
  onDeleteSession: (session: StudySession) => void;
  onJoinGroup: (group: StudyGroupSummary) => void;
  onLeaveGroup: (group: StudyGroupSummary) => void;
  onOpenChange: (open: boolean) => void;
  onOpenSessionDialog: () => void;
  onPostContentChange: (value: string) => void;
  onPostFileChange: (file: File | null) => void;
  onPostTitleChange: (value: string) => void;
  onPostTypeChange: (value: StudyGroupPostType) => void;
  onRemoveMember: (member: StudyGroupMember) => void;
  onResourceUrlChange: (value: string) => void;
  onToggleSessionAttendance: (session: StudySession) => void;
  open: boolean;
  postContent: string;
  postError: string;
  postFile: File | null;
  posts: StudyGroupPost[];
  postTitle: string;
  postType: StudyGroupPostType;
  resourceUrl: string;
  selectedGroup: StudyGroupSummary;
  sessions: StudySession[];
  userId?: string;
};

export function StudyGroupDetailsDialog({
  detailError,
  formatDateTime,
  formatFileSize,
  isGroupActionLoading,
  isLoadingDetails,
  isSavingPost,
  members,
  onCreatePost,
  onDeleteGroup,
  onDeletePost,
  onDeleteSession,
  onJoinGroup,
  onLeaveGroup,
  onOpenChange,
  onOpenSessionDialog,
  onPostContentChange,
  onPostFileChange,
  onPostTitleChange,
  onPostTypeChange,
  onRemoveMember,
  onResourceUrlChange,
  onToggleSessionAttendance,
  open,
  postContent,
  postError,
  postFile,
  posts,
  postTitle,
  postType,
  resourceUrl,
  selectedGroup,
  sessions,
  userId,
}: StudyGroupDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{selectedGroup.course_code}</Badge>
            {selectedGroup.is_owner && (
              <Badge className="bg-amber-100 text-amber-800">
                <Crown className="mr-1 h-3 w-3" />
                Owner
              </Badge>
            )}
          </div>
          <DialogTitle className="text-2xl">{selectedGroup.name}</DialogTitle>
          <DialogDescription>{selectedGroup.course_name}</DialogDescription>
        </DialogHeader>

        {detailError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {detailError}
          </div>
        )}

        {!selectedGroup.is_member ? (
          <div className="space-y-6 py-4">
            <p className="text-sm text-muted-foreground">
              {selectedGroup.description || "No description provided."}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="mt-1 text-xl font-semibold">
                  {selectedGroup.member_count}/{selectedGroup.max_members}
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="mt-1 font-semibold">{selectedGroup.creator_name}</p>
              </div>
            </div>
            <Button
              className="w-full"
              disabled={
                isGroupActionLoading ||
                selectedGroup.member_count >= selectedGroup.max_members
              }
              onClick={() => onJoinGroup(selectedGroup)}
            >
              {isGroupActionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              {selectedGroup.member_count >= selectedGroup.max_members
                ? "Group Full"
                : "Join Group"}
            </Button>
          </div>
        ) : isLoadingDetails ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="sessions" className="min-h-96">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="space-y-4 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Study Sessions</h3>
                  <p className="text-sm text-muted-foreground">
                    Plan focused online or in-person study time.
                  </p>
                </div>
                {selectedGroup.is_owner && (
                  <Button onClick={onOpenSessionDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Session
                  </Button>
                )}
              </div>

              {sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <Card key={session.id}>
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-semibold">{session.title}</h4>
                            {session.description && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {session.description}
                              </p>
                            )}
                          </div>
                          {selectedGroup.is_owner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteSession(session)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-3 text-sm md:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            {formatDateTime(session.starts_at)}
                          </div>
                          <div className="flex items-center gap-2">
                            {session.location_type === "online" ? (
                              <Video className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            )}
                            {session.location_type === "online"
                              ? "Online session"
                              : session.location_text}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-sm text-muted-foreground">
                            {session.attendeeCount}
                            {session.max_attendees ? `/${session.max_attendees}` : ""} attending
                          </span>
                          <div className="flex gap-2">
                            {session.meeting_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={session.meeting_url} target="_blank" rel="noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Open Link
                                </a>
                              </Button>
                            )}
                            <Button
                              variant={session.isGoing ? "outline" : "default"}
                              size="sm"
                              onClick={() => onToggleSessionAttendance(session)}
                            >
                              {session.isGoing ? "Cancel Attendance" : "I Will Attend"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed py-12 text-center">
                  <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="font-medium">No sessions scheduled</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="discussion" className="space-y-5 pt-4">
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={postType === "discussion" ? "default" : "outline"}
                      onClick={() => {
                        onPostTypeChange("discussion");
                        onResourceUrlChange("");
                        onPostFileChange(null);
                      }}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Discussion
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={postType === "resource" ? "default" : "outline"}
                      onClick={() => onPostTypeChange("resource")}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Resource
                    </Button>
                  </div>
                  <Input
                    value={postTitle}
                    onChange={(event) => onPostTitleChange(event.target.value)}
                    placeholder={
                      postType === "resource"
                        ? "Resource title"
                        : "Discussion title (optional)"
                    }
                  />
                  <Textarea
                    value={postContent}
                    onChange={(event) => onPostContentChange(event.target.value)}
                    placeholder="Write a message for your group..."
                  />
                  {postType === "resource" && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={resourceUrl}
                          onChange={(event) => onResourceUrlChange(event.target.value)}
                          placeholder="https://..."
                          className="pl-9"
                        />
                      </div>
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm hover:bg-muted/40">
                        <Paperclip className="h-4 w-4" />
                        {postFile ? postFile.name : "Attach a file (maximum 20 MB)"}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(event) => onPostFileChange(event.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  )}
                  {postError && <p className="text-sm text-red-600">{postError}</p>}
                  <div className="flex justify-end">
                    <Button disabled={isSavingPost} onClick={onCreatePost}>
                      {isSavingPost && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Post
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {posts.length > 0 ? (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <Card key={post.id}>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={post.author.avatar_url || undefined} />
                              <AvatarFallback>
                                {post.author.full_name
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold">{post.author.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(post.created_at)}
                              </p>
                            </div>
                          </div>
                          {(post.author_id === userId || selectedGroup.is_owner) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeletePost(post)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                        <div>
                          {post.title && <p className="font-semibold">{post.title}</p>}
                          {post.content && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                              {post.content}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {post.resource_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={post.resource_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open Resource
                              </a>
                            </Button>
                          )}
                          {post.downloadUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={post.downloadUrl} target="_blank" rel="noreferrer">
                                <FileText className="mr-2 h-4 w-4" />
                                {post.attachment_name || "Download File"}
                                {post.attachment_size
                                  ? ` · ${formatFileSize(post.attachment_size)}`
                                  : ""}
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed py-12 text-center">
                  <MessageCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="font-medium">No group posts yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="members" className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Group Members</h3>
                  <p className="text-sm text-muted-foreground">
                    {members.length}/{selectedGroup.max_members} members
                  </p>
                </div>
                {selectedGroup.is_owner ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isGroupActionLoading}
                    onClick={() => onDeleteGroup(selectedGroup)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Group
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isGroupActionLoading}
                    onClick={() => onLeaveGroup(selectedGroup)}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Leave Group
                  </Button>
                )}
              </div>
              <div className="divide-y rounded-md border">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.profile.full_name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.profile.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    {member.role === "owner" ? (
                      <Badge className="bg-amber-100 text-amber-800">
                        <Crown className="mr-1 h-3 w-3" />
                        Owner
                      </Badge>
                    ) : (
                      selectedGroup.is_owner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Remove member"
                          onClick={() => onRemoveMember(member)}
                        >
                          <UserMinus className="h-4 w-4 text-red-500" />
                        </Button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
