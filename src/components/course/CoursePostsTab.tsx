import type { ChangeEvent } from "react";
import { Download, Edit, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  CoursePerson,
  CoursePost,
  CoursePostFile,
  CourseProfileDisplay,
  MentionPerson,
} from "./coursePageTypes";

type CoursePostsTabProps = {
  profile: CourseProfileDisplay | null;
  userId?: string;
  isLecturer: boolean;
  people: CoursePerson[];
  posts: CoursePost[];
  newPostContent: string;
  postFiles: CoursePostFile[];
  postError: string;
  isUploading: boolean;
  showMentionDropdown: boolean;
  filteredMentions: MentionPerson[];
  editingPostId: string | null;
  editPostContent: string;
  editPostFiles: CoursePostFile[];
  onPostChange: (event: ChangeEvent<HTMLTextAreaElement>, editing?: boolean) => void;
  onMentionOpenChange: (open: boolean) => void;
  onInsertMention: (name: string) => void;
  onRemoveDraftFile: (file: CoursePostFile, index: number) => void;
  onPostUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onCreatePost: () => void;
  onRemoveEditFile: (file: CoursePostFile, index: number) => void;
  onEditUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onStartEdit: (post: CoursePost) => void;
  onDeletePost: (postId: string, attachments: CoursePostFile[]) => void;
};

const isImageAttachment = (file: CoursePostFile) =>
  Boolean(
    file.type?.includes("image")
    || file.name?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)
  );

export function CoursePostsTab({
  profile,
  userId,
  isLecturer,
  people,
  posts,
  newPostContent,
  postFiles,
  postError,
  isUploading,
  showMentionDropdown,
  filteredMentions,
  editingPostId,
  editPostContent,
  editPostFiles,
  onPostChange,
  onMentionOpenChange,
  onInsertMention,
  onRemoveDraftFile,
  onPostUpload,
  onCreatePost,
  onRemoveEditFile,
  onEditUpload,
  onCancelEdit,
  onSaveEdit,
  onStartEdit,
  onDeletePost,
}: CoursePostsTabProps) {
  return (
    <TabsContent value="posts" className="space-y-4 flex-1">
      <div className="flex gap-4 p-4 border rounded-lg bg-muted/10 shadow-sm relative">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
          <AvatarFallback>{profile?.full_name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 gap-2 flex flex-col relative">
          <Textarea
            placeholder="Share an announcement..."
            value={newPostContent}
            onChange={onPostChange}
            className="min-h-[80px]"
          />

          <Popover open={showMentionDropdown} onOpenChange={onMentionOpenChange}>
            <PopoverTrigger asChild>
              <div className="absolute top-10 left-0 w-1 h-1" />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="max-h-64 overflow-y-auto">
                {filteredMentions.map(person => (
                  <div
                    key={person.id}
                    className="p-2 hover:bg-muted cursor-pointer flex items-center gap-2"
                    onClick={() =>
                      onInsertMention(
                        person.name || person.full_name || "Unknown User"
                      )
                    }
                  >
                    {person.id !== "everyone" && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={person.avatar_url} />
                        <AvatarFallback>{(person.full_name || "U")[0]}</AvatarFallback>
                      </Avatar>
                    )}
                    <span className="text-sm font-medium">
                      {person.full_name || person.name || "Unknown User"}
                    </span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {postError && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
            >
              {postError}
            </div>
          )}

          {postFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {postFiles.map((file, index) => (
                <div
                  key={`${file.path}-${index}`}
                  className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md text-sm border"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => onRemoveDraftFile(file, index)}
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mt-2">
            <div>
              <input
                type="file"
                id="post-file-upload"
                className="hidden"
                multiple
                onChange={onPostUpload}
                disabled={isUploading}
              />
              <Label
                htmlFor="post-file-upload"
                className="cursor-pointer flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                {isUploading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Paperclip className="h-4 w-4" />}
                <span className="text-sm">Attach files</span>
              </Label>
            </div>
            <Button
              size="sm"
              onClick={onCreatePost}
              disabled={(!newPostContent && postFiles.length === 0) || isUploading}
            >
              Post
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {posts.map(post => {
          const author = people.find(person => person.id === post.author_id);
          const attachments: CoursePostFile[] = post.attachments || [];
          const imageAttachments = attachments.filter(isImageAttachment);
          const fileAttachments = attachments.filter(file => !isImageAttachment(file));

          return (
            <Card key={post.id} className="overflow-hidden">
              <div className="p-4 flex gap-3 relative">
                <Avatar className="h-10 w-10 mt-1 shrink-0 border border-gray-200">
                  <AvatarImage src={author?.avatar_url || undefined} />
                  <AvatarFallback>{post.author_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {editingPostId === post.id ? (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        value={editPostContent}
                        onChange={event => onPostChange(event, true)}
                        className="min-h-[80px]"
                      />
                      {editPostFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {editPostFiles.map((file, index) => (
                            <div
                              key={`${file.path}-${index}`}
                              className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md text-sm border"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{file.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => onRemoveEditFile(file, index)}
                              >
                                <X className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <div>
                          <input
                            type="file"
                            id={`edit-file-${post.id}`}
                            className="hidden"
                            multiple
                            onChange={onEditUpload}
                            disabled={isUploading}
                          />
                          <Label
                            htmlFor={`edit-file-${post.id}`}
                            className="cursor-pointer flex items-center gap-2 text-muted-foreground hover:text-foreground"
                          >
                            {isUploading
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Paperclip className="h-4 w-4" />}
                            <span className="text-sm">Attach files</span>
                          </Label>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={onCancelEdit}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={onSaveEdit}
                            disabled={(!editPostContent && editPostFiles.length === 0) || isUploading}
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-semibold truncate text-gray-900">
                          {post.author_name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(post.created_at).toLocaleString()}
                          </span>
                          {(post.author_id === userId || isLecturer) && (
                            <div className="flex items-center gap-1">
                              {post.author_id === userId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                                  onClick={() => onStartEdit(post)}
                                >
                                  <Edit className="h-3 w-3 mr-1" /> Edit
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                onClick={() => onDeletePost(post.id, attachments)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap break-words text-gray-700">
                        {post.content}
                      </p>

                      {attachments.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {imageAttachments.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {imageAttachments.map((image, index) => (
                                <a
                                  key={`${image.path}-${index}`}
                                  href={image.url || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block relative group overflow-hidden rounded-md border bg-muted"
                                >
                                  <img
                                    src={image.url}
                                    alt={image.name}
                                    className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Download className="text-white h-6 w-6" />
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}

                          {fileAttachments.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {fileAttachments.map((file, index) => (
                                <a
                                  key={`${file.path}-${index}`}
                                  href={file.url || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center p-2 bg-muted/30 border rounded-lg hover:border-blue-300 transition-colors group shadow-sm max-w-full"
                                >
                                  <div className="bg-blue-50 p-1.5 rounded mr-2 text-blue-600 shrink-0">
                                    <Paperclip className="h-4 w-4" />
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0 mr-2">
                                    <span className="text-sm font-medium truncate text-gray-700">
                                      {file.name}
                                    </span>
                                    {file.size && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {(file.size / 1024).toFixed(1)} KB
                                      </span>
                                    )}
                                  </div>
                                  <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-500 shrink-0" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </TabsContent>
  );
}
