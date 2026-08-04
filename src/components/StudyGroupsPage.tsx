import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getNotifyMessage, notify } from "@/lib/notify";
import { confirmAction } from "@/lib/confirm";
import { StudyGroupsBrowser } from "./study-groups/StudyGroupsBrowser";
import type {
  NewStudySession,
  StudyGroupMember,
  StudyGroupMemberCandidate,
  StudyGroupPost,
  StudyGroupSummary,
  StudySession,
} from "./study-groups/StudyGroupTypes";
import { GENERAL_STUDY_GROUP_COURSE_ID } from "./study-groups/StudyGroupTypes";
import {
  addStudyGroupMember,
  createStudyGroup,
  createStudyGroupPost,
  createStudySession,
  deleteStudyGroup,
  deleteStudyGroupPost,
  deleteStudySession,
  joinStudyGroup,
  leaveStudyGroup,
  loadStudyGroupDetails as loadStudyGroupDetailsData,
  loadStudyGroupMemberCandidates,
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

const StudyGroupMeetingRoomPreview = lazy(() =>
  import("./study-groups/StudyGroupMeetingRoomPreview").then(module => ({
    default: module.StudyGroupMeetingRoomPreview,
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

type StudyGroupDetailTab = "sessions" | "discussion" | "members";
const CHAT_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

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
    courseId: GENERAL_STUDY_GROUP_COURSE_ID,
    name: "",
    description: "",
    maxMembers: 12,
  });

  const [selectedGroup, setSelectedGroup] =
    useState<StudyGroupSummary | null>(null);
  const [meetingRoomGroup, setMeetingRoomGroup] =
    useState<StudyGroupSummary | null>(null);
  const [members, setMembers] = useState<StudyGroupMember[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [posts, setPosts] = useState<StudyGroupPost[]>([]);
  const [activeDetailTab, setActiveDetailTab] =
    useState<StudyGroupDetailTab>("sessions");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [isGroupActionLoading, setIsGroupActionLoading] = useState(false);

  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [newSession, setNewSession] = useState<NewStudySession>({
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    locationType: "in_person",
    locationText: "",
  });

  const [postContent, setPostContent] = useState("");
  const [postFile, setPostFile] = useState<File | null>(null);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [postError, setPostError] = useState("");
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [memberCandidates, setMemberCandidates] = useState<
    StudyGroupMemberCandidate[]
  >([]);
  const [isLoadingMemberCandidates, setIsLoadingMemberCandidates] =
    useState(false);
  const [isAddingMemberId, setIsAddingMemberId] = useState<string | null>(null);
  const [addMemberError, setAddMemberError] = useState("");
  const selectedGroupId = selectedGroup?.id;
  const selectedGroupIsOwner = selectedGroup?.is_owner;
  const selectedGroupMemberCount = selectedGroup?.member_count;
  const selectedGroupMaxMembers = selectedGroup?.max_members;

  useEffect(() => {
    const query = addMemberSearch.trim();
    const shouldSearch =
      selectedGroupIsOwner &&
      activeDetailTab === "members" &&
      selectedGroupMemberCount !== undefined &&
      selectedGroupMaxMembers !== undefined &&
      selectedGroupMemberCount < selectedGroupMaxMembers &&
      query.length >= 2;

    if (!selectedGroupId || !shouldSearch) {
      setMemberCandidates([]);
      setIsLoadingMemberCandidates(false);
      return;
    }

    let isCurrent = true;
    const timer = window.setTimeout(async () => {
      setIsLoadingMemberCandidates(true);
      setAddMemberError("");

      try {
        const candidates = await loadStudyGroupMemberCandidates({
          groupId: selectedGroupId,
          search: query,
        });

        if (isCurrent) {
          setMemberCandidates(candidates);
        }
      } catch (error: unknown) {
        if (isCurrent) {
          setAddMemberError(
            getNotifyMessage(error, "Failed to load available members."),
          );
          setMemberCandidates([]);
        }
      } finally {
        if (isCurrent) {
          setIsLoadingMemberCandidates(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [
    activeDetailTab,
    addMemberSearch,
    selectedGroupId,
    selectedGroupIsOwner,
    selectedGroupMaxMembers,
    selectedGroupMemberCount,
  ]);

  const resetAddMemberSearch = () => {
    setAddMemberSearch("");
    setMemberCandidates([]);
    setAddMemberError("");
    setIsLoadingMemberCandidates(false);
    setIsAddingMemberId(null);
  };

  const resetPostComposer = () => {
    setPostContent("");
    setPostFile(null);
    setPostError("");
  };

  const loadGroupDetails = async (
    group: StudyGroupSummary,
    options: { showLoading?: boolean } = {},
  ) => {
    const showLoading = options.showLoading ?? true;

    if (!group.is_member || !user) {
      setMembers([]);
      setSessions([]);
      setPosts([]);
      return;
    }

    if (showLoading) {
      setIsLoadingDetails(true);
    }
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
      if (showLoading) {
        setIsLoadingDetails(false);
      }
    }
  };

  const openGroup = (group: StudyGroupSummary) => {
    setActiveDetailTab("sessions");
    resetAddMemberSearch();
    resetPostComposer();
    setSelectedGroup(group);
    void loadGroupDetails(group);
  };

  const openMeetingRoom = (group: StudyGroupSummary) => {
    if (!group.is_member) return;

    setSelectedGroup(null);
    setMeetingRoomGroup(group);
    void loadGroupDetails(group);
  };

  const handleCreateGroup = async () => {
    if (!newGroup.courseId || !newGroup.name.trim()) return;

    setIsCreating(true);
    setCreateError("");
    try {
      await createStudyGroup({
        courseId:
          newGroup.courseId === GENERAL_STUDY_GROUP_COURSE_ID
            ? null
            : newGroup.courseId,
        description: newGroup.description.trim(),
        maxMembers: newGroup.maxMembers,
        name: newGroup.name.trim(),
      });

      setIsCreateOpen(false);
      setNewGroup({
        courseId: GENERAL_STUDY_GROUP_COURSE_ID,
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

  const handleAddMember = async (candidate: StudyGroupMemberCandidate) => {
    if (!selectedGroup) return;

    setIsAddingMemberId(candidate.user_id);
    setAddMemberError("");

    try {
      await addStudyGroupMember({
        groupId: selectedGroup.id,
        userId: candidate.user_id,
      });

      const updatedGroup = {
        ...selectedGroup,
        member_count: Math.min(
          selectedGroup.max_members,
          selectedGroup.member_count + 1,
        ),
      };
      setSelectedGroup(updatedGroup);
      setGroups((current) =>
        current.map((item) =>
          item.id === updatedGroup.id ? updatedGroup : item,
        ),
      );
      setMemberCandidates((current) =>
        current.filter((item) => item.user_id !== candidate.user_id),
      );
      setAddMemberSearch("");
      await loadGroupDetails(updatedGroup, { showLoading: false });
      notify.success(`${candidate.full_name} was added to the group.`);
    } catch (error: unknown) {
      setAddMemberError(getNotifyMessage(error, "Failed to add member."));
    } finally {
      setIsAddingMemberId(null);
    }
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
    if (newSession.locationType === "in_person" && !newSession.locationText.trim()) {
      setSessionError("Enter a location for the in-person session.");
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
      });

      setIsSessionOpen(false);
      setNewSession({
        title: "",
        description: "",
        startsAt: "",
        endsAt: "",
        locationType: "in_person",
        locationText: "",
      });
      if (newSession.locationType === "online") {
        const updatedGroup = { ...selectedGroup, has_online_session: true };
        setSelectedGroup(updatedGroup);
        setGroups((current) =>
          current.map((group) =>
            group.id === updatedGroup.id ? updatedGroup : group,
          ),
        );
      }
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
    if (session.location_type === "online") {
      const hasRemainingOnlineSession = sessions.some(
        (currentSession) =>
          currentSession.id !== session.id &&
          currentSession.location_type === "online",
      );
      const updatedGroup = {
        ...selectedGroup,
        has_online_session: hasRemainingOnlineSession,
      };
      setSelectedGroup(updatedGroup);
      setGroups((current) =>
        current.map((group) =>
          group.id === updatedGroup.id ? updatedGroup : group,
        ),
      );
    }
    await loadGroupDetails(selectedGroup);
    notify.success("Study session deleted.");
  };

  const handleCreatePost = async () => {
    if (!selectedGroup || !user) return;

    const trimmedContent = postContent.trim();
    if (!trimmedContent && !postFile) {
      return;
    }

    setIsSavingPost(true);
    setPostError("");

    try {
      await createStudyGroupPost({
        authorId: user.id,
        content: trimmedContent,
        file: postFile,
        groupId: selectedGroup.id,
        postType: "discussion",
        resourceUrl: null,
        title: null,
      });

      setPostContent("");
      setPostFile(null);
      await loadGroupDetails(selectedGroup, { showLoading: false });
    } catch (error: unknown) {
      setPostError(
        getNotifyMessage(
          error,
          "Failed to send message.",
        ),
      );
    } finally {
      setIsSavingPost(false);
    }
  };

  const handlePostFileChange = (file: File | null) => {
    if (file && file.size > CHAT_ATTACHMENT_MAX_BYTES) {
      setPostError("Attachments must be 25 MB or smaller.");
      return;
    }

    setPostError("");
    setPostFile(file);
  };

  const handleDeletePost = async (post: StudyGroupPost) => {
    if (!selectedGroup || !userId) return;
    if (post.author_id !== userId) {
      setDetailError("You can only delete your own messages.");
      return;
    }
    if (
      !(await confirmAction({
        title: post.post_type === "resource" ? "Delete resource?" : "Delete message?",
        description:
          post.post_type === "resource"
            ? "This shared resource will be permanently deleted."
            : "This message will be permanently deleted.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) return;

    try {
      await deleteStudyGroupPost(post, userId);
    } catch (error) {
      setDetailError(
        getNotifyMessage(
          error,
          post.post_type === "resource"
            ? "Failed to delete resource."
            : "Failed to delete message.",
        ),
      );
      return;
    }
    await loadGroupDetails(selectedGroup, { showLoading: false });
    notify.success(
      post.post_type === "resource" ? "Resource deleted." : "Message deleted.",
    );
  };

  if (meetingRoomGroup) {
    return (
      <Suspense fallback={null}>
        <StudyGroupMeetingRoomPreview
          group={meetingRoomGroup}
          members={members}
          sessions={sessions}
          isLoadingMembers={isLoadingDetails}
          onBack={() => setMeetingRoomGroup(null)}
        />
      </Suspense>
    );
  }

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
        onOpenRoom={openMeetingRoom}
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
            activeTab={activeDetailTab}
            addMemberCandidates={memberCandidates}
            addMemberError={addMemberError}
            addMemberSearch={addMemberSearch}
            open={Boolean(selectedGroup)}
            selectedGroup={selectedGroup}
            members={members}
            sessions={sessions}
            posts={posts}
            userId={userId}
            detailError={detailError}
            isLoadingDetails={isLoadingDetails}
            isLoadingMemberCandidates={isLoadingMemberCandidates}
            isGroupActionLoading={isGroupActionLoading}
            isAddingMemberId={isAddingMemberId}
            postContent={postContent}
            postFile={postFile}
            isSavingPost={isSavingPost}
            postError={postError}
            formatDateTime={formatDateTime}
            formatFileSize={formatFileSize}
            onAddMember={(candidate) => void handleAddMember(candidate)}
            onAddMemberSearchChange={setAddMemberSearch}
            onActiveTabChange={setActiveDetailTab}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedGroup(null);
                resetAddMemberSearch();
                resetPostComposer();
              }
            }}
            onJoinGroup={(group) => void handleJoinGroup(group)}
            onLeaveGroup={(group) => void handleLeaveGroup(group)}
            onDeleteGroup={(group) => void handleDeleteGroup(group)}
            onRemoveMember={(member) => void handleRemoveMember(member)}
            onOpenSessionDialog={() => setIsSessionOpen(true)}
            onDeleteSession={(session) => void handleDeleteSession(session)}
            onToggleSessionAttendance={(session) => void toggleSessionAttendance(session)}
            onPostContentChange={setPostContent}
            onPostFileChange={handlePostFileChange}
            onCreatePost={() => void handleCreatePost()}
            onDeletePost={(post) => void handleDeletePost(post)}
            onOpenMeetingRoom={openMeetingRoom}
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
