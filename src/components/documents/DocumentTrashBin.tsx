import * as React from "react";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Grid3X3,
  List,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Calendar,
  User,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/loading/ListSkeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TrashedDocument {
  id: string;
  title: string;
  fileType: "pdf" | "doc" | "docx" | "xls" | "xlsx" | "image" | "other";
  fileUrl?: string;
  thumbnailUrl?: string;
  deletedAt: string;
  deletedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  originalFolder?: string;
  size?: number;
}

interface DocumentTrashBinProps {
  documents: TrashedDocument[];
  isLoading?: boolean;
  onRestore?: (documentIds: string[]) => void;
  onDeletePermanently?: (documentIds: string[]) => void;
  onEmptyTrash?: () => void;
  currentUserId?: string;
  className?: string;
}

function getFileIcon(type: TrashedDocument["fileType"]) {
  switch (type) {
    case "pdf":
      return <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 font-bold text-xs">PDF</div>;
    case "doc":
    case "docx":
      return <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">DOC</div>;
    case "xls":
    case "xlsx":
      return <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-bold text-xs">XLS</div>;
    case "image":
      return <Image className="w-10 h-10 text-purple-500" />;
    default:
      return <File className="w-10 h-10 text-gray-400" />;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export function DocumentTrashBin({
  documents,
  isLoading,
  onRestore,
  onDeletePermanently,
  onEmptyTrash,
  currentUserId,
  className,
}: DocumentTrashBinProps) {
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [restoreDialogOpen, setRestoreDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(
      selectedIds.length === filteredDocuments.length
        ? []
        : filteredDocuments.map((d) => d.id)
    );
  };

  const handleRestore = async () => {
    setActionLoading(true);
    await onRestore?.(selectedIds);
    setActionLoading(false);
    setSelectedIds([]);
    setRestoreDialogOpen(false);
  };

  const handleDeletePermanently = async () => {
    setActionLoading(true);
    await onDeletePermanently?.(selectedIds);
    setActionLoading(false);
    setSelectedIds([]);
    setDeleteDialogOpen(false);
  };

  const handleEmptyTrash = async () => {
    setActionLoading(true);
    await onEmptyTrash?.();
    setActionLoading(false);
    setEmptyTrashDialogOpen(false);
    setSelectedIds([]);
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Trash</h2>
        </div>
        <ListSkeleton items={5} />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={Trash2}
          title="Trash is Empty"
          description="Deleted documents will appear here for 30 days before being permanently removed."
          className="min-h-[300px]"
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trash2 className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Trash</h2>
          <Badge variant="secondary">{documents.length} items</Badge>
        </div>
        <div className="flex items-center gap-2">
          {documents.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setEmptyTrashDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Empty Trash
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={
              selectedIds.length === filteredDocuments.length &&
              filteredDocuments.length > 0
            }
            onCheckedChange={toggleAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : "Select all"}
          </span>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRestoreDialogOpen(true)}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Restore
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete Permanently
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search trash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          {/* View Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-none rounded-l-md"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-none rounded-r-md"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Document List */}
      <ScrollArea className="h-[400px]">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No documents match your search</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  "group relative p-4 border rounded-lg transition-all cursor-pointer",
                  selectedIds.includes(doc.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                )}
                onClick={() => toggleSelection(doc.id)}
              >
                <Checkbox
                  checked={selectedIds.includes(doc.id)}
                  className="absolute top-2 left-2"
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => toggleSelection(doc.id)}
                />
                <div className="flex flex-col items-center text-center pt-4">
                  {doc.thumbnailUrl ? (
                    <img
                      src={doc.thumbnailUrl}
                      alt={doc.title}
                      className="w-16 h-16 object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className="mb-3">{getFileIcon(doc.fileType)}</div>
                  )}
                  <p className="text-sm font-medium truncate w-full">
                    {doc.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(doc.size)}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(new Date(doc.deletedAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  "group flex items-center gap-3 p-3 border rounded-lg transition-all cursor-pointer",
                  selectedIds.includes(doc.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                )}
                onClick={() => toggleSelection(doc.id)}
              >
                <Checkbox
                  checked={selectedIds.includes(doc.id)}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => toggleSelection(doc.id)}
                />
                {doc.thumbnailUrl ? (
                  <img
                    src={doc.thumbnailUrl}
                    alt={doc.title}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  getFileIcon(doc.fileType)
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{formatFileSize(doc.size)}</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {doc.deletedBy.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDistanceToNow(new Date(doc.deletedAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {doc.originalFolder && (
                      <Badge variant="outline" className="text-[10px]">
                        from {doc.originalFolder}
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIds([doc.id]);
                        setRestoreDialogOpen(true);
                      }}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIds([doc.id]);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Permanently
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Restore Documents
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to restore {selectedIds.length} document
              {selectedIds.length !== 1 ? "s" : ""}? They will be returned to
              their original locations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestore}
              disabled={actionLoading}
              className="bg-[#0B1C3E] hover:bg-[#1a3a6e]"
            >
              {actionLoading ? (
                <span className="animate-spin mr-2">◌</span>
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Permanently
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. {selectedIds.length} document
              {selectedIds.length !== 1 ? "s" : ""} will be permanently
              deleted from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePermanently}
              disabled={actionLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading ? (
                <span className="animate-spin mr-2">◌</span>
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Empty Trash Confirmation */}
      <AlertDialog
        open={emptyTrashDialogOpen}
        onOpenChange={setEmptyTrashDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Empty Trash
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {documents.length} items in the
              trash. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              disabled={actionLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading ? (
                <span className="animate-spin mr-2">◌</span>
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Empty Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
