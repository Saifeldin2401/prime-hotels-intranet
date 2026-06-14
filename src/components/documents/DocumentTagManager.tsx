import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Cloud, Hash, Palette, Plus, Tag, X } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

export interface DocumentTag {
  id: string;
  name: string;
  color: string;
  documentCount?: number;
}

interface DocumentTagManagerProps {
  tags: DocumentTag[];
  selectedTags?: string[];
  onSelectTags?: (tagIds: string[]) => void;
  onCreateTag?: (name: string, color: string) => void;
  onDeleteTag?: (tagId: string) => void;
  onAssignTags?: (documentIds: string[], tagIds: string[]) => void;
  documents?: { id: string; title: string }[];
  selectedDocumentIds?: string[];
  mode?: "manage" | "assign" | "filter";
  className?: string;
}

const TAG_COLORS = [
  { name: "Red", value: "#ef4444", bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  { name: "Orange", value: "#f97316", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  { name: "Amber", value: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  { name: "Yellow", value: "#eab308", bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
  { name: "Lime", value: "#84cc16", bg: "bg-lime-100", text: "text-lime-700", border: "border-lime-200" },
  { name: "Green", value: "#22c55e", bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  { name: "Emerald", value: "#10b981", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { name: "Teal", value: "#14b8a6", bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
  { name: "Cyan", value: "#06b6d4", bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
  { name: "Sky", value: "#0ea5e9", bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200" },
  { name: "Blue", value: "#3b82f6", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  { name: "Indigo", value: "#6366f1", bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
  { name: "Violet", value: "#8b5cf6", bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  { name: "Purple", value: "#a855f7", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  { name: "Fuchsia", value: "#d946ef", bg: "bg-fuchsia-100", text: "text-fuchsia-700", border: "border-fuchsia-200" },
  { name: "Pink", value: "#ec4899", bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
  { name: "Rose", value: "#f43f5e", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  { name: "Slate", value: "#64748b", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  { name: "Gray", value: "#6b7280", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
  { name: "Zinc", value: "#71717a", bg: "bg-zinc-100", text: "text-zinc-700", border: "border-zinc-200" },
];

function getColorClasses(colorValue: string) {
  const color = TAG_COLORS.find((c) => c.value === colorValue);
  return color || { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };
}

export function DocumentTagManager({
  tags,
  selectedTags = [],
  onSelectTags,
  onCreateTag,
  onDeleteTag,
  onAssignTags,
  selectedDocumentIds = [],
  mode = "manage",
  className,
}: DocumentTagManagerProps) {
  const { t } = useTranslation();
  const [newTagName, setNewTagName] = React.useState("");
  const [selectedColor, setSelectedColor] = React.useState(TAG_COLORS[10].value);
  const [isCreating, setIsCreating] = React.useState(false);
  const [bulkTagSearch, setBulkTagSearch] = React.useState("");
  const [bulkSelectedTags, setBulkSelectedTags] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(newTagName.toLowerCase())
  );

  const availableTagsForBulk = tags.filter((tag) =>
    tag.name.toLowerCase().includes(bulkTagSearch.toLowerCase())
  );

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      onCreateTag?.(newTagName.trim(), selectedColor);
      setNewTagName("");
      setIsCreating(false);
    }
  };

  const handleToggleTag = (tagId: string) => {
    const newSelected = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];
    onSelectTags?.(newSelected);
  };

  const handleBulkTagToggle = (tagId: string) => {
    setBulkSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleBulkAssign = () => {
    if (selectedDocumentIds.length > 0 && bulkSelectedTags.length > 0) {
      onAssignTags?.(selectedDocumentIds, bulkSelectedTags);
      setBulkSelectedTags([]);
      setBulkTagSearch("");
    }
  };

  // Tag cloud sizing based on document count
  const maxCount = Math.max(...tags.map((t) => t.documentCount || 0), 1);
  const getTagSize = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.75) return "text-lg px-4 py-2";
    if (ratio > 0.5) return "text-base px-3 py-1.5";
    if (ratio > 0.25) return "text-sm px-2.5 py-1";
    return "text-xs px-2 py-0.5";
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Create New Tag */}
      {mode === "manage" && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Create New Tag</Label>
          {isCreating ? (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateTag();
                    if (e.key === "Escape") {
                      setIsCreating(false);
                      setNewTagName("");
                    }
                  }}
                  placeholder="Tag name..."
                  className="flex-1"
                  autoFocus
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      style={{ backgroundColor: selectedColor }}
                      aria-label={t("accessibility.select_color", "Select color")}
                    >
                      <Palette className="w-4 h-4 text-white" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3">
                    <div className="grid grid-cols-5 gap-1.5">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setSelectedColor(color.value)}
                          className={cn(
                            "w-8 h-8 rounded-md transition-all",
                            selectedColor === color.value && "ring-2 ring-offset-2 ring-foreground"
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setIsCreating(false);
                    setNewTagName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[#0B1C3E] hover:bg-[#1a3a6e]"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                >
                  <Plus className="w-4 h-4 me-1" />
                  Create
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="w-4 h-4" />
              Add New Tag
            </Button>
          )}
        </div>
      )}

      {/* Tag List with Autocomplete */}
      {(mode === "manage" || mode === "filter") && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {mode === "filter" ? "Filter by Tags" : "All Tags"}
          </Label>
          <Command className="border rounded-lg">
            <CommandInput
              placeholder="Search tags..."
              value={newTagName}
              onValueChange={setNewTagName}
            />
            <CommandList className="max-h-[200px]">
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {filteredTags.map((tag) => {
                  const colors = getColorClasses(tag.color);
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => handleToggleTag(tag.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox checked={isSelected} />
                        <Badge
                          variant="outline"
                          className={cn(
                            colors.bg,
                            colors.text,
                            colors.border,
                            "font-medium"
                          )}
                        >
                          <Hash className="w-3 h-3 me-1" />
                          {tag.name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {tag.documentCount || 0} docs
                        </span>
                        {mode === "manage" && onDeleteTag && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTag(tag.id);
                            }}
                            aria-label={t("accessibility.delete_tag", "Delete tag")}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}

      {/* Tag Cloud */}
      {mode === "manage" && tags.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Tag Cloud
          </Label>
          <div className="flex flex-wrap gap-2 p-4 border rounded-lg bg-muted/20">
            {tags
              .sort((a, b) => (b.documentCount || 0) - (a.documentCount || 0))
              .map((tag) => {
                const colors = getColorClasses(tag.color);
                const size = getTagSize(tag.documentCount || 0);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    className={cn(
                      "rounded-full border transition-all hover:scale-105 hover:shadow-sm",
                      colors.bg,
                      colors.text,
                      colors.border,
                      size,
                      selectedTags.includes(tag.id) && "ring-2 ring-offset-2 ring-foreground"
                    )}
                  >
                    {tag.name}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Bulk Tag Assignment */}
      {mode === "assign" && selectedDocumentIds.length > 0 && (
        <div className="space-y-3 p-4 border rounded-lg bg-hotel-gold/5 border-hotel-gold/20">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Bulk Assign Tags ({selectedDocumentIds.length} documents)
            </Label>
            {bulkSelectedTags.length > 0 && (
              <Button
                size="sm"
                className="bg-[#0B1C3E] hover:bg-[#1a3a6e]"
                onClick={handleBulkAssign}
              >
                <Tag className="w-4 h-4 me-1" />
                Assign {bulkSelectedTags.length} tag
                {bulkSelectedTags.length !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
          <Input
            placeholder="Search tags to assign..."
            value={bulkTagSearch}
            onChange={(e) => setBulkTagSearch(e.target.value)}
          />
          <ScrollArea className="h-[150px]">
            <div className="space-y-1">
              {availableTagsForBulk.map((tag) => {
                const colors = getColorClasses(tag.color);
                const isSelected = bulkSelectedTags.includes(tag.id);
                return (
                  <div
                    key={tag.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                      isSelected ? "bg-accent" : "hover:bg-muted"
                    )}
                    onClick={() => handleBulkTagToggle(tag.id)}
                  >
                    <Checkbox checked={isSelected} />
                    <Badge
                      variant="outline"
                      className={cn(
                        colors.bg,
                        colors.text,
                        colors.border,
                        "font-medium"
                      )}
                    >
                      <Hash className="w-3 h-3 me-1" />
                      {tag.name}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Selected Tags</Label>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              if (!tag) return null;
              const colors = getColorClasses(tag.color);
              return (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className={cn(
                    colors.bg,
                    colors.text,
                    colors.border,
                    "gap-1 pe-1"
                  )}
                >
                  <Hash className="w-3 h-3" />
                  {tag.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ms-1 hover:bg-black/10"
                    onClick={() => handleToggleTag(tag.id)}
                    aria-label={t("accessibility.remove_tag", "Remove tag")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
