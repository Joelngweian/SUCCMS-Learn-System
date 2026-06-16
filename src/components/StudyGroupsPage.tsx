import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getNotifyMessage, notify } from "@/lib/notify";
import { confirmAction } from "@/lib/confirm";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
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
import { StudyGroupsBrowser } from "./study-groups/StudyGroupsBrowser";
import {
  CreateStudyGroupDialog,
  StudySessionDialog,
} from "./study-groups/StudyGroupDialogs";
import type {
  EnrolledCourse,
  StudyGroupMember,
  StudyGroupPost,
  StudyGroupSummary,
  StudySession,
} from "./study-groups/StudyGroupTypes";
import {
  createStudyGroup,
  createStudyGroupPost,
  createStudySession,
  deleteStudyGroup,
  deleteStudyGroupPost,
  deleteStudySession,
  dispatchStudySessionReminders,
  joinStudyGroup,
  leaveStudyGroup,
  loadEnrolledStudyGroupCourses,
  loadStudyGroupDetails as loadStudyGroupDetailsData,
  loadStudyGroupPage,
  removeStudyGroupMember,
  setStudySessionAttendance,
} from "./study-groups/studyGroupData";

const GROUP_PAGE_SIZE = 12;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatFileSize = (value: number | null) => {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export function StudyGroupsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [groups, setGroups] = useState<StudyGroupSummary[]>([]);
  const [activeView, setActiveView] = useState<"all" | "joined">("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<{
    createdAt: string;
    id: string;
  } | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newGroup, setNewGroup] = useState({
    courseId: "",
    name: "",
    description: "",
    maxMembers: 12,
  });

  const [selectedGroup, setSelectedGroup] =
    useState<StudyGroupSummary | null>(null);
  const [members, setMembers] = useState<StudyGroupMember[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [posts, setPosts] = useState<StudyGroupPost[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [isGroupActionLoading, setIsGroupActionLoading] = useState(false);

  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [newSession, setNewSession] = useState({
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    locationType: "in_person",
    locationText: "",
    meetingUrl: "",
    maxAttendees: "",
  });

  const [postType, setPostType] = useState<"discussion" | "resource">(
    "discussion"
  );
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [postFile, setPostFile] = useState<File | null>(null);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [postError, setPostError] = useState("");

  const joinedGroups = useMemo(
    () => groups.filter((group) => group.is_member),
    [groups]
  );

  const loadCourses = useCallback(async () => {
    if (!userId) return;
    setCourses(await loadEnrolledStudyGroupCourses(userId));
  }, [userId]);

  const loadGroups = useCallback(async (
    before: { createdAt: string; id: string } | null,
    append: boolean
  ) => {
    if (append) setIsLoadingMore(true);
    else {
      setIsLoading(true);
      setLoadError("");
    }

    try {
      const result = await loadStudyGroupPage({
        before,
        courseFilter,
        joinedOnly: activeView === "joined",
        limit: GROUP_PAGE_SIZE,
        search,
      });
      const page = result.page;
      const lastRow = page[page.length - 1];

      setGroups((current) => (append ? [...current, ...page] : page));
      setHasMore(result.hasMore);
      setCursor(
        lastRow
          ? { createdAt: lastRow.created_at, id: lastRow.id }
          : before
      );
    } catch (error: unknown) {
      console.error("Failed to load study groups:", error);
      setLoadError(
        getNotifyMessage(error,
          "Study groups could not be loaded. Run the study groups migration first."
        )
      );
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [activeView, courseFilter, search]);

  useEffect(() => {
    if (!userId) return;

    void loadCourses().catch((error) => {
      console.error("Failed to load enrolled courses:", error);
    });
    void dispatchStudySessionReminders();
  }, [loadCourses, userId]);

  useEffect(() => {
    if (!userId) return;
    const timeout = window.setTimeout(() => {
      void loadGroups(null, false);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadGroups, userId]);

  const refreshGroups = async () => {
    await loadGroups(null, false);
  };

  const loadGroupDetails = async (group: StudyGroupSummary) => {
    if (!group.is_member || !user) {
      setMembers([]);
      setSessions([]);
      setPosts([]);
      return;
    }

    setIsLoadingDetails(true);
    setDetailError("");

    try {
      const details = await loadStudyGroupDetailsData(group.id, user.id);
      setMembers(details.members);
      setSessions(details.sessions);
      setPosts(details.posts);
    } catch (error: unknown) {
      console.error("Failed to load study group details:", error);
      setDetailError(
        getNotifyMessage(error, "Study group details could not be loaded."),
      );
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const openGroup = (group: StudyGroupSummary) => {
    setSelectedGroup(group);
    void loadGroupDetails(group);
  };

  const handleCreateGroup = async () => {
    if (!newGroup.courseId || !newGroup.name.trim()) return;

    setIsCreating(true);
    setCreateError("");
    try {
      await createStudyGroup({
        courseId: newGroup.courseId,
        description: newGroup.description.trim(),
        maxMembers: newGroup.maxMembers,
        name: newGroup.name.trim(),
      });

      setIsCreateOpen(false);
      setNewGroup({
        courseId: "",
        name: "",
        description: "",
        maxMembers: 12,
      });
      setActiveView("joined");
      await refreshGroups();
      notify.success("Study group created.");
    } catch (error: unknown) {
      setCreateError(
        getNotifyMessage(error, "Failed to create study group."),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGroup = async (group: StudyGroupSummary) => {
    setIsGroupActionLoading(true);
    try {
      await joinStudyGroup(group.id);

      const updatedGroup = {
        ...group,
        is_member: true,
        member_count: group.member_count + 1,
      };
      setSelectedGroup(updatedGroup);
      setGroups((current) =>
        current.map((item) => (item.id === group.id ? updatedGroup : item))
      );
      await loadGroupDetails(updatedGroup);
      notify.success(`Joined ${group.name}.`);
    } catch (error: unknown) {
      setDetailError(getNotifyMessage(error, "Failed to join study group."));
    } finally {
      setIsGroupActionLoading(false);
    }
  };

  const handleLeaveGroup = async (group: StudyGroupSummary) => {
    if (
      !(await confirmAction({
        title: `Leave ${group.name}?`,
        description: "You will lose access to this study group's sessions and posts.",
        confirmLabel: "Leave Group",
        destructive: true,
      }))
    ) return;

    setIsGroupActionLoading(true);
    try {
      await leaveStudyGroup(group.id);

      setSelectedGroup(null);
      await refreshGroups();
      notify.success(`Left ${group.name}.`);
    } catch (error: unknown) {
      setDetailError(getNotifyMessage(error, "Failed to leave study group."));
    } finally {
      setIsGroupActionLoading(false);
    }
  };

  const handleDeleteGroup = async (group: StudyGroupSummary) => {
    if (
      !(await confirmAction({
        title: `Delete ${group.name}?`,
        description:
          "Sessions, posts, and member records will be permanently deleted.",
        confirmLabel: "Delete Group",
        destructive: true,
      }))
    ) return;

    setIsGroupActionLoading(true);
    try {
      await deleteStudyGroup(group.id);

      setSelectedGroup(null);
      await refreshGroups();
      notify.success("Study group deleted.");
    } catch (error: unknown) {
      setDetailError(
        getNotifyMessage(error, "Failed to delete study group."),
      );
    } finally {
      setIsGroupActionLoading(false);
    }
  };

  const handleRemoveMember = async (member: StudyGroupMember) => {
    if (!selectedGroup) return;
    if (
      !(await confirmAction({
        title: `Remove ${member.profile.full_name}?`,
        description: "This member will lose access to the study group.",
        confirmLabel: "Remove",
        destructive: true,
      }))
    ) return;

    try {
      await removeStudyGroupMember({
        groupId: selectedGroup.id,
        userId: member.user_id,
      });
    } catch (error) {
      setDetailError(getNotifyMessage(error, "Failed to remove member."));
      return;
    }

    setMembers((current) =>
      current.filter((item) => item.user_id !== member.user_id)
    );
    setSelectedGroup((current) =>
      current
        ? { ...current, member_count: Math.max(1, current.member_count - 1) }
        : current
    );
    notify.success(`${member.profile.full_name} was removed from the group.`);
  };

  const handleCreateSession = async () => {
    if (
      !selectedGroup ||
      !newSession.title.trim() ||
      !newSession.startsAt ||
      !newSession.endsAt ||
      !user
    ) {
      return;
    }

    const startsAt = new Date(newSession.startsAt);
    const endsAt = new Date(newSession.endsAt);
    if (endsAt <= startsAt) {
      setSessionError("End time must be later than the start time.");
      return;
    }
    if (
      newSession.locationType === "online" &&
      !/^https?:\/\//i.test(newSession.meetingUrl.trim())
    ) {
      setSessionError("Enter a valid http or https meeting link.");
      return;
    }

    setIsSavingSession(true);
    setSessionError("");
    try {
      await createStudySession({
        groupId: selectedGroup.id,
        createdBy: user.id,
        title: newSession.title.trim(),
        description: newSession.description.trim(),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        locationType: newSession.locationType,
        locationText:
          newSession.locationType === "in_person"
            ? newSession.locationText.trim()
            : null,
        meetingUrl:
          newSession.locationType === "online"
            ? newSession.meetingUrl.trim()
            : null,
        maxAttendees: newSession.maxAttendees
          ? Number(newSession.maxAttendees)
          : null,
      });

      setIsSessionOpen(false);
      setNewSession({
        title: "",
        description: "",
        startsAt: "",
        endsAt: "",
        locationType: "in_person",
        locationText: "",
        meetingUrl: "",
        maxAttendees: "",
      });
      await loadGroupDetails(selectedGroup);
      notify.success("Study session scheduled.");
    } catch (error: unknown) {
      setSessionError(
        getNotifyMessage(error, "Failed to create study session."),
      );
    } finally {
      setIsSavingSession(false);
    }
  };

  const toggleSessionAttendance = async (session: StudySession) => {
    if (!user || !selectedGroup) return;

    try {
      await setStudySessionAttendance({
        attending: !session.isGoing,
        sessionId: session.id,
      });
    } catch (error) {
      setDetailError(getNotifyMessage(error, "Failed to update attendance."));
      return;
    }

    await loadGroupDetails(selectedGroup);
    notify.success(
      session.isGoing ? "Attendance cancelled." : "Attendance confirmed.",
    );
  };

  const handleDeleteSession = async (session: StudySession) => {
    if (!selectedGroup) return;
    if (
      !(await confirmAction({
        title: `Delete ${session.title}?`,
        description: "This scheduled study session will be permanently deleted.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) return;

    try {
      await deleteStudySession(session.id);
    } catch (error) {
      setDetailError(getNotifyMessage(error, "Failed to delete study session."));
      return;
    }
    await loadGroupDetails(selectedGroup);
    notify.success("Study session deleted.");
  };

  const handleCreatePost = async () => {
    if (!selectedGroup || !user) return;
    if (
      !postTitle.trim() &&
      !postContent.trim() &&
      !resourceUrl.trim() &&
      !postFile
    ) {
      return;
    }
    if (
      postType === "resource" &&
      resourceUrl.trim() &&
      !/^https?:\/\//i.test(resourceUrl.trim())
    ) {
      setPostError("Enter a valid http or https resource link.");
      return;
    }
    if (postFile && postFile.size > 20 * 1024 * 1024) {
      setPostError("The attached file must be 20 MB or smaller.");
      return;
    }

    setIsSavingPost(true);
    setPostError("");

    try {
      await createStudyGroupPost({
        authorId: user.id,
        content: postContent.trim(),
        file: postFile,
        groupId: selectedGroup.id,
        postType,
        resourceUrl:
          postType === "resource" && resourceUrl.trim()
            ? resourceUrl.trim()
            : null,
        title: postTitle.trim() || null,
      });

      setPostTitle("");
      setPostContent("");
      setResourceUrl("");
      setPostFile(null);
      await loadGroupDetails(selectedGroup);
      notify.success("Group post published.");
    } catch (error: unknown) {
      setPostError(
        getNotifyMessage(error, "Failed to publish group post."),
      );
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleDeletePost = async (post: StudyGroupPost) => {
    if (!selectedGroup) return;
    if (
      !(await confirmAction({
        title: "Delete group post?",
        description: "This post will be permanently deleted.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) return;

    try {
      await deleteStudyGroupPost(post);
    } catch (error) {
      setDetailError(getNotifyMessage(error, "Failed to delete group post."));
      return;
    }
    await loadGroupDetails(selectedGroup);
    notify.success("Group post deleted.");
  };

  const visibleGroups = activeView === "joined" ? joinedGroups : groups;

  return (
    <div className="space-y-6">
      <StudyGroupsBrowser
        activeView={activeView}
        courses={courses}
        courseFilter={courseFilter}
        cursor={cursor}
        groups={visibleGroups}
        hasMore={hasMore}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        loadError={loadError}
        search={search}
        setActiveView={setActiveView}
        setCourseFilter={setCourseFilter}
        setSearch={setSearch}
        onCreate={() => setIsCreateOpen(true)}
        onLoadMore={(nextCursor) => void loadGroups(nextCursor, true)}
        onOpen={openGroup}
        formatDateTime={formatDateTime}
      />

      <CreateStudyGroupDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        courses={courses}
        value={newGroup}
        onChange={setNewGroup}
        error={createError}
        isSaving={isCreating}
        onSubmit={handleCreateGroup}
      />

      <Dialog
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => !open && setSelectedGroup(null)}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-5xl">
          {selectedGroup && (
            <>
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
                <DialogTitle className="text-2xl">
                  {selectedGroup.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedGroup.course_name}
                </DialogDescription>
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
                      <p className="mt-1 font-semibold">
                        {selectedGroup.creator_name}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={
                      isGroupActionLoading ||
                      selectedGroup.member_count >= selectedGroup.max_members
                    }
                    onClick={() => handleJoinGroup(selectedGroup)}
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
                        <Button onClick={() => setIsSessionOpen(true)}>
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
                                  <h4 className="font-semibold">
                                    {session.title}
                                  </h4>
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
                                    onClick={() => handleDeleteSession(session)}
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
                                  {session.max_attendees
                                    ? `/${session.max_attendees}`
                                    : ""}{" "}
                                  attending
                                </span>
                                <div className="flex gap-2">
                                  {session.meeting_url && (
                                    <Button variant="outline" size="sm" asChild>
                                      <a
                                        href={session.meeting_url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open Link
                                      </a>
                                    </Button>
                                  )}
                                  <Button
                                    variant={
                                      session.isGoing ? "outline" : "default"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      void toggleSessionAttendance(session)
                                    }
                                  >
                                    {session.isGoing
                                      ? "Cancel Attendance"
                                      : "I Will Attend"}
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
                            variant={
                              postType === "discussion"
                                ? "default"
                                : "outline"
                            }
                            onClick={() => {
                              setPostType("discussion");
                              setResourceUrl("");
                              setPostFile(null);
                            }}
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Discussion
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              postType === "resource" ? "default" : "outline"
                            }
                            onClick={() => setPostType("resource")}
                          >
                            <BookOpen className="mr-2 h-4 w-4" />
                            Resource
                          </Button>
                        </div>
                        <Input
                          value={postTitle}
                          onChange={(event) => setPostTitle(event.target.value)}
                          placeholder={
                            postType === "resource"
                              ? "Resource title"
                              : "Discussion title (optional)"
                          }
                        />
                        <Textarea
                          value={postContent}
                          onChange={(event) =>
                            setPostContent(event.target.value)
                          }
                          placeholder="Write a message for your group..."
                        />
                        {postType === "resource" && (
                          <div className="space-y-3">
                            <div className="relative">
                              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={resourceUrl}
                                onChange={(event) =>
                                  setResourceUrl(event.target.value)
                                }
                                placeholder="https://..."
                                className="pl-9"
                              />
                            </div>
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm hover:bg-muted/40">
                              <Paperclip className="h-4 w-4" />
                              {postFile
                                ? postFile.name
                                : "Attach a file (maximum 20 MB)"}
                              <input
                                type="file"
                                className="hidden"
                                onChange={(event) =>
                                  setPostFile(event.target.files?.[0] || null)
                                }
                              />
                            </label>
                          </div>
                        )}
                        {postError && (
                          <p className="text-sm text-red-600">{postError}</p>
                        )}
                        <div className="flex justify-end">
                          <Button
                            disabled={isSavingPost}
                            onClick={handleCreatePost}
                          >
                            {isSavingPost && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
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
                                    <AvatarImage
                                      src={post.author.avatar_url || undefined}
                                    />
                                    <AvatarFallback>
                                      {post.author.full_name
                                        .split(" ")
                                        .map((part) => part[0])
                                        .join("")
                                        .slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-semibold">
                                      {post.author.full_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDateTime(post.created_at)}
                                    </p>
                                  </div>
                                </div>
                                {(post.author_id === user?.id ||
                                  selectedGroup.is_owner) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeletePost(post)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                              <div>
                                {post.title && (
                                  <p className="font-semibold">{post.title}</p>
                                )}
                                {post.content && (
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                    {post.content}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {post.resource_url && (
                                  <Button variant="outline" size="sm" asChild>
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
                                {post.downloadUrl && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a
                                      href={post.downloadUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <FileText className="mr-2 h-4 w-4" />
                                      {post.attachment_name || "Download File"}
                                      {post.attachment_size
                                        ? ` · ${formatFileSize(
                                            post.attachment_size
                                          )}`
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
                          onClick={() => handleDeleteGroup(selectedGroup)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Group
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isGroupActionLoading}
                          onClick={() => handleLeaveGroup(selectedGroup)}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Leave Group
                        </Button>
                      )}
                    </div>
                    <div className="divide-y rounded-md border">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-3"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={member.profile.avatar_url || undefined}
                            />
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
                              Joined{" "}
                              {new Date(member.joined_at).toLocaleDateString()}
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
                                onClick={() => handleRemoveMember(member)}
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
            </>
          )}
        </DialogContent>
      </Dialog>

      <StudySessionDialog
        open={isSessionOpen}
        onOpenChange={setIsSessionOpen}
        value={newSession}
        onChange={setNewSession}
        error={sessionError}
        isSaving={isSavingSession}
        onSubmit={handleCreateSession}
      />
    </div>
  );
}
