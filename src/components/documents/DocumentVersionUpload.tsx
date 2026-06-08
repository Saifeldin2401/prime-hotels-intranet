import { ListSkeleton } from "@/components/loading/ListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import {
    ArrowLeftRight,
    Check,
    ChevronDown,
    ChevronUp,
    Clock,
    Download,
    FileText,
    History,
    MessageSquare,
    RotateCcw,
    Upload,
    User,
    X
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useDropzone } from "react-dropzone";

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  changeNotes?: string;
  isCurrent: boolean;
}

interface DocumentVersionUploadProps {
  versions: DocumentVersion[];
  isLoading?: boolean;
  currentVersionId: string;
  onUpload?: (file: File, changeNotes: string) => void;
  onRestore?: (versionId: string) => void;
  onDownload?: (version: DocumentVersion) => void;
  onCompare?: (versionId1: string, versionId2: string) => void;
  /** react-dropzone v14+ accept object: keys = MIME types, values = allowed extensions */
  acceptedFileTypes?: Record<string, string[]>;
  maxFileSize?: number; // in bytes
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) {
    return <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-600 font-bold text-sm">PDF</div>;
  }
  if (fileType.includes("word") || fileType.includes("doc")) {
    return <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">DOC</div>;
  }
  if (fileType.includes("excel") || fileType.includes("sheet") || fileType.includes("xls")) {
    return <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-bold text-sm">XLS</div>;
  }
  return <FileText className="w-12 h-12 text-gray-400" />;
}

export function DocumentVersionUpload({
  versions,
  isLoading,
  currentVersionId,
  onUpload,
  onRestore,
  onDownload,
  onCompare,
  // react-dropzone v14+ requires MIME type keys, not file extensions
  acceptedFileTypes = {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  },
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  className,
}: DocumentVersionUploadProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [changeNotes, setChangeNotes] = React.useState("");
  const [expandedVersions, setExpandedVersions] = React.useState<Set<string>>(new Set());
  const [compareVersion1, setCompareVersion1] = React.useState<string>("");
  const [compareVersion2, setCompareVersion2] = React.useState<string>("");
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const { t } = useTranslation();

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    // acceptedFileTypes is already in the MIME-type keyed format react-dropzone v14+ expects
    accept: acceptedFileTypes,
    maxSize: maxFileSize,
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
      }
    },
  });

  const sortedVersions = React.useMemo(() => {
    return [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  }, [versions]);

  const currentVersion = sortedVersions.find((v) => v.id === currentVersionId);

  const toggleExpand = (versionId: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    await onUpload?.(selectedFile, changeNotes);

    clearInterval(progressInterval);
    setUploadProgress(100);
    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
      setChangeNotes("");
      setUploadDialogOpen(false);
    }, 500);
  };

  const handleCompare = () => {
    if (compareVersion1 && compareVersion2) {
      onCompare?.(compareVersion1, compareVersion2);
      setCompareDialogOpen(false);
      setCompareVersion1("");
      setCompareVersion2("");
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Version History</h3>
        </div>
        <ListSkeleton items={3} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Version History</h3>
          <Badge variant="secondary">{versions.length} version{versions.length !== 1 ? "s" : ""}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {versions.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareDialogOpen(true)}
            >
              <ArrowLeftRight className="w-4 h-4 mr-1.5" />
              Compare
            </Button>
          )}
          <Button
            size="sm"
            className="bg-[#0B1C3E] hover:bg-[#1a3a6e]"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Upload New Version
          </Button>
        </div>
      </div>

      {/* Current Version Info */}
      {currentVersion && (
        <div className="p-4 bg-[#0B1C3E]/5 border border-[#0B1C3E]/20 rounded-lg">
          <div className="flex items-center gap-4">
            {getFileIcon(currentVersion.fileType)}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Current Version</span>
                <Badge className="bg-[#0B1C3E] text-white">
                  v{currentVersion.versionNumber}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {currentVersion.fileName} • {formatFileSize(currentVersion.fileSize)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload?.(currentVersion)}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download
            </Button>
          </div>
        </div>
      )}

      {/* Version List */}
      {versions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No Versions Yet"
          description="Upload the first version of this document to get started."
          action={{
            label: "Upload First Version",
            onClick: () => setUploadDialogOpen(true),
          }}
          className="min-h-[250px]"
        />
      ) : (
        <ScrollArea className="h-[350px]">
          <div className="space-y-3">
            {sortedVersions.map((version) => {
              const isCurrent = version.id === currentVersionId;
              const isExpanded = expandedVersions.has(version.id);

              return (
                <div
                  key={version.id}
                  className={cn(
                    "group border rounded-lg transition-all",
                    isCurrent
                      ? "border-[#0B1C3E]/30 bg-[#0B1C3E]/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  {/* Header Row */}
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpand(version.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleExpand(version.id)
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                        isCurrent
                          ? "bg-[#0B1C3E] text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      v{version.versionNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{version.fileName}</span>
                        {isCurrent && (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{formatFileSize(version.fileSize)}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(version.uploadedAt), { addSuffix: true })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {version.uploadedBy.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload?.(version);
                        }}
                        aria-label={t('accessibility.download_version', 'Download version')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {!isCurrent && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => onRestore?.(version.id)}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Restore This Version
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t">
                      <div className="pt-3 space-y-3">
                        {/* Uploader Info */}
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={version.uploadedBy.avatar} />
                            <AvatarFallback className="text-xs bg-[#0B1C3E] text-white">
                              {version.uploadedBy.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{version.uploadedBy.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded on {format(new Date(version.uploadedAt), "PPP")} at{" "}
                              {format(new Date(version.uploadedAt), "p")}
                            </p>
                          </div>
                        </div>

                        {/* Change Notes */}
                        {version.changeNotes && (
                          <div className="p-3 bg-muted/50 rounded-md">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              Change Notes
                            </div>
                            <p className="text-sm">{version.changeNotes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        {!isCurrent && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => onRestore?.(version.id)}
                            >
                              <RotateCcw className="w-4 h-4 mr-1.5" />
                              Restore This Version
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => onDownload?.(version)}
                            >
                              <Download className="w-4 h-4 mr-1.5" />
                              Download
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload New Version</DialogTitle>
            <DialogDescription>
              Upload a new version of this document. The current version will be preserved in history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Dropzone */}
            {!selectedFile ? (
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragActive
                    ? "border-[#0B1C3E] bg-[#0B1C3E]/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {isDragActive ? "Drop the file here" : "Drag & drop a file here"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse. Max size: {formatFileSize(maxFileSize)}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                {getFileIcon(selectedFile.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                  aria-label={t('accessibility.remove_file', 'Remove file')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {fileRejections.length > 0 && (
              <div className="text-sm text-destructive">
                {fileRejections[0].errors[0].message}
              </div>
            )}

            {/* Change Notes */}
            <div className="space-y-2">
              <Label htmlFor="changeNotes">Change Notes (Optional)</Label>
              <Textarea
                id="changeNotes"
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="Describe what changed in this version..."
                rows={3}
                disabled={isUploading}
              />
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0B1C3E] transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="bg-[#0B1C3E] hover:bg-[#1a3a6e]"
            >
              {isUploading ? (
                <span className="animate-spin mr-2">◌</span>
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compare Versions</DialogTitle>
            <DialogDescription>
              Select two versions to compare side by side.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Version 1</Label>
              <Select value={compareVersion1} onValueChange={setCompareVersion1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first version" />
                </SelectTrigger>
                <SelectContent>
                  {sortedVersions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.versionNumber} - {format(new Date(v.uploadedAt), "PP")}
                      {v.id === currentVersionId && " (Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Version 2</Label>
              <Select value={compareVersion2} onValueChange={setCompareVersion2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second version" />
                </SelectTrigger>
                <SelectContent>
                  {sortedVersions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.versionNumber} - {format(new Date(v.uploadedAt), "PP")}
                      {v.id === currentVersionId && " (Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompareDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCompare}
              disabled={!compareVersion1 || !compareVersion2 || compareVersion1 === compareVersion2}
              className="bg-[#0B1C3E] hover:bg-[#1a3a6e]"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Compare
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
