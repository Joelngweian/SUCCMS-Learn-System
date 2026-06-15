import { useAuth } from "@/contexts/AuthContext";
import { CoursePostsTab } from "./CoursePostsTab";
import { useCoursePeople } from "./useCoursePeople";
import { useCoursePosts } from "./useCoursePosts";

export function CoursePostsSection({
  courseId,
  isLecturer,
}: {
  courseId: string;
  isLecturer: boolean;
}) {
  const { profile, user } = useAuth();
  const { people } = useCoursePeople(courseId);
  const posts = useCoursePosts({
    authorName: profile?.full_name || "Unknown",
    courseId,
    people,
    userId: user?.id,
  });

  return (
    <CoursePostsTab
      profile={profile}
      userId={user?.id}
      isLecturer={isLecturer}
      people={people}
      posts={posts.posts}
      newPostContent={posts.newPostContent}
      postFiles={posts.postFiles}
      postError={posts.postError}
      isUploading={posts.isPostUploading}
      showMentionDropdown={posts.showMentionDropdown}
      filteredMentions={posts.filteredMentions}
      editingPostId={posts.editingPostId}
      editPostContent={posts.editPostContent}
      editPostFiles={posts.editPostFiles}
      onPostChange={posts.handlePostChange}
      onMentionOpenChange={posts.setShowMentionDropdown}
      onInsertMention={posts.insertMention}
      onRemoveDraftFile={posts.removeDraftFile}
      onPostUpload={posts.uploadDraftFiles}
      onCreatePost={posts.createPost}
      onRemoveEditFile={posts.removeEditFile}
      onEditUpload={posts.uploadEditFiles}
      onCancelEdit={posts.cancelEditingPost}
      onSaveEdit={posts.saveEditedPost}
      onStartEdit={posts.startEditingPost}
      onDeletePost={posts.deletePost}
    />
  );
}
