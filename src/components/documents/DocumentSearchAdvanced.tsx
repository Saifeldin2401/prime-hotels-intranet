import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
    Bookmark,
    Calendar,
    ChevronDown,
    ChevronUp,
    FileText,
    Filter,
    Save,
    Search,
    Shield,
    Tag,
    User,
    X,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type { DocumentTag } from "./DocumentTagManager";

export type ConfidentialityLevel = "public" | "internal" | "confidential" | "restricted";

export interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
}

export interface SearchFilters {
  query?: string;
  dateFrom?: Date;
  dateTo?: Date;
  fileTypes?: string[];
  confidentiality?: ConfidentialityLevel[];
  authorIds?: string[];
  tagIds?: string[];
  folderId?: string | null;
}

interface DocumentSearchAdvancedProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  availableFileTypes?: string[];
  availableAuthors?: Array<{ id: string; name: string; avatar?: string }>;
  availableTags?: DocumentTag[];
  savedSearches?: SavedSearch[];
  onSaveSearch?: (name: string) => void;
  onDeleteSavedSearch?: (id: string) => void;
  onLoadSavedSearch?: (savedSearch: SavedSearch) => void;
  resultCount?: number;
  className?: string;
}

const EMPTY_FILE_TYPES: string[] = [];
const EMPTY_AUTHORS: Array<{ id: string; name: string; avatar?: string }> = [];
const EMPTY_TAGS: DocumentTag[] = [];
const EMPTY_SAVED_SEARCHES: SavedSearch[] = [];

const FILE_TYPE_OPTIONS = [
  { value: "pdf", label: "PDF", icon: "📄" },
  { value: "doc", label: "Word Document", icon: "📝" },
  { value: "docx", label: "Word Document", icon: "📝" },
  { value: "xls", label: "Excel Spreadsheet", icon: "📊" },
  { value: "xlsx", label: "Excel Spreadsheet", icon: "📊" },
  { value: "ppt", label: "PowerPoint", icon: "📽️" },
  { value: "pptx", label: "PowerPoint", icon: "📽️" },
  { value: "image", label: "Image", icon: "🖼️" },
  { value: "video", label: "Video", icon: "🎥" },
  { value: "other", label: "Other", icon: "📎" },
];

const CONFIDENTIALITY_OPTIONS: Array<{
  value: ConfidentialityLevel;
  label: string;
  color: string;
  description: string;
}> = [
    {
      value: "public",
      label: "Public",
      color: "bg-gray-100 text-gray-700 border-gray-200",
      description: "Accessible to everyone",
    },
    {
      value: "internal",
      label: "Internal",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      description: "Staff and management only",
    },
    {
      value: "confidential",
      label: "Confidential",
      color: "bg-orange-100 text-orange-700 border-orange-200",
      description: "Management only",
    },
    {
      value: "restricted",
      label: "Restricted",
      color: "bg-red-100 text-red-700 border-red-200",
      description: "Authorized personnel only",
    },
  ];

export function DocumentSearchAdvanced({
  filters,
  onFiltersChange,
  onSearch,
  availableFileTypes = EMPTY_FILE_TYPES,
  availableAuthors = EMPTY_AUTHORS,
  availableTags = EMPTY_TAGS,
  savedSearches = EMPTY_SAVED_SEARCHES,
  onSaveSearch,
  onDeleteSavedSearch,
  onLoadSavedSearch,
  resultCount,
  className,
}: DocumentSearchAdvancedProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [saveName, setSaveName] = React.useState("");
  const [queryInput, setQueryInput] = React.useState(filters.query || "");
  const [activeFiltersCount, setActiveFiltersCount] = React.useState(0);

  // Count active filters
  React.useEffect(() => {
    let count = 0;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.fileTypes?.length) count += filters.fileTypes.length;
    if (filters.confidentiality?.length) count += filters.confidentiality.length;
    if (filters.authorIds?.length) count += filters.authorIds.length;
    if (filters.tagIds?.length) count += filters.tagIds.length;
    if (filters.folderId) count++;
    setActiveFiltersCount(count);
  }, [filters]);

  React.useEffect(() => {
    setQueryInput(filters.query || "");
  }, [filters.query]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = queryInput.trim();
      const currentQuery = (filters.query || "").trim();
      if (nextQuery === currentQuery) {
        return;
      }
      onFiltersChange({ ...filters, query: nextQuery || undefined });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [queryInput, filters, onFiltersChange]);

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = <K extends "fileTypes" | "confidentiality" | "authorIds" | "tagIds">(
    key: K,
    value: string
  ) => {
    const current = (filters[key] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilter(key, updated as SearchFilters[K]);
  };

  const clearFilters = () => {
    onFiltersChange({
      query: queryInput.trim() || undefined,
    });
  };

  const handleSaveSearch = () => {
    if (saveName.trim()) {
      onSaveSearch?.(saveName.trim());
      setSaveName("");
      setSaveDialogOpen(false);
    }
  };

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const nextQuery = queryInput.trim();
                onFiltersChange({ ...filters, query: nextQuery || undefined });
                onSearch();
              }
            }}
            className="ps-10"
          />
          {queryInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => {
                setQueryInput("");
                onFiltersChange({ ...filters, query: undefined });
              }}
              aria-label={t("accessibility.clear_search", "Clear search")}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ms-1">
              {activeFiltersCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )
          }
        </Button>
        <Button
          className="bg-[#0B1C3E] hover:bg-[#1a3a6e]"
          onClick={onSearch}
        >
          <Search className="w-4 h-4 me-2" />
          Search
        </Button>
      </div>

      {/* Saved Searches Quick Select */}
      {savedSearches.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Saved:</span>
          {savedSearches.map((saved) => (
            <Badge
              key={saved.id}
              variant="outline"
              className="cursor-pointer hover:bg-accent gap-1"
              onClick={() => onLoadSavedSearch?.(saved)}
            >
              <Bookmark className="w-3 h-3" />
              {saved.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ms-1 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSavedSearch?.(saved.id);
                }}
                aria-label={t("accessibility.delete_saved_search", "Delete saved search")}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="w-3 h-3" />
              From {format(filters.dateFrom, "MMM d, yyyy")}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ms-1 hover:bg-muted"
                onClick={() => updateFilter("dateFrom", undefined)}
                aria-label={t("accessibility.remove_date_from_filter", "Remove date from filter")}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="w-3 h-3" />
              To {format(filters.dateTo, "MMM d, yyyy")}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ms-1 hover:bg-muted"
                onClick={() => updateFilter("dateTo", undefined)}
                aria-label={t("accessibility.remove_date_to_filter", "Remove date to filter")}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {filters.fileTypes?.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1">
              <FileText className="w-3 h-3" />
              {type.toUpperCase()}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ms-1 hover:bg-muted"
                onClick={() => toggleArrayFilter("fileTypes", type)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          {filters.confidentiality?.map((level) => (
            <Badge key={level} variant="secondary" className="gap-1">
              <Shield className="w-3 h-3" />
              {level}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ms-1 hover:bg-muted"
                onClick={() => toggleArrayFilter("confidentiality", level)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          {filters.tagIds?.map((tagId) => {
            const tag = availableTags.find((t) => t.id === tagId);
            return tag ? (
              <Badge
                key={tagId}
                variant="outline"
                className="gap-1"
                style={{
                  backgroundColor: `${tag.color}20`,
                  borderColor: `${tag.color}40`,
                  color: tag.color,
                }}
              >
                <Tag className="w-3 h-3" />
                {tag.name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ms-1 hover:bg-black/10"
                  onClick={() => toggleArrayFilter("tagIds", tagId)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ) : null;
          })}
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearFilters}>
            Clear all
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setSaveDialogOpen(true)}
          >
            <Save className="w-3.5 h-3.5" />
            Save Search
          </Button>
        </div>
      )}

      {/* Expanded Filters Panel */}
      {isExpanded && (
        <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </Label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {filters.dateFrom ? (
                        format(filters.dateFrom, "PP")
                      ) : (
                        <span className="text-muted-foreground">From...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => updateFilter("dateFrom", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {filters.dateTo ? (
                        format(filters.dateTo, "PP")
                      ) : (
                        <span className="text-muted-foreground">To...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => updateFilter("dateTo", date)}
                      disabled={(date) =>
                        filters.dateFrom ? date < filters.dateFrom : false
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* File Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                File Type
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {FILE_TYPE_OPTIONS.filter(
                  (type) =>
                    availableFileTypes.length === 0 ||
                    availableFileTypes.includes(type.value)
                ).map((type) => (
                  <button
                    key={type.value}
                    onClick={() => toggleArrayFilter("fileTypes", type.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
                      filters.fileTypes?.includes(type.value)
                        ? "bg-[#0B1C3E] text-white border-[#0B1C3E]"
                        : "bg-background border-input hover:bg-accent"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidentiality */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Confidentiality
              </Label>
              <div className="space-y-1.5">
                {CONFIDENTIALITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => toggleArrayFilter("confidentiality", option.value)}
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                      filters.confidentiality?.includes(option.value)
                        ? "bg-accent"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={filters.confidentiality?.includes(option.value)}
                    />
                    <Badge variant="outline" className={cn("text-xs", option.color)}>
                      {option.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground ms-auto">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Author Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Authors
              </Label>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="space-y-1">
                  {availableAuthors.map((author) => (
                    <button
                      key={author.id}
                      onClick={() => toggleArrayFilter("authorIds", author.id)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                        filters.authorIds?.includes(author.id)
                          ? "bg-accent"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={filters.authorIds?.includes(author.id)}
                      />
                      <span className="text-sm">{author.name}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Tag Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </Label>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleArrayFilter("tagIds", tag.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
                        filters.tagIds?.includes(tag.id)
                          ? "ring-2 ring-offset-1 ring-[#0B1C3E]"
                          : ""
                      )}
                      style={{
                        backgroundColor: filters.tagIds?.includes(tag.id)
                          ? tag.color
                          : `${tag.color}20`,
                        borderColor: `${tag.color}40`,
                        color: filters.tagIds?.includes(tag.id) ? "white" : tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">
              {resultCount !== undefined && `${resultCount} results found`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
              <Button className="bg-[#0B1C3E] hover:bg-[#1a3a6e]" onClick={onSearch}>
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Search Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save these filters to quickly access them later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="save-name">Search Name</Label>
            <Input
              id="save-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g., Q4 Financial Reports"
              className="mt-2"
              onKeyDown={(e) => e.key === "Enter" && handleSaveSearch()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSearch}
              disabled={!saveName.trim()}
              className="bg-[#0B1C3E] hover:bg-[#1a3a6e]"
            >
              <Save className="w-4 h-4 me-2" />
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
