import {
  AzureCommunicationTokenCredential,
  type CommunicationIdentifierKind,
} from "@azure/communication-common";
import {
  CallClient,
  LocalVideoStream,
  VideoStreamRenderer,
  type Call,
  type CallAgent,
  type DeviceManager,
  type RemoteParticipant,
  type RemoteVideoStream,
  type VideoDeviceInfo,
  type VideoStreamRendererView,
} from "@azure/communication-calling";
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Camera,
  CameraOff,
  ChevronDown,
  CheckCircle2,
  Headphones,
  Hand,
  LayoutGrid,
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  Send,
  ShieldCheck,
  SmilePlus,
  Users,
  Volume2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  broadcastToPrivateTopic,
  subscribeToPrivateBroadcast,
} from "@/lib/realtime";
import { getAcsMeetingRoomAccess } from "@/lib/acs";
import type {
  StudyGroupMember,
  StudyGroupSummary,
  StudySession,
} from "./StudyGroupTypes";

type StudyGroupMeetingRoomPreviewProps = {
  group: StudyGroupSummary;
  members: StudyGroupMember[];
  sessions: StudySession[];
  isLoadingMembers: boolean;
  onBack: () => void;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

const formatSessionTime = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatChatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const getRoomBroadcastPayload = (
  message: unknown,
): RoomBroadcastPayload | null => {
  if (!message || typeof message !== "object") return null;

  const envelopePayload = (message as { payload?: unknown }).payload;
  const payload =
    envelopePayload && typeof envelopePayload === "object"
      ? envelopePayload
      : message;

  if (!payload || typeof payload !== "object" || !("type" in payload)) {
    return null;
  }

  const type = (payload as { type?: unknown }).type;
  if (
    type !== "join" &&
    type !== "status" &&
    type !== "leave" &&
    type !== "chat" &&
    type !== "reaction"
  ) {
    return null;
  }

  return payload as RoomBroadcastPayload;
};

type AudioMode = "computer" | "room" | "none";

type ActiveRoomPanel = "chat" | "people" | null;

type ViewMode = "focus" | "gallery";

const meetingReactions = [
  "\u{1F44D}",
  "\u{1F44F}",
  "\u{1F389}",
  "\u{1F602}",
  "\u{2764}\u{FE0F}",
  "\u{2705}",
];

type MediaDeviceOption = {
  id: string;
  label: string;
};

type RoomParticipantState = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  cameraOn: boolean;
  micOn: boolean;
  handRaised: boolean;
  screenSharing: boolean;
  joinedAt: string;
  lastSeenAt: number;
};

type RoomParticipant = StudyGroupMember & {
  cameraOn: boolean;
  micOn: boolean;
  handRaised: boolean;
  screenSharing: boolean;
  isCurrentUser: boolean;
};

type RoomChatMessage = {
  id: string;
  authorId: string | null;
  author: string;
  message: string;
  createdAt: string;
};

type RoomBroadcastPayload =
  | { type: "join" | "status"; participant: RoomParticipantState }
  | { type: "leave"; userId: string }
  | { type: "chat"; message: RoomChatMessage }
  | {
      type: "reaction";
      userId: string;
      author: string;
      reaction: string;
      createdAt: string;
    };

type AcsRemoteMediaTile = {
  id: string;
  participantId: string;
  displayName: string;
  kind: "Video" | "ScreenSharing";
  target: HTMLElement;
};

const defaultMicrophoneDevices: MediaDeviceOption[] = [
  { id: "default-microphone", label: "Default microphone" },
];

const defaultSpeakerDevices: MediaDeviceOption[] = [
  { id: "default-speaker", label: "Default speaker" },
];

const toDeviceOptions = (
  devices: MediaDeviceInfo[],
  kind: MediaDeviceKind,
  fallbackLabel: string,
) =>
  devices
    .filter((device) => device.kind === kind)
    .map((device, index) => ({
      id: device.deviceId || `${kind}-${index}`,
      label: device.label || `${fallbackLabel} ${index + 1}`,
    }));

const AUDIO_LEVEL_BAR_COUNT = 18;
const audioLevelBars = Array.from(
  { length: AUDIO_LEVEL_BAR_COUNT },
  (_, index) => index,
);

const shouldUseDefaultAudioDevice = (deviceId: string) =>
  deviceId === "default" ||
  deviceId.startsWith("default-") ||
  deviceId.startsWith("audioinput-");

type MediaDevicesWithDisplayMedia = MediaDevices & {
  getDisplayMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
};

type BrowserWindowWithAudioContext = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const getCommunicationIdentifierKey = (
  identifier: CommunicationIdentifierKind | undefined,
) => {
  if (!identifier) return "unknown";
  if ("communicationUserId" in identifier) return identifier.communicationUserId;
  if ("phoneNumber" in identifier) return identifier.phoneNumber;
  if ("microsoftTeamsUserId" in identifier) return identifier.microsoftTeamsUserId;
  if ("rawId" in identifier) return identifier.rawId;
  return JSON.stringify(identifier);
};

type AudioLevelMeterProps = {
  activeBars: number;
  isEnabled: boolean;
};

function AudioLevelMeter({ activeBars, isEnabled }: AudioLevelMeterProps) {
  return (
    <div
      className="flex h-7 items-end gap-1"
      aria-label="Microphone input level"
    >
      {audioLevelBars.map((barIndex) => (
        <span
          key={barIndex}
          className={
            isEnabled && barIndex < activeBars
              ? "w-1 rounded-full bg-blue-500 transition-colors"
              : "w-1 rounded-full bg-muted-foreground/30 transition-colors"
          }
          style={{ height: `${8 + ((barIndex * 5) % 18)}px` }}
        />
      ))}
    </div>
  );
}

type AudioDevicePickerProps = {
  title: string;
  devices: MediaDeviceOption[];
  selectedDeviceId: string;
  onSelectedDeviceIdChange: (value: string) => void;
  disabled: boolean;
  icon: ReactNode;
  onOpen: () => void;
  onOpenAudioSettings: () => void;
  children?: ReactNode;
  contentClassName?: string;
};

function AudioDevicePicker({
  title,
  devices,
  selectedDeviceId,
  onSelectedDeviceIdChange,
  disabled,
  icon,
  onOpen,
  onOpenAudioSettings,
  children,
  contentClassName = "w-80",
}: AudioDevicePickerProps) {
  const selectedDevice =
    devices.find((device) => device.id === selectedDeviceId) ?? devices[0];

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          onOpen();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold text-blue-700 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-300 dark:hover:text-blue-200"
        >
          <span className="min-w-0 truncate">
            {selectedDevice?.label ?? `Default ${title.toLowerCase()}`}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={12}
        className={`z-[130] ${contentClassName} p-4 shadow-2xl`}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <span className="text-muted-foreground">{icon}</span>
          <span>{title}</span>
        </div>
        <DropdownMenuRadioGroup
          value={selectedDeviceId}
          onValueChange={onSelectedDeviceIdChange}
        >
          {devices.map((device) => (
            <DropdownMenuRadioItem
              key={device.id}
              value={device.id}
              className="mb-1 rounded-md border border-transparent py-2 pr-3 pl-8 text-sm focus:bg-accent focus:text-accent-foreground data-[state=checked]:border-blue-200 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:border-blue-900 dark:data-[state=checked]:bg-blue-950/40"
            >
              <span className="truncate">{device.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {children && <div className="mt-4">{children}</div>}
        <DropdownMenuSeparator className="my-4" />
        <button
          type="button"
          className="text-sm text-muted-foreground transition hover:text-foreground"
          onClick={onOpenAudioSettings}
        >
          More audio settings
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type AudioSettingsSectionProps = {
  title: string;
  devices: MediaDeviceOption[];
  selectedDeviceId: string;
  onSelectedDeviceIdChange: (value: string) => void;
  icon: ReactNode;
  children?: ReactNode;
};

function AudioSettingsSection({
  title,
  devices,
  selectedDeviceId,
  onSelectedDeviceIdChange,
  icon,
  children,
}: AudioSettingsSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm font-semibold">
        <ChevronDown className="h-3.5 w-3.5" />
        <span>{title}</span>
      </div>
      <RadioGroup
        value={selectedDeviceId}
        onValueChange={onSelectedDeviceIdChange}
        className="gap-1"
      >
        {devices.map((device) => (
          <label
            key={device.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-accent"
          >
            <RadioGroupItem value={device.id} />
            <span className="min-w-0 flex-1 truncate">{device.label}</span>
          </label>
        ))}
      </RadioGroup>
      {children && (
        <div className="flex items-center gap-3 px-2 text-muted-foreground">
          {icon}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      )}
    </section>
  );
}

type RoomToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  active?: boolean;
  danger?: boolean;
};

const RoomToolbarButton = forwardRef<HTMLButtonElement, RoomToolbarButtonProps>(
  (
    {
      label,
      icon,
      active = false,
      danger = false,
      className = "",
      ...props
    },
    ref,
  ) => {
    const toneClass = danger
      ? "text-red-300 hover:bg-red-500/15 hover:text-red-200"
      : active
        ? "bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/15"
        : "text-white/75 hover:bg-white/10 hover:text-white";

    return (
      <button
        ref={ref}
        type="button"
        className={`flex h-14 min-w-[62px] flex-col items-center justify-center gap-1 rounded-lg px-2 transition ${toneClass} ${className}`}
        {...props}
      >
        <span className="flex h-5 items-center">{icon}</span>
        <span className="text-[11px] font-medium leading-none">{label}</span>
      </button>
    );
  },
);

RoomToolbarButton.displayName = "RoomToolbarButton";

type AcsMediaViewProps = {
  target: HTMLElement;
  className?: string;
};

function AcsMediaView({ target, className }: AcsMediaViewProps) {
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      if (target.parentElement !== node) {
        node.replaceChildren(target);
      }
    },
    [target],
  );

  return <div ref={containerRef} className={className} />;
}

export function StudyGroupMeetingRoomPreview({
  group,
  members,
  sessions,
  isLoadingMembers,
  onBack,
}: StudyGroupMeetingRoomPreviewProps) {
  const { profile, user } = useAuth();
  const [hasJoinedPreview, setHasJoinedPreview] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [audioMode, setAudioMode] = useState<AudioMode>("computer");
  const [microphoneDevices, setMicrophoneDevices] = useState(
    defaultMicrophoneDevices,
  );
  const [speakerDevices, setSpeakerDevices] = useState(defaultSpeakerDevices);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState(
    defaultMicrophoneDevices[0].id,
  );
  const [selectedSpeakerId, setSelectedSpeakerId] = useState(
    defaultSpeakerDevices[0].id,
  );
  const [deviceMessage, setDeviceMessage] = useState<string | null>(null);
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [activeMicrophoneBars, setActiveMicrophoneBars] = useState(0);
  const [activeRoomPanel, setActiveRoomPanel] =
    useState<ActiveRoomPanel>(null);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("focus");
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [roomChatMessage, setRoomChatMessage] = useState("");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [latestChatNotice, setLatestChatNotice] =
    useState<RoomChatMessage | null>(null);
  const [roomChatMessages, setRoomChatMessages] = useState<RoomChatMessage[]>([
    {
      id: "welcome",
      authorId: null,
      author: "SUCCMS Room",
      message: "Meeting chat is ready.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [roomParticipantStates, setRoomParticipantStates] = useState<
    Record<string, RoomParticipantState>
  >({});
  const activeMicrophoneBarsRef = useRef(0);
  const hasPublishedJoinRef = useRef(false);
  const activeRoomPanelRef = useRef<ActiveRoomPanel>(activeRoomPanel);
  const cameraPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenPreviewRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localVideoContainerRef = useRef<HTMLDivElement | null>(null);
  const callClientRef = useRef<CallClient | null>(null);
  const callAgentRef = useRef<CallAgent | null>(null);
  const deviceManagerRef = useRef<DeviceManager | null>(null);
  const callRef = useRef<Call | null>(null);
  const localVideoStreamRef = useRef<LocalVideoStream | null>(null);
  const localVideoRendererRef = useRef<VideoStreamRenderer | null>(null);
  const localVideoViewRef = useRef<VideoStreamRendererView | null>(null);
  const remoteRenderersRef = useRef<
    Record<string, { renderer: VideoStreamRenderer; view: VideoStreamRendererView }>
  >({});
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [meetingRoomError, setMeetingRoomError] = useState<string | null>(null);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [remoteMediaTiles, setRemoteMediaTiles] = useState<AcsRemoteMediaTile[]>([]);
  const roomTopic = `study-group:${group.id}:meeting-room`;
  const currentUserId =
    user?.id ||
    profile?.id ||
    members.find((member) => member.user_id === group.creator_id)?.user_id ||
    group.creator_id;
  const currentDisplayName =
    profile?.full_name ||
    members.find((member) => member.user_id === currentUserId)?.profile
      .full_name ||
    user?.email ||
    group.creator_name ||
    "You";
  const currentAvatarUrl =
    profile?.avatar_url ||
    members.find((member) => member.user_id === currentUserId)?.profile
      .avatar_url ||
    group.creator_avatar_url ||
    null;

  const fallbackCreatorMember = useMemo<StudyGroupMember>(
    () => ({
      id: group.creator_id,
      joined_at: group.created_at,
      role: "owner",
      user_id: group.creator_id,
      profile: {
        id: group.creator_id,
        avatar_url: group.creator_avatar_url,
        full_name: group.creator_name,
      },
    }),
    [
      group.created_at,
      group.creator_avatar_url,
      group.creator_id,
      group.creator_name,
    ],
  );

  const memberRoster = useMemo<StudyGroupMember[]>(() => {
    const roster = members.length > 0 ? members : [fallbackCreatorMember];
    const currentMember = roster.find(
      (member) => member.user_id === currentUserId,
    );

    if (currentMember) {
      return roster.map((member) =>
        member.user_id === currentUserId
          ? {
              ...member,
              profile: {
                ...member.profile,
                avatar_url: currentAvatarUrl,
                full_name: currentDisplayName,
              },
            }
          : member,
      );
    }

    return [
      {
        id: `room-current-${currentUserId}`,
        joined_at: new Date().toISOString(),
        role: group.creator_id === currentUserId ? "owner" : "member",
        user_id: currentUserId,
        profile: {
          id: currentUserId,
          avatar_url: currentAvatarUrl,
          full_name: currentDisplayName,
        },
      },
      ...roster,
    ];
  }, [
    currentAvatarUrl,
    currentDisplayName,
    currentUserId,
    fallbackCreatorMember,
    group.creator_id,
    members,
  ]);

  const currentMember =
    memberRoster.find((member) => member.user_id === currentUserId) ??
    memberRoster[0] ??
    fallbackCreatorMember;

  const localParticipantState = useMemo<RoomParticipantState>(
    () => ({
      userId: currentUserId,
      name: currentDisplayName,
      avatarUrl: currentAvatarUrl,
      role: currentMember.role,
      cameraOn: isCameraOn,
      micOn: isMicOn && audioMode !== "none",
      handRaised: isHandRaised,
      screenSharing: isSharingScreen,
      joinedAt: currentMember.joined_at || group.created_at,
      lastSeenAt: Date.now(),
    }),
    [
      audioMode,
      currentAvatarUrl,
      currentDisplayName,
      currentMember.joined_at,
      currentMember.role,
      currentUserId,
      group.created_at,
      isCameraOn,
      isHandRaised,
      isMicOn,
      isSharingScreen,
    ],
  );

  const participants = useMemo<RoomParticipant[]>(() => {
    const states = hasJoinedPreview
      ? Object.values(roomParticipantStates)
      : memberRoster.map((member) => ({
          userId: member.user_id,
          name: member.profile.full_name,
          avatarUrl: member.profile.avatar_url,
          role: member.role,
          cameraOn: false,
          micOn: false,
          handRaised: false,
          screenSharing: false,
          joinedAt: member.joined_at,
          lastSeenAt: 0,
        }));
    const activeStates =
      hasJoinedPreview && states.length === 0 ? [localParticipantState] : states;

    return activeStates
      .map((state) => {
        const rosterMember = memberRoster.find(
          (member) => member.user_id === state.userId,
        );
        const member =
          rosterMember ??
          ({
            id: `room-${state.userId}`,
            joined_at: state.joinedAt,
            role: state.role,
            user_id: state.userId,
            profile: {
              id: state.userId,
              avatar_url: state.avatarUrl,
              full_name: state.name,
            },
          } satisfies StudyGroupMember);

        return {
          ...member,
          role: state.role,
          profile: {
            ...member.profile,
            avatar_url: state.avatarUrl,
            full_name: state.name,
          },
          cameraOn: state.cameraOn,
          micOn: state.micOn,
          handRaised: state.handRaised,
          screenSharing: state.screenSharing,
          isCurrentUser: state.userId === currentUserId,
        };
      })
      .sort((left, right) => {
        if (left.isCurrentUser !== right.isCurrentUser) {
          return left.isCurrentUser ? -1 : 1;
        }
        if (left.user_id === group.creator_id) return -1;
        if (right.user_id === group.creator_id) return 1;
        return left.joined_at.localeCompare(right.joined_at);
      });
  }, [
    currentUserId,
    group.creator_id,
    hasJoinedPreview,
    localParticipantState,
    memberRoster,
    roomParticipantStates,
  ]);

  const publishRoomEvent = useCallback(
    async (payload: RoomBroadcastPayload) => {
      try {
        await broadcastToPrivateTopic({
          event: "MEETING_ROOM",
          payload,
          topic: roomTopic,
        });
      } catch (error) {
        console.warn("Meeting room broadcast failed:", error);
      }
    },
    [roomTopic],
  );

  useEffect(() => {
    hasPublishedJoinRef.current = false;
    setRoomParticipantStates({});
    setRoomChatMessages([
      {
        id: "welcome",
        authorId: null,
        author: "SUCCMS Room",
        message: "Meeting chat is ready.",
        createdAt: new Date().toISOString(),
      },
    ]);
    setUnreadChatCount(0);
    setLatestChatNotice(null);
  }, [group.id]);

  useEffect(() => {
    activeRoomPanelRef.current = activeRoomPanel;
    if (activeRoomPanel === "chat") {
      setUnreadChatCount(0);
      setLatestChatNotice(null);
    }
  }, [activeRoomPanel]);

  useEffect(() => {
    if (!latestChatNotice) return;

    const timeoutId = window.setTimeout(() => {
      setLatestChatNotice(null);
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [latestChatNotice]);

  useEffect(() => {
    if (!screenShareError) return;

    const timeoutId = window.setTimeout(() => {
      setScreenShareError(null);
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [screenShareError]);

  useEffect(() => {
    if (!hasJoinedPreview) return;

    return subscribeToPrivateBroadcast({
      event: "*",
      topic: roomTopic,
      onMessage: (message) => {
        const payload = getRoomBroadcastPayload(message);
        if (!payload) return;

        if (payload.type === "chat") {
          setRoomChatMessages((currentMessages) =>
            currentMessages.some((item) => item.id === payload.message.id)
              ? currentMessages
              : [...currentMessages, payload.message],
          );
          if (
            payload.message.authorId !== currentUserId &&
            activeRoomPanelRef.current !== "chat"
          ) {
            setUnreadChatCount((count) => count + 1);
            setLatestChatNotice(payload.message);
          }
          return;
        }

        if (payload.type === "reaction") {
          if (payload.userId !== currentUserId) {
            setSelectedReaction(payload.reaction);
          }
          return;
        }

        if (payload.type === "leave") {
          setRoomParticipantStates((currentStates) =>
            Object.fromEntries(
              Object.entries(currentStates).filter(
                ([userId]) => userId !== payload.userId,
              ),
            ),
          );
          return;
        }

        setRoomParticipantStates((currentStates) => ({
          ...currentStates,
          [payload.participant.userId]: {
            ...payload.participant,
            lastSeenAt: Date.now(),
          },
        }));
      },
    });
  }, [currentUserId, hasJoinedPreview, roomTopic]);

  useEffect(() => {
    if (!hasJoinedPreview) return;

    const nextState = {
      ...localParticipantState,
      lastSeenAt: Date.now(),
    };

    setRoomParticipantStates((currentStates) => ({
      ...currentStates,
      [nextState.userId]: nextState,
    }));

    const type = hasPublishedJoinRef.current ? "status" : "join";
    hasPublishedJoinRef.current = true;
    void publishRoomEvent({ type, participant: nextState });
  }, [hasJoinedPreview, localParticipantState, publishRoomEvent]);

  useEffect(() => {
    if (!hasJoinedPreview) return;

    return () => {
      void publishRoomEvent({ type: "leave", userId: currentUserId });
    };
  }, [currentUserId, hasJoinedPreview, publishRoomEvent]);

  const loadMediaDevices = useCallback(async (requestPermission = false) => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDeviceMessage("This browser does not support media device selection.");
      return;
    }

    try {
      if (requestPermission && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const microphones = toDeviceOptions(
        devices,
        "audioinput",
        "Microphone",
      );
      const speakers = toDeviceOptions(devices, "audiooutput", "Speaker");

      const nextMicrophones =
        microphones.length > 0 ? microphones : defaultMicrophoneDevices;
      const nextSpeakers =
        speakers.length > 0 ? speakers : defaultSpeakerDevices;

      setMicrophoneDevices(nextMicrophones);
      setSpeakerDevices(nextSpeakers);
      setSelectedMicrophoneId((current) =>
        nextMicrophones.some((device) => device.id === current)
          ? current
          : nextMicrophones[0].id,
      );
      setSelectedSpeakerId((current) =>
        nextSpeakers.some((device) => device.id === current)
          ? current
          : nextSpeakers[0].id,
      );
      setDeviceMessage(
        speakers.length > 0
          ? null
          : "Speaker selection depends on browser support. Chrome and Edge usually support output devices.",
      );
    } catch (error) {
      setDeviceMessage(
        "Device names may be hidden until the browser is allowed to use the microphone.",
      );
    }
  }, []);

  useEffect(() => {
    void loadMediaDevices(true);

    const handleDeviceChange = () => {
      void loadMediaDevices();
    };

    navigator.mediaDevices?.addEventListener?.(
      "devicechange",
      handleDeviceChange,
    );

    return () => {
      navigator.mediaDevices?.removeEventListener?.(
        "devicechange",
        handleDeviceChange,
      );
    };
  }, [loadMediaDevices]);

  useEffect(() => {
    const setBars = (nextBars: number) => {
      if (activeMicrophoneBarsRef.current === nextBars) {
        return;
      }

      activeMicrophoneBarsRef.current = nextBars;
      setActiveMicrophoneBars(nextBars);
    };

    const resetBars = () => setBars(0);

    if (!isMicOn || audioMode !== "computer") {
      resetBars();
      return;
    }

    let isCancelled = false;
    let animationFrameId = 0;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;

    const startMeter = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        resetBars();
        return;
      }

      try {
        const audioConstraint: boolean | MediaTrackConstraints =
          shouldUseDefaultAudioDevice(selectedMicrophoneId)
            ? true
            : { deviceId: { exact: selectedMicrophoneId } };

        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const AudioContextConstructor =
          window.AudioContext ??
          (window as BrowserWindowWithAudioContext).webkitAudioContext;

        if (!AudioContextConstructor) {
          resetBars();
          return;
        }

        audioContext = new AudioContextConstructor();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const samples = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteTimeDomainData(samples);

          let sumSquares = 0;
          samples.forEach((sample) => {
            const normalized = (sample - 128) / 128;
            sumSquares += normalized * normalized;
          });

          const rms = Math.sqrt(sumSquares / samples.length);
          const nextBars = Math.min(
            AUDIO_LEVEL_BAR_COUNT,
            Math.round(Math.min(1, rms * 7) * AUDIO_LEVEL_BAR_COUNT),
          );

          if (!isCancelled) {
            setBars(nextBars);
            animationFrameId = window.requestAnimationFrame(tick);
          }
        };

        tick();
      } catch {
        resetBars();
      }
    };

    void startMeter();

    return () => {
      isCancelled = true;
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      stream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close();
    };
  }, [audioMode, isMicOn, selectedMicrophoneId]);

  useEffect(() => {
    if (!selectedReaction) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSelectedReaction(null);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [selectedReaction]);

  const stopCameraPreview = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    if (cameraPreviewRef.current) {
      cameraPreviewRef.current.srcObject = null;
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;

    if (screenPreviewRef.current) {
      screenPreviewRef.current.srcObject = null;
    }

    setIsSharingScreen(false);
  }, []);

  const stopAcsScreenShare = useCallback(async () => {
    try {
      if (callRef.current?.isScreenSharingOn) {
        await callRef.current.stopScreenSharing();
      }
    } finally {
      stopScreenShare();
      setScreenShareError(null);
    }
  }, [stopScreenShare]);

  useEffect(() => {
    let isCancelled = false;

    if (hasJoinedPreview) {
      stopCameraPreview();
      return;
    }

    if (!isCameraOn) {
      stopCameraPreview();
      setCameraError(null);
      return;
    }

    const startCameraPreview = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera preview is not supported in this browser.");
        setIsCameraOn(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        setCameraError(null);

        if (cameraPreviewRef.current) {
          cameraPreviewRef.current.srcObject = stream;
        }
      } catch {
        if (!isCancelled) {
          stopCameraPreview();
          setCameraError("Camera permission was denied or no camera is available.");
          setIsCameraOn(false);
        }
      }
    };

    void startCameraPreview();

    return () => {
      isCancelled = true;
    };
  }, [hasJoinedPreview, isCameraOn, stopCameraPreview]);

  useEffect(() => {
    if (isCameraOn && cameraPreviewRef.current && cameraStreamRef.current) {
      cameraPreviewRef.current.srcObject = cameraStreamRef.current;
    }
  }, [hasJoinedPreview, isCameraOn, isSharingScreen, viewMode]);

  useEffect(() => {
    if (isSharingScreen && screenPreviewRef.current && screenStreamRef.current) {
      screenPreviewRef.current.srcObject = screenStreamRef.current;
    }
  }, [isSharingScreen, activeRoomPanel, viewMode]);

  useEffect(() => {
    const screenPreview = screenPreviewRef.current;

    return () => {
      stopCameraPreview();
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      if (screenPreview) {
        screenPreview.srcObject = null;
      }
    };
  }, [stopCameraPreview]);

  const disposeLocalVideoRenderer = useCallback(() => {
    localVideoViewRef.current?.dispose();
    localVideoRendererRef.current?.dispose();
    localVideoViewRef.current = null;
    localVideoRendererRef.current = null;
    if (localVideoContainerRef.current) {
      localVideoContainerRef.current.replaceChildren();
    }
  }, []);

  const renderLocalVideoStream = useCallback(async () => {
    const stream = localVideoStreamRef.current;
    const container = localVideoContainerRef.current;
    if (!stream || !container) return;

    disposeLocalVideoRenderer();
    const renderer = new VideoStreamRenderer(stream);
    const view = await renderer.createView({ scalingMode: "Crop" });
    localVideoRendererRef.current = renderer;
    localVideoViewRef.current = view;
    container.replaceChildren(view.target);
  }, [disposeLocalVideoRenderer]);

  useEffect(() => {
    if (
      !hasJoinedPreview ||
      !isCameraOn ||
      !localVideoStreamRef.current ||
      !localVideoContainerRef.current ||
      localVideoViewRef.current
    ) {
      return;
    }

    void renderLocalVideoStream();
  }, [hasJoinedPreview, isCameraOn, renderLocalVideoStream, viewMode]);

  const removeRemoteMediaTile = useCallback((tileId: string) => {
    const renderer = remoteRenderersRef.current[tileId];
    renderer?.view.dispose();
    renderer?.renderer.dispose();
    delete remoteRenderersRef.current[tileId];
    setRemoteMediaTiles((tiles) => tiles.filter((tile) => tile.id !== tileId));
  }, []);

  const renderRemoteMediaStream = useCallback(
    async (participant: RemoteParticipant, stream: RemoteVideoStream) => {
      const participantId = getCommunicationIdentifierKey(participant.identifier);
      const kind =
        String(stream.mediaStreamType) === "ScreenSharing"
          ? "ScreenSharing"
          : "Video";
      const tileId = `${participantId}-${stream.id}-${kind}`;

      if (!stream.isAvailable) {
        removeRemoteMediaTile(tileId);
        return;
      }

      if (remoteRenderersRef.current[tileId]) {
        return;
      }

      const renderer = new VideoStreamRenderer(stream);
      const view = await renderer.createView({
        scalingMode: kind === "ScreenSharing" ? "Fit" : "Crop",
      });
      remoteRenderersRef.current[tileId] = { renderer, view };
      setRemoteMediaTiles((tiles) => [
        ...tiles.filter((tile) => tile.id !== tileId),
        {
          id: tileId,
          participantId,
          displayName: participant.displayName || "Classmate",
          kind,
          target: view.target,
        },
      ]);
    },
    [removeRemoteMediaTile],
  );

  const subscribeToRemoteParticipant = useCallback(
    (participant: RemoteParticipant) => {
      participant.videoStreams.forEach((stream) => {
        const updateStream = () => {
          void renderRemoteMediaStream(participant, stream);
        };
        stream.on("isAvailableChanged", updateStream);
        void renderRemoteMediaStream(participant, stream);
      });

      participant.on("videoStreamsUpdated", ({ added, removed }) => {
        added.forEach((stream) => {
          const updateStream = () => {
            void renderRemoteMediaStream(participant, stream);
          };
          stream.on("isAvailableChanged", updateStream);
          void renderRemoteMediaStream(participant, stream);
        });
        removed.forEach((stream) => {
          const participantId = getCommunicationIdentifierKey(participant.identifier);
          removeRemoteMediaTile(`${participantId}-${stream.id}-Video`);
          removeRemoteMediaTile(`${participantId}-${stream.id}-ScreenSharing`);
        });
      });
    },
    [removeRemoteMediaTile, renderRemoteMediaStream],
  );

  const cleanupAcsCall = useCallback(() => {
    Object.keys(remoteRenderersRef.current).forEach(removeRemoteMediaTile);
    disposeLocalVideoRenderer();
    localVideoStreamRef.current = null;
    callRef.current?.hangUp({ forEveryone: false }).catch(() => undefined);
    callRef.current = null;
    callAgentRef.current?.dispose();
    callAgentRef.current = null;
    callClientRef.current?.dispose();
    callClientRef.current = null;
    deviceManagerRef.current = null;
  }, [disposeLocalVideoRenderer, removeRemoteMediaTile]);

  const getFirstCamera = useCallback(async () => {
    const cameras = await deviceManagerRef.current?.getCameras();
    return cameras?.[0] as VideoDeviceInfo | undefined;
  }, []);

  const handleToggleCamera = useCallback(async () => {
    if (!hasJoinedPreview || !callRef.current) {
      setIsCameraOn((value) => !value);
      return;
    }

    setCameraError(null);
    try {
      if (isCameraOn) {
        if (localVideoStreamRef.current) {
          await callRef.current.stopVideo(localVideoStreamRef.current);
        }
        disposeLocalVideoRenderer();
        localVideoStreamRef.current = null;
        setIsCameraOn(false);
        return;
      }

      const camera = await getFirstCamera();
      if (!camera) {
        setCameraError("No camera is available.");
        return;
      }

      const localVideoStream = new LocalVideoStream(camera);
      localVideoStreamRef.current = localVideoStream;
      await callRef.current.startVideo(localVideoStream);
      setIsCameraOn(true);
      await renderLocalVideoStream();
    } catch {
      setCameraError("Camera could not be started.");
      setIsCameraOn(false);
    }
  }, [
    disposeLocalVideoRenderer,
    getFirstCamera,
    hasJoinedPreview,
    isCameraOn,
    renderLocalVideoStream,
  ]);

  const handleToggleMic = useCallback(async () => {
    if (!hasJoinedPreview || !callRef.current) {
      setIsMicOn((value) => !value);
      return;
    }

    try {
      if (isMicOn) {
        await callRef.current.mute();
        setIsMicOn(false);
      } else {
        await callRef.current.unmute();
        setIsMicOn(true);
      }
    } catch {
      setDeviceMessage("Microphone state could not be changed.");
    }
  }, [hasJoinedPreview, isMicOn]);

  const handleJoinRoom = useCallback(async () => {
    setMeetingRoomError(null);
    setIsJoiningRoom(true);

    try {
      stopCameraPreview();
      const roomAccess = await getAcsMeetingRoomAccess(group.id);
      const callClient = new CallClient();
      callClientRef.current = callClient;

      const tokenCredential = new AzureCommunicationTokenCredential(
        roomAccess.token,
      );
      const callAgent = await callClient.createCallAgent(tokenCredential, {
        displayName: currentDisplayName,
      });
      const deviceManager = await callClient.getDeviceManager();
      callAgentRef.current = callAgent;
      deviceManagerRef.current = deviceManager;

      await deviceManager.askDevicePermission({
        audio: audioMode !== "none",
        video: isCameraOn,
      });

      const camera = isCameraOn ? await getFirstCamera() : undefined;
      const localVideoStream = camera ? new LocalVideoStream(camera) : null;
      localVideoStreamRef.current = localVideoStream;

      const call = callAgent.join(
        { roomId: roomAccess.roomId },
        {
          audioOptions: { muted: !isMicOn || audioMode === "none" },
          ...(localVideoStream
            ? { videoOptions: { localVideoStreams: [localVideoStream] } }
            : {}),
        },
      );

      callRef.current = call;
      setHasJoinedPreview(true);
      setIsMicOn(!call.isMuted);

      call.on("isMutedChanged", () => {
        setIsMicOn(!call.isMuted);
      });
      call.on("isScreenSharingOnChanged", () => {
        setIsSharingScreen(call.isScreenSharingOn);
        if (call.isScreenSharingOn) {
          setViewMode("focus");
        }
      });
      call.on("remoteParticipantsUpdated", ({ added, removed }) => {
        added.forEach(subscribeToRemoteParticipant);
        removed.forEach((participant) => {
          const participantId = getCommunicationIdentifierKey(participant.identifier);
          setRemoteMediaTiles((tiles) => {
            tiles
              .filter((tile) => tile.participantId === participantId)
              .forEach((tile) => {
                const renderer = remoteRenderersRef.current[tile.id];
                renderer?.view.dispose();
                renderer?.renderer.dispose();
                delete remoteRenderersRef.current[tile.id];
              });
            return tiles.filter((tile) => tile.participantId !== participantId);
          });
        });
      });
      call.remoteParticipants.forEach(subscribeToRemoteParticipant);

      if (localVideoStream) {
        await renderLocalVideoStream();
      }
    } catch (error) {
      console.error("ACS meeting room join failed:", error);
      cleanupAcsCall();
      setHasJoinedPreview(false);
      setMeetingRoomError(
        error instanceof Error
          ? error.message
          : "Meeting room could not be joined.",
      );
    } finally {
      setIsJoiningRoom(false);
    }
  }, [
    audioMode,
    cleanupAcsCall,
    currentDisplayName,
    getFirstCamera,
    group.id,
    isCameraOn,
    isMicOn,
    renderLocalVideoStream,
    stopCameraPreview,
    subscribeToRemoteParticipant,
  ]);

  const nextSession = sessions[0];
  const currentParticipant =
    participants.find((participant) => participant.isCurrentUser) ??
    participants[0];
  const courseCode = group.course_code || "General";
  const courseName = group.course_name || "Open to everyone";
  const roomTitle = group.name || courseName;
  const groupMemberCount = Math.max(group.member_count || 0, memberRoster.length);
  const raisedHandCount = participants.filter(
    (participant) => participant.handRaised,
  ).length;
  const isRemoteTileForParticipant = (
    tile: AcsRemoteMediaTile,
    participant: RoomParticipant,
  ) =>
    !participant.isCurrentUser &&
    (tile.displayName === participant.profile.full_name ||
      tile.participantId.includes(participant.user_id));
  const activeRemoteScreenShare = remoteMediaTiles.find(
    (tile) =>
      tile.kind === "ScreenSharing" &&
      participants.some(
        (participant) =>
          participant.screenSharing &&
          isRemoteTileForParticipant(tile, participant),
      ),
  );
  const remoteVideoTiles = remoteMediaTiles.filter(
    (tile) =>
      tile.kind === "Video" &&
      participants.some(
        (participant) =>
          participant.cameraOn && isRemoteTileForParticipant(tile, participant),
      ),
  );
  const activeScreenShareParticipant =
    participants.find((participant) => participant.screenSharing) ?? null;
  const isShowingScreenShare = Boolean(
    activeScreenShareParticipant || activeRemoteScreenShare,
  );
  const hasGalleryScreenShareTile = viewMode === "gallery" && isShowingScreenShare;
  const galleryParticipants = participants.slice(0, 9);
  const galleryTileCount =
    galleryParticipants.length + (hasGalleryScreenShareTile ? 1 : 0);
  const galleryGridClass =
    galleryTileCount === 1
      ? "max-w-md grid-cols-1"
      : galleryTileCount === 2
        ? "max-w-3xl grid-cols-1 sm:grid-cols-2"
        : "max-w-5xl grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";
  const sharingParticipants = participants.slice(0, 4);
  const additionalSharingParticipantCount = Math.max(
    participants.length - sharingParticipants.length,
    0,
  );
  const getRemoteVideoTileForMember = (member: RoomParticipant) =>
    remoteVideoTiles.find(
      (tile) =>
        tile.displayName === member.profile.full_name ||
        tile.participantId.includes(member.user_id),
    );
  const attachLocalVideoContainer = useCallback((node: HTMLDivElement | null) => {
    localVideoContainerRef.current = node;
    if (node && localVideoViewRef.current?.target) {
      node.replaceChildren(localVideoViewRef.current.target);
      return;
    }
    if (node && localVideoStreamRef.current) {
      void renderLocalVideoStream();
    }
  }, [renderLocalVideoStream]);
  const handleSendRoomMessage = () => {
    const trimmedMessage = roomChatMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    const nextMessage: RoomChatMessage = {
      id: `message-${currentUserId}-${Date.now()}`,
      authorId: currentUserId,
      author: currentParticipant?.profile.full_name || currentDisplayName,
      message: trimmedMessage,
      createdAt: new Date().toISOString(),
    };

    setRoomChatMessages((currentMessages) => [
      ...currentMessages,
      nextMessage,
    ]);
    setRoomChatMessage("");
    void publishRoomEvent({ type: "chat", message: nextMessage });
  };
  const handleToggleChatPanel = () => {
    setActiveRoomPanel((panel) => {
      const nextPanel = panel === "chat" ? null : "chat";
      if (nextPanel === "chat") {
        setUnreadChatCount(0);
        setLatestChatNotice(null);
      }
      return nextPanel;
    });
  };
  const handleToggleRaiseHand = () => {
    const nextIsRaised = !isHandRaised;

    setIsHandRaised(nextIsRaised);

    if (nextIsRaised) {
      setActiveRoomPanel("people");
    }
  };
  const handleSendReaction = (reaction: string) => {
    setSelectedReaction(reaction);
    void publishRoomEvent({
      type: "reaction",
      userId: currentUserId,
      author: currentParticipant?.profile.full_name || currentDisplayName,
      reaction,
      createdAt: new Date().toISOString(),
    });
  };
  const handleToggleScreenShare = async () => {
    setScreenShareError(null);

    if (isSharingScreen) {
      await stopAcsScreenShare();
      return;
    }

    if (!callRef.current) {
      setScreenShareError("Join the meeting room before sharing your screen.");
      return;
    }

    try {
      await callRef.current.startScreenSharing();
      setIsSharingScreen(true);
      setViewMode("focus");
    } catch {
      setScreenShareError("Screen sharing was cancelled.");
    }
  };
  const handleLeaveRoom = async () => {
    await stopAcsScreenShare();
    stopCameraPreview();
    cleanupAcsCall();
    onBack();
  };

  if (!hasJoinedPreview) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                  {courseCode}
                </Badge>
                <Badge variant="outline">{courseName}</Badge>
                <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                  Meeting setup
                </Badge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Join {group.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose your camera and audio settings before entering the study
                meeting room.
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              {groupMemberCount}/{group.max_members} members
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_420px]">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex min-h-[360px] items-center justify-center bg-slate-950 text-white">
                  {isCameraOn ? (
                    <div className="relative h-[360px] w-full bg-black">
                      <video
                        ref={cameraPreviewRef}
                        autoPlay
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                      {cameraError && (
                        <div className="absolute inset-x-4 bottom-4 rounded-xl bg-red-500/90 px-4 py-3 text-sm text-white shadow-lg">
                          {cameraError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <CameraOff className="mx-auto mb-4 h-10 w-10 text-white/60" />
                      <p className="font-semibold">Your camera is turned off</p>
                      <p className="mt-1 text-xs text-white/60">
                        You can still join the room without video.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t bg-muted/30 p-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setIsCameraOn((current) => !current)}
                  >
                    {isCameraOn ? (
                      <Camera className="h-4 w-4" />
                    ) : (
                      <CameraOff className="h-4 w-4" />
                    )}
                    Camera {isCameraOn ? "on" : "off"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setIsMicOn((current) => !current)}
                  >
                    {isMicOn ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                    Mic {isMicOn ? "on" : "off"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Headphones className="h-4 w-4 text-blue-600" />
                  Audio settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={audioMode}
                  onValueChange={(value) => setAudioMode(value as AudioMode)}
                  className="gap-3"
                >
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent">
                    <RadioGroupItem value="computer" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">Computer audio</p>
                      <p className="text-xs text-muted-foreground">
                        Use your device microphone and speaker.
                      </p>
                    </div>
                    {audioMode === "computer" && (
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    )}
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent">
                    <RadioGroupItem value="room" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">Room audio</p>
                      <p className="text-xs text-muted-foreground">
                        Use classroom or shared room audio later.
                      </p>
                    </div>
                    {audioMode === "room" && (
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    )}
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent">
                    <RadioGroupItem value="none" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">Do not use audio</p>
                      <p className="text-xs text-muted-foreground">
                        Join silently and use chat only.
                      </p>
                    </div>
                    {audioMode === "none" && (
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    )}
                  </label>
                </RadioGroup>

                {audioMode === "computer" && (
                  <div className="overflow-hidden rounded-xl border bg-muted/20">
                    <div className="flex items-center gap-4 border-b p-4">
                      <Mic className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <AudioDevicePicker
                        title="Microphone"
                        devices={microphoneDevices}
                        selectedDeviceId={selectedMicrophoneId}
                        onSelectedDeviceIdChange={setSelectedMicrophoneId}
                        disabled={false}
                        icon={<Mic className="h-4 w-4" />}
                        onOpen={() => void loadMediaDevices(true)}
                        onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {isMicOn ? (
                            <Mic className="h-4 w-4 shrink-0" />
                          ) : (
                            <MicOff className="h-4 w-4 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <AudioLevelMeter
                              activeBars={activeMicrophoneBars}
                              isEnabled={isMicOn && audioMode === "computer"}
                            />
                          </div>
                        </div>
                      </AudioDevicePicker>
                      <Switch checked={isMicOn} onCheckedChange={setIsMicOn} />
                    </div>

                    <div className="flex items-center gap-4 p-4">
                      <Volume2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <AudioDevicePicker
                        title="Speaker"
                        devices={speakerDevices}
                        selectedDeviceId={selectedSpeakerId}
                        onSelectedDeviceIdChange={setSelectedSpeakerId}
                        disabled={false}
                        icon={<Volume2 className="h-4 w-4" />}
                        onOpen={() => void loadMediaDevices(true)}
                        onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
                        contentClassName="w-96"
                      >
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Volume2 className="h-4 w-4 shrink-0" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={speakerVolume}
                            className="h-1 flex-1 accent-blue-600"
                            aria-label="Speaker volume"
                            onChange={(event) =>
                              setSpeakerVolume(Number(event.target.value))
                            }
                          />
                        </div>
                      </AudioDevicePicker>
                    </div>
                  </div>
                )}

                {audioMode === "none" && (
                  <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Audio is disabled. You can still join and use chat.
                  </div>
                )}

                {deviceMessage && audioMode !== "none" && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {deviceMessage}
                  </p>
                )}

                {meetingRoomError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                    {meetingRoomError}
                  </p>
                )}

                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Camera</p>
                      <p className="text-xs text-muted-foreground">
                        Start with camera {isCameraOn ? "enabled" : "off"}.
                      </p>
                    </div>
                    <Switch
                      checked={isCameraOn}
                      onCheckedChange={setIsCameraOn}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={onBack}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 px-6 hover:bg-blue-700"
                    disabled={isJoiningRoom}
                    onClick={() => void handleJoinRoom()}
                  >
                    {isJoiningRoom ? "Joining..." : "Join room"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Sheet
            open={isAudioSettingsOpen}
            onOpenChange={setIsAudioSettingsOpen}
          >
            <SheetContent
              side="right"
              className="w-full border-l p-0 data-[state=closed]:duration-200 data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
              style={{ maxWidth: "480px" }}
            >
              <SheetHeader className="border-b px-5 py-4">
                <SheetTitle>Audio settings</SheetTitle>
                <SheetDescription>
                  Choose the microphone and speaker used before joining the
                  study room.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-7 overflow-y-auto px-5 py-5">
                <AudioSettingsSection
                  title="Speaker"
                  devices={speakerDevices}
                  selectedDeviceId={selectedSpeakerId}
                  onSelectedDeviceIdChange={setSelectedSpeakerId}
                  icon={<Volume2 className="h-4 w-4 shrink-0" />}
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={speakerVolume}
                    className="h-1 w-full accent-blue-600"
                    aria-label="Speaker volume"
                    onChange={(event) =>
                      setSpeakerVolume(Number(event.target.value))
                    }
                  />
                </AudioSettingsSection>

                <AudioSettingsSection
                  title="Microphone"
                  devices={microphoneDevices}
                  selectedDeviceId={selectedMicrophoneId}
                  onSelectedDeviceIdChange={setSelectedMicrophoneId}
                  icon={
                    isMicOn ? (
                      <Mic className="h-4 w-4 shrink-0" />
                    ) : (
                      <MicOff className="h-4 w-4 shrink-0" />
                    )
                  }
                >
                  <AudioLevelMeter
                    activeBars={activeMicrophoneBars}
                    isEnabled={isMicOn && audioMode === "computer"}
                  />
                </AudioSettingsSection>

                {deviceMessage && audioMode !== "none" && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                    {deviceMessage}
                  </p>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

  const toolbarButtonBase =
    "flex min-w-[58px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs text-white/85 transition hover:bg-white/10 hover:text-white";
  const toolbarButtonActive = "bg-white/15 text-white";
  const isScreenShareFocusView = isShowingScreenShare && viewMode === "focus";
  const isGalleryLayoutView = viewMode === "gallery" || participants.length > 1;

  return (
    <div className="fixed inset-0 z-[100] bg-[#1f1f1f] text-white">
      <section className="flex h-screen w-screen flex-col overflow-hidden bg-[#1f1f1f] text-white">
        <header className="flex flex-col gap-3 border-b border-white/10 bg-[#242424] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-300" />
              <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                {courseCode}
              </Badge>
              <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                {courseName}
              </Badge>
              <span className="text-xs text-white/55">
                {nextSession
                  ? formatSessionTime(nextSession.starts_at)
                  : "Meeting room"}
              </span>
            </div>
            <h1 className="truncate text-lg font-semibold">{roomTitle}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className={`${toolbarButtonBase} ${
                activeRoomPanel === "chat" ? toolbarButtonActive : ""
              }`}
              onClick={handleToggleChatPanel}
            >
              <span className="relative">
                <MessageCircle className="h-5 w-5" />
                {unreadChatCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-400 px-1 text-[10px] font-bold text-slate-950">
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
                  </span>
                )}
              </span>
              Chat
            </button>
            <button
              type="button"
              className={`${toolbarButtonBase} ${
                activeRoomPanel === "people" ? toolbarButtonActive : ""
              }`}
              onClick={() =>
                setActiveRoomPanel((panel) =>
                  panel === "people" ? null : "people",
                )
              }
            >
              <span className="relative">
                <Users className="h-5 w-5" />
                {raisedHandCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-950">
                    {raisedHandCount}
                  </span>
                )}
              </span>
              People
            </button>
            <button
              type="button"
              className={`${toolbarButtonBase} ${
                isHandRaised ? toolbarButtonActive : ""
              }`}
              onClick={handleToggleRaiseHand}
            >
              <Hand className="h-5 w-5" />
              Raise
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={toolbarButtonBase}>
                  <SmilePlus className="h-5 w-5" />
                  React
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="z-[130] grid min-w-[220px] grid-cols-6 gap-1 p-2"
              >
                {meetingReactions.map((reaction) => (
                  <button
                    key={reaction}
                    type="button"
                    className="rounded-lg p-2 text-xl transition hover:bg-accent"
                    title={reaction}
                    onClick={() => handleSendReaction(reaction)}
                  >
                    {reaction}
                  </button>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`${toolbarButtonBase} ${
                    viewMode === "gallery" ? toolbarButtonActive : ""
                  }`}
                >
                  <LayoutGrid className="h-5 w-5" />
                  View
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[130] w-44">
                <DropdownMenuRadioGroup
                  value={viewMode}
                  onValueChange={(value) => setViewMode(value as ViewMode)}
                >
                  <DropdownMenuRadioItem value="focus">
                    Focus view
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="gallery">
                    Gallery view
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="mx-2 hidden h-8 w-px bg-white/20 lg:block" />

            <button
              type="button"
              className={`${toolbarButtonBase} ${
                !isCameraOn ? toolbarButtonActive : ""
              }`}
              onClick={() => void handleToggleCamera()}
            >
              {isCameraOn ? (
                <Camera className="h-5 w-5" />
              ) : (
                <CameraOff className="h-5 w-5" />
              )}
              Camera
            </button>
            <button
              type="button"
              className={`${toolbarButtonBase} ${
                !isMicOn ? toolbarButtonActive : ""
              }`}
              onClick={() => void handleToggleMic()}
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              Mic
            </button>
            <button
              type="button"
              className={`${toolbarButtonBase} ${
                isSharingScreen ? toolbarButtonActive : ""
              }`}
              onClick={() => void handleToggleScreenShare()}
            >
              {isSharingScreen ? (
                <ScreenShareOff className="h-5 w-5" />
              ) : (
                <ScreenShare className="h-5 w-5" />
              )}
              Share
            </button>
            <button
              type="button"
              className="flex min-w-[58px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs text-red-300 transition hover:bg-red-500/15 hover:text-red-200"
              onClick={() => void handleLeaveRoom()}
            >
              <PhoneOff className="h-5 w-5" />
              Leave
            </button>
          </div>
        </header>

        <div
          className={`grid min-h-0 flex-1 ${
            activeRoomPanel ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""
          }`}
        >
          <main
            className={`relative flex min-h-0 overflow-hidden bg-[#1f1f1f] ${
              isScreenShareFocusView
                ? "items-stretch justify-stretch p-3 sm:p-4 lg:p-5"
                : "items-center justify-center p-6"
            }`}
          >
            {selectedReaction && (
              <div className="absolute right-8 top-8 z-10 rounded-full bg-black/45 px-5 py-3 text-5xl shadow-lg">
                {selectedReaction}
              </div>
            )}

            {screenShareError && (
              <div className="absolute left-8 top-8 z-10 rounded-xl bg-red-500/90 px-4 py-3 text-sm text-white shadow-lg">
                {screenShareError}
              </div>
            )}

            {latestChatNotice && activeRoomPanel !== "chat" && (
              <button
                type="button"
                className="absolute left-1/2 top-6 z-20 flex max-w-sm -translate-x-1/2 items-start gap-3 rounded-xl border border-blue-300/30 bg-[#2f3b52]/95 px-4 py-3 text-left text-sm text-white shadow-xl backdrop-blur transition hover:bg-[#35445f]"
                onClick={handleToggleChatPanel}
              >
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-200" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-blue-100">
                    New message from {latestChatNotice.author}
                  </span>
                  <span className="mt-0.5 block truncate text-white/85">
                    {latestChatNotice.message}
                  </span>
                </span>
              </button>
            )}

            {isScreenShareFocusView ? (
              <div className="grid h-full w-full min-h-0 grid-cols-[minmax(0,1fr)_104px] grid-rows-[minmax(0,1fr)_72px] gap-3">
                <div className="relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
                  {activeRemoteScreenShare ? (
                    <AcsMediaView
                      target={activeRemoteScreenShare.target}
                      className="h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-contain"
                    />
                  ) : activeScreenShareParticipant?.isCurrentUser ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#111] text-center">
                      <ScreenShare className="h-12 w-12 text-blue-300" />
                      <div>
                        <p className="text-lg font-semibold text-white">
                          You are sharing your screen
                        </p>
                        <p className="text-sm text-white/55">
                          Other members can see your shared screen here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#111] text-center">
                      <ScreenShare className="h-12 w-12 text-white/45" />
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {activeScreenShareParticipant?.profile.full_name ||
                            "A participant"}{" "}
                          is presenting
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="absolute left-4 top-4 rounded-xl bg-black/60 px-3 py-2 text-left shadow-lg backdrop-blur">
                    <p className="text-sm font-semibold text-white">
                      {activeRemoteScreenShare
                        ? `${activeRemoteScreenShare.displayName} is presenting`
                        : activeScreenShareParticipant?.isCurrentUser
                        ? "You are presenting"
                        : `${activeScreenShareParticipant?.profile.full_name || "Someone"} is presenting`}
                    </p>
                  </div>
                  {activeScreenShareParticipant?.isCurrentUser && (
                    <Button
                      type="button"
                      variant="outline"
                      className="absolute right-4 top-4 border-white/20 bg-black/60 text-white hover:bg-white/10 hover:text-white"
                      onClick={() => void stopAcsScreenShare()}
                    >
                      Stop sharing
                    </Button>
                  )}
                </div>

                <div className="flex min-h-0 flex-col gap-2">
                  {sharingParticipants.map((member) => (
                    <div
                      key={member.id}
                      className="flex h-24 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 text-center"
                    >
                      {member.isCurrentUser && member.cameraOn ? (
                        <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-black">
                          <div
                            ref={attachLocalVideoContainer}
                            className="h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
                          />
                        </div>
                      ) : getRemoteVideoTileForMember(member) ? (
                        <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-black">
                          <AcsMediaView
                            target={getRemoteVideoTileForMember(member)!.target}
                            className="h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
                          />
                        </div>
                      ) : (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-blue-600 text-xs text-white">
                            {getInitials(member.profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <p className="mt-2 w-full truncate text-xs font-medium text-white/90">
                        {member.isCurrentUser ? "You" : member.profile.full_name}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="col-span-2 flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {roomTitle}
                    </p>
                    <p className="text-xs text-white/55">
                      {participants.length}/{group.max_members} people
                    </p>
                  </div>
                  {additionalSharingParticipantCount > 0 && (
                    <Badge className="bg-white/10 text-white hover:bg-white/10">
                      +{additionalSharingParticipantCount}
                    </Badge>
                  )}
                </div>
              </div>
            ) : isGalleryLayoutView ? (
              <div className={`grid w-full gap-4 ${galleryGridClass}`}>
                {hasGalleryScreenShareTile && (
                  <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-blue-300/30 bg-blue-500/10 p-5 ring-2 ring-blue-400">
                    <div className="relative flex aspect-video w-full max-w-xs items-center justify-center overflow-hidden rounded-xl bg-black">
                      {activeRemoteScreenShare ? (
                        <AcsMediaView
                          target={activeRemoteScreenShare.target}
                          className="h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-contain"
                        />
                      ) : activeScreenShareParticipant?.isCurrentUser ? (
                        <video
                          ref={screenPreviewRef}
                          className="h-full w-full object-contain"
                          autoPlay
                          muted
                          playsInline
                        />
                      ) : (
                        <ScreenShare className="h-10 w-10 text-white/50" />
                      )}
                      <div className="absolute left-2 top-2 rounded-md bg-black/65 px-2 py-1 text-[11px] font-semibold text-white">
                        Sharing screen
                      </div>
                    </div>
                    <p className="mt-3 max-w-full truncate text-sm font-semibold">
                      {activeRemoteScreenShare?.displayName ||
                        activeScreenShareParticipant?.profile.full_name ||
                        "Screen share"}
                    </p>
                    <p className="text-xs text-blue-100">Presenting</p>
                  </div>
                )}
                {galleryParticipants.map((member) => (
                  <div
                    key={member.id}
                    className={`flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-5 ${
                      member.isCurrentUser ? "ring-2 ring-blue-400" : ""
                    }`}
                  >
                      {member.isCurrentUser && member.cameraOn ? (
                        <div className="flex aspect-video w-full max-w-xs items-center justify-center overflow-hidden rounded-xl bg-black">
                          <div
                            ref={attachLocalVideoContainer}
                            className="h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
                          />
                        </div>
                      ) : getRemoteVideoTileForMember(member) ? (
                        <div className="flex aspect-video w-full max-w-xs items-center justify-center overflow-hidden rounded-xl bg-black">
                          <AcsMediaView
                            target={getRemoteVideoTileForMember(member)!.target}
                            className="h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
                          />
                        </div>
                      ) : (
                        <Avatar className="h-20 w-20">
                        <AvatarImage src={member.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-blue-600 text-xl text-white">
                          {getInitials(member.profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <p className="mt-3 max-w-full truncate text-sm font-semibold">
                      {member.isCurrentUser ? "You" : member.profile.full_name}
                    </p>
                    <p className="text-xs text-white/55">
                      {member.user_id === group.creator_id
                        ? member.cameraOn
                          ? "Host - camera on"
                          : "Host"
                        : member.role}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                {currentParticipant?.cameraOn ? (
                  <div className="flex aspect-video w-full max-w-3xl items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
                    <div
                      ref={attachLocalVideoContainer}
                      className="h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
                    />
                  </div>
                ) : (
                  <Avatar className="h-44 w-44 border-4 border-white/10">
                    <AvatarImage src={currentParticipant?.profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-pink-200 text-6xl font-semibold text-pink-900">
                      {getInitials(
                        currentParticipant?.profile.full_name || group.name,
                      )}
                    </AvatarFallback>
                  </Avatar>
                )}
                <h2 className="mt-8 text-2xl font-semibold">
                  Waiting for classmates
                </h2>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Badge className="bg-white/10 text-white hover:bg-white/10">
                    {participants.length}/{group.max_members} people
                  </Badge>
                  {currentParticipant?.handRaised && (
                    <Badge className="bg-amber-400/20 text-amber-100 hover:bg-amber-400/20">
                      Hand raised
                    </Badge>
                  )}
                  {!currentParticipant?.micOn && (
                    <Badge className="bg-white/10 text-white hover:bg-white/10">
                      Mic muted
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </main>

          {activeRoomPanel && (
            <aside className="min-h-0 border-l border-white/10 bg-[#252525] text-white">
              {activeRoomPanel === "chat" ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b border-white/10 px-4 py-4">
                    <h2 className="font-semibold">Meeting chat</h2>
                    <p className="text-xs text-white/55">
                      Synced through Azure realtime.
                    </p>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                    {roomChatMessages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-2xl bg-white/8 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs text-white/50">
                          <span>{message.author}</span>
                          <span>{formatChatTime(message.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-white/90">{message.message}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/10 p-4">
                    <Textarea
                      rows={3}
                      value={roomChatMessage}
                      onChange={(event) => setRoomChatMessage(event.target.value)}
                      placeholder="Type a message..."
                      className="border-white/10 bg-white/10 text-white placeholder:text-white/45"
                    />
                    <Button
                      className="mt-3 w-full gap-2 bg-blue-600 hover:bg-blue-700"
                      onClick={handleSendRoomMessage}
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b border-white/10 px-4 py-4">
                    <h2 className="font-semibold">People</h2>
                    <p className="text-xs text-white/55">
                      {participants.length} room member
                      {participants.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                    {isLoadingMembers && (
                      <p className="text-sm text-white/55">
                        Loading group members...
                      </p>
                    )}
                    {participants.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-xl bg-white/6 p-3"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-blue-600 text-white">
                            {getInitials(member.profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {member.isCurrentUser
                              ? "You"
                              : member.profile.full_name}
                          </p>
                          <p className="text-xs text-white/50">
                            {member.isCurrentUser
                              ? "Current user"
                              : member.user_id === group.creator_id
                                ? "Host"
                                : member.role === "owner"
                                  ? "Group owner"
                                  : "Member"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.handRaised && (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-2 py-1 text-xs font-semibold text-amber-200"
                              title={`${member.profile.full_name} raised a hand`}
                            >
                              <Hand className="h-3 w-3" />
                              Raised
                            </span>
                          )}
                          {member.screenSharing && (
                            <ScreenShare className="h-4 w-4 text-blue-300" />
                          )}
                          {member.cameraOn ? (
                            <Camera className="h-4 w-4 text-blue-300" />
                          ) : (
                            <CameraOff className="h-4 w-4 text-white/35" />
                          )}
                          {member.micOn ? (
                            <Mic className="h-4 w-4 text-blue-300" />
                          ) : (
                            <MicOff className="h-4 w-4 text-white/35" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}
