import { useMemo, useRef } from "react";
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
import { cn } from "../ui/utils";
import {
  CalendarDays,
  Crown,
  ExternalLink,
  FileText,
  Image,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  Trash2,
  UserMinus,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import type {
  StudyGroupMember,
  StudyGroupMemberCandidate,
  StudyGroupPost,
  StudyGroupSummary,
  StudySession,
} from "./StudyGroupTypes";

type StudyGroupDetailTab = "sessions" | "discussion" | "members";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getActiveMentionQuery = (value: string) => {
  const match = value.match(/(^|\s)@([^\s@]*)$/);
  return match ? match[2].toLowerCase() : null;
};

const isImageAttachment = (post: StudyGroupPost) =>
  Boolean(post.downloadUrl && post.attachment_type?.startsWith("image/"));

const renderMessageContent = (
  content: string,
  members: StudyGroupMember[],
  isOwnPost: boolean,
) => {
  const mentionLabels = [
    "@everyone",
    ...members.map((member) => `@${member.profile.full_name}`),
  ].sort((first, second) => second.length - first.length);

  if (!content || mentionLabels.length === 0) return content;

  const matcher = new RegExp(
    `(${mentionLabels.map(escapeRegExp).join("|")})`,
    "gi",
  );

  return content.split(matcher).map((part, index) => {
    const isMention = mentionLabels.some(
      (label) => label.toLowerCase() === part.toLowerCase(),
    );

    return isMention ? (
      <span
        key={`${part}-${index}`}
        className={cn(
          "rounded px-1 font-semibold",
          isOwnPost
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200",
        )}
      >
        {part}
      </span>
    ) : (
      part
    );
  });
};

type StudyGroupDetailsDialogProps = {
  activeTab: StudyGroupDetailTab;
  detailError: string;
  formatDateTime: (value: string) => string;
  formatFileSize: (value: number | null) => string;
  addMemberCandidates: StudyGroupMemberCandidate[];
  addMemberError: string;
  addMemberSearch: string;
  isGroupActionLoading: boolean;
  isAddingMemberId: string | null;
  isLoadingMemberCandidates: boolean;
  isLoadingDetails: boolean;
  isSavingPost: boolean;
  members: StudyGroupMember[];
  onAddMember: (candidate: StudyGroupMemberCandidate) => void;
  onAddMemberSearchChange: (value: string) => void;
  onCreatePost: () => void;
  onDeleteGroup: (group: StudyGroupSummary) => void;
  onDeletePost: (post: StudyGroupPost) => void;
  onDeleteSession: (session: StudySession) => void;
  onJoinGroup: (group: StudyGroupSummary) => void;
  onLeaveGroup: (group: StudyGroupSummary) => void;
  onOpenChange: (open: boolean) => void;
  onOpenMeetingRoom: (group: StudyGroupSummary) => void;
  onOpenSessionDialog: () => void;
  onActiveTabChange: (value: StudyGroupDetailTab) => void;
  onPostFileChange: (file: File | null) => void;
  onPostContentChange: (value: string) => void;
  onRemoveMember: (member: StudyGroupMember) => void;
  onToggleSessionAttendance: (session: StudySession) => void;
  open: boolean;
  postContent: string;
  postError: string;
  postFile: File | null;
  posts: StudyGroupPost[];
  selectedGroup: StudyGroupSummary;
  sessions: StudySession[];
  userId?: string;
};

export function StudyGroupDetailsDialog({
  activeTab,
  addMemberCandidates,
  addMemberError,
  addMemberSearch,
  detailError,
  formatDateTime,
  formatFileSize,
  isAddingMemberId,
  isGroupActionLoading,
  isLoadingMemberCandidates,
  isLoadingDetails,
  isSavingPost,
  members,
  onAddMember,
  onAddMemberSearchChange,
  onCreatePost,
  onDeleteGroup,
  onDeletePost,
  onDeleteSession,
  onJoinGroup,
  onLeaveGroup,
  onOpenChange,
  onOpenMeetingRoom,
  onOpenSessionDialog,
  onActiveTabChange,
  onPostFileChange,
  onPostContentChange,
  onRemoveMember,
  onToggleSessionAttendance,
  open,
  postContent,
  postError,
  postFile,
  posts,
  selectedGroup,
  sessions,
  userId,
}: StudyGroupDetailsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const orderedPosts = [...posts].sort(
    (first, second) =>
      new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
  );
  const canSubmitPost = Boolean(postContent.trim() || postFile);
  const canAddMembers = selectedGroup.member_count < selectedGroup.max_members;
  const courseCode = selectedGroup.course_code || "General";
  const courseName = selectedGroup.course_name || "Open to everyone";
  const currentTime = Date.now();
  const hasOnlineSession = sessions.some(
    (session) =>
      session.location_type === "online" &&
      new Date(session.ends_at).getTime() >= currentTime,
  );
  const shouldShowMemberCandidates =
    selectedGroup.is_owner && addMemberSearch.trim().length >= 2 && canAddMembers;
  const mentionQuery = getActiveMentionQuery(postContent);
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];

    const options = [
      {
        id: "everyone",
        label: "everyone",
        name: "Everyone",
        avatar_url: null,
        description: `${members.length} members`,
      },
      ...members.map((member) => ({
        id: member.user_id,
        label: member.profile.full_name,
        name: member.profile.full_name,
        avatar_url: member.profile.avatar_url,
        description: member.role,
      })),
    ];

    return options
      .filter((option) =>
        option.label.toLowerCase().includes(mentionQuery),
      )
      .slice(0, 6);
  }, [members, mentionQuery]);

  const insertMention = (label: string) => {
    onPostContentChange(
      postContent.replace(/(^|\s)@([^\s@]*)$/, `$1@${label} `),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{courseCode}</Badge>
            {selectedGroup.is_owner && (
              <Badge className="bg-amber-100 text-amber-800">
                <Crown className="mr-1 h-3 w-3" />
                Owner
              </Badge>
            )}
          </div>
          <DialogTitle className="text-2xl">{selectedGroup.name}</DialogTitle>
          <DialogDescription>{courseName}</DialogDescription>
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
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              onActiveTabChange(value as StudyGroupDetailTab)
            }
            className="min-h-96"
          >
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
                <div className="flex flex-wrap gap-2">
                  {hasOnlineSession && (
                    <Button
                      variant="outline"
                      className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                      onClick={() => onOpenMeetingRoom(selectedGroup)}
                    >
                      <Video className="h-4 w-4" />
                      Open Meeting Room
                    </Button>
                  )}
                  {selectedGroup.is_owner && (
                    <Button onClick={onOpenSessionDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      New Session
                    </Button>
                  )}
                </div>
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

            <TabsContent value="discussion" className="pt-4">
              <div className="flex h-[560px] max-h-[62vh] flex-col overflow-hidden rounded-md border bg-background">
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                  <div>
                    <h3 className="font-semibold">Group Chat</h3>
                    <p className="text-sm text-muted-foreground">
                      {members.length} members in this study group
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4">
                  {orderedPosts.length > 0 ? (
                    orderedPosts.map((post) => {
                      const isOwnPost = post.author_id === userId;
                      const isResourcePost =
                        post.post_type === "resource" || Boolean(post.resource_url);
                      const hasImageAttachment = isImageAttachment(post);
                      const hasFileAttachment =
                        Boolean(post.downloadUrl) && !hasImageAttachment;
                      const isImageOnlyPost =
                        hasImageAttachment &&
                        !post.content &&
                        !post.title &&
                        !post.resource_url;

                      return (
                        <div
                          key={post.id}
                          className={cn(
                            "flex items-end gap-2",
                            isOwnPost && "justify-end",
                          )}
                        >
                          {!isOwnPost && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={post.author.avatar_url || undefined} />
                              <AvatarFallback>
                                {getInitials(post.author.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "flex max-w-[78%] flex-col space-y-1",
                              isOwnPost && "items-end",
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-center gap-2 text-xs text-muted-foreground",
                                isOwnPost && "justify-end",
                              )}
                            >
                              <span>{isOwnPost ? "You" : post.author.full_name}</span>
                              <span>{formatDateTime(post.created_at)}</span>
                              {isOwnPost && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                                  title="Delete message"
                                  onClick={() => onDeletePost(post)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              )}
                            </div>
                            <div
                              className={cn(
                                "rounded-2xl text-sm",
                                isImageOnlyPost
                                  ? "overflow-hidden"
                                  : "px-4 py-3 shadow-sm",
                                isOwnPost && !isImageOnlyPost
                                  ? "rounded-br-sm bg-primary text-primary-foreground"
                                  : "rounded-bl-sm border bg-background",
                                isOwnPost && isImageOnlyPost && "rounded-br-sm",
                              )}
                            >
                              {isResourcePost && (
                                <div
                                  className={cn(
                                    "mb-2 flex items-center gap-2 text-xs font-medium",
                                    isOwnPost
                                      ? "text-primary-foreground/80"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Resource
                                </div>
                              )}
                              {post.title && (
                                <p className="mb-1 font-semibold">{post.title}</p>
                              )}
                              {post.content && (
                                <p className="whitespace-pre-wrap leading-5">
                                  {renderMessageContent(
                                    post.content,
                                    members,
                                    isOwnPost,
                                  )}
                                </p>
                              )}
                              {hasImageAttachment && post.downloadUrl && (
                                <a
                                  href={post.downloadUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cn(
                                    "block",
                                    !isImageOnlyPost && "mt-3",
                                  )}
                                >
                                  <img
                                    src={post.downloadUrl}
                                    alt={post.attachment_name || "Image attachment"}
                                    className={cn(
                                      "max-h-64 w-full object-cover",
                                      !isImageOnlyPost && "rounded-md",
                                    )}
                                  />
                                </a>
                              )}
                              {(post.resource_url || hasFileAttachment) && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {post.resource_url && (
                                    <Button variant="secondary" size="sm" asChild>
                                      <a
                                        href={post.resource_url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open Resource
                                      </a>
                                    </Button>
                                  )}
                                  {post.downloadUrl && hasFileAttachment && (
                                    <Button variant="secondary" size="sm" asChild>
                                      <a
                                        href={post.downloadUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <FileText className="mr-2 h-4 w-4" />
                                        {post.attachment_name || "Download File"}
                                        {post.attachment_size
                                          ? ` - ${formatFileSize(post.attachment_size)}`
                                          : ""}
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <MessageCircle className="mb-3 h-9 w-9 text-muted-foreground/40" />
                      <p className="font-medium">No messages yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Start the group conversation.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t bg-background p-4">
                  {mentionSuggestions.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-md border bg-background shadow-sm">
                      {mentionSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                          onClick={() => insertMention(suggestion.label)}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={suggestion.avatar_url || undefined} />
                            <AvatarFallback>
                              {suggestion.id === "everyone"
                                ? "@"
                                : getInitials(suggestion.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              @{suggestion.label}
                            </p>
                            <p className="text-xs capitalize text-muted-foreground">
                              {suggestion.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {postFile && (
                    <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                      {postFile.type.startsWith("image/") ? (
                        <Image className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {postFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(postFile.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label="Remove attachment"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                          onPostFileChange(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(event) =>
                        onPostFileChange(event.target.files?.[0] || null)
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 px-3"
                      disabled={isSavingPost}
                      aria-label="Attach file"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                          fileInputRef.current.click();
                        }
                      }}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Textarea
                      value={postContent}
                      onChange={(event) => onPostContentChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing &&
                          canSubmitPost &&
                          !isSavingPost
                        ) {
                          event.preventDefault();
                          onCreatePost();
                        }
                      }}
                      placeholder="Message this study group..."
                      className="min-h-11 resize-none"
                    />
                    <Button
                      type="button"
                      className="h-11 px-3"
                      disabled={isSavingPost || !canSubmitPost}
                      aria-label="Send message"
                      onClick={onCreatePost}
                    >
                      {isSavingPost ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {postError && <p className="text-sm text-red-600">{postError}</p>}
                </div>
              </div>
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

              {selectedGroup.is_owner && (
                <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold">Add Member</h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedGroup.course_id
                          ? `Search students enrolled in ${courseCode}.`
                          : "Search anyone in SUCCMS."}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {selectedGroup.member_count}/{selectedGroup.max_members}
                    </Badge>
                  </div>
                  <div className="relative">
                    <Input
                      value={addMemberSearch}
                      onChange={(event) =>
                        onAddMemberSearchChange(event.target.value)
                      }
                      placeholder="Search by name or username..."
                      disabled={!canAddMembers}
                      className="pr-9"
                    />
                    {isLoadingMemberCandidates && (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {addMemberError && (
                    <p className="text-sm text-red-600">{addMemberError}</p>
                  )}
                  {!canAddMembers ? (
                    <p className="text-sm text-muted-foreground">
                      This study group is full.
                    </p>
                  ) : shouldShowMemberCandidates ? (
                    addMemberCandidates.length > 0 ? (
                      <div className="divide-y rounded-md border bg-background">
                        {addMemberCandidates.map((candidate) => (
                          <div
                            key={candidate.user_id}
                            className="flex items-center gap-3 p-3"
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarImage
                                src={candidate.avatar_url || undefined}
                              />
                              <AvatarFallback>
                                {getInitials(candidate.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {candidate.full_name}
                              </p>
                              <p className="text-xs capitalize text-muted-foreground">
                                {candidate.role}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="gap-2"
                              disabled={Boolean(isAddingMemberId)}
                              onClick={() => onAddMember(candidate)}
                            >
                              {isAddingMemberId === candidate.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserPlus className="h-4 w-4" />
                              )}
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !isLoadingMemberCandidates && (
                        <p className="text-sm text-muted-foreground">
                          No available students found.
                        </p>
                      )
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Type at least 2 characters to search.
                    </p>
                  )}
                </div>
              )}

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
