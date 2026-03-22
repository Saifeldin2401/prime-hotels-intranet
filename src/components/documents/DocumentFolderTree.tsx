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
import { Input } from "@/components/ui/input";
import type { DocumentFolder } from "@/hooks/useDocuments";
import { cn } from "@/lib/utils";
import {
    ChevronDown,
    ChevronRight,
    Edit3,
    FileText,
    Folder,
    FolderOpen,
    MoreHorizontal,
    Plus,
    Trash2,
} from "lucide-react";
import * as React from "react";

interface DocumentFolderTreeProps {
  folders: DocumentFolder[];
  selectedFolderId?: string | null;
  onSelectFolder?: (folderId: string | null) => void;
  onCreateFolder?: (name: string, parentId: string | null) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onMoveFolder?: (folderId: string, newParentId: string | null) => void;
  className?: string;
}

interface FolderNodeProps {
  folder: DocumentFolder;
  level: number;
  selectedFolderId?: string | null;
  expandedFolders: Set<string>;
  draggingId: string | null;
  dragOverId: string | null;
  inlineEditId: string | null;
  inlineEditValue: string;
  onToggleExpand: (folderId: string) => void;
  onSelect: (folderId: string | null) => void;
  onDragStart: (e: React.DragEvent, folderId: string) => void;
  onDragOver: (e: React.DragEvent, folderId: string | null) => void;
  onDrop: (e: React.DragEvent, targetFolderId: string | null) => void;
  onDragEnd: () => void;
  onStartInlineEdit: (folderId: string, currentName: string) => void;
  onInlineEditChange: (value: string) => void;
  onInlineEditSubmit: () => void;
  onInlineEditCancel: () => void;
  onCreateSubfolder: (parentId: string) => void;
  onDelete: (folderId: string) => void;
  onCreateRootFolder: () => void;
  isCreatingInline: boolean;
  inlineCreateParentId: string | null;
  inlineCreateValue: string;
  onStartInlineCreate: (parentId: string | null) => void;
  onInlineCreateChange: (value: string) => void;
  onInlineCreateSubmit: () => void;
  onInlineCreateCancel: () => void;
}

const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  level,
  selectedFolderId,
  expandedFolders,
  draggingId,
  dragOverId,
  inlineEditId,
  inlineEditValue,
  onToggleExpand,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onStartInlineEdit,
  onInlineEditChange,
  onInlineEditSubmit,
  onInlineEditCancel,
  onCreateSubfolder,
  onDelete,
  onCreateRootFolder,
  isCreatingInline,
  inlineCreateParentId,
  inlineCreateValue,
  onStartInlineCreate,
  onInlineCreateChange,
  onInlineCreateSubmit,
  onInlineCreateCancel,
}) => {
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const isDragging = draggingId === folder.id;
  const isDragOver = dragOverId === folder.id;
  const isEditing = inlineEditId === folder.id;
  const isCreatingHere = isCreatingInline && inlineCreateParentId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const createInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  React.useEffect(() => {
    if (isCreatingHere && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreatingHere]);

  return (
    <div className="select-none">
      <div
        draggable={!isEditing}
        onDragStart={(e) => onDragStart(e, folder.id)}
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDrop={(e) => onDrop(e, folder.id)}
        onDragEnd={onDragEnd}
        onDragEnter={(e) => e.preventDefault()}
        className={cn(
          "group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-all duration-200",
          "hover:bg-accent",
          isSelected && "bg-[#0B1C3E] text-white hover:bg-[#1a3a6e]",
          isDragging && "opacity-50",
          isDragOver && "bg-hotel-gold/20 ring-2 ring-hotel-gold ring-inset",
          level > 0 && "ml-4"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folder.id);
          }}
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded-sm transition-colors",
            !hasChildren && "invisible",
            isSelected ? "hover:bg-white/20" : "hover:bg-muted"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <div
          onClick={() => onSelect(folder.id)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {isExpanded ? (
            <FolderOpen
              className={cn(
                "w-5 h-5 shrink-0",
                isSelected ? "text-hotel-gold" : "text-hotel-gold"
              )}
            />
          ) : (
            <Folder
              className={cn(
                "w-5 h-5 shrink-0",
                isSelected ? "text-hotel-gold" : "text-hotel-gold"
              )}
            />
          )}

          {isEditing ? (
            <Input
              ref={inputRef}
              value={inlineEditValue}
              onChange={(e) => onInlineEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onInlineEditSubmit();
                if (e.key === "Escape") onInlineEditCancel();
              }}
              onBlur={onInlineEditSubmit}
              className="h-7 py-0 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate text-sm font-medium flex-1">
              {folder.name}
            </span>
          )}

          <Badge
            variant="secondary"
            className={cn(
              "text-xs h-5 px-1.5 shrink-0",
              isSelected
                ? "bg-white/20 text-white border-white/30"
                : "bg-muted"
            )}
          >
            {folder.document_count || 0}
          </Badge>
        </div>

        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                  isSelected && "hover:bg-white/20 hover:text-white"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => onStartInlineEdit(folder.id, folder.name)}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateSubfolder(folder.id)}>
                <Plus className="w-4 h-4 mr-2" />
                New Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(folder.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Inline Create Input */}
      {isCreatingHere && (
        <div
          className="flex items-center gap-2 py-1.5 px-2 ml-4"
          style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
        >
          <Folder className="w-5 h-5 text-hotel-gold shrink-0" />
          <Input
            ref={createInputRef}
            value={inlineCreateValue}
            onChange={(e) => onInlineCreateChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onInlineCreateSubmit();
              if (e.key === "Escape") onInlineCreateCancel();
            }}
            placeholder="Folder name..."
            className="h-7 py-0 text-sm flex-1"
          />
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-0.5">
          {folder.children!.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              draggingId={draggingId}
              dragOverId={dragOverId}
              inlineEditId={inlineEditId}
              inlineEditValue={inlineEditValue}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onStartInlineEdit={onStartInlineEdit}
              onInlineEditChange={onInlineEditChange}
              onInlineEditSubmit={onInlineEditSubmit}
              onInlineEditCancel={onInlineEditCancel}
              onCreateSubfolder={onCreateSubfolder}
              onDelete={onDelete}
              onCreateRootFolder={onCreateRootFolder}
              isCreatingInline={isCreatingInline}
              inlineCreateParentId={inlineCreateParentId}
              inlineCreateValue={inlineCreateValue}
              onStartInlineCreate={onStartInlineCreate}
              onInlineCreateChange={onInlineCreateChange}
              onInlineCreateSubmit={onInlineCreateSubmit}
              onInlineCreateCancel={onInlineCreateCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function DocumentFolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  className,
}: DocumentFolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(
    new Set()
  );
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const [inlineEditId, setInlineEditId] = React.useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = React.useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [folderToDelete, setFolderToDelete] = React.useState<string | null>(
    null
  );
  const [isCreatingInline, setIsCreatingInline] = React.useState(false);
  const [inlineCreateParentId, setInlineCreateParentId] = React.useState<
    string | null
  >(null);
  const [inlineCreateValue, setInlineCreateValue] = React.useState("");

  // Auto-expand selected folder and its parents
  React.useEffect(() => {
    if (selectedFolderId) {
      const findAndExpandParents = (
        items: DocumentFolder[],
        targetId: string,
        path: string[] = []
      ): string[] | null => {
        for (const item of items) {
          if (item.id === targetId) {
            return [...path, item.id];
          }
          if (item.children) {
            const result = findAndExpandParents(item.children, targetId, [
              ...path,
              item.id,
            ]);
            if (result) return result;
          }
        }
        return null;
      };

      const path = findAndExpandParents(folders, selectedFolderId);
      if (path) {
        setExpandedFolders((prev) => new Set([...prev, ...path]));
      }
    }
  }, [selectedFolderId, folders]);

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, folderId: string) => {
    setDraggingId(folderId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (folderId !== draggingId) {
      setDragOverId(folderId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    if (draggingId && draggingId !== targetFolderId) {
      // Prevent dropping into own descendant
      const isDescendant = (items: DocumentFolder[], parentId: string, childId: string): boolean => {
        for (const item of items) {
          if (item.id === parentId) {
            const checkChildren = (children: DocumentFolder[], id: string): boolean => {
              for (const child of children) {
                if (child.id === id) return true;
                if (child.children && checkChildren(child.children, id)) return true;
              }
              return false;
            };
            return item.children ? checkChildren(item.children, childId) : false;
          }
          if (item.children && isDescendant(item.children, parentId, childId)) {
            return true;
          }
        }
        return false;
      };

      if (targetFolderId && isDescendant(folders, draggingId, targetFolderId)) {
        return;
      }

      onMoveFolder?.(draggingId, targetFolderId);
    }
    setDragOverId(null);
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleStartInlineEdit = (folderId: string, currentName: string) => {
    setInlineEditId(folderId);
    setInlineEditValue(currentName);
  };

  const handleInlineEditSubmit = () => {
    if (inlineEditId && inlineEditValue.trim()) {
      onRenameFolder?.(inlineEditId, inlineEditValue.trim());
    }
    setInlineEditId(null);
    setInlineEditValue("");
  };

  const handleInlineEditCancel = () => {
    setInlineEditId(null);
    setInlineEditValue("");
  };

  const handleDelete = (folderId: string) => {
    setFolderToDelete(folderId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (folderToDelete) {
      onDeleteFolder?.(folderToDelete);
    }
    setDeleteDialogOpen(false);
    setFolderToDelete(null);
  };

  const handleStartInlineCreate = (parentId: string | null) => {
    setIsCreatingInline(true);
    setInlineCreateParentId(parentId);
    setInlineCreateValue("");
    if (parentId) {
      setExpandedFolders((prev) => new Set([...prev, parentId]));
    }
  };

  const handleInlineCreateSubmit = () => {
    if (inlineCreateValue.trim()) {
      onCreateFolder?.(inlineCreateValue.trim(), inlineCreateParentId);
    }
    setIsCreatingInline(false);
    setInlineCreateParentId(null);
    setInlineCreateValue("");
  };

  const handleInlineCreateCancel = () => {
    setIsCreatingInline(false);
    setInlineCreateParentId(null);
    setInlineCreateValue("");
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <span className="text-sm font-semibold text-foreground">Folders</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => handleStartInlineCreate(null)}
        >
          <Plus className="w-3.5 h-3.5" />
          New Folder
        </Button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto py-2">
        {/* Root level drop zone */}
        <div
          onDragOver={(e) => handleDragOver(e, null)}
          onDrop={(e) => handleDrop(e, null)}
          className={cn(
            "mx-2 mb-2 py-2 px-3 rounded-md border-2 border-dashed text-center text-sm transition-colors",
            dragOverId === null && draggingId
              ? "border-hotel-gold bg-hotel-gold/10 text-foreground"
              : "border-muted text-muted-foreground"
          )}
        >
          <FileText className="w-4 h-4 mx-auto mb-1" />
          All Documents
        </div>

        {/* Inline Create at Root */}
        {isCreatingInline && inlineCreateParentId === null && (
          <div className="flex items-center gap-2 py-1.5 px-2 mx-2 mb-2">
            <Folder className="w-5 h-5 text-hotel-gold shrink-0" />
            <Input
              value={inlineCreateValue}
              onChange={(e) => setInlineCreateValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInlineCreateSubmit();
                if (e.key === "Escape") handleInlineCreateCancel();
              }}
              placeholder="Folder name..."
              className="h-8 py-0 text-sm flex-1"
              autoFocus
            />
          </div>
        )}

        {/* Folder Tree */}
        {folders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Folder className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No folders yet</p>
            <Button
              variant="link"
              size="sm"
              className="mt-1"
              onClick={() => handleStartInlineCreate(null)}
            >
              Create your first folder
            </Button>
          </div>
        ) : (
          folders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              level={0}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              draggingId={draggingId}
              dragOverId={dragOverId}
              inlineEditId={inlineEditId}
              inlineEditValue={inlineEditValue}
              onToggleExpand={handleToggleExpand}
              onSelect={onSelectFolder || (() => { })}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onStartInlineEdit={handleStartInlineEdit}
              onInlineEditChange={setInlineEditValue}
              onInlineEditSubmit={handleInlineEditSubmit}
              onInlineEditCancel={handleInlineEditCancel}
              onCreateSubfolder={handleStartInlineCreate}
              onDelete={handleDelete}
              onCreateRootFolder={() => handleStartInlineCreate(null)}
              isCreatingInline={isCreatingInline}
              inlineCreateParentId={inlineCreateParentId}
              inlineCreateValue={inlineCreateValue}
              onStartInlineCreate={handleStartInlineCreate}
              onInlineCreateChange={setInlineCreateValue}
              onInlineCreateSubmit={handleInlineCreateSubmit}
              onInlineCreateCancel={handleInlineCreateCancel}
            />
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this folder? Documents inside will
              be moved to &quot;All Documents&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
