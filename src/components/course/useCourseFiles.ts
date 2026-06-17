import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import { supabase } from "@/lib/supabase";
import { confirmAction } from "@/lib/confirm";
import type { CourseMaterial } from "./coursePageTypes";
import {
  getErrorMessage,
  removeCourseContentPaths,
} from "./courseStorage";

export type CourseFolderPathItem = {
  id: string | null;
  name: string;
};

const COURSE_MATERIAL_SELECT =
  "id, course_id, title, description, file_url, file_type, uploaded_by, uploaded_at, downloads_count, ms_drive_id, ms_drive_item_id, ms_web_url, ms_edit_url, ms_last_synced_at, parent_id, file_path, size, created_by";

export function useCourseFiles({
  courseId,
  userId,
}: {
  courseId: string;
  userId?: string | null;
}) {
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<CourseFolderPathItem[]>([
    { id: null, name: "Root" },
  ]);
  const [fileManagerError, setFileManagerError] = useState("");
  const [isFileUploading, setIsFileUploading] = useState(false);

  const fetchMaterials = useCallback(async () => {
    let query = supabase
      .from("course_materials")
      .select(COURSE_MATERIAL_SELECT)
      .eq("course_id", courseId)
      .order("file_type", { ascending: false })
      .order("title", { ascending: true });

    query = currentFolderId
      ? query.eq("parent_id", currentFolderId)
      : query.is("parent_id", null);

    const { data, error } = await query;
    if (error) {
      console.error("Failed to load course files:", error);
      setFileManagerError(`Failed to load files: ${error.message}`);
      return;
    }

    setFileManagerError("");
    setMaterials(data || []);
  }, [courseId, currentFolderId]);

  useEffect(() => {
    setCurrentFolderId(null);
    setFolderPath([{ id: null, name: "Root" }]);
  }, [courseId]);

  useEffect(() => {
    void fetchMaterials();
  }, [fetchMaterials]);

  const navigateFolder = (index: number, folderId: string | null) => {
    setFolderPath(current => current.slice(0, index + 1));
    setCurrentFolderId(folderId);
  };

  const createFolder = async (folderName: string) => {
    if (!folderName.trim() || !userId) return false;
    setFileManagerError("");

    const { error } = await supabase.from("course_materials").insert({
      course_id: courseId,
      parent_id: currentFolderId,
      title: folderName.trim(),
      file_type: "folder",
      created_by: userId,
    });

    if (error) {
      setFileManagerError(`Failed to create folder: ${error.message}`);
      return false;
    }

    await fetchMaterials();
    return true;
  };

  const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    if (!userId) {
      setFileManagerError("You must be signed in to upload files.");
      event.target.value = "";
      return;
    }

    setFileManagerError("");
    setIsFileUploading(true);
    const files = Array.from(event.target.files);
    const folderCache = new Map<string, string | null>();
    folderCache.set("", currentFolderId);

    try {
      for (const file of files) {
        let targetFolderId = currentFolderId;

        if (file.webkitRelativePath) {
          const folderParts = file.webkitRelativePath.split("/");
          folderParts.pop();
          let currentPath = "";
          let parentId = currentFolderId;

          for (const folderName of folderParts) {
            currentPath = currentPath
              ? `${currentPath}/${folderName}`
              : folderName;

            if (folderCache.has(currentPath)) {
              parentId = folderCache.get(currentPath) ?? null;
              continue;
            }

            const { data, error } = await supabase
              .from("course_materials")
              .insert({
                course_id: courseId,
                parent_id: parentId,
                title: folderName,
                file_type: "folder",
                created_by: userId,
              })
              .select("id")
              .single();

            if (error) throw error;
            folderCache.set(currentPath, data.id);
            parentId = data.id;
          }
          targetFolderId = parentId;
        }

        const extension = file.name.split(".").pop() || "unknown";
        const filePath = `${courseId}/materials/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("course_content")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from("course_materials")
          .insert({
            course_id: courseId,
            parent_id: targetFolderId,
            title: file.name,
            file_path: filePath,
            file_type: extension,
            size: file.size,
            created_by: userId,
          });

        if (insertError) {
          await supabase.storage.from("course_content").remove([filePath]);
          throw insertError;
        }
      }

      await fetchMaterials();
    } catch (error) {
      setFileManagerError(
        `Failed to upload file: ${getErrorMessage(error, "Please try again.")}`,
      );
    } finally {
      setIsFileUploading(false);
      event.target.value = "";
    }
  };

  const deleteMaterial = async (
    event: MouseEvent,
    materialId: string,
  ) => {
    event.stopPropagation();
    if (
      !(await confirmAction({
        title: "Delete this item?",
        description:
          "The selected file or folder and its contents will be permanently deleted.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) return;
    setFileManagerError("");

    try {
      const { data: courseMaterials, error: loadError } = await supabase
        .from("course_materials")
        .select("id, parent_id, file_path")
        .eq("course_id", courseId);
      if (loadError) throw loadError;

      const descendantIds = new Set<string>([materialId]);
      let foundDescendant = true;
      while (foundDescendant) {
        foundDescendant = false;
        for (const material of courseMaterials || []) {
          if (
            material.parent_id &&
            descendantIds.has(material.parent_id) &&
            !descendantIds.has(material.id)
          ) {
            descendantIds.add(material.id);
            foundDescendant = true;
          }
        }
      }

      const storagePaths = (courseMaterials || [])
        .filter(material => descendantIds.has(material.id))
        .map(material => material.file_path)
        .filter((path): path is string => Boolean(path));

      const { error: deleteError } = await supabase
        .from("course_materials")
        .delete()
        .eq("id", materialId);
      if (deleteError) throw deleteError;

      const cleanupError = await removeCourseContentPaths(storagePaths);
      if (cleanupError) {
        setFileManagerError(
          `Item deleted, but a stored file could not be removed: ${cleanupError.message}`,
        );
      }
      await fetchMaterials();
    } catch (error) {
      console.error(error);
      setFileManagerError(
        `Failed to delete item: ${getErrorMessage(error, "Please try again.")}`,
      );
    }
  };

  const openMaterial = (material: CourseMaterial) => {
    if (material.file_type === "folder") {
      setCurrentFolderId(material.id);
      setFolderPath(current => [
        ...current,
        { id: material.id, name: material.title },
      ]);
      return;
    }

    if (material.file_path) {
      const { data } = supabase.storage
        .from("course_content")
        .getPublicUrl(material.file_path);
      window.open(data.publicUrl, "_blank");
    }
  };

  return {
    createFolder,
    deleteMaterial,
    fileManagerError,
    folderPath,
    isFileUploading,
    materials,
    navigateFolder,
    openMaterial,
    setFileManagerError,
    uploadFiles,
  };
}
