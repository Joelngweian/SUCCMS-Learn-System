import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import {
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Send,
  Share2,
  ThumbsUp,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { ForumEmojiPicker } from "../forum/ForumEmojiPicker";
import { CampusPostMedia } from "./CampusPostMedia";
import {
  formatCampusPostTime,
  getCampusMemberInitials,
  getCampusRoleBadgeClass,
} from "./campusFeedPresentation";
import type {
  CampusPost,
  CampusPostAttachment,
  CampusPostComment,
  SelectedCampusMedia,
} from "./campusFeedTypes";
import {
  MAX_CAMPUS_COMMENT_MEDIA_FILES,
  MAX_CAMPUS_POST_MEDIA_BYTES,
  MAX_CAMPUS_POST_MEDIA_FILES,
  useCampusFeed,
} from "./useCampusFeed";

const CAMPUS_MENTION_PATTERN = /@([A-Za-z0-9_-]{2,64})/g;

type CampusMentionTarget = "composer" | "editPost";

type ActiveCampusMention = {
  target: CampusMentionTarget;
  query: string;
  start: number;
  end: number;
};

type CampusMentionSuggestion = {
  id: string;
  type: "course" | "user";
  token: string;
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  badge?: string | null;
};

type CampusMentionUserRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
};

type DirectCourseMentionRow = {
  id: string;
  owner_id: string | null;
  courses:
    | {
        course_code: string | null;
        code: string | null;
        name: string | null;
        chinese_name: string | null;
      }
    | Array<{
        course_code: string | null;
        code: string | null;
        name: string | null;
        chinese_name: string | null;
      }>
    | null;
  course_instructors?: Array<{ user_id: string | null }> | null;
};

const renderCampusMentionText = (content: string) => {
  const parts = [];
  let lastIndex = 0;

  content.replace(CAMPUS_MENTION_PATTERN, (match, token, offset) => {
    if (offset > lastIndex) {
      parts.push(content.slice(lastIndex, offset));
    }
    parts.push(
      <span
        key={`${token}-${offset}`}
        className="font-semibold text-primary"
      >
        {match}
      </span>,
    );
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
};

const getActiveCampusMention = (
  target: CampusMentionTarget,
  value: string,
  cursorPosition: number | null,
): ActiveCampusMention | null => {
  if (cursorPosition === null) return null;

  const beforeCursor = value.slice(0, cursorPosition);
  const match = /(^|\s)@([A-Za-z0-9_-]{0,64})$/.exec(beforeCursor);
  if (!match) return null;

  return {
    target,
    query: match[2],
    start: match.index + match[1].length,
    end: cursorPosition,
  };
};

const getUserMentionToken = (userRow: CampusMentionUserRow) => {
  const username = userRow.username?.trim();
  if (username) return username.replace(/^@+/, "");

  const nameToken = userRow.full_name?.replace(/\s+/g, "");
  return nameToken || userRow.id.slice(0, 8);
};

const toUserMentionSuggestion = (
  userRow: CampusMentionUserRow,
): CampusMentionSuggestion => ({
  id: userRow.id,
  type: "user",
  token: getUserMentionToken(userRow),
  title: userRow.full_name || userRow.username || "Campus member",
  subtitle: userRow.username ? `@${userRow.username}` : userRow.role || "User",
  avatarUrl: userRow.avatar_url,
  badge: userRow.role,
});

const firstRelation = <T,>(value: T | T[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value;

const toCourseMentionSuggestion = (course: {
  id: string;
  course_code: string;
  name: string | null;
  chinese_name: string | null;
}): CampusMentionSuggestion => ({
  id: course.id,
  type: "course",
  token: course.course_code,
  title: course.course_code,
  subtitle: course.chinese_name
    ? `${course.name || "Course"} · ${course.chinese_name}`
    : course.name || "Course",
  badge: "Course",
});

const searchCampusMentionCourses = async (
  query: string,
): Promise<CampusMentionSuggestion[]> => {
  const { data, error } = await supabase.rpc("search_campus_mention_courses", {
    p_search: query || null,
    p_limit: 5,
  });

  if (!error) {
    return (data || []).map(course =>
      toCourseMentionSuggestion({
        id: course.id,
        course_code: course.course_code,
        name: course.name,
        chinese_name: course.chinese_name,
      }),
    );
  }

  console.warn("Campus mention course RPC unavailable; using fallback query:", error);
  const fallbackResult = await supabase
    .from("course_offerings")
    .select(
      "id, owner_id, courses!inner(course_code, code, name, chinese_name), course_instructors(user_id)",
    )
    .eq("status", "active")
    .limit(120);

  if (fallbackResult.error) throw fallbackResult.error;

  const normalizedQuery = query.trim().toLowerCase();
  const seenCourseCodes = new Set<string>();

  return ((fallbackResult.data || []) as unknown as DirectCourseMentionRow[])
    .flatMap(row => {
      const course = firstRelation(row.courses);
      const courseCode =
        course?.course_code?.trim() || course?.code?.trim() || "";
      const hasTeacher =
        Boolean(row.owner_id) || Boolean(row.course_instructors?.length);
      if (!course || !courseCode || !hasTeacher) return [];

      const normalizedCourseCode = courseCode.toUpperCase();
      if (seenCourseCodes.has(normalizedCourseCode)) return [];

      const searchText = [
        courseCode,
        course.name || "",
        course.chinese_name || "",
      ]
        .join(" ")
        .toLowerCase();
      if (normalizedQuery && !searchText.includes(normalizedQuery)) return [];

      seenCourseCodes.add(normalizedCourseCode);
      return [
        toCourseMentionSuggestion({
          id: row.id,
          course_code: courseCode,
          name: course.name,
          chinese_name: course.chinese_name,
        }),
      ];
    })
    .slice(0, 5);
};

export function CampusFeed() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const editCommentFileInputRef = useRef<HTMLInputElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editPostTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editPreviewUrlsRef = useRef(new Set<string>());
  const commentPreviewUrlsRef = useRef(new Set<string>());
  const highlightedPostRef = useRef<string | null>(null);
  const mentionRequestRef = useRef(0);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeMention, setActiveMention] =
    useState<ActiveCampusMention | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<
    CampusMentionSuggestion[]
  >([]);
  const [isMentionLoading, setIsMentionLoading] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [submittingCommentIds, setSubmittingCommentIds] =
    useState<Set<string>>(new Set());
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(
    new Set(),
  );
  const [lightboxAttachment, setLightboxAttachment] =
    useState<CampusPost["attachments"][number] | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editAttachments, setEditAttachments] = useState<
    CampusPostAttachment[]
  >([]);
  const [editSelectedMedia, setEditSelectedMedia] = useState<
    SelectedCampusMedia[]
  >([]);
  const [editError, setEditError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState("");
  const [commentMedia, setCommentMedia] =
    useState<SelectedCampusMedia | null>(null);
  const [commentMediaError, setCommentMediaError] = useState("");
  const [editCommentAttachments, setEditCommentAttachments] = useState<
    CampusPostAttachment[]
  >([]);
  const [editCommentMedia, setEditCommentMedia] =
    useState<SelectedCampusMedia | null>(null);
  const [editCommentMediaError, setEditCommentMediaError] = useState("");
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(
    null,
  );
  const feed = useCampusFeed();
  const activePost =
    feed.posts.find(post => post.id === activePostId) || null;
  const activeComments = activePost
    ? feed.commentsByPost[activePost.id] || []
    : [];
  const areActiveCommentsLoading = activePost
    ? feed.loadingCommentPostIds.has(activePost.id)
    : false;
  const isActiveCommentSubmitting = activePost
    ? submittingCommentIds.has(activePost.id)
    : false;

  useEffect(() => {
    const previewUrls = editPreviewUrlsRef.current;
    const commentPreviewUrls = commentPreviewUrlsRef.current;
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      previewUrls.clear();
      commentPreviewUrls.forEach(url => URL.revokeObjectURL(url));
      commentPreviewUrls.clear();
    };
  }, []);

  useEffect(() => {
    const targetPostId = window.location.hash.match(/^#campus-post-(.+)$/)?.[1];
    if (!targetPostId || highlightedPostRef.current === targetPostId) return;
    if (!feed.posts.some(post => post.id === targetPostId)) return;

    highlightedPostRef.current = targetPostId;
    window.setTimeout(() => {
      const element = document.getElementById(`campus-post-${targetPostId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.classList.add("ring-2", "ring-primary/40");
      window.setTimeout(() => {
        element?.classList.remove("ring-2", "ring-primary/40");
      }, 2400);
    }, 120);
  }, [feed.posts]);

  useEffect(() => {
    if (!activeMention) {
      setMentionSuggestions([]);
      setIsMentionLoading(false);
      return;
    }

    const requestId = ++mentionRequestRef.current;
    const searchTerm = activeMention.query.trim();
    const debounceTimer = window.setTimeout(async () => {
      setIsMentionLoading(true);
      try {
        const userQuery = supabase
          .from("user_profiles")
          .select("id, full_name, username, avatar_url, role")
          .or("is_active.eq.true,is_active.is.null")
          .order("full_name", { ascending: true })
          .limit(5);

        if (user?.id) userQuery.neq("id", user.id);
        if (searchTerm) {
          userQuery.or(
            `full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`,
          );
        }

        const [courseSuggestions, userResult] = await Promise.all([
          searchCampusMentionCourses(searchTerm),
          userQuery,
        ]);
        if (requestId !== mentionRequestRef.current) return;
        if (userResult.error) throw userResult.error;

        setMentionSuggestions([
          ...courseSuggestions,
          ...((userResult.data || []) as CampusMentionUserRow[])
            .map(toUserMentionSuggestion)
            .slice(0, Math.max(0, 8 - courseSuggestions.length)),
        ]);
      } catch (error) {
        console.error("Campus mention suggestions failed:", error);
        if (requestId === mentionRequestRef.current) {
          setMentionSuggestions([]);
        }
      } finally {
        if (requestId === mentionRequestRef.current) {
          setIsMentionLoading(false);
        }
      }
    }, searchTerm ? 180 : 0);

    return () => window.clearTimeout(debounceTimer);
  }, [activeMention, user?.id]);

  const releaseEditMedia = () => {
    editPreviewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    editPreviewUrlsRef.current.clear();
    setEditSelectedMedia([]);
  };

  const updateActiveMention = (
    target: CampusMentionTarget,
    value: string,
    cursorPosition: number | null,
  ) => {
    setActiveMention(
      getActiveCampusMention(target, value, cursorPosition),
    );
  };

  const insertMentionSuggestion = (suggestion: CampusMentionSuggestion) => {
    if (!activeMention) return;

    const mentionText = `@${suggestion.token} `;
    const currentValue =
      activeMention.target === "composer" ? feed.draftContent : editDraft;
    const nextValue =
      currentValue.slice(0, activeMention.start)
      + mentionText
      + currentValue.slice(activeMention.end);
    const nextCursor = activeMention.start + mentionText.length;
    const textareaRef =
      activeMention.target === "composer"
        ? composerTextareaRef
        : editPostTextareaRef;

    if (activeMention.target === "composer") {
      feed.setDraftContent(nextValue);
    } else {
      setEditDraft(nextValue);
    }

    setActiveMention(null);
    setMentionSuggestions([]);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const renderMentionSuggestions = (target: CampusMentionTarget) => {
    if (!activeMention || activeMention.target !== target) return null;

    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          Mention someone or a taught course
        </div>
        {isMentionLoading ? (
          <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching mentions...
          </div>
        ) : mentionSuggestions.length > 0 ? (
          <div className="max-h-72 overflow-y-auto py-1">
            {mentionSuggestions.map(suggestion => (
              <button
                key={`${suggestion.type}-${suggestion.id}`}
                type="button"
                onMouseDown={event => {
                  event.preventDefault();
                  insertMentionSuggestion(suggestion);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/70"
              >
                {suggestion.type === "user" ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={suggestion.avatarUrl || ""} />
                    <AvatarFallback>
                      {getCampusMemberInitials(suggestion.title)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    @{suggestion.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {suggestion.subtitle}
                  </span>
                </span>
                {suggestion.badge && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {suggestion.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="px-3 py-3 text-sm text-muted-foreground">
            No users or taught courses found for @{activeMention.query || "..."}.
          </div>
        )}
      </div>
    );
  };

  const openPostDialog = (postId: string) => {
    setActivePostId(postId);
    void feed.loadComments(postId);
  };

  const releaseCommentMedia = () => {
    if (commentMedia) {
      URL.revokeObjectURL(commentMedia.previewUrl);
      commentPreviewUrlsRef.current.delete(commentMedia.previewUrl);
    }
    setCommentMedia(null);
    setCommentMediaError("");
  };

  const releaseEditCommentMedia = () => {
    if (editCommentMedia) {
      URL.revokeObjectURL(editCommentMedia.previewUrl);
      commentPreviewUrlsRef.current.delete(editCommentMedia.previewUrl);
    }
    setEditCommentMedia(null);
    setEditCommentMediaError("");
  };

  const startEditingComment = (comment: CampusPostComment) => {
    releaseEditCommentMedia();
    setEditingCommentId(comment.id);
    setEditCommentDraft(comment.content);
    setEditCommentAttachments(comment.attachments);
  };

  const cancelEditingComment = () => {
    releaseEditCommentMedia();
    setEditingCommentId(null);
    setEditCommentDraft("");
    setEditCommentAttachments([]);
  };

  const saveEditedComment = async (comment: CampusPostComment) => {
    const updated = await feed.updateComment(
      comment,
      editCommentDraft,
      editCommentAttachments,
      editCommentMedia,
    );
    if (updated) cancelEditingComment();
  };

  const selectCommentMedia = (
    event: ChangeEvent<HTMLInputElement>,
    editing: boolean,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const setError = editing
      ? setEditCommentMediaError
      : setCommentMediaError;
    if (!file.type.startsWith("image/")) {
      setError("Comments currently support image attachments only.");
      return;
    }
    if (file.size > MAX_CAMPUS_POST_MEDIA_BYTES) {
      setError(`${file.name} is larger than 10 MB.`);
      return;
    }

    if (editing) {
      releaseEditCommentMedia();
    } else {
      releaseCommentMedia();
    }
    const previewUrl = URL.createObjectURL(file);
    commentPreviewUrlsRef.current.add(previewUrl);
    const selected = {
      id: crypto.randomUUID(),
      file,
      previewUrl,
    };
    if (editing) {
      setEditCommentAttachments([]);
      setEditCommentMedia(selected);
      setEditCommentMediaError("");
    } else {
      setCommentMedia(selected);
      setCommentMediaError("");
    }
  };

  const togglePostContent = (postId: string) => {
    setExpandedPostIds(current => {
      const next = new Set(current);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const startEditingPost = (post: CampusPost) => {
    releaseEditMedia();
    setActiveMention(null);
    setEditingPostId(post.id);
    setEditDraft(post.content);
    setEditAttachments(post.attachments);
    setEditError("");
  };

  const cancelEditingPost = () => {
    releaseEditMedia();
    setActiveMention(current =>
      current?.target === "editPost" ? null : current,
    );
    setEditingPostId(null);
    setEditDraft("");
    setEditAttachments([]);
    setEditError("");
  };

  const saveEditedPost = async (post: CampusPost) => {
    const updated = await feed.updatePost(
      post,
      editDraft,
      editAttachments,
      editSelectedMedia,
    );
    if (updated) cancelEditingPost();
  };

  const removeExistingEditAttachment = (path: string) => {
    setEditAttachments(current =>
      current.filter(attachment => attachment.path !== path)
    );
    setEditError("");
  };

  const removeNewEditMedia = (mediaId: string) => {
    setEditSelectedMedia(current => current.filter(media => {
      if (media.id !== mediaId) return true;
      URL.revokeObjectURL(media.previewUrl);
      editPreviewUrlsRef.current.delete(media.previewUrl);
      return false;
    }));
    setEditError("");
  };

  const selectEditMedia = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    const remainingSlots =
      MAX_CAMPUS_POST_MEDIA_FILES
      - editAttachments.length
      - editSelectedMedia.length;
    if (remainingSlots <= 0) {
      setEditError(
        `You can attach up to ${MAX_CAMPUS_POST_MEDIA_FILES} images.`,
      );
      return;
    }

    const accepted: SelectedCampusMedia[] = [];
    let nextError = "";
    for (const file of files.slice(0, remainingSlots)) {
      if (!file.type.startsWith("image/")) {
        nextError = "Campus posts currently support image attachments only.";
        continue;
      }
      if (file.size > MAX_CAMPUS_POST_MEDIA_BYTES) {
        nextError = `${file.name} is larger than 10 MB.`;
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      editPreviewUrlsRef.current.add(previewUrl);
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl,
      });
    }

    setEditSelectedMedia(current => [...current, ...accepted]);
    setEditError(nextError);
  };

  const submitComment = async (
    event: FormEvent<HTMLFormElement>,
    postId: string,
  ) => {
    event.preventDefault();
    const content = commentDrafts[postId] || "";
    if (
      (!content.trim() && !commentMedia)
      || submittingCommentIds.has(postId)
    ) return;

    setSubmittingCommentIds(current => new Set(current).add(postId));
    const created = await feed.addComment(postId, content, commentMedia);
    if (created) {
      setCommentDrafts(current => ({ ...current, [postId]: "" }));
      releaseCommentMedia();
    }
    setSubmittingCommentIds(current => {
      const next = new Set(current);
      next.delete(postId);
      return next;
    });
  };

  const sharePost = async (post: CampusPost) => {
    const url = `${window.location.origin}${window.location.pathname}#campus-post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.authorName}'s campus post`,
          text: post.content.slice(0, 180),
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        notify.success("Post link copied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      notify.error(error, "The post link could not be shared.");
    }
  };

  return (
    <section
      aria-labelledby="campus-feed-title"
      className="mx-auto w-full max-w-[820px] space-y-4"
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 id="campus-feed-title" className="text-xl font-semibold">
              Campus Feed
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Posts shared across the SUCCMS campus community.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void feed.refreshPosts()}
          disabled={feed.isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${feed.isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="overflow-visible shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                {getCampusMemberInitials(profile?.full_name || "Campus Member")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="relative">
                <Textarea
                  ref={composerTextareaRef}
                  value={feed.draftContent}
                  onChange={event => {
                    feed.setDraftContent(event.target.value);
                    updateActiveMention(
                      "composer",
                      event.target.value,
                      event.currentTarget.selectionStart,
                    );
                  }}
                  onClick={event =>
                    updateActiveMention(
                      "composer",
                      event.currentTarget.value,
                      event.currentTarget.selectionStart,
                    )
                  }
                  onKeyUp={event =>
                    updateActiveMention(
                      "composer",
                      event.currentTarget.value,
                      event.currentTarget.selectionStart,
                    )
                  }
                  placeholder={`What's on your mind, ${
                    profile?.full_name?.split(" ")[0] || "Scholar"
                  }?`}
                  maxLength={5000}
                  className="min-h-24 resize-none border-0 bg-muted/60 px-4 py-3 shadow-none focus-visible:ring-1"
                />
                {renderMentionSuggestions("composer")}
              </div>

              {feed.selectedMedia.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {feed.selectedMedia.map(media => (
                    <div
                      key={media.id}
                      className="group relative overflow-hidden rounded-lg border bg-muted"
                    >
                      <img
                        src={media.previewUrl}
                        alt={media.file.name}
                        className="h-36 w-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-2 h-7 w-7 rounded-full opacity-90"
                        onClick={() => feed.removeSelectedMedia(media.id)}
                        aria-label={`Remove ${media.file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {feed.composerError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {feed.composerError}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={feed.isCreating || feed.selectedMedia.length >= 4}
                  >
                    <ImagePlus className="h-4 w-4 text-emerald-600" />
                    Photo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={feed.selectMedia}
                  />
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    Campus-wide · students, lecturers and admins
                  </span>
                </div>
                <Button
                  type="button"
                  className="bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                  onClick={() => {
                    setActiveMention(null);
                    void feed.createPost();
                  }}
                  disabled={
                    feed.isCreating
                    || (!feed.draftContent.trim()
                      && feed.selectedMedia.length === 0)
                  }
                >
                  {feed.isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Post
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {feed.newPostsAvailable && (
        <button
          type="button"
          onClick={() => void feed.refreshPosts()}
          className="w-full rounded-full border bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          New campus posts are available — show latest
        </button>
      )}

      {feed.feedError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {feed.feedError}
        </div>
      )}

      {feed.isLoading && feed.posts.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : feed.posts.length === 0 && !feed.feedError ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">The campus feed is ready</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first person to share an update.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feed.posts.map(post => {
            const isOwner = post.authorId === user?.id;
            const isContentExpanded = expandedPostIds.has(post.id);
            const isEditing = editingPostId === post.id;
            const isUpdating = feed.updatingPostIds.has(post.id);
            const hasLongContent =
              post.content.length > 360
              || post.content.split(/\r?\n/).length > 5;

            return (
              <Card
                id={`campus-post-${post.id}`}
                key={post.id}
                className={`relative shadow-sm ${
                  isEditing ? "overflow-visible" : "overflow-hidden"
                }`}
              >
                <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-3 pr-14">
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${post.authorId}`)}
                    className="shrink-0 rounded-full"
                    aria-label={`Open ${post.authorName}'s profile`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.authorAvatarUrl || undefined} />
                      <AvatarFallback>
                        {getCampusMemberInitials(post.authorName)}
                      </AvatarFallback>
                    </Avatar>
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/${post.authorId}`)}
                        className="truncate text-sm font-semibold hover:underline"
                      >
                        {post.authorName}
                      </button>
                      <Badge
                        variant="outline"
                        className={`capitalize ${getCampusRoleBadgeClass(post.authorRole)}`}
                      >
                        {post.authorRole}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatCampusPostTime(post.createdAt)}
                      {post.updatedAt !== post.createdAt ? " · Edited" : ""}
                      {" · Campus"}
                    </p>
                  </div>

                  {isOwner && !isEditing && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-3 top-3 h-8 w-8 rounded-full"
                          aria-label="Post options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => startEditingPost(post)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit post
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => void feed.deletePost(post)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete post
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 p-0">
                  {isEditing ? (
                    <div className="space-y-3 px-4">
                      <div className="relative">
                        <Textarea
                          ref={editPostTextareaRef}
                          value={editDraft}
                          onChange={event => {
                            setEditDraft(event.target.value);
                            updateActiveMention(
                              "editPost",
                              event.target.value,
                              event.currentTarget.selectionStart,
                            );
                          }}
                          onClick={event =>
                            updateActiveMention(
                              "editPost",
                              event.currentTarget.value,
                              event.currentTarget.selectionStart,
                            )
                          }
                          onKeyUp={event =>
                            updateActiveMention(
                              "editPost",
                              event.currentTarget.value,
                              event.currentTarget.selectionStart,
                            )
                          }
                          maxLength={5000}
                          className="min-h-28 resize-y"
                          autoFocus
                          aria-label="Edit post content"
                        />
                        {renderMentionSuggestions("editPost")}
                      </div>
                      {(editAttachments.length > 0
                        || editSelectedMedia.length > 0) && (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {editAttachments.map(attachment => (
                            <div
                              key={attachment.path}
                              className="group relative overflow-hidden rounded-lg border bg-muted"
                            >
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="h-28 w-full object-cover"
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full opacity-90"
                                onClick={() =>
                                  removeExistingEditAttachment(attachment.path)
                                }
                                disabled={isUpdating}
                                aria-label={`Remove ${attachment.name}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {editSelectedMedia.map(media => (
                            <div
                              key={media.id}
                              className="group relative overflow-hidden rounded-lg border border-primary/30 bg-muted"
                            >
                              <img
                                src={media.previewUrl}
                                alt={media.file.name}
                                className="h-28 w-full object-cover"
                              />
                              <Badge className="absolute bottom-1.5 left-1.5 text-[10px]">
                                New
                              </Badge>
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full opacity-90"
                                onClick={() => removeNewEditMedia(media.id)}
                                disabled={isUpdating}
                                aria-label={`Remove ${media.file.name}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {editError && (
                        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {editError}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => editFileInputRef.current?.click()}
                            disabled={
                              isUpdating
                              || editAttachments.length
                                + editSelectedMedia.length
                                >= MAX_CAMPUS_POST_MEDIA_FILES
                            }
                          >
                            <ImagePlus className="h-4 w-4 text-emerald-600" />
                            Add photos
                          </Button>
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            multiple
                            className="hidden"
                            onChange={selectEditMedia}
                          />
                          <span className="text-xs text-muted-foreground">
                            {editAttachments.length + editSelectedMedia.length}/
                            {MAX_CAMPUS_POST_MEDIA_FILES}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={cancelEditingPost}
                            disabled={isUpdating}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void saveEditedPost(post)}
                            disabled={
                              isUpdating
                              || (!editDraft.trim()
                                && editAttachments.length
                                  + editSelectedMedia.length
                                  === 0)
                            }
                          >
                            {isUpdating && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : post.content ? (
                    <div className="px-4">
                      <p
                        className={`whitespace-pre-wrap break-words text-sm leading-6 ${
                          hasLongContent && !isContentExpanded
                            ? "line-clamp-5"
                            : ""
                        }`}
                      >
                        {renderCampusMentionText(post.content)}
                      </p>
                      {hasLongContent && (
                        <button
                          type="button"
                          onClick={() => togglePostContent(post.id)}
                          className="mt-1 text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline"
                        >
                          {isContentExpanded ? "See less" : "See more"}
                        </button>
                      )}
                    </div>
                  ) : null}

                  {!isEditing && (
                    <CampusPostMedia
                      post={post}
                      onOpen={setLightboxAttachment}
                    />
                  )}

                  <div className="mx-4 flex items-center justify-between border-b pb-2 text-xs text-muted-foreground">
                    <span>
                      {post.reactionCount > 0
                        ? `${post.reactionCount} reaction${
                            post.reactionCount === 1 ? "" : "s"
                          }`
                        : "Be the first to react"}
                    </span>
                    <button
                      type="button"
                      onClick={() => openPostDialog(post.id)}
                      className="hover:underline"
                    >
                      {post.commentCount} comment
                      {post.commentCount === 1 ? "" : "s"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1 px-3">
                    <Button
                      type="button"
                      variant="ghost"
                      className={
                        post.viewerReaction
                          ? "text-primary hover:text-primary"
                          : "text-muted-foreground"
                      }
                      onClick={() => void feed.toggleReaction(post)}
                    >
                      <ThumbsUp
                        className={`h-4 w-4 ${
                          post.viewerReaction ? "fill-current" : ""
                        }`}
                      />
                      Like
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => openPostDialog(post.id)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Comment
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => void sharePost(post)}
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {feed.hasMore && !feed.feedError && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void feed.loadMorePosts()}
          disabled={feed.isLoadingMore}
        >
          {feed.isLoadingMore && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Load more posts
        </Button>
      )}

      <Dialog
        open={Boolean(activePost)}
        onOpenChange={open => {
          if (!open) {
            setOpenCommentMenuId(null);
            setActivePostId(null);
            cancelEditingComment();
            releaseCommentMedia();
          }
        }}
      >
        <DialogContent
          className="grid h-[90vh] max-h-[900px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-4xl"
          onPointerDownOutside={event => event.preventDefault()}
          onInteractOutside={event => event.preventDefault()}
        >
          {activePost && (
            <>
              <div className="border-b px-6 py-4 text-center">
                <DialogTitle className="pr-10 text-lg">
                  {activePost.authorName}&apos;s Post
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Campus post details and comments.
                </DialogDescription>
              </div>

              <div className="overflow-y-auto">
                <div className="space-y-4 border-b p-5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/profile/${activePost.authorId}`)
                      }
                      className="shrink-0 rounded-full"
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage
                          src={activePost.authorAvatarUrl || undefined}
                        />
                        <AvatarFallback>
                          {getCampusMemberInitials(activePost.authorName)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/profile/${activePost.authorId}`)
                          }
                          className="truncate text-sm font-semibold hover:underline"
                        >
                          {activePost.authorName}
                        </button>
                        <Badge
                          variant="outline"
                          className={`capitalize ${getCampusRoleBadgeClass(activePost.authorRole)}`}
                        >
                          {activePost.authorRole}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCampusPostTime(activePost.createdAt)}
                        {activePost.updatedAt !== activePost.createdAt
                          ? " · Edited"
                          : ""}
                        {" · Campus"}
                      </p>
                    </div>
                  </div>

                  {activePost.content && (
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {renderCampusMentionText(activePost.content)}
                    </p>
                  )}
                </div>

                <CampusPostMedia
                  post={activePost}
                  onOpen={setLightboxAttachment}
                />

                <div className="border-b px-5 py-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {activePost.reactionCount} reaction
                      {activePost.reactionCount === 1 ? "" : "s"}
                    </span>
                    <span>
                      {activePost.commentCount} comment
                      {activePost.commentCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 border-t pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className={
                        activePost.viewerReaction
                          ? "text-primary hover:text-primary"
                          : "text-muted-foreground"
                      }
                      onClick={() => void feed.toggleReaction(activePost)}
                    >
                      <ThumbsUp
                        className={`h-4 w-4 ${
                          activePost.viewerReaction ? "fill-current" : ""
                        }`}
                      />
                      Like
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => void sharePost(activePost)}
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 bg-muted/20 p-5">
                  <h3 className="text-sm font-semibold">
                    Comments
                  </h3>
                  {areActiveCommentsLoading ? (
                    <div className="flex min-h-32 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : activeComments.length > 0 ? (
                    <div className="space-y-4">
                      {activeComments.map(comment => (
                        <div
                          key={comment.id}
                          className="flex items-start gap-2.5"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/profile/${comment.authorId}`)
                            }
                            className="shrink-0 rounded-full"
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarImage
                                src={comment.authorAvatarUrl || undefined}
                              />
                              <AvatarFallback className="text-xs">
                                {getCampusMemberInitials(comment.authorName)}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                          <div className="min-w-0 max-w-[85%] flex-1">
                            <div className="group/comment-menu flex items-start gap-1">
                              <div
                                className={`min-w-0 max-w-full rounded-2xl bg-muted px-3.5 py-2.5 ${
                                  editingCommentId === comment.id
                                    ? "w-full"
                                    : ""
                                }`}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-semibold">
                                    {comment.authorName}
                                  </span>
                                  <span className="text-[10px] capitalize text-muted-foreground">
                                    {comment.authorRole}
                                  </span>
                                </div>
                                {editingCommentId === comment.id ? (
                                  <div className="mt-2 space-y-2">
                                    <Textarea
                                      value={editCommentDraft}
                                      onChange={event =>
                                        setEditCommentDraft(event.target.value)
                                      }
                                      maxLength={2000}
                                      className="min-h-20 resize-y bg-background"
                                      autoFocus
                                      aria-label="Edit comment"
                                    />
                                    {editCommentAttachments.map(attachment => (
                                      <div
                                        key={attachment.path}
                                        className="relative overflow-hidden rounded-xl bg-background"
                                      >
                                        <img
                                          src={attachment.url}
                                          alt={attachment.name}
                                          className="max-h-56 w-full object-cover"
                                        />
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="icon"
                                          className="absolute right-2 top-2 h-7 w-7 rounded-full"
                                          onClick={() =>
                                            setEditCommentAttachments([])
                                          }
                                          aria-label="Remove comment image"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                    {editCommentMedia && (
                                      <div className="relative overflow-hidden rounded-xl bg-background">
                                        <img
                                          src={editCommentMedia.previewUrl}
                                          alt={editCommentMedia.file.name}
                                          className="max-h-56 w-full object-cover"
                                        />
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="icon"
                                          className="absolute right-2 top-2 h-7 w-7 rounded-full"
                                          onClick={releaseEditCommentMedia}
                                          aria-label="Remove new comment image"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )}
                                    {editCommentMediaError && (
                                      <p className="text-xs text-destructive">
                                        {editCommentMediaError}
                                      </p>
                                    )}
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1">
                                        <ForumEmojiPicker
                                          onSelect={emoji =>
                                            setEditCommentDraft(current =>
                                              current.length + emoji.length <= 2000
                                                ? `${current}${emoji}`
                                                : current,
                                            )
                                          }
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 rounded-full"
                                          onClick={() =>
                                            editCommentFileInputRef.current?.click()
                                          }
                                          title="Attach an image"
                                          aria-label="Attach an image"
                                        >
                                          <ImagePlus className="h-4 w-4 text-emerald-600" />
                                        </Button>
                                        <input
                                          ref={editCommentFileInputRef}
                                          type="file"
                                          accept="image/jpeg,image/png,image/webp,image/gif"
                                          className="hidden"
                                          onChange={event =>
                                            selectCommentMedia(event, true)
                                          }
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={cancelEditingComment}
                                          disabled={feed.updatingCommentIds.has(
                                            comment.id,
                                          )}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() =>
                                            void saveEditedComment(comment)
                                          }
                                          disabled={
                                            (!editCommentDraft.trim()
                                              && editCommentAttachments.length === 0
                                              && !editCommentMedia)
                                            || feed.updatingCommentIds.has(
                                              comment.id,
                                            )
                                          }
                                        >
                                          {feed.updatingCommentIds.has(
                                            comment.id,
                                          ) && (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          )}
                                          Save
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {comment.content && (
                                      <p className="mt-0.5 break-words text-sm">
                                        {renderCampusMentionText(
                                          comment.content,
                                        )}
                                      </p>
                                    )}
                                    {comment.attachments.map(attachment => (
                                      <button
                                        key={attachment.path}
                                        type="button"
                                        className="mt-2 block overflow-hidden rounded-xl"
                                        onClick={() =>
                                          setLightboxAttachment(attachment)
                                        }
                                      >
                                        <img
                                          src={attachment.url}
                                          alt={attachment.name}
                                          className="max-h-72 max-w-full object-cover"
                                        />
                                      </button>
                                    ))}
                                  </>
                                )}
                              </div>

                              {(comment.authorId === user?.id
                                || profile?.role === "admin")
                                && editingCommentId !== comment.id && (
                                  <DropdownMenu
                                    modal={false}
                                    open={openCommentMenuId === comment.id}
                                    onOpenChange={open =>
                                      setOpenCommentMenuId(
                                        open ? comment.id : null,
                                      )
                                    }
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 rounded-full opacity-100 transition-opacity sm:opacity-0 sm:group-hover/comment-menu:opacity-100 sm:group-focus-within/comment-menu:opacity-100"
                                        aria-label="Comment options"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {comment.authorId === user?.id && (
                                        <DropdownMenuItem
                                          onSelect={() =>
                                            startEditingComment(comment)
                                          }
                                        >
                                          <Pencil className="h-4 w-4" />
                                          Edit comment
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        variant="destructive"
                                        disabled={feed.deletingCommentIds.has(
                                          comment.id,
                                        )}
                                        onSelect={() =>
                                          void feed.deleteComment(comment)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete comment
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                            </div>
                            <span className="ml-3 mt-1 block text-[10px] text-muted-foreground">
                              {formatCampusPostTime(comment.createdAt)}
                              {comment.updatedAt !== comment.createdAt
                                ? " · Edited"
                                : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
                      <p className="mt-2 text-sm font-medium">
                        No comments yet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Start the conversation.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <form
                className="space-y-3 border-t bg-background p-4"
                onSubmit={event => submitComment(event, activePost.id)}
              >
                {commentMedia && (
                  <div className="ml-12 w-fit max-w-[min(18rem,calc(100%-3rem))]">
                    <div className="relative overflow-hidden rounded-xl border bg-muted">
                      <img
                        src={commentMedia.previewUrl}
                        alt={commentMedia.file.name}
                        className="max-h-44 w-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-2 h-7 w-7 rounded-full"
                        onClick={releaseCommentMedia}
                        aria-label="Remove comment image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {commentMediaError && (
                  <p className="ml-12 text-xs text-destructive">
                    {commentMediaError}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {getCampusMemberInitials(profile?.full_name || "Campus Member")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 items-center rounded-full bg-muted/60 pr-2">
                    <Input
                      value={commentDrafts[activePost.id] || ""}
                      onChange={event =>
                        setCommentDrafts(current => ({
                          ...current,
                          [activePost.id]: event.target.value,
                        }))
                      }
                      maxLength={2000}
                      placeholder="Write a comment..."
                      className="min-w-0 flex-1 rounded-full border-0 bg-transparent shadow-none focus-visible:ring-0"
                      autoFocus
                    />
                    <ForumEmojiPicker
                      onSelect={emoji =>
                        setCommentDrafts(current => {
                          const draft = current[activePost.id] || "";
                          return draft.length + emoji.length <= 2000
                            ? {
                              ...current,
                              [activePost.id]: `${draft}${emoji}`,
                            }
                            : current;
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-full"
                      onClick={() => commentFileInputRef.current?.click()}
                      disabled={
                        (commentMedia ? 1 : 0)
                        >= MAX_CAMPUS_COMMENT_MEDIA_FILES
                      }
                      title="Attach an image"
                      aria-label="Attach an image"
                    >
                      <ImagePlus className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <input
                      ref={commentFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={event => selectCommentMedia(event, false)}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="shrink-0 rounded-full"
                    disabled={
                      isActiveCommentSubmitting
                      || (!(commentDrafts[activePost.id] || "").trim()
                        && !commentMedia)
                    }
                    aria-label="Post comment"
                  >
                    {isActiveCommentSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(lightboxAttachment)}
        onOpenChange={open => {
          if (!open) setLightboxAttachment(null);
        }}
      >
        <DialogContent className="border-0 bg-black/95 p-2 sm:max-w-6xl">
          <DialogTitle className="sr-only">
            {lightboxAttachment?.name || "Campus post image"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full-size preview of an image attached to a campus post.
          </DialogDescription>
          {lightboxAttachment?.url && (
            <img
              src={lightboxAttachment.url}
              alt={lightboxAttachment.name}
              className="max-h-[88vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
