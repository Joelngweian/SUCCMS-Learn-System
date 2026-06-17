import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { supabase } from "@/lib/supabase";
import { confirmAction } from "@/lib/confirm";
import {
  normalizeCoursePost,
  type CoursePerson,
  type CoursePost,
  type CoursePostFile,
  type MentionPerson,
} from "./coursePageTypes";
import {
  getCourseContentStoragePath,
  getErrorMessage,
  removeCourseContentPaths,
} from "./courseStorage";

const COURSE_POST_SELECT =
  "id, course_id, author_id, author_name, content, attachments, created_at, updated_at";

export function useCoursePosts({
  authorName,
  courseId,
  people,
  userId,
}: {
  authorName: string;
  courseId: string;
  people: CoursePerson[];
  userId?: string | null;
}) {
  const [posts, setPosts] = useState<CoursePost[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [postFiles, setPostFiles] = useState<CoursePostFile[]>([]);
  const [postError, setPostError] = useState("");
  const [isPostUploading, setIsPostUploading] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [editPostFiles, setEditPostFiles] = useState<CoursePostFile[]>([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionCursorIndex, setMentionCursorIndex] = useState(0);
  const draftPostPathsRef = useRef(new Set<string>());
  const editPostNewPathsRef = useRef(new Set<string>());
  const editPostOriginalFilesRef = useRef<CoursePostFile[]>([]);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("course_posts")
      .select(COURSE_POST_SELECT)
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    if (error) {
      setPostError(`Failed to load posts: ${error.message}`);
      return;
    }
    setPosts((data || []).map(normalizeCoursePost));
  }, [courseId]);

  useEffect(() => {
    setPosts([]);
    setNewPostContent("");
    setPostFiles([]);
    setPostError("");
    setEditingPostId(null);
    setEditPostContent("");
    setEditPostFiles([]);
    setShowMentionDropdown(false);
    void fetchPosts();
    const channel = supabase
      .channel(`course-posts:${courseId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "course_posts",
          filter: `course_id=eq.${courseId}`,
        },
        payload => {
          const post = normalizeCoursePost(
            payload.new as Parameters<typeof normalizeCoursePost>[0],
          );
          setPosts(current =>
            current.some(item => item.id === post.id)
              ? current
              : [post, ...current],
          );
        },
      )
      .subscribe();

    const draftPaths = draftPostPathsRef.current;
    const editPaths = editPostNewPathsRef.current;
    return () => {
      void supabase.removeChannel(channel);
      const abandonedPaths = [...draftPaths, ...editPaths];
      if (abandonedPaths.length > 0) {
        void supabase.storage.from("course_content").remove(abandonedPaths);
      }
      draftPaths.clear();
      editPaths.clear();
      editPostOriginalFilesRef.current = [];
    };
  }, [courseId, fetchPosts]);

  const uploadPostFiles = async (
    event: ChangeEvent<HTMLInputElement>,
    target: "draft" | "edit",
  ) => {
    if (!event.target.files?.length) return;
    setPostError("");
    setIsPostUploading(true);
    const files = Array.from(event.target.files);
    const uploadedFiles: CoursePostFile[] = [];
    const uploadedPaths: string[] = [];

    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^\w.-]+/g, "_");
        const filePath = `${courseId}/posts/${crypto.randomUUID()}_${safeName}`;
        const { error } = await supabase.storage
          .from("course_content")
          .upload(filePath, file);
        if (error) throw error;

        uploadedPaths.push(filePath);
        const { data } = supabase.storage
          .from("course_content")
          .getPublicUrl(filePath);
        uploadedFiles.push({
          name: file.name,
          path: filePath,
          url: data.publicUrl,
          size: file.size,
          type: file.type,
        });
      }

      const targetPaths =
        target === "draft"
          ? draftPostPathsRef.current
          : editPostNewPathsRef.current;
      uploadedPaths.forEach(path => targetPaths.add(path));

      if (target === "draft") {
        setPostFiles(current => [...current, ...uploadedFiles]);
      } else {
        setEditPostFiles(current => [...current, ...uploadedFiles]);
      }
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("course_content").remove(uploadedPaths);
      }
      setPostError(
        `Failed to upload attachment: ${getErrorMessage(error, "Please try again.")}`,
      );
    } finally {
      setIsPostUploading(false);
      event.target.value = "";
    }
  };

  const removeDraftFile = async (file: CoursePostFile, index: number) => {
    const path = getCourseContentStoragePath(file);
    const error = await removeCourseContentPaths([path]);
    if (error) {
      setPostError(`Failed to remove attachment: ${error.message}`);
      return;
    }

    if (path) draftPostPathsRef.current.delete(path);
    setPostFiles(current =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const removeEditFile = async (file: CoursePostFile, index: number) => {
    const path = getCourseContentStoragePath(file);
    const isNewUpload = Boolean(
      path && editPostNewPathsRef.current.has(path),
    );

    if (isNewUpload) {
      const error = await removeCourseContentPaths([path]);
      if (error) {
        setPostError(`Failed to remove attachment: ${error.message}`);
        return;
      }
      editPostNewPathsRef.current.delete(path!);
    }

    setEditPostFiles(current =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const createPost = async () => {
    if (
      !userId ||
      (!newPostContent.trim() && postFiles.length === 0)
    ) {
      return;
    }
    setPostError("");

    const { error } = await supabase.from("course_posts").insert({
      course_id: courseId,
      author_id: userId,
      author_name: authorName,
      content: newPostContent.trim(),
      attachments: postFiles,
    });

    if (error) {
      setPostError(`Failed to create post: ${error.message}`);
      return;
    }

    setNewPostContent("");
    draftPostPathsRef.current.clear();
    setPostFiles([]);
    await fetchPosts();
  };

  const saveEditedPost = async () => {
    if (
      !editingPostId ||
      (!editPostContent.trim() && editPostFiles.length === 0)
    ) {
      return;
    }
    setPostError("");

    const { error } = await supabase
      .from("course_posts")
      .update({
        content: editPostContent,
        attachments: editPostFiles,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingPostId);

    if (error) {
      setPostError(`Failed to update post: ${error.message}`);
      return;
    }

    const retainedPaths = new Set(
      editPostFiles
        .map(getCourseContentStoragePath)
        .filter((path): path is string => Boolean(path)),
    );
    const removedOriginalPaths = editPostOriginalFilesRef.current
      .map(getCourseContentStoragePath)
      .filter(
        (path): path is string =>
          path !== null && !retainedPaths.has(path),
      );
    const cleanupError = await removeCourseContentPaths(removedOriginalPaths);

    editPostNewPathsRef.current.clear();
    editPostOriginalFilesRef.current = [];
    setEditingPostId(null);
    await fetchPosts();
    if (cleanupError) {
      setPostError(
        `Post updated, but an old attachment could not be removed: ${cleanupError.message}`,
      );
    }
  };

  const deletePost = async (
    postId: string,
    attachments: CoursePostFile[],
  ) => {
    if (
      !(await confirmAction({
        title: "Delete post?",
        description: "This course post and its attachments will be permanently deleted.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) return;
    setPostError("");

    const { error } = await supabase
      .from("course_posts")
      .delete()
      .eq("id", postId);
    if (error) {
      setPostError(`Failed to delete post: ${error.message}`);
      return;
    }

    const cleanupError = await removeCourseContentPaths(
      attachments.map(getCourseContentStoragePath),
    );
    if (cleanupError) {
      setPostError(
        `Post deleted, but an attachment could not be removed: ${cleanupError.message}`,
      );
    }
    setPosts(current => current.filter(post => post.id !== postId));
  };

  const startEditingPost = async (post: CoursePost) => {
    if (editPostNewPathsRef.current.size > 0) {
      await removeCourseContentPaths([...editPostNewPathsRef.current]);
      editPostNewPathsRef.current.clear();
    }

    setEditingPostId(post.id);
    setEditPostContent(post.content);
    setEditPostFiles(post.attachments || []);
    editPostOriginalFilesRef.current = post.attachments || [];
    setPostError("");
  };

  const cancelEditingPost = async () => {
    const cleanupError = await removeCourseContentPaths([
      ...editPostNewPathsRef.current,
    ]);
    if (cleanupError) {
      setPostError(
        `Failed to clean up the new attachment: ${cleanupError.message}`,
      );
      return;
    }

    editPostNewPathsRef.current.clear();
    editPostOriginalFilesRef.current = [];
    setEditingPostId(null);
    setEditPostContent("");
    setEditPostFiles([]);
  };

  const handlePostChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
    isEditing = false,
  ) => {
    const value = event.target.value;
    if (isEditing) setEditPostContent(value);
    else setNewPostContent(value);

    const cursorPosition = event.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      setMentionSearch(match[1].toLowerCase());
      setShowMentionDropdown(true);
      setMentionCursorIndex(match.index || 0);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (name: string) => {
    const isEditing = editingPostId !== null;
    const content = isEditing ? editPostContent : newPostContent;
    const before = content.substring(0, mentionCursorIndex);
    const after = content.substring(
      mentionCursorIndex + mentionSearch.length + 1,
    );
    const nextContent = `${before}@${name} ${after}`;

    if (isEditing) setEditPostContent(nextContent);
    else setNewPostContent(nextContent);
    setShowMentionDropdown(false);
  };

  const filteredMentions = useMemo<MentionPerson[]>(
    () => [
      {
        id: "everyone",
        name: "everyone",
        full_name: "everyone",
        role: "all",
        avatar_url: null,
      },
      ...people.filter(person =>
        person.full_name
          ?.toLowerCase()
          .includes(mentionSearch.toLowerCase()),
      ),
    ],
    [mentionSearch, people],
  );

  return {
    cancelEditingPost,
    createPost,
    deletePost,
    editPostContent,
    editPostFiles,
    editingPostId,
    filteredMentions,
    handlePostChange,
    insertMention,
    isPostUploading,
    newPostContent,
    postError,
    postFiles,
    posts,
    removeDraftFile,
    removeEditFile,
    saveEditedPost,
    setShowMentionDropdown,
    showMentionDropdown,
    startEditingPost,
    uploadDraftFiles: (event: ChangeEvent<HTMLInputElement>) =>
      uploadPostFiles(event, "draft"),
    uploadEditFiles: (event: ChangeEvent<HTMLInputElement>) =>
      uploadPostFiles(event, "edit"),
  };
}
