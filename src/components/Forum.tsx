import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { supabase } from "@/lib/supabase.ts";
import {
  COURSE_OFFERING_SELECT,
  normalizeCourseOffering,
} from "@/lib/courseOfferings";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { 
  Search, Plus, MessageCircle, Pin, 
  Loader2, Coffee, Layers, Heart, HelpCircle, Frown, Smile, ThumbsUp, Flame, ArrowLeft, 
  Image as ImageIcon, X, SmilePlus, Edit2, Trash2, AtSign
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "./ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "./ui/popover";
import "./Forum.css";

/* ================= CONFIGURATION ================= */

const REACTION_TYPES = [
  { id: 'mad', icon: '😡', label: 'Mad' },
  { id: 'question', icon: '❓', label: 'Confused' },
  { id: 'sad', icon: '😢', label: 'Sad' },
  { id: 'laugh', icon: '😂', label: 'Haha' },
  { id: 'love', icon: '❤️', label: 'Love' },
  { id: 'hugs', icon: '🫂', label: 'Hugs' },
];

const getReactionIcon = (type: string) => {
    if (type === 'like') return '👍';
    return REACTION_TYPES.find(r => r.id === type)?.icon || '👍';
};

const DISPLAY_REACTION_TYPES = [
  { id: 'mad', icon: '\u{1F621}', label: 'Mad' },
  { id: 'question', icon: '\u{1F914}', label: 'Confused' },
  { id: 'sad', icon: '\u{1F622}', label: 'Sad' },
  { id: 'laugh', icon: '\u{1F602}', label: 'Haha' },
  { id: 'love', icon: '\u2764\uFE0F', label: 'Love' },
  { id: 'hugs', icon: '\u{1F917}', label: 'Hugs' },
];

const COMMENT_EMOJIS = [
  '\u{1F600}', '\u{1F602}', '\u{1F60A}', '\u{1F60D}',
  '\u{1F914}', '\u{1F44D}', '\u{1F44F}', '\u{1F64C}',
  '\u2764\uFE0F', '\u{1F389}', '\u{1F525}', '\u2705',
];

const ROOT_COMMENT_PAGE_SIZE = 10;
const CHILD_REPLY_PAGE_SIZE = 5;

const getDisplayReactionIcon = (type: string) => {
    if (type === 'like') return '\u{1F44D}';
    return DISPLAY_REACTION_TYPES.find(r => r.id === type)?.icon || '\u{1F44D}';
};

const getMentionToken = (name: string) => `@${name.trim().replace(/\s+/g, "")}`;

const getActiveMentionQuery = (value: string) => {
    const match = value.match(/(^|\s)@([^\s@]*)$/);
    return match ? match[2].toLowerCase() : null;
};

const renderMentionedText = (content: string) => {
    const parts = content.split(/(@everyone|@[\w\u00C0-\uFFFF-]+)/g);

    return parts.map((part, index) => {
        if (!part) return null;
        if (part.startsWith("@")) {
            return (
                <span key={`${part}-${index}`} className="rounded bg-blue-50 px-1 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {part}
                </span>
            );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
    });
};

function ThreadContentPreview({ content }: { content: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const element = contentRef.current;
    if (!element || isExpanded) return;

    const measureOverflow = () => {
      setHasOverflow(element.scrollHeight > element.clientHeight + 1);
    };

    measureOverflow();
    const frame = window.requestAnimationFrame(measureOverflow);
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(element);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [content, isExpanded]);

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsExpanded(current => !current);
  };

  return (
    <div className="forum-thread-preview">
      <div
        ref={contentRef}
        className={`forum-thread-preview-text text-gray-600 dark:text-gray-100 text-base leading-relaxed${isExpanded ? " expanded" : ""}`}
      >
        {renderMentionedText(content)}
      </div>
      {(hasOverflow || isExpanded) && (
        <button
          type="button"
          className="forum-thread-preview-toggle"
          onClick={handleToggle}
          aria-expanded={isExpanded}
        >
          {isExpanded ? "Show less" : "See more"}
        </button>
      )}
    </div>
  );
}

export function Forum() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  // Data
  const [courses, setCourses] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [userReactions, setUserReactions] = useState<Record<string, string>>({}); 
  const [replyReactions, setReplyReactions] = useState<Record<string, string>>({}); 
  const [loading, setLoading] = useState(true);
  
  // View State
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThread, setSelectedThread] = useState<any | null>(null); 
  const [lightboxImage, setLightboxImage] = useState<string | null>(null); // For image popup
  
  // Create Thread State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newThread, setNewThread] = useState({ title: "", content: "", course_id: "general" });
  const [threadImages, setThreadImages] = useState<File[]>([]); // Array for up to 5 images
  const [threadImagePreviews, setThreadImagePreviews] = useState<string[]>([]);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [createThreadError, setCreateThreadError] = useState("");
  const [editingThread, setEditingThread] = useState<any | null>(null);
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
  const [mentionMembers, setMentionMembers] = useState<any[]>([]);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState("");
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [openReactionPicker, setOpenReactionPicker] = useState<string | null>(null);
  const [hasMoreRootComments, setHasMoreRootComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [expandedReplyIds, setExpandedReplyIds] = useState<Record<string, boolean>>({});
  const [loadingReplyBranches, setLoadingReplyBranches] = useState<Record<string, boolean>>({});

  const threadFileInputRef = useRef<HTMLInputElement>(null);
  const editThreadFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const MAX_NESTING_DEPTH = 3; 

  /* ================= EFFECTS ================= */

  useEffect(() => {
    if (user) {
      fetchCourses();
      fetchUserReactions();
    }
  }, [user, profile?.role]);

  useEffect(() => {
    if (user) fetchThreads();
  }, [selectedFilter, user, courses.length]);

  useEffect(() => {
    if (selectedThread) {
      fetchMentionMembers(selectedThread.course_id || null);
    } else {
      setMentionMembers([]);
    }
  }, [selectedThread?.id, selectedThread?.course_id]);

  /* ================= FETCHING ================= */

  const fetchCourses = async () => {
    if (!user) return;

    if (profile?.role === 'lecturer') {
      const { data: teachingRows } = await supabase
        .from('course_instructors')
        .select(`course_id, course_offerings(${COURSE_OFFERING_SELECT})`)
        .eq('user_id', user.id);

      setCourses(
        (teachingRows || [])
          .map((row: any) => normalizeCourseOffering(row.course_offerings))
          .filter((course: any) => course.id)
      );
      return;
    }

    const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select(`course_id, course_offerings(${COURSE_OFFERING_SELECT})`)
        .eq('student_id', user.id);
        
    setCourses(
      (enrollments || [])
        .map((row: any) => normalizeCourseOffering(row.course_offerings))
        .filter((course: any) => course.id)
    );
  };

  const fetchMentionMembers = async (courseId: string | null) => {
    try {
      if (!courseId) {
        const { data } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, role, avatar_url')
          .in('role', ['student', 'lecturer'])
          .order('full_name', { ascending: true })
          .limit(80);

        setMentionMembers(data || []);
        return;
      }

      const { data: studentRows } = await supabase
        .from('course_enrollments')
        .select('student_id')
        .eq('course_id', courseId);

      const { data: instructorRows } = await supabase
        .from('course_instructors')
        .select('user_id')
        .eq('course_id', courseId);

      const memberIds = Array.from(new Set([
        ...(studentRows || []).map((row: any) => row.student_id),
        ...(instructorRows || []).map((row: any) => row.user_id),
      ].filter(Boolean)));

      if (memberIds.length === 0) {
        setMentionMembers([]);
        return;
      }

      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, avatar_url')
        .in('id', memberIds)
        .in('role', ['student', 'lecturer'])
        .order('full_name', { ascending: true });

      setMentionMembers(data || []);
    } catch (error) {
      console.error("Error fetching mention members:", error);
      setMentionMembers([]);
    }
  };

  const fetchUserReactions = async () => {
    const { data: threadRx } = await supabase.from('forum_reactions').select('thread_id, type').eq('user_id', user?.id);
    const tMap: Record<string, string> = {};
    threadRx?.forEach((r: any) => tMap[r.thread_id] = r.type);
    setUserReactions(tMap);

    const { data: replyRx } = await supabase.from('forum_reply_reactions').select('reply_id, type').eq('user_id', user?.id);
    const rMap: Record<string, string> = {};
    replyRx?.forEach((r: any) => rMap[r.reply_id] = r.type);
    setReplyReactions(rMap);
  };

  const fetchThreads = async () => {
    setLoading(true);
    let query = supabase
        .from('forum_threads')
        .select(`
            *,
            author:user_profiles!author_id(id, full_name, avatar_url, role),
            replies:forum_replies(count),
            reactions:forum_reactions(type) 
        `);

    if (selectedFilter === "general") {
        query = query.is('course_id', null);
    } else if (selectedFilter !== "all") {
        query = query.eq('course_id', selectedFilter);
    } else if (courses.length > 0) {
        const myCourseIds = courses.map(c => c.id);
        const idString = `(${myCourseIds.join(',')})`;
        query = query.or(`course_id.in.${idString},course_id.is.null`);
    }

    const { data, error } = await query;
    if (!error) {
        const sorted = (data || []).sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setThreads(sorted);
    } else {
        console.error("Error fetching forum threads:", error);
        setThreads([]);
    }
    setLoading(false);
  };

  const replySelect = `
    *,
    author:user_profiles!author_id(id, full_name, avatar_url, role),
    reactions:forum_reply_reactions(type)
  `;

  const attachChildMetadata = async (replies: any[] = []) => {
    if (replies.length === 0) return [];

    const replyIds = replies.map(reply => reply.id);
    const { data: childRows, error } = await supabase
      .from('forum_replies')
      .select('parent_id')
      .in('parent_id', replyIds);

    if (error) console.error('Reply child count fetch error:', error);

    const childCounts: Record<string, number> = {};
    (childRows || []).forEach((row: any) => {
      if (row.parent_id) childCounts[row.parent_id] = (childCounts[row.parent_id] || 0) + 1;
    });

    return replies.map(reply => ({
      ...reply,
      children: [],
      childCount: childCounts[reply.id] || 0,
      childrenLoaded: false,
      hasMoreChildren: (childCounts[reply.id] || 0) > 0,
    }));
  };

  const fetchRootCommentPage = async (threadId: string, start: number) => {
    const { data, error, count } = await supabase
      .from('forum_replies')
      .select(replySelect, { count: 'exact' })
      .eq('thread_id', threadId)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .range(start, start + ROOT_COMMENT_PAGE_SIZE - 1);

    if (error) throw error;

    return {
      replies: await attachChildMetadata(data || []),
      rootCount: count || 0,
    };
  };

  const fetchThreadDetails = async (threadId: string) => {
    try {
      const [threadResult, totalReplyResult, rootPage] = await Promise.all([
        supabase
          .from('forum_threads')
          .select(`*, author:user_profiles!author_id(id, full_name, avatar_url, role)`)
          .eq('id', threadId)
          .single(),
        supabase
          .from('forum_replies')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', threadId),
        fetchRootCommentPage(threadId, 0),
      ]);

      if (threadResult.error) throw threadResult.error;
      if (totalReplyResult.error) throw totalReplyResult.error;

      const thread = threadResult.data;
      setExpandedReplyIds({});
      setLoadingReplyBranches({});
      setHasMoreRootComments(rootPage.replies.length < rootPage.rootCount);
      setSelectedThread({
        ...thread,
        structuredReplies: rootPage.replies,
        replyCount: totalReplyResult.count || 0,
        rootReplyCount: rootPage.rootCount,
      });
    } catch (error) {
      console.error('fetchThreadDetails failed', error);
      setSelectedThread({} as any);
    }
  };

  const findReplyNode = (nodes: any[] = [], replyId: string): any | null => {
    for (const node of nodes) {
      if (node.id === replyId) return node;
      const childMatch = findReplyNode(node.children || [], replyId);
      if (childMatch) return childMatch;
    }
    return null;
  };

  const updateReplyTreeNode = (nodes: any[] = [], replyId: string, updater: (node: any) => any): any[] => {
    return nodes.map(node => {
      if (node.id === replyId) return updater(node);
      return {
        ...node,
        children: updateReplyTreeNode(node.children || [], replyId, updater),
      };
    });
  };

  const removeReplyTreeNode = (nodes: any[] = [], replyId: string): any[] => {
    return nodes
      .filter(node => node.id !== replyId)
      .map(node => ({
        ...node,
        children: removeReplyTreeNode(node.children || [], replyId),
      }));
  };

  const handleLoadMoreComments = async () => {
    if (!selectedThread || loadingMoreComments || !hasMoreRootComments) return;
    setLoadingMoreComments(true);

    try {
      const existingRoots = selectedThread.structuredReplies || [];
      const page = await fetchRootCommentPage(selectedThread.id, existingRoots.length);
      const existingIds = new Set(existingRoots.map((reply: any) => reply.id));
      const newReplies = page.replies.filter((reply: any) => !existingIds.has(reply.id));
      const nextRoots = [...existingRoots, ...newReplies];

      setSelectedThread((current: any) => current ? {
        ...current,
        structuredReplies: nextRoots,
        rootReplyCount: page.rootCount,
      } : current);
      setHasMoreRootComments(nextRoots.length < page.rootCount);
    } catch (error) {
      console.error('Failed to load more comments:', error);
    } finally {
      setLoadingMoreComments(false);
    }
  };

  const loadChildReplies = async (parentId: string, append = false) => {
    if (!selectedThread || loadingReplyBranches[parentId]) return;

    const parent = findReplyNode(selectedThread.structuredReplies || [], parentId);
    if (!parent) return;

    const start = append ? (parent.children || []).length : 0;
    setLoadingReplyBranches(current => ({ ...current, [parentId]: true }));

    try {
      const { data, error, count } = await supabase
        .from('forum_replies')
        .select(replySelect, { count: 'exact' })
        .eq('thread_id', selectedThread.id)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: false })
        .range(start, start + CHILD_REPLY_PAGE_SIZE - 1);

      if (error) throw error;

      const replies = await attachChildMetadata(data || []);
      setSelectedThread((current: any) => {
        if (!current) return current;

        return {
          ...current,
          structuredReplies: updateReplyTreeNode(current.structuredReplies || [], parentId, node => {
            const existingChildren = append ? (node.children || []) : [];
            const existingIds = new Set(existingChildren.map((child: any) => child.id));
            const newChildren = replies.filter((child: any) => !existingIds.has(child.id));
            const nextChildren = [...existingChildren, ...newChildren];
            const childCount = count || 0;

            return {
              ...node,
              children: nextChildren,
              childCount,
              childrenLoaded: true,
              hasMoreChildren: nextChildren.length < childCount,
            };
          }),
        };
      });
      setExpandedReplyIds(current => ({ ...current, [parentId]: true }));
    } catch (error) {
      console.error('Failed to load replies:', error);
    } finally {
      setLoadingReplyBranches(current => ({ ...current, [parentId]: false }));
    }
  };

  const handleToggleReplies = (comment: any) => {
    if (expandedReplyIds[comment.id]) {
      setExpandedReplyIds(current => ({ ...current, [comment.id]: false }));
      return;
    }

    if (comment.childrenLoaded) {
      setExpandedReplyIds(current => ({ ...current, [comment.id]: true }));
      return;
    }

    loadChildReplies(comment.id);
  };

  /* ================= IMAGE UPLOAD ================= */

  const uploadFileToSupabase = async (file: File) => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const selectedCourseId =
          selectedThread?.course_id ||
          (newThread.course_id !== "general" ? newThread.course_id : null);
        const filePath = selectedCourseId
          ? `${selectedCourseId}/${user?.id}/${fileName}`
          : `${user?.id}/${fileName}`;
        
        const { error } = await supabase.storage.from('forum-images').upload(filePath, file);
        if (error) {
            console.error("Upload error (make sure bucket exists):", error);
            return null;
        }
        const { data } = supabase.storage.from('forum-images').getPublicUrl(filePath);
        return data.publicUrl;
      } catch (e) {
          console.error("Upload failed", e);
          return null;
      }
  };

  /* ================= ACTIONS ================= */

  const getThreadCategory = (title: string, content: string) => {
    const hashtagRegex = /#(\w+)/;
    const contentMatch = content.match(hashtagRegex);
    const titleMatch = title.match(hashtagRegex);
    return contentMatch ? contentMatch[1] : (titleMatch ? titleMatch[1] : "General");
  };

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

        const { error } = await supabase.from('forum_threads').insert({
            course_id: finalCourseId,
            author_id: user.id,
            title: newThread.title.trim(),
            content: newThread.content.trim(),
            category: extractedCategory,
            images: uploadedUrls
        });

        if (error) throw error;

        setIsCreateOpen(false);
        setNewThread({ title: "", content: "", course_id: "general" });
        setThreadImages([]);
        setThreadImagePreviews([]);
        await fetchThreads();
    } catch (error: any) {
        console.error("Failed to create forum thread:", error);
        setCreateThreadError(error.message || "Failed to post discussion.");
    } finally {
        setIsCreatingThread(false);
    }
  };

  const openEditThread = (thread: any, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setEditingThread(thread);
    setEditThread({ title: thread.title || "", content: thread.content || "" });
    setEditThreadExistingImages(thread.images || []);
    setEditThreadImages([]);
    setEditThreadImagePreviews([]);
    setEditThreadError("");
  };

  const handleSaveThreadEdit = async () => {
    if (!editingThread || !editThread.title.trim() || !editThread.content.trim()) return;
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
        images: nextImages,
      };

      const { error } = await supabase
        .from('forum_threads')
        .update(updates)
        .eq('id', editingThread.id)
        .eq('author_id', user?.id);

      if (error) throw error;

      const applyThreadUpdate = (thread: any) => thread.id === editingThread.id ? { ...thread, ...updates } : thread;
      setThreads(prev => prev.map(applyThreadUpdate));
      setSelectedThread(prev => prev?.id === editingThread.id ? { ...prev, ...updates } : prev);
      setEditingThread(null);
    } catch (error: any) {
      console.error("Failed to edit discussion:", error);
      setEditThreadError(error.message || "Failed to edit discussion.");
    } finally {
      setIsSavingThreadEdit(false);
    }
  };

  const handleDeleteThread = async (threadId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!window.confirm("Delete this discussion?")) return;
    setDeletingThreadId(threadId);

    try {
      const { error } = await supabase
        .from('forum_threads')
        .delete()
        .eq('id', threadId)
        .eq('author_id', user?.id);

      if (error) throw error;

      setThreads(prev => prev.filter(thread => thread.id !== threadId));
      if (selectedThread?.id === threadId) setSelectedThread(null);
    } catch (error: any) {
      console.error("Failed to delete discussion:", error);
      alert(`Failed to delete discussion: ${error.message || "Unknown error"}`);
    } finally {
      setDeletingThreadId(null);
    }
  };

  const handlePostReply = async (parentId: string | null = null) => {
        if (!selectedThread || (!replyText.trim() && !replyImage)) return;
        
        let imageUrl = null;
        if (replyImage) {
            imageUrl = await uploadFileToSupabase(replyImage);
        }

        const resolvedParent = parentId ?? replyTargetId ?? null;
    
        const { data: createdReply, error } = await supabase.from('forum_replies').insert({
                thread_id: selectedThread.id,
                author_id: user?.id,
                content: replyText.trim(),
                parent_id: resolvedParent,
                image_url: imageUrl
        }).select(replySelect).single();

        if (error) {
          console.error('Failed to post reply:', error);
          return;
        }

        const newReply = {
          ...createdReply,
          children: [],
          childCount: 0,
          childrenLoaded: false,
          hasMoreChildren: false,
        };

        setSelectedThread((current: any) => {
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
              const nextChildren = [newReply, ...(node.children || []).filter((child: any) => child.id !== newReply.id)];
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
  };

  const updateReplyTreeContent = (nodes: any[] = [], replyId: string, content: string): any[] => {
    return nodes.map(node => {
      if (node.id === replyId) return { ...node, content };
      return { ...node, children: updateReplyTreeContent(node.children || [], replyId, content) };
    });
  };

  const resetReplyComposer = () => {
    setReplyText("");
    setReplyImage(null);
    setReplyImagePreview(null);
    setActiveReplyBox(null);
    setReplyTargetId(null);
  };

  const handleStartEditReply = (comment: any) => {
    setEditingReplyId(comment.id);
    setEditingReplyText(comment.content || "");
    resetReplyComposer();
  };

  const handleSaveReplyEdit = async (replyId: string) => {
    if (!editingReplyText.trim()) return;
    setSavingReplyId(replyId);

    try {
      const nextContent = editingReplyText.trim();
      const { error } = await supabase
        .from('forum_replies')
        .update({ content: nextContent })
        .eq('id', replyId)
        .eq('author_id', user?.id);

      if (error) throw error;

      setSelectedThread(prev => prev ? {
        ...prev,
        structuredReplies: updateReplyTreeContent(prev.structuredReplies || [], replyId, nextContent),
      } : prev);
      setEditingReplyId(null);
      setEditingReplyText("");
    } catch (error: any) {
      console.error("Failed to edit comment:", error);
      alert(`Failed to edit comment: ${error.message || "Unknown error"}`);
    } finally {
      setSavingReplyId(null);
    }
  };

  const handleDeleteReply = async (comment: any) => {
    if (!selectedThread) return;
    if (!window.confirm("Delete this comment?")) return;
    setDeletingReplyId(comment.id);

    try {
      const { error } = await supabase
        .from('forum_replies')
        .delete()
        .eq('id', comment.id)
        .eq('author_id', user?.id);

      if (error) throw error;

      const [totalReplyResult, rootReplyResult, parentReplyResult] = await Promise.all([
        supabase
          .from('forum_replies')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', selectedThread.id),
        supabase
          .from('forum_replies')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', selectedThread.id)
          .is('parent_id', null),
        comment.parent_id
          ? supabase
              .from('forum_replies')
              .select('id', { count: 'exact', head: true })
              .eq('parent_id', comment.parent_id)
          : Promise.resolve({ count: null, error: null }),
      ]);

      if (totalReplyResult.error) throw totalReplyResult.error;
      if (rootReplyResult.error) throw rootReplyResult.error;
      if (parentReplyResult.error) throw parentReplyResult.error;

      const rootReplyCount = rootReplyResult.count || 0;
      const loadedRootCount = Math.max(
        0,
        (selectedThread.structuredReplies || []).length - (comment.parent_id ? 0 : 1),
      );

      setSelectedThread((current: any) => {
        if (!current) return current;

        let nextReplies = removeReplyTreeNode(current.structuredReplies || [], comment.id);
        if (comment.parent_id) {
          nextReplies = updateReplyTreeNode(nextReplies, comment.parent_id, parent => {
            const childCount = parentReplyResult.count || 0;
            return {
              ...parent,
              childCount,
              hasMoreChildren: (parent.children || []).length < childCount,
            };
          });
        }

        return {
          ...current,
          structuredReplies: nextReplies,
          replyCount: totalReplyResult.count || 0,
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
    } catch (error: any) {
      console.error("Failed to delete comment:", error);
      alert(`Failed to delete comment: ${error.message || "Unknown error"}`);
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
          if (isThread) {
              if (currentType) {
                  const { error: deleteError } = await supabase
                      .from('forum_reactions')
                      .delete()
                      .eq('thread_id', targetId)
                      .eq('user_id', user.id);
                  if (deleteError) throw deleteError;
              }

              if (nextType) {
                  const { error: insertError } = await supabase
                      .from('forum_reactions')
                      .insert({ thread_id: targetId, user_id: user.id, type: nextType });
                  if (insertError) throw insertError;
              }
          } else {
              if (currentType) {
                  const { error: deleteError } = await supabase
                      .from('forum_reply_reactions')
                      .delete()
                      .eq('reply_id', targetId)
                      .eq('user_id', user.id);
                  if (deleteError) throw deleteError;
              }

              if (nextType) {
                  const { error: insertError } = await supabase
                      .from('forum_reply_reactions')
                      .insert({ reply_id: targetId, user_id: user.id, type: nextType });
                  if (insertError) throw insertError;
              }
          }
      } catch (error) {
          console.error("Failed to update reaction:", error);
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

  const getCourseBadge = (courseId: string | null) => {
    if (!courseId) return <Badge className="border-none" style={{ backgroundColor: 'rgba(147, 51, 234, 0.2)', color: '#d8b4fe' }}><Coffee className="h-3 w-3 mr-1"/> Campus Life</Badge>;
    const course = courses.find(c => c.id === courseId);
    return <Badge variant="outline" className="bg-white border-gray-300 text-gray-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-300">{course?.name || "Unknown Course"}</Badge>;
  };

  const formatDate = (dateString: string) => {
    try {
        return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return ""; }
  };

  const countReplies = (nodes: any[] = []): number => nodes.reduce((acc, node) => acc + 1 + countReplies(node.children || []), 0);

  const mentionOptions = [
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

  const getFilteredMentionOptions = (value: string) => {
    const query = getActiveMentionQuery(value);
    if (query === null) return [];

    return mentionOptions
      .filter(option => {
        return !query
          || option.label.toLowerCase().includes(query)
          || option.token.toLowerCase().includes(query);
      })
      .slice(0, 8);
  };

  const applyMention = (value: string, token: string) => {
    return value.replace(/(^|\s)@([^\s@]*)$/, `$1${token} `);
  };

  const MentionSuggestions = ({ value, onSelect }: { value: string, onSelect: (token: string) => void }) => {
    const options = getFilteredMentionOptions(value);
    if (options.length === 0) return null;

    return (
      <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        {options.map(option => (
          <button
            key={option.id}
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
            onClick={() => onSelect(option.token)}
          >
            <AtSign className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-gray-900 dark:text-white">{option.label}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{option.detail}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderEmojiPicker = (onSelect: (emoji: string) => void) => (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20 dark:hover:text-yellow-400"
          title="Add emoji"
        >
          <Smile className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="grid w-52 grid-cols-6 gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        {COMMENT_EMOJIS.map(emoji => (
          <button
            key={emoji}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );

  const applyReactionDelta = (reactions: any[] = [], previousType?: string, nextType?: string) => {
    const next = [...reactions];
    if (previousType) {
      const removeIndex = next.findIndex((reaction) => reaction.type === previousType);
      if (removeIndex >= 0) next.splice(removeIndex, 1);
    }
    if (nextType) next.push({ type: nextType });
    return next;
  };

  const updateReplyTreeReaction = (nodes: any[] = [], replyId: string, previousType?: string, nextType?: string): any[] => {
    return nodes.map(node => {
      if (node.id === replyId) {
        return {
          ...node,
          reactions: applyReactionDelta(node.reactions || [], previousType, nextType),
        };
      }

      return {
        ...node,
        children: updateReplyTreeReaction(node.children || [], replyId, previousType, nextType),
      };
    });
  };

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

  const renderReactionBar = (targetId: string, reactions: any[], myReaction: string, isThread: boolean) => {
      // Calculate Top 3
      const counts: Record<string, number> = {};
      (reactions || []).forEach((r: any) => counts[r.type] = (counts[r.type] || 0) + 1);
      
      const topTypes = Object.entries(counts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([type]) => type);

      const isLiked = myReaction === 'like';
      const pickerKey = `${isThread ? 'thread' : 'reply'}-${targetId}`;

      return (
          <div className="relative flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              {/* Like Button */}
              <Button 
                  variant="ghost" 
                  size="sm"
                  className={`gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${isLiked ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}
                  onClick={(e) => {
                      e.stopPropagation();
                      setOpenReactionPicker(null);
                      handleReaction(targetId, 'like', isThread);
                  }}
              >
                  <ThumbsUp className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  Like
              </Button>

              {/* Emoji Picker */}
              <div className="relative">
                  <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`px-2 ${openReactionPicker === pickerKey || (myReaction && myReaction !== 'like') ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'} hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20 dark:hover:text-yellow-400`}
                      onClick={(e) => {
                          e.stopPropagation();
                          setOpenReactionPicker(current => current === pickerKey ? null : pickerKey);
                      }}
                      title="React with an emoji"
                  >
                      <SmilePlus className="h-5 w-5" />
                  </Button>

                  {openReactionPicker === pickerKey && (
                    <div
                      className="absolute left-0 z-[100] grid grid-cols-6 gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
                      style={{ bottom: "calc(100% + 8px)", top: "auto" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {DISPLAY_REACTION_TYPES.map((r) => (
                          <button 
                              type="button"
                              key={r.id} 
                              className={`flex h-10 w-10 items-center justify-center rounded-full text-2xl transition-transform hover:scale-110 ${myReaction === r.id ? 'bg-blue-100 ring-2 ring-blue-400 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-zinc-700'}`} 
                              onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpenReactionPicker(null);
                                  await handleReaction(targetId, r.id, isThread);
                              }}
                              title={r.label}
                          >
                              {r.icon}
                          </button>
                      ))}
                    </div>
                  )}
              </div>

              {/* Top 3 Display */}
              {topTypes.length > 0 && (
                  <div className="flex items-center gap-1.5 ml-2 text-xs text-gray-500 dark:text-gray-400 cursor-default" title={`${reactions.length} reactions`}>
                      <div className="flex -space-x-1">
                          {topTypes.map((type, i) => (
                              <span key={i} className="relative z-10 text-sm drop-shadow-sm bg-white dark:bg-zinc-800 rounded-full">{getDisplayReactionIcon(type)}</span>
                          ))}
                      </div>
                      <span className="font-medium hover:underline">{reactions.length}</span>
                  </div>
              )}
          </div>
      );
  };

  const initReply = (comment: any, _depth: number) => {
    setEditingReplyId(null);
    setEditingReplyText("");
    setActiveReplyBox(comment.id);
    setReplyTargetId(comment.id);
    setReplyText("");
    setReplyImage(null);
    setReplyImagePreview(null);
  };

  const renderCommentNode = (comment: any, depth = 0) => {
    const showReplyBox = activeReplyBox === comment.id;
    const indentLevel = Math.min(depth, MAX_NESTING_DEPTH - 1);
    const indentClass = indentLevel > 0 ? 'mt-5' : 'mt-8';
    const isOwnComment = comment.author_id === user?.id;
    const isEditingComment = editingReplyId === comment.id;

    return (
        <div className={`flex gap-4 w-full ${indentClass}`}>
            <Avatar className={`${depth > 0 ? 'h-8 w-8' : 'h-10 w-10'} cursor-pointer hover:opacity-80`} onClick={(e) => navigateToProfile(e, comment.author?.id)}>
                <AvatarImage src={comment.author?.avatar_url} />
                <AvatarFallback>{comment.author?.full_name?.[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 group">
                <div className="flex items-baseline gap-2">
                    <span 
                        className="font-semibold text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:underline"
                        onClick={(e) => navigateToProfile(e, comment.author?.id)}
                    >
                        {comment.author?.full_name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(comment.created_at)}</span>
                </div>

                {isEditingComment ? (
                    <div className="mt-3 space-y-3">
                        <div className="relative">
                            <Textarea
                                value={editingReplyText}
                                onChange={(e) => setEditingReplyText(e.target.value)}
                                className="min-h-[96px] p-3 pr-12 text-sm bg-white dark:bg-zinc-900 dark:text-white dark:placeholder-gray-400"
                                autoFocus
                            />
                            <div className="absolute bottom-2 right-2">
                                {renderEmojiPicker(emoji => setEditingReplyText(value => `${value}${emoji}`))}
                            </div>
                            <MentionSuggestions
                                value={editingReplyText}
                                onSelect={(token) => setEditingReplyText(value => applyMention(value, token))}
                            />
                        </div>
                        <div className="flex justify-end gap-4 pt-1">
                            <Button variant="ghost" size="sm" className="px-4" onClick={() => { setEditingReplyId(null); setEditingReplyText(""); }}>Cancel</Button>
                            <Button className="px-5" size="sm" onClick={() => handleSaveReplyEdit(comment.id)} disabled={!editingReplyText.trim() || savingReplyId === comment.id}>
                                {savingReplyId === comment.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                Save
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div style={{ whiteSpace: "pre-wrap" }} className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed mt-1">
                        {renderMentionedText(comment.content)}
                    </div>
                )}

                {/* Reply Image Display */}
                {comment.image_url && (
                    <div className="mt-2">
                        <img 
                            src={comment.image_url} 
                            alt="Attachment" 
                            className="max-h-48 rounded-lg border dark:border-zinc-700 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxImage(comment.image_url)}
                        />
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
                    {renderReactionBar(comment.id, comment.reactions || [], replyReactions[comment.id], false)}

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => initReply(comment, depth)}
                            className="px-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                        >
                            Reply
                        </button>
                        {isOwnComment && !isEditingComment && (
                            <>
                                <button
                                    onClick={() => handleStartEditReply(comment)}
                                    className="px-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteReply(comment)}
                                    disabled={deletingReplyId === comment.id}
                                    className="px-1 text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50"
                                >
                                    {deletingReplyId === comment.id ? "Deleting..." : "Delete"}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {(comment.childCount || 0) > 0 && (
                    <button
                        type="button"
                        onClick={() => handleToggleReplies(comment)}
                        disabled={loadingReplyBranches[comment.id]}
                        className="flex min-h-8 items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                        style={{
                            marginTop: "14px",
                            marginBottom: expandedReplyIds[comment.id] ? "10px" : "0",
                        }}
                    >
                        {loadingReplyBranches[comment.id] && <Loader2 className="h-3 w-3 animate-spin" />}
                        {expandedReplyIds[comment.id]
                          ? "Hide replies"
                          : `View ${comment.childCount} ${comment.childCount === 1 ? "reply" : "replies"}`}
                    </button>
                )}

                {/* Reply Input */}
                {showReplyBox && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-1">
                        <div className="relative">
                            <Textarea 
                                autoFocus
                                placeholder={`Replying to ${comment.author?.full_name}...`}
                                dir="ltr"
                                className="min-h-[76px] text-sm p-3 pr-20 bg-white dark:bg-zinc-900 dark:text-white dark:placeholder-gray-400 border-b-2 focus:border-primary resize-none"
                                style={{ textAlign: "left" }}
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                            />
                            <MentionSuggestions
                                value={replyText}
                                onSelect={(token) => setReplyText(value => applyMention(value, token))}
                            />
                            {/* Image Upload Trigger */}
                            <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                {renderEmojiPicker(emoji => setReplyText(value => `${value}${emoji}`))}
                                <button 
                                    type="button"
                                    className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                                    onClick={() => replyFileInputRef.current?.click()}
                                    title="Attach an image"
                                >
                                    <ImageIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <input 
                                type="file" 
                                ref={replyFileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setReplyImage(file);
                                        setReplyImagePreview(URL.createObjectURL(file));
                                    }
                                }}
                            />
                        </div>

                        {/* Image Preview */}
                        {replyImagePreview && (
                            <div className="mt-2 relative inline-block group">
                                <img src={replyImagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-lg border-2 border-gray-200 dark:border-zinc-700 shadow-sm" />
                                <button 
                                    onClick={() => { setReplyImage(null); setReplyImagePreview(null); }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-3">
                            <Button variant="ghost" size="sm" onClick={resetReplyComposer} className="h-8 dark:text-white dark:hover:bg-zinc-800">Cancel</Button>
                            <Button size="sm" onClick={() => handlePostReply(replyTargetId ?? comment.id)} className="h-8">Reply</Button>
                        </div>
                    </div>
                )}

                {/* Recursive Children */}
                {expandedReplyIds[comment.id] && (
                    <>
                        {comment.children && comment.children.length > 0 && comment.children.map((child: any) => (
                            <div key={child.id} style={{ marginLeft: `${indentLevel >= MAX_NESTING_DEPTH - 1 ? (MAX_NESTING_DEPTH - 1) * 3 : (indentLevel + 1) * 3}rem` }}>
                                {renderCommentNode(child, depth + 1)}
                            </div>
                        ))}
                        {comment.hasMoreChildren && (
                            <div
                                className="mt-4"
                                style={{ marginLeft: `${indentLevel >= MAX_NESTING_DEPTH - 1 ? (MAX_NESTING_DEPTH - 1) * 3 : (indentLevel + 1) * 3}rem` }}
                            >
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => loadChildReplies(comment.id, true)}
                                    disabled={loadingReplyBranches[comment.id]}
                                    className="gap-2"
                                >
                                    {loadingReplyBranches[comment.id] && <Loader2 className="h-3 w-3 animate-spin" />}
                                    Load more replies
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
  };

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
                    {threads.filter(t => {
                        const query = searchQuery.toLowerCase();
                        return t.title?.toLowerCase().includes(query) || t.content?.toLowerCase().includes(query) || t.category?.toLowerCase().includes(query);
                    }).map(thread => {
                        const replyCount = thread.replies && thread.replies[0] ? thread.replies[0].count : 0;
                        const isOwnThread = thread.author_id === user?.id;

                        return (
                            <Card key={thread.id} className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-gray-200 dark:border-zinc-800 dark:bg-zinc-900" onClick={() => fetchThreadDetails(thread.id)}>
                                <CardContent className="p-6 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3" onClick={(e) => navigateToProfile(e, thread.author?.id)}>
                                            <Avatar className="h-10 w-10 border border-gray-200 hover:ring-2 hover:ring-primary transition-all">
                                                <AvatarImage src={thread.author?.avatar_url} />
                                                <AvatarFallback>{thread.author?.full_name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 dark:text-white hover:underline">{thread.author?.full_name}</span>
                                                    {thread.author?.role === 'lecturer' && <Badge variant="secondary" className="h-5 text-[10px]">Lecturer</Badge>}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(thread.created_at)}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {isOwnThread && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                                        onClick={(e) => openEditThread(thread, e)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-red-500 hover:text-red-700"
                                                        disabled={deletingThreadId === thread.id}
                                                        onClick={(e) => handleDeleteThread(thread.id, e)}
                                                    >
                                                        {deletingThreadId === thread.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                </>
                                            )}
                                            {thread.is_pinned && <Pin className="h-5 w-5 text-blue-500 fill-blue-100 rotate-45" />}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">{thread.title}</h3>
                                        <ThreadContentPreview content={thread.content || ""} />

                                        {/* Image Preview Grid - Fixed Container */}
                                        {(thread?.images ?? []).length > 0 && (
                                            <div className="mt-4 bg-gray-100 dark:bg-zinc-800/50 rounded-lg p-3 h-48 flex items-center justify-center overflow-hidden">
                                                <div className="flex flex-wrap gap-2 h-full items-center justify-center w-full">
                                                    {(thread?.images ?? []).slice(0, 4).map((img: string, i: number) => (
                                                        img && (
                                                            <img 
                                                                key={i} 
                                                                src={img} 
                                                                alt="Preview" 
                                                                className="h-full max-w-1/2 object-contain rounded border dark:border-zinc-700 cursor-pointer hover:opacity-90 transition-opacity" 
                                                                onClick={() => setLightboxImage(img)}
                                                                onError={() => console.error('Image failed to load:', img)}
                                                            />
                                                        )
                                                    ))}
                                                    {(thread?.images ?? []).length > 4 && (
                                                        <div className="flex items-center justify-center bg-gray-300 dark:bg-zinc-700 rounded h-40 w-20 text-gray-700 dark:text-gray-300 font-bold text-sm cursor-pointer hover:bg-gray-400 dark:hover:bg-zinc-600 transition-colors">
                                                            +{(thread?.images ?? []).length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {getCourseBadge(thread.course_id)}
                                        <Badge className="border-none" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#d1d5db' }}>#{thread.category}</Badge>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between mt-2">
                                        {renderReactionBar(thread.id, thread.reactions || [], userReactions[thread.id], true)}
                                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                            <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> {replyCount} replies</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : selectedThread ? (
                
                // === THREAD DETAIL VIEW ===
                <div className="animate-in fade-in-50 slide-in-from-right-5 w-full">
                    <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent dark:text-white dark:hover:text-gray-300" onClick={() => setSelectedThread(null)}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Feed
                    </Button>
                    
                    <Card className="mb-6 border-2 border-gray-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 bg-white">
                        <CardContent className="p-8 dark:text-white">
                            <div className="mb-4 flex items-start justify-between gap-4">
                                <div className="flex gap-2">
                                    {getCourseBadge(selectedThread?.course_id || null)}
                                    <Badge className="text-sm px-3 py-1 border-none" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#d1d5db' }}>#{selectedThread?.category ?? 'general'}</Badge>
                                </div>
                                {selectedThread?.author_id === user?.id && (
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openEditThread(selectedThread)}>
                                            <Edit2 className="mr-2 h-4 w-4" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700"
                                            disabled={deletingThreadId === selectedThread.id}
                                            onClick={() => handleDeleteThread(selectedThread.id)}
                                        >
                                            {deletingThreadId === selectedThread.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                            Delete
                                        </Button>
                                    </div>
                                )}
                            </div>
                            
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                                {selectedThread?.title ?? 'Discussion'}
                            </h1>

                            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100 dark:border-zinc-800 cursor-pointer" onClick={(e) => selectedThread?.author?.id && navigateToProfile(e, selectedThread.author.id)}>
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={selectedThread?.author?.avatar_url} />
                                    <AvatarFallback>{selectedThread?.author?.full_name?.[0] ?? 'U'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white hover:underline">{selectedThread?.author?.full_name ?? 'Anonymous'}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedThread?.created_at ? formatDate(selectedThread.created_at) : 'Date unknown'}</p>
                                </div>
                            </div>

                            <div style={{ whiteSpace: "pre-wrap" }} className="text-lg text-gray-800 dark:text-gray-100 leading-relaxed font-serif">
                                {renderMentionedText(selectedThread?.content ?? 'No content')}
                            </div>

                            {/* Full Image Gallery (Reddit Style - Below Text) */}
                            {(selectedThread?.images ?? []).length > 0 && (
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(selectedThread?.images ?? []).map((img: string | null | undefined, i: number) => (
                                        img ? (
                                            <img 
                                                key={i} 
                                                src={img} 
                                                alt={`Attachment ${i+1}`} 
                                                className="w-full h-auto rounded-xl border dark:border-zinc-700 shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
                                                onClick={() => setLightboxImage(img)}
                                                onError={() => console.error('Image failed to load:', img)}
                                            />
                                        ) : null
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* COMMENTS */}
                    <div className="space-y-4 mb-20">
                        <h3 className="font-bold text-xl flex items-center gap-2 text-gray-800 dark:text-white mb-6">
                            <MessageCircle className="h-5 w-5"/>
                            {selectedThread.replyCount || 0} Comments
                        </h3>
                        
                        {/* Root Reply Box */}
                        <div className="flex gap-4 mb-12">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={profile?.avatar_url || (user as any)?.user_metadata?.avatar_url} />
                                <AvatarFallback>{profile?.full_name?.[0] || (user as any)?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                                <div className="border-b-2 border-gray-200 dark:border-zinc-800 focus-within:border-black dark:focus-within:border-white transition-colors relative">
                                    <Textarea 
                                        placeholder="Add a comment..." 
                                        dir="ltr"
                                        className="min-h-[36px] text-sm p-1 pr-20 border-0 focus-visible:ring-0 bg-transparent resize-none dark:text-white dark:placeholder-gray-400" 
                                        style={{ textAlign: "left" }}
                                        value={activeReplyBox === null ? replyText : ''} 
                                        onChange={e => {
                                            if (activeReplyBox === null) setReplyText(e.target.value)
                                        }}
                                        onFocus={() => {
                                            if (activeReplyBox !== null) {
                                                resetReplyComposer();
                                            }
                                        }}
                                    />
                                    <MentionSuggestions
                                        value={activeReplyBox === null ? replyText : ''}
                                        onSelect={(token) => setReplyText(value => applyMention(value, token))}
                                    />
                                    <div className="absolute bottom-0.5 right-0 flex items-center gap-1">
                                        {renderEmojiPicker(emoji => setReplyText(value => `${value}${emoji}`))}
                                        <button 
                                            type="button"
                                            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                                            onClick={() => replyFileInputRef.current?.click()}
                                            title="Attach an image"
                                        >
                                            <ImageIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Preview */}
                                {activeReplyBox === null && replyImagePreview && (
                                    <div className="relative inline-block mt-2 group">
                                        <img src={replyImagePreview} alt="Preview" className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200 dark:border-zinc-700 shadow-sm" />
                                        <button 
                                            onClick={() => { setReplyImage(null); setReplyImagePreview(null); }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}

                                {activeReplyBox === null && (replyText.length > 0 || replyImage) && (
                                    <div className="flex justify-end gap-2 animate-in fade-in">
                                        <Button variant="ghost" size="sm" onClick={resetReplyComposer} className="rounded-full dark:text-white dark:hover:bg-zinc-800">Cancel</Button>
                                        <Button onClick={() => handlePostReply(null)} disabled={!replyText.trim() && !replyImage} size="sm" className="rounded-full">Comment</Button>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    ref={replyFileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setReplyImage(file);
                                            setReplyImagePreview(URL.createObjectURL(file));
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Comment Stream */}
                        {selectedThread.structuredReplies?.map((reply: any) => (
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

      {/* CREATE THREAD DIALOG */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open: boolean) => {
            if (!isCreatingThread) {
                setIsCreateOpen(open);
                if (!open) setCreateThreadError("");
            }
        }}
      >
        <DialogContent
            hideCloseButton
            className="max-w-2xl dark:bg-zinc-900 dark:border-zinc-800"
        >
            <button
                type="button"
                aria-label="Close discussion dialog"
                disabled={isCreatingThread}
                onClick={() => {
                    setIsCreateOpen(false);
                    setCreateThreadError("");
                }}
                className="absolute z-10 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                style={{ top: "16px", right: "16px", left: "auto" }}
            >
                <X className="h-5 w-5" />
            </button>
            <DialogHeader className="pr-12">
                <DialogTitle className="text-2xl dark:text-white">Start a New Discussion</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                {createThreadError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                        {createThreadError}
                    </div>
                )}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Where to post?</label>
                    <Select value={newThread.course_id} onValueChange={val => setNewThread({...newThread, course_id: val})}>
                        <SelectTrigger className="h-12 text-base dark:bg-gray-100 dark:border-gray-300" style={{ color: 'black' }}>
                            <SelectValue placeholder="Select Context" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-zinc-800 dark:border-zinc-700">
                            <SelectItem value="general" className="font-bold text-purple-600">☕ General Lounge (Campus Life)</SelectItem>
                            {courses.map(c => <SelectItem key={c.id} value={c.id}>📚 {c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Topic Title</label>
                    <Input placeholder="E.g., How do I solve the Tutorial 3 bug? #Homework" className="h-12 text-lg dark:bg-gray-100 dark:border-gray-300" style={{ color: 'black' }} value={newThread.title} onChange={e => setNewThread({...newThread, title: e.target.value})} />
                </div>
                <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Content</label>
                    <Textarea
                        placeholder="Write your thoughts here..."
                        className="min-h-[200px] p-4 text-base leading-relaxed whitespace-pre-wrap dark:bg-gray-100 dark:border-gray-300"
                        style={{ color: 'black' }}
                        value={newThread.content}
                        onChange={e => setNewThread({...newThread, content: e.target.value})}
                    />
                    
                    {/* THREAD IMAGE PREVIEWS (Max 5) */}
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Attachments ({threadImages.length}/5)
                            </label>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {threadImagePreviews.map((src, i) => (
                                <div key={i} className="group relative inline-block">
                                    <img src={src} alt="Preview" className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200 dark:border-zinc-700 shadow-sm" />
                                    <button 
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                                        onClick={() => {
                                            const newFiles = [...threadImages]; newFiles.splice(i, 1);
                                            const newPreviews = [...threadImagePreviews]; newPreviews.splice(i, 1);
                                            setThreadImages(newFiles);
                                            setThreadImagePreviews(newPreviews);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            {threadImages.length < 5 && (
                                <button 
                                    className="h-24 w-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg hover:border-primary dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-zinc-800/50 transition-all duration-200 group"
                                    onClick={() => threadFileInputRef.current?.click()}
                                >
                                    <ImageIcon className="h-6 w-6 text-gray-400 group-hover:text-primary transition-colors" />
                                    <span className="text-xs text-gray-400 group-hover:text-primary font-medium mt-1 transition-colors">Add Photo</span>
                                </button>
                            )}
                            <input 
                                type="file" 
                                ref={threadFileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                multiple
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length + threadImages.length > 5) {
                                        alert("Max 5 images allowed.");
                                        return;
                                    }
                                    setThreadImages([...threadImages, ...files]);
                                    setThreadImagePreviews([...threadImagePreviews, ...files.map(f => URL.createObjectURL(f))]);
                                }} 
                            />
                        </div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button
                    onClick={handleCreateThread}
                    size="lg"
                    className="w-full sm:w-auto font-bold"
                    disabled={!newThread.title.trim() || !newThread.content.trim() || isCreatingThread}
                >
                    {isCreatingThread && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCreatingThread ? "Posting..." : "Post Discussion"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT THREAD DIALOG */}
      <Dialog
        open={!!editingThread}
        onOpenChange={(open: boolean) => {
            if (!open && !isSavingThreadEdit) {
                setEditingThread(null);
                setEditThreadError("");
            }
        }}
      >
        <DialogContent hideCloseButton className="max-w-2xl dark:bg-zinc-900 dark:border-zinc-800">
            <button
                type="button"
                aria-label="Close edit dialog"
                disabled={isSavingThreadEdit}
                onClick={() => {
                    setEditingThread(null);
                    setEditThreadError("");
                }}
                className="absolute z-50 flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                style={{ top: "24px", right: "24px", left: "auto" }}
            >
                <X className="h-4 w-4" />
            </button>
            <DialogHeader className="pr-12">
                <DialogTitle className="text-2xl dark:text-white">Edit Discussion</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                {editThreadError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                        {editThreadError}
                    </div>
                )}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Topic Title</label>
                    <Input
                        className="h-12 text-lg dark:bg-gray-100 dark:border-gray-300"
                        style={{ color: 'black' }}
                        value={editThread.title}
                        onChange={e => setEditThread({...editThread, title: e.target.value})}
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Content</label>
                    <Textarea
                        className="min-h-[180px] p-4 text-base leading-relaxed whitespace-pre-wrap dark:bg-gray-100 dark:border-gray-300"
                        style={{ color: 'black' }}
                        value={editThread.content}
                        onChange={e => setEditThread({...editThread, content: e.target.value})}
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Images ({editThreadExistingImages.length + editThreadImages.length}/5)
                    </label>
                    <div className="flex flex-wrap gap-3">
                        {editThreadExistingImages.map((src, i) => (
                            <div key={`existing-${src}-${i}`} className="group relative inline-block">
                                <img src={src} alt="Existing attachment" className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200 dark:border-zinc-700 shadow-sm" />
                                <button
                                    type="button"
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-all"
                                    onClick={() => setEditThreadExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        {editThreadImagePreviews.map((src, i) => (
                            <div key={`new-${src}-${i}`} className="group relative inline-block">
                                <img src={src} alt="New attachment preview" className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200 dark:border-zinc-700 shadow-sm" />
                                <button
                                    type="button"
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-all"
                                    onClick={() => {
                                        setEditThreadImages(prev => prev.filter((_, idx) => idx !== i));
                                        setEditThreadImagePreviews(prev => prev.filter((_, idx) => idx !== i));
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        {editThreadExistingImages.length + editThreadImages.length < 5 && (
                            <button
                                type="button"
                                className="h-24 w-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg hover:border-primary dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-zinc-800/50 transition-all duration-200 group"
                                onClick={() => editThreadFileInputRef.current?.click()}
                            >
                                <ImageIcon className="h-6 w-6 text-gray-400 group-hover:text-primary transition-colors" />
                                <span className="text-xs text-gray-400 group-hover:text-primary font-medium mt-1 transition-colors">Add Photo</span>
                            </button>
                        )}
                        <input
                            type="file"
                            ref={editThreadFileInputRef}
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length + editThreadImages.length + editThreadExistingImages.length > 5) {
                                    alert("Max 5 images allowed.");
                                    return;
                                }
                                setEditThreadImages(prev => [...prev, ...files]);
                                setEditThreadImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                                e.target.value = "";
                            }}
                        />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setEditingThread(null)} disabled={isSavingThreadEdit}>Cancel</Button>
                <Button onClick={handleSaveThreadEdit} disabled={!editThread.title.trim() || !editThread.content.trim() || isSavingThreadEdit}>
                    {isSavingThreadEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
