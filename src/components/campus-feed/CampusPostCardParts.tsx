import { MessageCircle, MoreHorizontal, Pencil, Share2, ThumbsUp, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { CardHeader } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  formatCampusPostTime,
  getCampusMemberInitials,
  getCampusRoleBadgeClass,
} from "./campusFeedPresentation";
import type { CampusPost } from "./campusFeedTypes";

type CampusPostAuthorHeaderProps = {
  isEditing: boolean;
  isOwner: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onOpenProfile: () => void;
  post: CampusPost;
};

export function CampusPostAuthorHeader({
  isEditing,
  isOwner,
  onDelete,
  onEdit,
  onOpenProfile,
  post,
}: CampusPostAuthorHeaderProps) {
  return (
    <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-3 pr-14">
      <button
        type="button"
        onClick={onOpenProfile}
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
            onClick={onOpenProfile}
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
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit post
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 className="h-4 w-4" />
              Delete post
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </CardHeader>
  );
}

type CampusPostEngagementBarProps = {
  onComment: () => void;
  onShare: () => void;
  onToggleReaction: () => void;
  post: CampusPost;
};

export function CampusPostEngagementBar({
  onComment,
  onShare,
  onToggleReaction,
  post,
}: CampusPostEngagementBarProps) {
  return (
    <>
      <div className="mx-4 flex items-center justify-between border-b pb-2 text-xs text-muted-foreground">
        <span>
          {post.reactionCount > 0
            ? `${post.reactionCount} reaction${post.reactionCount === 1 ? "" : "s"}`
            : "Be the first to react"}
        </span>
        <button type="button" onClick={onComment} className="hover:underline">
          {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}
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
          onClick={onToggleReaction}
        >
          <ThumbsUp
            className={`h-4 w-4 ${post.viewerReaction ? "fill-current" : ""}`}
          />
          Like
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground"
          onClick={onComment}
        >
          <MessageCircle className="h-4 w-4" />
          Comment
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground"
          onClick={onShare}
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>
    </>
  );
}
