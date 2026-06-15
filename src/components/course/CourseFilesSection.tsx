import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CourseFilesTab } from "./CourseFilesTab";
import { NewFolderDialog } from "./CourseDialogs";
import { useCourseFiles } from "./useCourseFiles";

export function CourseFilesSection({
  courseId,
  isLecturer,
}: {
  courseId: string;
  isLecturer: boolean;
}) {
  const { profile, user } = useAuth();
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const files = useCourseFiles({ courseId, userId: user?.id });

  const handleCreateFolder = async () => {
    const created = await files.createFolder(newFolderName);
    if (!created) return;
    setNewFolderName("");
    setShowNewFolderDialog(false);
  };

  return (
    <>
      <CourseFilesTab
        userId={user?.id}
        profileRole={profile?.role}
        isLecturer={isLecturer}
        folderPath={files.folderPath}
        materials={files.materials}
        fileManagerError={files.fileManagerError}
        isUploading={files.isFileUploading}
        onNavigateFolder={files.navigateFolder}
        onOpenNewFolder={() => {
          files.setFileManagerError("");
          setShowNewFolderDialog(true);
        }}
        onFileUpload={files.uploadFiles}
        onFileClick={files.openMaterial}
        onDeleteMaterial={files.deleteMaterial}
      />

      <NewFolderDialog
        open={showNewFolderDialog}
        folderName={newFolderName}
        error={files.fileManagerError}
        onOpenChange={setShowNewFolderDialog}
        onFolderNameChange={setNewFolderName}
        onCreate={() => void handleCreateFolder()}
      />
    </>
  );
}
