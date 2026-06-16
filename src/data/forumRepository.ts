import { supabase } from "@/lib/supabase";
import type { Database, Json } from "@/lib/database.types";

type ForumThreadInsert =
  Database["public"]["Tables"]["forum_threads"]["Insert"];
type ForumThreadUpdate =
  Database["public"]["Tables"]["forum_threads"]["Update"];
type ForumReplyInsert =
  Database["public"]["Tables"]["forum_replies"]["Insert"];
type ForumReactionInsert =
  Database["public"]["Tables"]["forum_reactions"]["Insert"];
type ForumReplyReactionInsert =
  Database["public"]["Tables"]["forum_reply_reactions"]["Insert"];

export const FORUM_REPLY_SELECT = `
  *,
  author:user_profiles!author_id(id, full_name, avatar_url, role),
  reactions:forum_reply_reactions(type)
`;

export const FORUM_THREAD_SELECT = `
  *,
  author:user_profiles!author_id(id, full_name, avatar_url, role),
  replies:forum_replies(count),
  reactions:forum_reactions(type)
`;

export const FORUM_THREAD_DETAIL_SELECT =
  "*, author:user_profiles!author_id(id, full_name, avatar_url, role)";

export type ForumReplySelectRow = NonNullable<
  Awaited<ReturnType<typeof createForumReply>>
>;

export async function uploadForumImage({
  courseId,
  file,
  userId,
}: {
  courseId: string | null;
  file: File;
  userId: string;
}) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt || "file"}`;
  const filePath = courseId
    ? `${courseId}/${userId}/${fileName}`
    : `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from("forum-images")
    .upload(filePath, file);

  if (error) throw error;

  return supabase.storage
    .from("forum-images")
    .getPublicUrl(filePath).data.publicUrl;
}

export async function createForumThread(payload: ForumThreadInsert) {
  const { error } = await supabase.from("forum_threads").insert(payload);
  if (error) throw error;
}

export async function updateForumThread({
  authorId,
  threadId,
  updates,
}: {
  authorId: string;
  threadId: string;
  updates: ForumThreadUpdate;
}) {
  const { error } = await supabase
    .from("forum_threads")
    .update(updates)
    .eq("id", threadId)
    .eq("author_id", authorId);

  if (error) throw error;
}

export async function deleteForumThread({
  authorId,
  threadId,
}: {
  authorId: string;
  threadId: string;
}) {
  const { error } = await supabase
    .from("forum_threads")
    .delete()
    .eq("id", threadId)
    .eq("author_id", authorId);

  if (error) throw error;
}

export async function createForumReply(payload: ForumReplyInsert) {
  const { data, error } = await supabase
    .from("forum_replies")
    .insert(payload)
    .select(FORUM_REPLY_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateForumReply({
  authorId,
  content,
  replyId,
}: {
  authorId: string;
  content: string;
  replyId: string;
}) {
  const { error } = await supabase
    .from("forum_replies")
    .update({ content })
    .eq("id", replyId)
    .eq("author_id", authorId);

  if (error) throw error;
}

export async function deleteForumReply({
  authorId,
  replyId,
}: {
  authorId: string;
  replyId: string;
}) {
  const { error } = await supabase
    .from("forum_replies")
    .delete()
    .eq("id", replyId)
    .eq("author_id", authorId);

  if (error) throw error;
}

export async function getForumReplyCounts({
  parentId,
  threadId,
}: {
  parentId: string | null;
  threadId: string;
}) {
  const [totalReplyResult, rootReplyResult, parentReplyResult] =
    await Promise.all([
      supabase
        .from("forum_replies")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", threadId),
      supabase
        .from("forum_replies")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", threadId)
        .is("parent_id", null),
      parentId
        ? supabase
            .from("forum_replies")
            .select("id", { count: "exact", head: true })
            .eq("parent_id", parentId)
        : Promise.resolve({ count: null, error: null }),
    ]);

  if (totalReplyResult.error) throw totalReplyResult.error;
  if (rootReplyResult.error) throw rootReplyResult.error;
  if (parentReplyResult.error) throw parentReplyResult.error;

  return {
    parentReplyCount: parentReplyResult.count || 0,
    rootReplyCount: rootReplyResult.count || 0,
    totalReplyCount: totalReplyResult.count || 0,
  };
}

export async function getThreadReplyCount(threadId: string) {
  const { count, error } = await supabase
    .from("forum_replies")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", threadId);

  if (error) throw error;
  return count || 0;
}

export async function getRootCommentPage({
  start,
  threadId,
}: {
  start: number;
  threadId: string;
}) {
  const { data, error, count } = await supabase
    .from("forum_replies")
    .select(FORUM_REPLY_SELECT, { count: "exact" })
    .eq("thread_id", threadId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .range(start, start + 9);

  if (error) throw error;

  return {
    rootCount: count || 0,
    rows: data || [],
  };
}

export async function getChildReplyPage({
  parentId,
  start,
  threadId,
}: {
  parentId: string;
  start: number;
  threadId: string;
}) {
  const { data, error, count } = await supabase
    .from("forum_replies")
    .select(FORUM_REPLY_SELECT, { count: "exact" })
    .eq("thread_id", threadId)
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
    .range(start, start + 4);

  if (error) throw error;

  return {
    childCount: count || 0,
    rows: data || [],
  };
}

export async function getReplyChildCounts(replyIds: string[]) {
  if (replyIds.length === 0) return {};

  const { data, error } = await supabase
    .from("forum_replies")
    .select("parent_id")
    .in("parent_id", replyIds);

  if (error) throw error;

  return (data || []).reduce<Record<string, number>>((counts, row) => {
    if (row.parent_id) {
      counts[row.parent_id] = (counts[row.parent_id] || 0) + 1;
    }
    return counts;
  }, {});
}

export async function getForumThreadDetail(threadId: string) {
  const { data, error } = await supabase
    .from("forum_threads")
    .select(FORUM_THREAD_DETAIL_SELECT)
    .eq("id", threadId)
    .single();

  if (error) throw error;
  return data;
}

export async function getForumThreadsPage({
  courseIds,
  filter,
  search,
  start,
}: {
  courseIds: string[];
  filter: string;
  search: string;
  start: number;
}) {
  let query = supabase
    .from("forum_threads")
    .select(FORUM_THREAD_SELECT)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + 12);

  if (filter === "general") {
    query = query.is("course_id", null);
  } else if (filter !== "all") {
    query = query.eq("course_id", filter);
  } else if (courseIds.length > 0) {
    query = query.or(
      `course_id.in.(${courseIds.join(",")}),course_id.is.null`,
    );
  } else {
    query = query.is("course_id", null);
  }

  const normalizedSearch = search.replace(/[,%_()]/g, " ").trim();
  if (normalizedSearch) {
    query = query.or(
      `title.ilike.%${normalizedSearch}%,content.ilike.%${normalizedSearch}%,category.ilike.%${normalizedSearch}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getUserForumReactions(userId: string) {
  const [threadResult, replyResult] = await Promise.all([
    supabase
      .from("forum_reactions")
      .select("thread_id, type")
      .eq("user_id", userId),
    supabase
      .from("forum_reply_reactions")
      .select("reply_id, type")
      .eq("user_id", userId),
  ]);

  if (threadResult.error) throw threadResult.error;
  if (replyResult.error) throw replyResult.error;

  return {
    replyReactions: Object.fromEntries(
      (replyResult.data || []).map(reaction => [
        reaction.reply_id,
        reaction.type,
      ]),
    ),
    threadReactions: Object.fromEntries(
      (threadResult.data || []).map(reaction => [
        reaction.thread_id,
        reaction.type,
      ]),
    ),
  };
}

export async function setForumReaction({
  currentType,
  isThread,
  nextType,
  targetId,
  userId,
}: {
  currentType?: string;
  isThread: boolean;
  nextType?: string;
  targetId: string;
  userId: string;
}) {
  if (isThread) {
    if (currentType) {
      const { error } = await supabase
        .from("forum_reactions")
        .delete()
        .eq("thread_id", targetId)
        .eq("user_id", userId);
      if (error) throw error;
    }

    if (nextType) {
      const payload: ForumReactionInsert = {
        thread_id: targetId,
        type: nextType,
        user_id: userId,
      };
      const { error } = await supabase.from("forum_reactions").insert(payload);
      if (error) throw error;
    }
    return;
  }

  if (currentType) {
    const { error } = await supabase
      .from("forum_reply_reactions")
      .delete()
      .eq("reply_id", targetId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  if (nextType) {
    const payload: ForumReplyReactionInsert = {
      reply_id: targetId,
      type: nextType,
      user_id: userId,
    };
    const { error } = await supabase
      .from("forum_reply_reactions")
      .insert(payload);
    if (error) throw error;
  }
}

export const toForumImagesJson = (images: string[]): Json => images;
