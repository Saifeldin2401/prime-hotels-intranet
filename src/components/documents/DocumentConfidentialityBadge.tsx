import * as React from "react";
import {
  Globe,
  Building2,
  Lock,
  ShieldAlert,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

export type ConfidentialityLevel = "public" | "internal" | "confidential" | "restricted";

export interface ConfidentialityConfig {
  level: ConfidentialityLevel;
  label: string;
  description: string;
  detailedDescription: string;
  icon: React.ReactElement<any>;
  color: {
    bg: string;
    text: string;
    border: string;
    hover: string;
  };
  accessDescription: string;
  examples: string[];
}

const CONFIDENTIALITY_CONFIGS: Record<ConfidentialityLevel, ConfidentialityConfig> = {
  public: {
    level: "public",
    label: "Public",
    description: "Accessible to everyone",
    detailedDescription: "This document is publicly available and can be accessed by anyone, including guests, visitors, and external parties without authentication.",
    icon: <Globe className="w-3.5 h-3.5" />,
    color: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-200",
      hover: "hover:bg-gray-200",
    },
    accessDescription: "Everyone",
    examples: [
      "Hotel brochures",
      "Public menus",
      "General information",
      "Marketing materials",
    ],
  },
  internal: {
    level: "internal",
    label: "Internal",
    description: "Staff and management only",
    detailedDescription: "This document is intended for internal use only and should be accessible to all hotel staff and management personnel.",
    icon: <Building2 className="w-3.5 h-3.5" />,
    color: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-200",
      hover: "hover:bg-blue-200",
    },
    accessDescription: "All Staff",
    examples: [
      "Training materials",
      "Standard operating procedures",
      "Internal newsletters",
      "Department schedules",
    ],
  },
  confidential: {
    level: "confidential",
    label: "Confidential",
    description: "Management level only",
    detailedDescription: "This document contains sensitive information that should only be accessed by management and authorized supervisory personnel.",
    icon: <Lock className="w-3.5 h-3.5" />,
    color: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200",
      hover: "hover:bg-amber-200",
    },
    accessDescription: "Management Only",
    examples: [
      "Financial reports",
      "Employee records",
      "Strategic plans",
      "Performance reviews",
    ],
  },
  restricted: {
    level: "restricted",
    label: "Restricted",
    description: "Authorized personnel only",
    detailedDescription: "This document is highly sensitive and restricted to specific authorized personnel only. Unauthorized access is strictly prohibited and may be subject to disciplinary action.",
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    color: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-200",
      hover: "hover:bg-red-200",
    },
    accessDescription: "Authorized Personnel Only",
    examples: [
      "Executive board minutes",
      "M&A documents",
      "Legal proceedings",
      "Security protocols",
    ],
  },
};

interface DocumentConfidentialityBadgeProps {
  level: ConfidentialityLevel;
  size?: "sm" | "default" | "lg";
  variant?: "badge" | "pill" | "card" | "dot";
  showTooltip?: boolean;
  showHoverCard?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: {
    badge: "text-[10px] px-1.5 py-0 h-5 gap-1",
    pill: "text-[10px] px-2 py-0.5 gap-1",
    card: "p-2 gap-2",
    dot: "w-2 h-2",
  },
  default: {
    badge: "text-xs px-2.5 py-0 h-6 gap-1.5",
    pill: "text-xs px-3 py-1 gap-1.5",
    card: "p-3 gap-3",
    dot: "w-2.5 h-2.5",
  },
  lg: {
    badge: "text-sm px-3 py-0 h-7 gap-2",
    pill: "text-sm px-4 py-1.5 gap-2",
    card: "p-4 gap-4",
    dot: "w-3 h-3",
  },
};

function BadgeContent({
  config,
  size,
  variant,
}: {
  config: ConfidentialityConfig;
  size: "sm" | "default" | "lg";
  variant: "badge" | "pill" | "card" | "dot";
}) {
  if (variant === "dot") {
    return (
      <div
        className={cn(
          "rounded-full",
          sizeClasses[size].dot,
          config.level === "public" && "bg-gray-400",
          config.level === "internal" && "bg-blue-500",
          config.level === "confidential" && "bg-amber-500",
          config.level === "restricted" && "bg-red-500"
        )}
      />
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("flex items-start gap-3", sizeClasses[size].card)}>
        <div
          className={cn(
            "p-2 rounded-lg shrink-0",
            config.color.bg,
            config.color.text
          )}
        >
          {React.cloneElement(config.icon, {
            className: "w-5 h-5",
          })}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{config.label}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] border-0",
                config.color.bg,
                config.color.text
              )}
            >
              {config.accessDescription}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {config.description}
          </p>
        </div>
      </div>
    );
  }

  // badge or pill
  return (
    <>
      {config.icon}
      <span>{config.label}</span>
    </>
  );
}

export function DocumentConfidentialityBadge({
  level,
  size = "default",
  variant = "badge",
  showTooltip = true,
  showHoverCard = false,
  className,
  onClick,
}: DocumentConfidentialityBadgeProps) {
  const config = CONFIDENTIALITY_CONFIGS[level];

  const badgeElement = (
    <Badge
      variant="outline"
      className={cn(
        "font-medium transition-colors",
        variant !== "dot" && config.color.bg,
        variant !== "dot" && config.color.text,
        variant !== "dot" && config.color.border,
        variant !== "dot" && config.color.hover,
        sizeClasses[size][variant],
        onClick && "cursor-pointer",
        variant === "pill" && "rounded-full",
        variant === "card" && "block w-full text-left h-auto",
        className
      )}
      onClick={onClick}
    >
      <BadgeContent config={config} size={size} variant={variant} />
    </Badge>
  );

  // Tooltip/HoverCard wrappers are optional; if their UI components are not present,
  // we still render a functional badge.
  void showTooltip;
  void showHoverCard;
  return badgeElement;
}

// Selector component for forms
interface ConfidentialitySelectorProps {
  value?: ConfidentialityLevel;
  onChange: (level: ConfidentialityLevel) => void;
  className?: string;
}

export function ConfidentialitySelector({
  value,
  onChange,
  className,
}: ConfidentialitySelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {(Object.keys(CONFIDENTIALITY_CONFIGS) as ConfidentialityLevel[]).map(
        (level) => {
          const config = CONFIDENTIALITY_CONFIGS[level];
          const isSelected = value === level;

          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all",
                isSelected
                  ? "border-[#0B1C3E] bg-[#0B1C3E]/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg shrink-0",
                  config.color.bg,
                  config.color.text
                )}
              >
                {React.cloneElement(config.icon, {
                  className: "w-4 h-4",
                })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{config.label}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] border-0",
                      config.color.bg,
                      config.color.text
                    )}
                  >
                    {config.accessDescription}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {config.description}
                </p>
              </div>
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                  isSelected
                    ? "border-[#0B1C3E] bg-[#0B1C3E]"
                    : "border-muted-foreground/30"
                )}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          );
        }
      )}
    </div>
  );
}

// Legend component for displaying all levels
interface ConfidentialityLegendProps {
  className?: string;
}

export function ConfidentialityLegend({ className }: ConfidentialityLegendProps) {
  return (
    <div className={cn("space-y-2 p-4 bg-muted/30 rounded-lg", className)}>
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Info className="w-4 h-4" />
        Confidentiality Levels
      </h4>
      <div className="space-y-2">
        {(Object.keys(CONFIDENTIALITY_CONFIGS) as ConfidentialityLevel[]).map(
          (level) => {
            const config = CONFIDENTIALITY_CONFIGS[level];
            return (
              <div key={level} className="flex items-center gap-2">
                <div
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    config.color.bg,
                    config.color.text
                  )}
                >
                  {config.label}
                </div>
                <span className="text-xs text-muted-foreground">
                  {config.description}
                </span>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

// Compact indicator for lists
interface ConfidentialityIndicatorProps {
  level: ConfidentialityLevel;
  showLabel?: boolean;
  className?: string;
}

export function ConfidentialityIndicator({
  level,
  showLabel = false,
  className,
}: ConfidentialityIndicatorProps) {
  const config = CONFIDENTIALITY_CONFIGS[level];

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        className={cn(
          "rounded-full",
          level === "public" && "bg-gray-400",
          level === "internal" && "bg-blue-500",
          level === "confidential" && "bg-amber-500",
          level === "restricted" && "bg-red-500",
          showLabel ? "w-2 h-2" : "w-2.5 h-2.5"
        )}
        title={`${config.label}: ${config.description}`}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">{config.label}</span>
      )}
    </div>
  );
}

export default DocumentConfidentialityBadge;
