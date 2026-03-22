import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { DocumentFolder } from "@/hooks/useDocuments";
import { cn } from "@/lib/utils";
import {
    Archive,
    Check,
    Download,
    FileText,
    FolderInput,
    Loader2,
    Share2,
    Tags,
    Trash2,
    X,
} from "lucide-react";
import * as React from "react";
import type { DocumentTag } from "./DocumentTagManager";

interface DocumentBulkActionsBarProps {
  selectedIds: string[];
  totalCount: number;
  documents?: { id: string; title: string }[];
  folders?: DocumentFolder[];
  tags?: DocumentTag[];
  onSelectAll?: () => void;
  onSelectNone?: () => void;
  onMove?: (documentIds: string[], folderId: string | null) => void;
  onTag?: (documentIds: string[], tagIds: string[]) => void;
  onArchive?: (documentIds: string[]) => void;
  onDelete?: (documentIds: string[]) => void;
  onDownload?: (documentIds: string[]) => void;
  onShare?: (documentIds: string[]) => void;
  isProcessing?: boolean;
  className?: string;
}

const EMPTY_DOCUMENTS: Array<{ id: string; title: string }> = [];
const EMPTY_FOLDERS: DocumentFolder[] = [];
const EMPTY_TAGS: DocumentTag[] = [];

export function DocumentBulkActionsBar({
  selectedIds,
  totalCount,
  documents = EMPTY_DOCUMENTS,
  folders = EMPTY_FOLDERS,
  tags = EMPTY_TAGS,
  onSelectAll,
  onSelectNone,
  onMove,
  onTag,
  onArchive,
  onDelete,
  onDownload,
  onShare,
  isProcessing,
  className,
}: DocumentBulkActionsBarProps) {
  const [moveDialogOpen, setMoveDialogOpen] = React.useState(false);
  const [tagDialogOpen, setTagDialogOpen] = React.useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);

  const selectedCount = selectedIds.length;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const selectedDocumentPreview = selectedIds
    .map((id) => documents.find((doc) => doc.id === id))
    .filter(Boolean)
    .slice(0, 8) as Array<{ id: string; title: string }>;

  const handleSelectToggle = () => {
    if (isAllSelected) {
      onSelectNone?.();
    } else {
      onSelectAll?.();
    }
  };

  const handleMove = () => {
    if (selectedFolderId !== undefined) {
      onMove?.(selectedIds, selectedFolderId);
      setMoveDialogOpen(false);
      setSelectedFolderId(null);
    }
  };

  const handleTag = () => {
    if (selectedTagIds.length > 0) {
      onTag?.(selectedIds, selectedTagIds);
      setTagDialogOpen(false);
      setSelectedTagIds([]);
    }
  };

  const handleDelete = () => {
    onDelete?.(selectedIds);
    setDeleteDialogOpen(false);
  };

  const handleArchive = () => {
    onArchive?.(selectedIds);
    setArchiveDialogOpen(false);
  };

  // Build flat folder list for selection
  const flattenFolders = (items: DocumentFolder[], level = 0): Array<DocumentFolder & { level: number }> => {
    const result: Array<DocumentFolder & { level: number }> = [];
    for (const item of items) {
      result.push({ ...item, level });
      if (item.children) {
        result.push(...flattenFolders(item.children, level + 1));
      }
    }
    return result;
  };

  const flatFolders = flattenFolders(folders);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-40 flex items-center gap-3 px-4 py-3",
          "bg-[#0B1C3E] text-white shadow-lg rounded-lg mx-4 mt-4",
          className
        )}
      >
        {/* Selection Info */}
        <div className="flex items-center gap-3 shrink-0">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectToggle}
            className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-[#0B1C3E]"
          />
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-white/20 text-white hover:bg-white/30 font-semibold"
            >
              {selectedCount}
            </Badge>
            <span className="text-sm font-medium">
              {selectedCount === 1 ? "document" : "documents"} selected
            </span>
          </div>
        </div>

        <Separator orientation="vertical" className="h-6 bg-white/20" />

        {/* Actions */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
          {/* Move */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 gap-1.5 whitespace-nowrap"
            onClick={() => setMoveDialogOpen(true)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FolderInput className="w-4 h-4" />
            )}
            Move
          </Button>

          {/* Tag */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 gap-1.5 whitespace-nowrap"
            onClick={() => setTagDialogOpen(true)}
            disabled={isProcessing}
          >
            <Tags className="w-4 h-4" />
            Tag
          </Button>

          {/* Archive */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 gap-1.5 whitespace-nowrap"
            onClick={() => setArchiveDialogOpen(true)}
            disabled={isProcessing}
          >
            <Archive className="w-4 h-4" />
            Archive
          </Button>

          <Separator orientation="vertical" className="h-6 bg-white/20 mx-1" />

          {/* Download */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 gap-1.5 whitespace-nowrap"
            onClick={() => onDownload?.(selectedIds)}
            disabled={isProcessing}
          >
            <Download className="w-4 h-4" />
            Download
          </Button>

          {/* Share */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 gap-1.5 whitespace-nowrap"
            onClick={() => onShare?.(selectedIds)}
            disabled={isProcessing}
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            className="text-red-300 hover:bg-red-500/20 hover:text-red-200 gap-1.5 whitespace-nowrap"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isProcessing}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6 bg-white/20" />

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 shrink-0"
          onClick={() => onSelectNone?.()}
          disabled={isProcessing}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Move Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Move Documents</DialogTitle>
            <DialogDescription>
              Move {selectedCount} document{selectedCount !== 1 ? "s" : ""} to a folder
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedDocumentPreview.length > 0 && (
              <div className="mb-4 rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Preview of affected documents
                </p>
                <ul className="space-y-1">
                  {selectedDocumentPreview.map((doc) => (
                    <li key={doc.id} className="text-xs truncate">
                      {doc.title}
                    </li>
                  ))}
                  {selectedCount > selectedDocumentPreview.length && (
                    <li className="text-xs text-muted-foreground">
                      +{selectedCount - selectedDocumentPreview.length} more
                    </li>
                  )}
                </ul>
              </div>
            )}
            <div className="space-y-1 max-h-[300px] overflow-auto">
              {/* Root option */}
              <button
                onClick={() => setSelectedFolderId(null)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors",
                  selectedFolderId === null
                    ? "bg-[#0B1C3E] text-white"
                    : "hover:bg-muted"
                )}
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">All Documents (Root)</span>
                {selectedFolderId === null && <Check className="w-4 h-4 ml-auto" />}
              </button>

              {flatFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors",
                    selectedFolderId === folder.id
                      ? "bg-[#0B1C3E] text-white"
                      : "hover:bg-muted"
                  )}
                  style={{ paddingLeft: `${folder.level * 20 + 12}px` }}
                >
                  <FolderInput className="w-4 h-4" />
                  <span className="font-medium">{folder.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {folder.document_count || 0}
                  </Badge>
                  {selectedFolderId === folder.id && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              className="bg-[#0B1C3E] hover:bg-[#1a3a6e]"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FolderInput className="w-4 h-4 mr-2" />
              )}
              Move {selectedCount} Document{selectedCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Tag Documents</DialogTitle>
            <DialogDescription>
              Add tags to {selectedCount} document{selectedCount !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedDocumentPreview.length > 0 && (
              <div className="mb-4 rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Preview of affected documents
                </p>
                <ul className="space-y-1">
                  {selectedDocumentPreview.map((doc) => (
                    <li key={doc.id} className="text-xs truncate">
                      {doc.title}
                    </li>
                  ))}
                  {selectedCount > selectedDocumentPreview.length && (
                    <li className="text-xs text-muted-foreground">
                      +{selectedCount - selectedDocumentPreview.length} more
                    </li>
                  )}
                </ul>
              </div>
            )}
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {tags.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No tags available. Create some tags first.
                </p>
              ) : (
                tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() =>
                      setSelectedTagIds((prev) =>
                        prev.includes(tag.id)
                          ? prev.filter((id) => id !== tag.id)
                          : [...prev, tag.id]
                      )
                    }
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors border",
                      selectedTagIds.includes(tag.id)
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted"
                    )}
                  >
                    <Checkbox checked={selectedTagIds.includes(tag.id)} />
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-medium">{tag.name}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {tag.documentCount || 0}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTag}
              className="bg-[#0B1C3E] hover:bg-[#1a3a6e]"
              disabled={selectedTagIds.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Tags className="w-4 h-4 mr-2" />
              )}
              Add {selectedTagIds.length} Tag
              {selectedTagIds.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Archive Documents
            </DialogTitle>
            <DialogDescription>
              This will archive {selectedCount} document
              {selectedCount !== 1 ? "s" : ""}. You can undo this right after the action.
            </DialogDescription>
          </DialogHeader>
          {selectedDocumentPreview.length > 0 && (
            <div className="py-3">
              <p className="text-sm font-medium mb-2">Preview of affected documents:</p>
              <ul className="space-y-1">
                {selectedDocumentPreview.map((doc) => (
                  <li key={doc.id} className="text-sm text-muted-foreground truncate">
                    - {doc.title}
                  </li>
                ))}
                {selectedCount > selectedDocumentPreview.length && (
                  <li className="text-sm text-muted-foreground">
                    +{selectedCount - selectedDocumentPreview.length} more
                  </li>
                )}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleArchive} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              Archive {selectedCount} Document{selectedCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Documents
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCount} document
              {selectedCount !== 1 ? "s" : ""}? This will move them to the trash.
            </DialogDescription>
          </DialogHeader>
          {selectedCount <= 5 && documents.length > 0 && (
            <div className="py-4">
              <p className="text-sm font-medium mb-2">Documents to delete:</p>
              <ul className="space-y-1">
                {selectedIds
                  .map((id) => documents.find((d) => d.id === id))
                  .filter(Boolean)
                  .map((doc) => (
                    <li
                      key={doc!.id}
                      className="text-sm text-muted-foreground truncate"
                    >
                      • {doc!.title}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete {selectedCount} Document{selectedCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
