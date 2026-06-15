import type { ForumReaction, ForumReply } from "./forumTypes";

export const findReplyNode = (
  nodes: ForumReply[],
  replyId: string,
): ForumReply | null => {
  for (const node of nodes) {
    if (node.id === replyId) return node;
    const childMatch = findReplyNode(node.children, replyId);
    if (childMatch) return childMatch;
  }
  return null;
};

export const updateReplyTreeNode = (
  nodes: ForumReply[],
  replyId: string,
  updater: (node: ForumReply) => ForumReply,
): ForumReply[] =>
  nodes.map((node) =>
    node.id === replyId
      ? updater(node)
      : {
          ...node,
          children: updateReplyTreeNode(node.children, replyId, updater),
        },
  );

export const removeReplyTreeNode = (
  nodes: ForumReply[],
  replyId: string,
): ForumReply[] =>
  nodes
    .filter((node) => node.id !== replyId)
    .map((node) => ({
      ...node,
      children: removeReplyTreeNode(node.children, replyId),
    }));

export const updateReplyTreeContent = (
  nodes: ForumReply[],
  replyId: string,
  content: string,
): ForumReply[] =>
  updateReplyTreeNode(nodes, replyId, (node) => ({ ...node, content }));

export const applyReactionDelta = (
  reactions: ForumReaction[],
  previousType?: string,
  nextType?: string,
): ForumReaction[] => {
  const next = [...reactions];
  if (previousType) {
    const removeIndex = next.findIndex(
      (reaction) => reaction.type === previousType,
    );
    if (removeIndex >= 0) next.splice(removeIndex, 1);
  }
  if (nextType) next.push({ type: nextType });
  return next;
};

export const updateReplyTreeReaction = (
  nodes: ForumReply[],
  replyId: string,
  previousType?: string,
  nextType?: string,
): ForumReply[] =>
  updateReplyTreeNode(nodes, replyId, (node) => ({
    ...node,
    reactions: applyReactionDelta(
      node.reactions ?? [],
      previousType,
      nextType,
    ),
  }));

export const countReplyTree = (nodes: ForumReply[]): number =>
  nodes.reduce(
    (count, node) => count + 1 + countReplyTree(node.children),
    0,
  );
