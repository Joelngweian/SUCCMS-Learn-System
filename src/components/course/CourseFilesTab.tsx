import type { ChangeEvent, MouseEvent, ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TabsContent } from "@/components/ui/tabs";
import type { CourseMaterial } from "./coursePageTypes";

type CourseFilesTabProps = {
  userId?: string;
  profileRole?: string;
  isLecturer: boolean;
  folderPath: Array<{ id: string | null; name: string }>;
  materials: CourseMaterial[];
  fileManagerError: string;
  isUploading: boolean;
  onNavigateFolder: (index: number, folderId: string | null) => void;
  onOpenNewFolder: () => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileClick: (file: CourseMaterial) => void;
  onDeleteMaterial: (event: MouseEvent, materialId: string) => void;
};

const getFileIcon = (type: string): ReactNode => {
  if (type === "folder") {
    return <Folder className="h-6 w-6 text-blue-500 fill-blue-100" />;
  }
  if (type.includes("image")) return <FileImage className="h-6 w-6 text-purple-500" />;
  if (type.includes("pdf")) return <FileText className="h-6 w-6 text-red-500" />;
  if (type.includes("sheet") || type.includes("excel")) {
    return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
  }
  if (type.includes("code") || type.includes("tsx") || type.includes("java")) {
    return <FileCode className="h-6 w-6 text-yellow-500" />;
  }
  return <File className="h-6 w-6 text-gray-500" />;
};

export function CourseFilesTab({
  userId,
  profileRole,
  isLecturer,
  folderPath,
  materials,
  fileManagerError,
  isUploading,
  onNavigateFolder,
  onOpenNewFolder,
  onFileUpload,
  onFileClick,
  onDeleteMaterial,
}: CourseFilesTabProps) {
  return (
    <TabsContent value="files" className="space-y-4 flex-1">
      <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-sm">
          {folderPath.map((folder, index) => (
            <div key={`${folder.id}-${index}`} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
              )}
              <button
                onClick={() => onNavigateFolder(index, folder.id)}
                className={`hover:underline ${
                  index === folderPath.length - 1
                    ? "font-bold"
                    : "text-muted-foreground"
                }`}
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>

        {userId && (
          <div className="flex w-full shrink-0 gap-2 sm:w-auto sm:flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="flex-1 justify-center rounded-md border-0 bg-indigo-100 px-4 font-semibold text-indigo-900 shadow-sm hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800 sm:flex-none"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New
                  <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 shadow-xl">
                <DropdownMenuItem
                  onClick={onOpenNewFolder}
                  className="cursor-pointer font-medium py-2"
                >
                  <Folder className="h-4 w-4 mr-3 text-yellow-500 fill-yellow-500" />
                  Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer py-2"
                  onClick={() => notify.info("Word document creation is not available yet.")}
                >
                  <FileText className="h-4 w-4 mr-3 text-blue-500 fill-blue-500" />
                  Word document
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer py-2"
                  onClick={() => notify.info("Excel workbook creation is not available yet.")}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-3 text-green-500 fill-green-500" />
                  Excel workbook
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer py-2"
                  onClick={() => notify.info("PowerPoint creation is not available yet.")}
                >
                  <FileImage className="h-4 w-4 mr-3 text-orange-500 fill-orange-500" />
                  PowerPoint presentation
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer py-2"
                  onClick={() => notify.info("OneNote creation is not available yet.")}
                >
                  <File className="h-4 w-4 mr-3 text-purple-500 fill-purple-500" />
                  OneNote notebook
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="relative flex flex-1 items-center sm:flex-none">
              <input
                type="file"
                id="file-upload-input"
                className="hidden"
                multiple
                onChange={onFileUpload}
                disabled={isUploading}
              />
              <input
                type="file"
                id="folder-upload-input"
                // @ts-expect-error Directory selection is supported by Chromium.
                webkitdirectory="true"
                directory="true"
                className="hidden"
                multiple
                onChange={onFileUpload}
                disabled={isUploading}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 sm:w-auto"
                    disabled={isUploading}
                  >
                    {isUploading
                      ? <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      : <Upload className="h-4 w-4 mr-2" />}
                    Upload
                    <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40 shadow-xl">
                  <DropdownMenuItem
                    className="cursor-pointer py-2"
                    onClick={() => document.getElementById("file-upload-input")?.click()}
                  >
                    <File className="h-4 w-4 mr-3" /> Files
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer py-2"
                    onClick={() => document.getElementById("folder-upload-input")?.click()}
                  >
                    <Folder className="h-4 w-4 mr-3" /> Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>

      {fileManagerError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          {fileManagerError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {materials.map(file => (
          <Card
            key={file.id}
            className="group relative hover:shadow-md cursor-pointer transition-all hover:bg-accent/5"
            onClick={() => onFileClick(file)}
          >
            {(isLecturer || profileRole === "admin" || file.created_by === userId) && (
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 z-10 shadow-sm bg-background/90 backdrop-blur-sm"
                onClick={event => onDeleteMaterial(event, file.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <CardContent className="p-4 flex flex-col items-center text-center gap-3 h-full justify-center">
              {getFileIcon(file.file_type || "")}
              <span className="text-sm font-medium leading-tight line-clamp-2 break-all px-2">
                {file.title}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </TabsContent>
  );
}
