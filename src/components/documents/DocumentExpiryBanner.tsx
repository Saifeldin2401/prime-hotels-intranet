import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { differenceInDays, format, isPast, isToday } from "date-fns";
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    Clock,
    X,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

export type ExpiryWarningLevel = "critical" | "warning" | "notice" | "expired";

export interface DocumentExpiryInfo {
  id: string;
  title: string;
  expiryDate: string;
  documentNumber?: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

interface DocumentExpiryBannerProps {
  documents: DocumentExpiryInfo[];
  warningThresholds?: {
    critical: number; // days (default: 1)
    warning: number; // days (default: 7)
    notice: number; // days (default: 30)
  };
  onExtend?: (documentId: string, newDate: Date) => void;
  onDismiss?: (documentId: string) => void;
  onViewDocument?: (documentId: string) => void;
  maxDisplay?: number;
  className?: string;
}

function getExpiryStatus(
  expiryDate: string,
  thresholds: { critical: number; warning: number; notice: number }
): { level: ExpiryWarningLevel; daysRemaining: number; message: string } {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysRemaining = differenceInDays(expiry, now);

  if (isPast(expiry) && !isToday(expiry)) {
    return {
      level: "expired",
      daysRemaining: Math.abs(daysRemaining),
      message: `Expired ${Math.abs(daysRemaining)} days ago`,
    };
  }

  if (isToday(expiry)) {
    return {
      level: "critical",
      daysRemaining: 0,
      message: "Expires today",
    };
  }

  if (daysRemaining <= thresholds.critical) {
    return {
      level: "critical",
      daysRemaining,
      message: `Expires in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`,
    };
  }

  if (daysRemaining <= thresholds.warning) {
    return {
      level: "warning",
      daysRemaining,
      message: `Expires in ${daysRemaining} days`,
    };
  }

  if (daysRemaining <= thresholds.notice) {
    return {
      level: "notice",
      daysRemaining,
      message: `Expires in ${daysRemaining} days`,
    };
  }

  return {
    level: "notice",
    daysRemaining,
    message: `Expires in ${daysRemaining} days`,
  };
}

function getStatusStyles(level: ExpiryWarningLevel) {
  switch (level) {
    case "expired":
      return {
        container: "bg-red-50 border-red-200 text-red-900",
        icon: "text-red-600",
        badge: "bg-red-100 text-red-700 border-red-200",
        button: "bg-red-600 hover:bg-red-700 text-white",
      };
    case "critical":
      return {
        container: "bg-red-50/80 border-red-200 text-red-900",
        icon: "text-red-500",
        badge: "bg-red-100 text-red-700 border-red-200",
        button: "bg-red-600 hover:bg-red-700 text-white",
      };
    case "warning":
      return {
        container: "bg-amber-50 border-amber-200 text-amber-900",
        icon: "text-amber-500",
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        button: "bg-amber-600 hover:bg-amber-700 text-white",
      };
    case "notice":
      return {
        container: "bg-blue-50 border-blue-200 text-blue-900",
        icon: "text-blue-500",
        badge: "bg-blue-100 text-blue-700 border-blue-200",
        button: "bg-blue-600 hover:bg-blue-700 text-white",
      };
  }
}

export function DocumentExpiryBanner({
  documents,
  warningThresholds = { critical: 1, warning: 7, notice: 30 },
  onExtend,
  onDismiss,
  onViewDocument,
  maxDisplay = 3,
  className,
}: DocumentExpiryBannerProps) {
  const [dismissedIds, setDismissedIds] = React.useState<string[]>([]);
  const [extendDialogOpen, setExtendDialogOpen] = React.useState(false);
  const [selectedDocument, setSelectedDocument] =
    React.useState<DocumentExpiryInfo | null>(null);
  const [newExpiryDate, setNewExpiryDate] = React.useState<Date>();
  const [showAll, setShowAll] = React.useState(false);
  const { t } = useTranslation();

  // Filter out dismissed and sort by urgency
  const activeDocuments = documents
    .filter((doc) => !dismissedIds.includes(doc.id))
    .map((doc) => ({
      ...doc,
      status: getExpiryStatus(doc.expiryDate, warningThresholds),
    }))
    .sort((a, b) => a.status.daysRemaining - b.status.daysRemaining);

  const displayedDocuments = showAll
    ? activeDocuments
    : activeDocuments.slice(0, maxDisplay);
  const remainingCount = activeDocuments.length - maxDisplay;

  const handleDismiss = (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation();
    setDismissedIds((prev) => [...prev, documentId]);
    onDismiss?.(documentId);
  };

  const handleExtendClick = (e: React.MouseEvent, doc: DocumentExpiryInfo) => {
    e.stopPropagation();
    setSelectedDocument(doc);
    setNewExpiryDate(new Date(doc.expiryDate));
    setExtendDialogOpen(true);
  };

  const handleExtendSubmit = () => {
    if (selectedDocument && newExpiryDate) {
      onExtend?.(selectedDocument.id, newExpiryDate);
      setExtendDialogOpen(false);
      setSelectedDocument(null);
      setNewExpiryDate(undefined);
    }
  };

  if (activeDocuments.length === 0) {
    return null;
  }

  // Group by urgency for summary
  const expiredCount = activeDocuments.filter(
    (d) => d.status.level === "expired"
  ).length;
  const criticalCount = activeDocuments.filter(
    (d) => d.status.level === "critical"
  ).length;
  const warningCount = activeDocuments.filter(
    (d) => d.status.level === "warning"
  ).length;

  const hasUrgent = expiredCount > 0 || criticalCount > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Summary Banner */}
      {activeDocuments.length > 1 && (
        <div
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border",
            hasUrgent
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
              hasUrgent ? "bg-red-100" : "bg-amber-100"
            )}
          >
            <Clock
              className={cn(
                "w-5 h-5",
                hasUrgent ? "text-red-600" : "text-amber-600"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-medium",
                hasUrgent ? "text-red-900" : "text-amber-900"
              )}
            >
              {activeDocuments.length} documents require attention
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {expiredCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {expiredCount} expired
                </Badge>
              )}
              {criticalCount > 0 && (
                <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100">
                  {criticalCount} critical
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-100">
                  {warningCount} warning
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Individual Document Banners */}
      <div className="space-y-2">
        {displayedDocuments.map((doc) => {
          const styles = getStatusStyles(doc.status.level);
          return (
            <div
              key={doc.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                styles.container,
                onViewDocument && "cursor-pointer hover:shadow-sm"
              )}
              onClick={() => onViewDocument?.(doc.id)}
            >
              <AlertTriangle className={cn("w-5 h-5 shrink-0", styles.icon)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{doc.title}</span>
                  {doc.documentNumber && (
                    <Badge variant="outline" className="text-xs">
                      {doc.documentNumber}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-sm opacity-80">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(doc.expiryDate), "MMM d, yyyy")}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", styles.badge)}
                  >
                    {doc.status.message}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("h-8 gap-1.5", styles.badge)}
                  onClick={(e) => handleExtendClick(e, doc)}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Extend
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 opacity-60 hover:opacity-100"
                  onClick={(e) => handleDismiss(e, doc.id)}
                  aria-label={t('accessibility.dismiss_notification', 'Dismiss notification')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* Show More/Less */}
        {activeDocuments.length > maxDisplay && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll
              ? "Show less"
              : `Show ${remainingCount} more document${
                  remainingCount !== 1 ? "s" : ""
                }`}
          </Button>
        )}
      </div>

      {/* Extend Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Extend Expiry Date</DialogTitle>
            <DialogDescription>
              Select a new expiry date for &quot;{selectedDocument?.title}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {newExpiryDate ? (
                    format(newExpiryDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={newExpiryDate}
                  onSelect={setNewExpiryDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {newExpiryDate && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Document will expire in{" "}
                {differenceInDays(newExpiryDate, new Date())} days
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExtendSubmit}
              disabled={!newExpiryDate}
              className="bg-[#0B1C3E] hover:bg-[#1a3a6e]"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Extend Expiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple inline version for document cards
interface DocumentExpiryInlineProps {
  expiryDate: string;
  className?: string;
}

export function DocumentExpiryInline({
  expiryDate,
  className,
}: DocumentExpiryInlineProps) {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysRemaining = differenceInDays(expiry, now);

  if (isPast(expiry) && !isToday(expiry)) {
    return (
      <Badge variant="destructive" className={cn("gap-1", className)}>
        <AlertCircle className="w-3 h-3" />
        Expired
      </Badge>
    );
  }

  if (isToday(expiry)) {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1 bg-red-100 text-red-700 border-red-200", className)}
      >
        <Clock className="w-3 h-3" />
        Expires today
      </Badge>
    );
  }

  if (daysRemaining <= 7) {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1 bg-amber-100 text-amber-700 border-amber-200", className)}
      >
        <Clock className="w-3 h-3" />
        {daysRemaining} days left
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("gap-1", className)}>
      <Calendar className="w-3 h-3" />
      {format(expiry, "MMM d")}
    </Badge>
  );
}
