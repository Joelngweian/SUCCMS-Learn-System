import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { notify } from "@/lib/notify";
import { confirmAction } from "@/lib/confirm";
import {
  createForumReply,
  createForumThread,
  deleteForumReply,
  deleteForumThread,
  getForumReplyCounts,
  setForumReaction,
  toForumImagesJson,
  updateForumReply,
  updateForumThread,
  uploadForumImage,
} from "@/data/forumRepository";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Search, Plus, MessageCircle,
  Loader2, Coffee, Layers, ArrowLeft,
  X
} from "lucide-react";
import {
  CreateDiscussionDialog,
  EditDiscussionDialog,
} from "./forum/ForumThreadDialogs";
import { ForumEmojiPicker } from "./forum/ForumEmojiPicker";
import { ForumReactionBar } from "./forum/ForumReactionBar";
import { ForumThreadCard } from "./forum/ForumThreadCard";
import { ForumCommentNode } from "./forum/ForumCommentNode";
import {
  ForumMentionSuggestions,
  type ForumMentionOption,
} from "./forum/ForumMentionSuggestions";
import {
  ForumRootCommentComposer,
  ForumThreadDetailCard,
} from "./forum/ForumThreadDetail";
import {
  applyReactionDelta,
  removeReplyTreeNode,
  updateReplyTreeContent,
  updateReplyTreeNode,
  updateReplyTreeReaction,
} from "./forum/forumTree";
import type {
  ForumReply,
  ForumThread,
} from "./forum/forumTypes";
import {
  normalizeForumReply,
} from "./forum/forumTypes";
import {
  formatForumDate,
  getErrorMessage,
  getMentionToken,
  getThreadCategory,
  renderCourseBadge,
  renderMentionedText,
} from "./forum/forumUtils";
import { useForumFeed } from "./forum/useForumFeed";
import { useForumThreadDetails } from "./forum/useForumThreadDetails";
import "./Forum.css";

export function Forum() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const userId = user?.id;
  const profileRole = profile?.role;
  const {
    courses,
    fetchMentionMembers,
    fetchThreads,
    hasMoreThreads,
    loading,
    loadingMoreThreads,
    mentionMembers,
    replyReactions,
    searchQuery,
    selectedFilter,
    setMentionMembers,
    setReplyReactions,
    setSearchQuery,
    setSelectedFilter,
    setThreads,
    setUserReactions,
    threads,
    userReactions,
  } = useForumFeed({ profileRole, userId });

  const {
    expandedReplyIds,
    fetchThreadDetails,
    hasMoreRootComments,
    loadChildReplies,
    loadMoreComments: handleLoadMoreComments,
    loadingMoreComments,
    loadingReplyBranches,
    selectedThread,
    setExpandedReplyIds,
    setHasMoreRootComments,
    setLoadingReplyBranches,
    setSelectedThread,
    toggleReplies: handleToggleReplies,
  } = useForumThreadDetails();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null); // For image popup
  
  // Create Thread State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newThread, setNewThread] = useState({ title: "", content: "", course_id: "general" });
  const [threadImages, setThreadImages] = useState<File[]>([]); // Array for up to 5 images
  const [threadImagePreviews, setThreadImagePreviews] = useState<string[]>([]);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [createThreadError, setCreateThreadError] = useState("");
  const [editingThread, setEditingThread] = useState<ForumThread | null>(null);
  const [editThread, setEditThread] = useState({ title: "", content: "" });
  const [editThreadExistingImages, setEditThreadExistingImages] = useState<string[]>([]);
  const [editThreadImages, setEditThreadImages] = useState<File[]>([]);
  const [editThreadImagePreviews, setEditThreadImagePreviews] = useState<string[]>([]);
  const [isSavingThreadEdit, setIsSavingThreadEdit] = useState(false);
  const [editThreadError, setEditThreadError] = useState("");
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);

  // Reply State
  const [replyText, setReplyText] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [activeReplyBox, setActiveReplyBox] = useState<string | null>(null);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState("");
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [openReactionPicker, setOpenReactionPicker] = useState<string | null>(null);

  const threadFileInputRef = useRef<HTMLInputElement>(null);
  const editThreadFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const threadLoadMoreRef = useRef<HTMLDivElement>(null);

  const MAX_NESTING_DEPTH = 3; 

  /* ================= FETCHING ================= */

  useEffect(() => {
    if (selectedThread) {
      void fetchMentionMembers(selectedThread.course_id || null);
    } else {
      setMentionMembers([]);
    }
  }, [fetchMentionMembers, selectedThread, setMentionMembers]);

  useEffect(() => {
    const sentinel = threadLoadMoreRef.current;
    if (
      !sentinel
      || selectedThread
      || loading
      || loadingMoreThreads
      || !hasMoreThreads
    ) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void fetchThreads(false);
        }
      },
      {
        root: null,
        rootMargin: "400px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    selectedThread,
    loading,
    loadingMoreThreads,
    hasMoreThreads,
    fetchThreads,
  ]);

  /* ================= IMAGE UPLOAD ================= */

  const uploadFileToSupabase = async (file: File) => {
    if (!userId) return null;
    try {
      const selectedCourseId =
        selectedThread?.course_id ||
        (newThread.course_id !== "general" ? newThread.course_id : null);
      return await uploadForumImage({
        courseId: selectedCourseId,
        file,
        userId,
      });
    } catch (error) {
      console.error("Upload failed", error);
      return null;
    }
  };

  /* ================= ACTIONS ================= */

  const handleCreateThread = async () => {
    if (!newThread.title || !newThread.content) return;

    if (!user) {
        setCreateThreadError("You must be signed in to post a discussion.");
        return;
    }

    setIsCreatingThread(true);
    setCreateThreadError("");

    try {
        // 1. Upload all images
        const uploadedUrls: string[] = [];
        for (const file of threadImages) {
            const url = await uploadFileToSupabase(file);
            if (!url) throw new Error("Failed to upload one of the images. Please try again.");
            uploadedUrls.push(url);
        }

        const extractedCategory = getThreadCategory(newThread.title, newThread.content);
        const finalCourseId = newThread.course_id === "general" ? null : newThread.course_id;

        await createForumThread({
            course_id: finalCourseId,
            author_id: user.id,
            title: newThread.title.trim(),
            content: newThread.content.trim(),
            category: extractedCategory,
            images: toForumImagesJson(uploadedUrls),
        });

        setIsCreateOpen(false);
        setNewThread({ title: "", content: "", course_id: "general" });
        setThreadImages([]);
        setThreadImagePreviews([]);
        await fetchThreads();
        notify.success("Discussion published.");
    } catch (error: unknown) {
        console.error("Failed to create forum thread:", error);
        setCreateThreadError(
          getErrorMessage(error, "Failed to post discussion."),
        );
    } finally {
        setIsCreatingThread(false);
    }
  };

  const openEditThread = (thread: ForumThread, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setEditingThread(thread);
    setEditThread({ title: thread.title || "", content: thread.content || "" });
    setEditThreadExistingImages(thread.images || []);
    setEditThreadImages([]);
    setEditThreadImagePreviews([]);
    setEditThreadError("");
  };

  const handleSaveThreadEdit = async () => {
    if (
      !editingThread
      || !userId
      || !editThread.title.trim()
      || !editThread.content.trim()
    ) return;
    setIsSavingThreadEdit(true);
    setEditThreadError("");

    try {
      const uploadedUrls: string[] = [];
      for (const file of editThreadImages) {
        const url = await uploadFileToSupabase(file);
        if (!url) throw new Error("Failed to upload one of the images. Please try again.");
        uploadedUrls.push(url);
      }

      const nextImages = [...editThreadExistingImages, ...uploadedUrls];
      const updates = {
        title: editThread.title.trim(),
        content: editThread.content.trim(),
        category: getThreadCategory(editThread.title, editThread.content),
        images: toForumImagesJson(nextImages),
      };

      await updateForumThread({
        authorId: userId,
        threadId: editingThread.id,
        updates,
      });

      const applyThreadUpdate = (thread: ForumThread): ForumThread =>
        thread.id === editingThread.id
          ? { ...thread, ...updates, images: nextImages }
          : thread;
      setThreads(prev => prev.map(applyThreadUpdate));
      setSelectedThread(prev => prev?.id === editingThread.id
        ? { ...prev, ...updates, images: nextImages }
        : prev);
      setEditingThread(null);
      notify.success("Discussion updated.");
    } catch (error: unknown) {
      console.error("Failed to edit discussion:", error);
      setEditThreadError(
        getErrorMessage(error, "Failed to edit discussion."),
      );
    } finally {
      setIsSavingThreadEdit(false);
    }
  };

  const handleDeleteThread = async (threadId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (
      !(await confirmAction({
        title: "Delete discussion?",
        description:
          "This discussion and its replies will be permanently deleted.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) return;
    if (!userId) return;
    setDeletingThreadId(threadId);

    try {
      await deleteForumThread({ authorId: userId, threadId });

      setThreads(prev => prev.filter(thread => thread.id !== threadId));
      if (selectedThread?.id === threadId) setSelectedThread(null);
      notify.success("Discussion deleted.");
    } catch (error: unknown) {
      console.error("Failed to delete discussion:", error);
      notify.error(
        error,
        `Failed to delete discussion: ${getErrorMessage(error, "Unknown error")}`,
      );
    } finally {
      setDeletingThreadId(null);
    }
  };

  const handlePostReply = async (parentId: string | null = null) => {
        if (
          isPostingReply
          || !selectedThread
          || !userId
          || (!replyText.trim() && !replyImage)
        ) return;

        setIsPostingReply(true);

        try {
        let imageUrl = null;
        if (replyImage) {
            imageUrl = await uploadFileToSupabase(replyImage);
        }

        const resolvedParent = parentId ?? replyTargetId ?? null;
    
        const createdReply = await createForumReply({
          thread_id: selectedThread.id,
          author_id: userId,
          content: replyText.trim(),
          parent_id: resolvedParent,
          image_url: imageUrl,
        });

        const newReply = normalizeForumReply(createdReply);

        setSelectedThread((current) => {
          if (!current) return current;

          if (!resolvedParent) {
            return {
              ...current,
              structuredReplies: [newReply, ...(current.structuredReplies || [])],
              replyCount: (current.replyCount || 0) + 1,
              rootReplyCount: (current.rootReplyCount || 0) + 1,
            };
          }

          return {
            ...current,
            structuredReplies: updateReplyTreeNode(current.structuredReplies || [], resolvedParent, node => {
              const nextChildren = [
                newReply,
                ...node.children.filter((child) => child.id !== newReply.id),
              ];
              const nextChildCount = (node.childCount || 0) + 1;

              return {
                ...node,
                children: nextChildren,
                childCount: nextChildCount,
                childrenLoaded: true,
                hasMoreChildren: nextChildren.length < nextChildCount,
              };
            }),
            replyCount: (current.replyCount || 0) + 1,
          };
        });

        if (resolvedParent) {
          setExpandedReplyIds(current => ({ ...current, [resolvedParent]: true }));
        }

        resetReplyComposer();
        fetchThreads();
        notify.success("Comment posted.");
        } finally {
          setIsPostingReply(false);
        }
  };

  const handleReplyComposerKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    parentId: string | null,
  ) => {
    if (
      event.key !== "Enter"
      || event.shiftKey
      || event.nativeEvent.isComposing
    ) return;

    event.preventDefault();
    if (!replyText.trim() && !replyImage) return;

    void handlePostReply(parentId);
  };

  const resetReplyComposer = () => {
    setReplyText("");
    setReplyImage(null);
    setReplyImagePreview(null);
    setActiveReplyBox(null);
    setReplyTargetId(null);
  };

  const handleStartEditReply = (comment: ForumReply) => {
    setEditingReplyId(comment.id);
    setEditingReplyText(comment.content || "");
    resetReplyComposer();
  };

  const handleSaveReplyEdit = async (replyId: string) => {
    if (!editingReplyText.trim() || !userId) return;
    setSavingReplyId(replyId);

    try {
      const nextContent = editingReplyText.trim();
      await updateForumReply({
        authorId: userId,
        content: nextContent,
        replyId,
      });

      setSelectedThread(prev => prev ? {
        ...prev,
        structuredReplies: updateReplyTreeContent(prev.structuredReplies || [], replyId, nextContent),
      } : prev);
      setEditingReplyId(null);
      setEditingReplyText("");
      notify.success("Comment updated.");
    } catch (error: unknown) {
      console.error("Failed to edit comment:", error);
      notify.error(
        error,
        `Failed to edit comment: ${getErrorMessage(error, "Unknown error")}`,
      );
    } finally {
      setSavingReplyId(null);
    }
  };

  const handleDeleteReply = async (comment: ForumReply) => {
    if (!selectedThread || !userId) return;
    if (
      !(await confirmAction({
        title: "Delete comment?",
        description:
          "This comment and its nested replies will be permanently deleted.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) return;
    setDeletingReplyId(comment.id);

    try {
      await deleteForumReply({ authorId: userId, replyId: comment.id });
      const {
        parentReplyCount,
        rootReplyCount,
        totalReplyCount,
      } = await getForumReplyCounts({
        parentId: comment.parent_id,
        threadId: selectedThread.id,
      });
      const loadedRootCount = Math.max(
        0,
        (selectedThread.structuredReplies || []).length - (comment.parent_id ? 0 : 1),
      );

      setSelectedThread((current) => {
        if (!current) return current;

        let nextReplies = removeReplyTreeNode(current.structuredReplies || [], comment.id);
        if (comment.parent_id) {
          nextReplies = updateReplyTreeNode(nextReplies, comment.parent_id, parent => {
            return {
              ...parent,
              childCount: parentReplyCount,
              hasMoreChildren: (parent.children || []).length < parentReplyCount,
            };
          });
        }

        return {
          ...current,
          structuredReplies: nextReplies,
          replyCount: totalReplyCount,
          rootReplyCount,
        };
      });

      setExpandedReplyIds(current => {
        const next = { ...current };
        delete next[comment.id];
        return next;
      });
      setHasMoreRootComments(loadedRootCount < rootReplyCount);
      await fetchThreads();
      notify.success("Comment deleted.");
    } catch (error: unknown) {
      console.error("Failed to delete comment:", error);
      notify.error(
        error,
        `Failed to delete comment: ${getErrorMessage(error, "Unknown error")}`,
      );
    } finally {
      setDeletingReplyId(null);
    }
  };

  const handleReaction = async (targetId: string, type: string, isThread: boolean) => {
      if (!user) return;
      const currentReactions = isThread ? userReactions : replyReactions;
      
      const currentType = currentReactions[targetId];
      const nextType = currentType === type ? undefined : type;

      if (isThread) {
          setUserReactions(prev => {
              const next = { ...prev };
              if (nextType) next[targetId] = nextType;
              else delete next[targetId];
              return next;
          });
      } else {
          setReplyReactions(prev => {
              const next = { ...prev };
              if (nextType) next[targetId] = nextType;
              else delete next[targetId];
              return next;
          });
      }

      updateLocalReaction(targetId, currentType, nextType, isThread);

      try {
          await setForumReaction({
            currentType,
            isThread,
            nextType,
            targetId,
            userId: user.id,
          });
      } catch (error) {
          console.error("Failed to update reaction:", error);
          notify.error(error, "Reaction could not be updated.");
          updateLocalReaction(targetId, nextType, currentType, isThread);
          if (isThread) {
              setUserReactions(prev => {
                  const next = { ...prev };
                  if (currentType) next[targetId] = currentType;
                  else delete next[targetId];
                  return next;
              });
          } else {
              setReplyReactions(prev => {
                  const next = { ...prev };
                  if (currentType) next[targetId] = currentType;
                  else delete next[targetId];
                  return next;
              });
          }
      }
  };

  /* ================= HELPERS ================= */

  const navigateToProfile = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    navigate(`/profile/${userId}`);
  };

  const getCourseBadge = (courseId: string | null) =>
    renderCourseBadge(courseId, courses);

  const mentionOptions: ForumMentionOption[] = [
    { id: "everyone", label: "Everyone", detail: "All course members", token: "@everyone" },
    ...mentionMembers
      .filter(member => member?.full_name && member.role !== 'admin')
      .map(member => ({
        id: member.id,
        label: member.full_name,
        detail: member.role === 'lecturer' ? "Lecturer" : "Student",
        token: getMentionToken(member.full_name),
      })),
  ];

  const applyMention = (value: string, token: string) => {
    return value.replace(/(^|\s)@([^\s@]*)$/, `$1${token} `);
  };

  const renderEmojiPicker = (onSelect: (emoji: string) => void) => (
    <ForumEmojiPicker onSelect={onSelect} />
  );

  const updateLocalReaction = (targetId: string, previousType: string | undefined, nextType: string | undefined, isThread: boolean) => {
    if (isThread) {
      setThreads(prev => prev.map(thread => thread.id === targetId ? {
        ...thread,
        reactions: applyReactionDelta(thread.reactions || [], previousType, nextType),
      } : thread));

      setSelectedThread(prev => prev?.id === targetId ? {
        ...prev,
        reactions: applyReactionDelta(prev.reactions || [], previousType, nextType),
      } : prev);
      return;
    }

    setSelectedThread(prev => prev ? {
      ...prev,
      structuredReplies: updateReplyTreeReaction(prev.structuredReplies || [], targetId, previousType, nextType),
    } : prev);
  };

  /* ================= SUB-COMPONENTS ================= */

  const initReply = (comment: ForumReply, _depth: number) => {
    setEditingReplyId(null);
    setEditingReplyText("");
    setActiveReplyBox(comment.id);
    setReplyTargetId(comment.id);
    setReplyText("");
    setReplyImage(null);
    setReplyImagePreview(null);
  };

  const renderCommentNode = (comment: ForumReply, depth = 0) => (
    <ForumCommentNode
      comment={comment}
      depth={depth}
      maxNestingDepth={MAX_NESTING_DEPTH}
      currentUserId={user?.id}
      activeReplyBox={activeReplyBox}
      replyTargetId={replyTargetId}
      replyText={replyText}
      replyImagePreview={replyImagePreview}
      replyFileInputRef={replyFileInputRef}
      editingReplyId={editingReplyId}
      editingReplyText={editingReplyText}
      savingReplyId={savingReplyId}
      deletingReplyId={deletingReplyId}
      isPostingReply={isPostingReply}
      replyReactions={replyReactions}
      openReactionPicker={openReactionPicker}
      expandedReplyIds={expandedReplyIds}
      loadingReplyBranches={loadingReplyBranches}
      formatDate={formatForumDate}
      renderMentionedText={renderMentionedText}
      renderEmojiPicker={renderEmojiPicker}
      renderMentionSuggestions={(value, onSelect) => (
        <ForumMentionSuggestions
          options={mentionOptions}
          value={value}
          onSelect={onSelect}
        />
      )}
      onNavigateProfile={navigateToProfile}
      onOpenImage={setLightboxImage}
      onReact={handleReaction}
      onOpenReactionPickerChange={setOpenReactionPicker}
      onStartReply={initReply}
      onStartEdit={handleStartEditReply}
      onEditingReplyTextChange={setEditingReplyText}
      onCancelEdit={() => {
        setEditingReplyId(null);
        setEditingReplyText("");
      }}
      onSaveEdit={handleSaveReplyEdit}
      onDelete={handleDeleteReply}
      onToggleReplies={handleToggleReplies}
      onReplyTextChange={setReplyText}
      onReplyKeyDown={handleReplyComposerKeyDown}
      onReplyImageChange={(file) => {
        setReplyImage(file);
        setReplyImagePreview(URL.createObjectURL(file));
      }}
      onRemoveReplyImage={() => {
        setReplyImage(null);
        setReplyImagePreview(null);
      }}
      onResetReplyComposer={resetReplyComposer}
      onPostReply={(parentId) => void handlePostReply(parentId)}
      onLoadChildReplies={(parentId) => void loadChildReplies(parentId, true)}
    />
  );

  /* ================= MAIN RENDER ================= */

  return (
    <div className="forum-root min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 p-4 lg:p-8">
      
      {/* LIGHTBOX POPUP */}
      {lightboxImage ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setLightboxImage(null)}>
              <button className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors" onClick={() => setLightboxImage(null)}>
                  <X className="h-10 w-10" />
              </button>
              {lightboxImage && (
                  <img 
                      src={lightboxImage} 
                      alt="Full size view" 
                      className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" 
                      onClick={(e) => e.stopPropagation()}
                      onError={() => setLightboxImage(null)}
                  />
              )}
          </div>
      ) : null}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR */}
        <aside className="lg:col-span-1 space-y-6">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Forums</h1>
                <p className="text-gray-500 dark:text-gray-300 mt-1">Engage with your community</p>
            </div>
            
            <Button
                className="w-full shadow-md font-bold py-6 text-lg"
                onClick={() => {
                    setCreateThreadError("");
                    setIsCreateOpen(true);
                }}
            >
                <Plus className="h-5 w-5 mr-2" /> Start Discussion
            </Button>

            <nav className="space-y-1">
                <button onClick={() => setSelectedFilter("all")} className={`forum-filter-button w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${selectedFilter === "all" ? "active bg-gray-100 dark:bg-zinc-800 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-zinc-700" : "hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800"}`}>
                    <Layers className="h-4 w-4" /> All Discussions
                </button>
                <button onClick={() => setSelectedFilter("general")} className={`forum-filter-button w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${selectedFilter === "general" ? "active bg-gray-100 dark:bg-zinc-800 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-zinc-700" : "hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800"}`}>
                    <Coffee className="h-4 w-4" /> General Lounge
                </button>
                <div className="px-3 py-2 mt-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">My Courses</div>
                {courses.map(c => (
                    <button key={c.id} onClick={() => setSelectedFilter(c.id)} className={`forum-course-button w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${selectedFilter === c.id ? "active bg-blue-50 font-bold dark:bg-blue-900/30 dark:!text-blue-400" : "hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800"}`}>
                        {c.name} <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-normal">({c.course_code})</span>
                    </button>
                ))}
            </nav>
        </aside>

        {/* MAIN FEED AREA */}
        <main className="lg:col-span-3 space-y-6">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <Input 
                    placeholder="Search topics, hashtags..." 
                    className="pl-10 pr-4 h-12 bg-white dark:bg-zinc-900 dark:text-white dark:placeholder-gray-500 border-gray-200 dark:border-zinc-800 text-base shadow-sm focus-visible:ring-primary"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-300 dark:text-gray-600"/></div> : !selectedThread ? (
                
                // === LIST VIEW ===
                <div className="space-y-6">
                    {threads.map(thread => (
                      <ForumThreadCard
                        key={thread.id}
                        thread={thread}
                        currentUserId={user?.id}
                        deletingThreadId={deletingThreadId}
                        courseBadge={getCourseBadge(thread.course_id)}
                        reactionBar={
                          <ForumReactionBar
                            targetId={thread.id}
                            reactions={thread.reactions || []}
                            myReaction={userReactions[thread.id]}
                            targetType="thread"
                            openPicker={openReactionPicker}
                            onOpenPickerChange={setOpenReactionPicker}
                            onReact={handleReaction}
                          />
                        }
                        formatDate={formatForumDate}
                        onOpen={fetchThreadDetails}
                        onOpenProfile={navigateToProfile}
                        onEdit={openEditThread}
                        onDelete={handleDeleteThread}
                        onOpenImage={setLightboxImage}
                      />
                    ))}

                    {threads.length === 0 && (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
                            <MessageCircle className="mx-auto mb-3 h-8 w-8 text-gray-400 dark:text-gray-500" />
                            <p className="font-semibold text-gray-800 dark:text-gray-100">
                                No discussions found
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Try another search or start a new discussion.
                            </p>
                        </div>
                    )}

                    {hasMoreThreads && (
                        <div
                            ref={threadLoadMoreRef}
                            className="flex min-h-16 items-center justify-center pt-2"
                            aria-label="Loading more discussions"
                        >
                            {loadingMoreThreads && (
                                <Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" />
                            )}
                        </div>
                    )}
                </div>
            ) : selectedThread ? (
                
                // === THREAD DETAIL VIEW ===
                <div className="animate-in fade-in-50 slide-in-from-right-5 w-full">
                    <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent dark:text-white dark:hover:text-gray-300" onClick={() => setSelectedThread(null)}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Feed
                    </Button>
                    
                    <ForumThreadDetailCard
                      thread={selectedThread}
                      currentUserId={user?.id}
                      deletingThreadId={deletingThreadId}
                      courseBadge={getCourseBadge(selectedThread?.course_id || null)}
                      formatDate={formatForumDate}
                      renderMentionedText={renderMentionedText}
                      onOpenProfile={navigateToProfile}
                      onEdit={openEditThread}
                      onDelete={(threadId) => void handleDeleteThread(threadId)}
                      onOpenImage={setLightboxImage}
                    />

                    {/* COMMENTS */}
                    <div className="space-y-4 mb-20">
                        <h3 className="font-bold text-xl flex items-center gap-2 text-gray-800 dark:text-white mb-6">
                            <MessageCircle className="h-5 w-5"/>
                            {selectedThread.replyCount || 0} Comments
                        </h3>
                        
                        {/* Root Reply Box */}
                        <ForumRootCommentComposer
                          avatarUrl={
                            profile?.avatar_url
                          }
                          fallback={
                            profile?.full_name?.[0] ||
                            user?.email?.[0] ||
                            "U"
                          }
                          activeReplyBox={activeReplyBox}
                          replyText={replyText}
                          replyImagePreview={replyImagePreview}
                          hasReplyImage={Boolean(replyImage)}
                          isPostingReply={isPostingReply}
                          fileInputRef={replyFileInputRef}
                          renderEmojiPicker={renderEmojiPicker}
                          renderMentionSuggestions={(value, onSelect) => (
                            <ForumMentionSuggestions
                              options={mentionOptions}
                              value={value}
                              onSelect={onSelect}
                            />
                          )}
                          onTextChange={setReplyText}
                          onFocus={() => {
                            if (activeReplyBox !== null) {
                              resetReplyComposer();
                            }
                          }}
                          onKeyDown={(event) =>
                            handleReplyComposerKeyDown(event, null)
                          }
                          onImageChange={(file) => {
                            setReplyImage(file);
                            setReplyImagePreview(URL.createObjectURL(file));
                          }}
                          onRemoveImage={() => {
                            setReplyImage(null);
                            setReplyImagePreview(null);
                          }}
                          onCancel={resetReplyComposer}
                          onSubmit={() => void handlePostReply(null)}
                        />

                        {/* Comment Stream */}
                        {selectedThread.structuredReplies.map((reply) => (
                            <div key={reply.id} className="group">
                                {renderCommentNode(reply, 0)}
                            </div>
                        ))}

                        {(selectedThread.structuredReplies || []).length === 0 && (
                            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-zinc-700 dark:text-gray-400">
                                No comments yet.
                            </div>
                        )}

                        {hasMoreRootComments && (
                            <div className="flex justify-center pt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleLoadMoreComments}
                                    disabled={loadingMoreComments}
                                    className="min-w-48 gap-2"
                                >
                                    {loadingMoreComments && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {loadingMoreComments ? "Loading..." : "Load More Comments"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // === FALLBACK: Thread not loaded or error ===
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Loading discussion...</p>
                    <Loader2 className="h-8 w-8 animate-spin text-gray-300 dark:text-gray-600 mx-auto"/>
                </div>
            )}
        </main>
      </div>

      <CreateDiscussionDialog
        open={isCreateOpen}
        courses={courses}
        draft={newThread}
        images={threadImages}
        imagePreviews={threadImagePreviews}
        fileInputRef={threadFileInputRef}
        isSaving={isCreatingThread}
        error={createThreadError}
        onOpenChange={open => {
          setIsCreateOpen(open);
          if (!open) setCreateThreadError("");
        }}
        onDraftChange={setNewThread}
        onRemoveImage={index => {
          setThreadImages(current => current.filter((_, itemIndex) => itemIndex !== index));
          setThreadImagePreviews(current => current.filter((_, itemIndex) => itemIndex !== index));
        }}
        onAddImages={files => {
          if (files.length + threadImages.length > 5) {
            notify.warning("A discussion can include up to 5 images.");
            return;
          }
          setThreadImages(current => [...current, ...files]);
          setThreadImagePreviews(current => [
            ...current,
            ...files.map(file => URL.createObjectURL(file)),
          ]);
        }}
        onSubmit={handleCreateThread}
      />

      <EditDiscussionDialog
        open={Boolean(editingThread)}
        draft={editThread}
        existingImages={editThreadExistingImages}
        images={editThreadImages}
        imagePreviews={editThreadImagePreviews}
        fileInputRef={editThreadFileInputRef}
        isSaving={isSavingThreadEdit}
        error={editThreadError}
        onOpenChange={open => {
          if (!open) {
            setEditingThread(null);
            setEditThreadError("");
          }
        }}
        onDraftChange={setEditThread}
        onRemoveExistingImage={index =>
          setEditThreadExistingImages(current =>
            current.filter((_, itemIndex) => itemIndex !== index)
          )
        }
        onRemoveNewImage={index => {
          setEditThreadImages(current =>
            current.filter((_, itemIndex) => itemIndex !== index)
          );
          setEditThreadImagePreviews(current =>
            current.filter((_, itemIndex) => itemIndex !== index)
          );
        }}
        onAddImages={files => {
          if (
            files.length
              + editThreadImages.length
              + editThreadExistingImages.length
              > 5
          ) {
            notify.warning("A discussion can include up to 5 images.");
            return;
          }
          setEditThreadImages(current => [...current, ...files]);
          setEditThreadImagePreviews(current => [
            ...current,
            ...files.map(file => URL.createObjectURL(file)),
          ]);
        }}
        onSubmit={handleSaveThreadEdit}
      />
    </div>
  );
}
