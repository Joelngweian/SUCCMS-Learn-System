import { lazy, Suspense, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getNotifyMessage, notify } from "@/lib/notify";
import { confirmAction } from "@/lib/confirm";
import { StudyGroupsBrowser } from "./study-groups/StudyGroupsBrowser";
import type {
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
  joinStudyGroup,
  leaveStudyGroup,
  loadStudyGroupDetails as loadStudyGroupDetailsData,
  removeStudyGroupMember,
  setStudySessionAttendance,
} from "./study-groups/studyGroupData";
import { useStudyGroupsBrowserState } from "./study-groups/useStudyGroupsBrowserState";

const CreateStudyGroupDialog = lazy(() =>
  import("./study-groups/StudyGroupDialogs").then(module => ({
    default: module.CreateStudyGroupDialog,
  })),
);

const StudySessionDialog = lazy(() =>
  import("./study-groups/StudyGroupDialogs").then(module => ({
    default: module.StudySessionDialog,
  })),
);

const StudyGroupDetailsDialog = lazy(() =>
  import("./study-groups/StudyGroupDetailsDialog").then(module => ({
    default: module.StudyGroupDetailsDialog,
  })),
);

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
  const {
    activeView,
    courseFilter,
    courses,
    cursor,
    groups,
    hasMore,
    isLoading,
    isLoadingMore,
    loadError,
    loadGroups,
    refreshGroups,
    search,
    setActiveView,
    setCourseFilter,
    setGroups,
    setSearch,
    visibleGroups,
  } = useStudyGroupsBrowserState(userId);

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

      {isCreateOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {selectedGroup && (
        <Suspense fallback={null}>
          <StudyGroupDetailsDialog
            open={Boolean(selectedGroup)}
            selectedGroup={selectedGroup}
            members={members}
            sessions={sessions}
            posts={posts}
            userId={userId}
            detailError={detailError}
            isLoadingDetails={isLoadingDetails}
            isGroupActionLoading={isGroupActionLoading}
            postType={postType}
            postTitle={postTitle}
            postContent={postContent}
            resourceUrl={resourceUrl}
            postFile={postFile}
            isSavingPost={isSavingPost}
            postError={postError}
            formatDateTime={formatDateTime}
            formatFileSize={formatFileSize}
            onOpenChange={(open) => !open && setSelectedGroup(null)}
            onJoinGroup={(group) => void handleJoinGroup(group)}
            onLeaveGroup={(group) => void handleLeaveGroup(group)}
            onDeleteGroup={(group) => void handleDeleteGroup(group)}
            onRemoveMember={(member) => void handleRemoveMember(member)}
            onOpenSessionDialog={() => setIsSessionOpen(true)}
            onDeleteSession={(session) => void handleDeleteSession(session)}
            onToggleSessionAttendance={(session) => void toggleSessionAttendance(session)}
            onPostTypeChange={setPostType}
            onPostTitleChange={setPostTitle}
            onPostContentChange={setPostContent}
            onResourceUrlChange={setResourceUrl}
            onPostFileChange={setPostFile}
            onCreatePost={() => void handleCreatePost()}
            onDeletePost={(post) => void handleDeletePost(post)}
          />
        </Suspense>
      )}
      {isSessionOpen && (
        <Suspense fallback={null}>
          <StudySessionDialog
            open={isSessionOpen}
            onOpenChange={setIsSessionOpen}
            value={newSession}
            onChange={setNewSession}
            error={sessionError}
            isSaving={isSavingSession}
            onSubmit={handleCreateSession}
          />
        </Suspense>
      )}
    </div>
  );
}
