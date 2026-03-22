import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
    AlertTriangle,
    Check,
    ChevronRight,
    Copy,
    Files,
    FileText,
    Lightbulb,
    Loader2,
    RefreshCw,
    Sparkles,
    Tag,
    X
} from "lucide-react";
import * as React from "react";

export interface AISuggestedTag {
  name: string;
  confidence: number; // 0-100
}

export interface DuplicateWarning {
  documentId: string;
  documentTitle: string;
  similarityScore: number; // 0-100
  matchedContent?: string;
}

export interface SimilarDocument {
  id: string;
  title: string;
  similarity: number;
  reason: string;
}

export interface AIDocumentSuggestions {
  documentId: string;
  suggestedTags: AISuggestedTag[];
  summary?: string;
  duplicateWarnings: DuplicateWarning[];
  similarDocuments: SimilarDocument[];
  keyInsights?: string[];
}

interface AIDocumentAssistantProps {
  suggestions: AIDocumentSuggestions;
  existingTags?: string[];
  onAcceptTag?: (tagName: string) => void;
  onRejectTag?: (tagName: string) => void;
  onAcceptAllTags?: () => void;
  onViewDuplicate?: (documentId: string) => void;
  onViewSimilar?: (documentId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  let colorClass = "";

  if (confidence >= 80) {
    colorClass = "bg-green-100 text-green-700 border-green-200";
  } else if (confidence >= 50) {
    colorClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
  } else {
    colorClass = "bg-gray-100 text-gray-700 border-gray-200";
  }

  return (
    <Badge variant="outline" className={cn("text-xs", colorClass)}>
      {confidence}% match
    </Badge>
  );
}

function SimilarityBar({ similarity }: { similarity: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            similarity >= 80 ? "bg-red-500" : similarity >= 60 ? "bg-yellow-500" : "bg-blue-500"
          )}
          style={{ width: `${similarity}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{similarity}%</span>
    </div>
  );
}

export function AIDocumentAssistant({
  suggestions,
  existingTags = [],
  onAcceptTag,
  onRejectTag,
  onAcceptAllTags,
  onViewDuplicate,
  onViewSimilar,
  onRefresh,
  isLoading,
  className,
}: AIDocumentAssistantProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(["tags", "summary", "duplicates", "similar"])
  );
  const [copiedSummary, setCopiedSummary] = React.useState(false);
  const [acceptedTags, setAcceptedTags] = React.useState<Set<string>>(new Set());
  const [rejectedTags, setRejectedTags] = React.useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleAcceptTag = (tagName: string) => {
    setAcceptedTags((prev) => new Set([...prev, tagName]));
    onAcceptTag?.(tagName);
  };

  const handleRejectTag = (tagName: string) => {
    setRejectedTags((prev) => new Set([...prev, tagName]));
    onRejectTag?.(tagName);
  };

  const handleCopySummary = () => {
    if (suggestions.summary) {
      navigator.clipboard.writeText(suggestions.summary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    }
  };

  const pendingTags = suggestions.suggestedTags.filter(
    (tag) => !acceptedTags.has(tag.name) && !rejectedTags.has(tag.name) && !existingTags.includes(tag.name)
  );

  if (isLoading) {
    return (
      <Card className={cn("border-dashed border-2 border-primary/20", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing document...</p>
              <p className="text-xs text-muted-foreground mt-1">
                This may take a few moments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnySuggestions =
    pendingTags.length > 0 ||
    suggestions.summary ||
    suggestions.duplicateWarnings.length > 0 ||
    suggestions.similarDocuments.length > 0;

  if (!hasAnySuggestions) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Lightbulb className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No AI suggestions available for this document.
            </p>
            <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn("border-primary/20", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              AI Assistant
            </CardTitle>
            <div className="flex items-center gap-1">
              {onRefresh && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh suggestions</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Suggested Tags Section */}
          {pendingTags.length > 0 && (
            <Collapsible open={expandedSections.has("tags")} onOpenChange={() => toggleSection("tags")}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Suggested Tags</span>
                  <Badge variant="secondary" className="text-xs">{pendingTags.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {pendingTags.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        pendingTags.forEach((tag) => handleAcceptTag(tag.name));
                        onAcceptAllTags?.();
                      }}
                    >
                      Accept All
                    </Button>
                  )}
                  {expandedSections.has("tags") ? (
                    <ChevronRight className="w-4 h-4 rotate-90 transition-transform" />
                  ) : (
                    <ChevronRight className="w-4 h-4 transition-transform" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pt-2 space-y-2">
                  {pendingTags.map((tag) => (
                    <div
                      key={tag.name}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tag.name}</span>
                        <ConfidenceBadge confidence={tag.confidence} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-green-100 hover:text-green-700"
                              onClick={() => handleAcceptTag(tag.name)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Accept tag</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-red-100 hover:text-red-700"
                              onClick={() => handleRejectTag(tag.name)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reject tag</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Document Summary Section */}
          {suggestions.summary && (
            <>
              <Separator />
              <Collapsible open={expandedSections.has("summary")} onOpenChange={() => toggleSection("summary")}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Document Summary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopySummary();
                          }}
                        >
                          {copiedSummary ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {copiedSummary ? "Copied!" : "Copy summary"}
                      </TooltipContent>
                    </Tooltip>
                    {expandedSections.has("summary") ? (
                      <ChevronRight className="w-4 h-4 rotate-90 transition-transform" />
                    ) : (
                      <ChevronRight className="w-4 h-4 transition-transform" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {suggestions.summary}
                    </p>
                    {suggestions.keyInsights && suggestions.keyInsights.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-foreground mb-2">Key Insights:</p>
                        <ul className="space-y-1">
                          {suggestions.keyInsights.map((insight, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Duplicate Warnings Section */}
          {suggestions.duplicateWarnings.length > 0 && (
            <>
              <Separator />
              <Collapsible open={expandedSections.has("duplicates")} onOpenChange={() => toggleSection("duplicates")}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-sm">Possible Duplicates</span>
                    <Badge variant="destructive" className="text-xs">
                      {suggestions.duplicateWarnings.length}
                    </Badge>
                  </div>
                  {expandedSections.has("duplicates") ? (
                    <ChevronRight className="w-4 h-4 rotate-90 transition-transform" />
                  ) : (
                    <ChevronRight className="w-4 h-4 transition-transform" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-2 space-y-2">
                    {suggestions.duplicateWarnings.map((warning) => (
                      <div
                        key={warning.documentId}
                        className="p-3 border border-amber-200 bg-amber-50/50 rounded-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {warning.documentTitle}
                            </p>
                            <SimilarityBar similarity={warning.similarityScore} />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={() => onViewDuplicate?.(warning.documentId)}
                          >
                            View
                          </Button>
                        </div>
                        {warning.matchedContent && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            &ldquo;{warning.matchedContent}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Similar Documents Section */}
          {suggestions.similarDocuments.length > 0 && (
            <>
              <Separator />
              <Collapsible open={expandedSections.has("similar")} onOpenChange={() => toggleSection("similar")}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded-md px-2 -mx-2">
                  <div className="flex items-center gap-2">
                    <Files className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-sm">Related Documents</span>
                    <Badge variant="secondary" className="text-xs">
                      {suggestions.similarDocuments.length}
                    </Badge>
                  </div>
                  {expandedSections.has("similar") ? (
                    <ChevronRight className="w-4 h-4 rotate-90 transition-transform" />
                  ) : (
                    <ChevronRight className="w-4 h-4 transition-transform" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-2 space-y-2">
                    {suggestions.similarDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                        onClick={() => onViewSimilar?.(doc.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.reason}</p>
                        </div>
                        <SimilarityBar similarity={doc.similarity} />
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
