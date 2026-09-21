import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Building2,
    Globe,
    Lock,
    ShieldAlert,
} from "lucide-react";
import * as React from "react";

type ConfidentialityLevel = "public" | "internal" | "confidential" | "restricted";

interface ConfidentialityConfig {
  level: ConfidentialityLevel;
  label: string;
  description: string;
  detailedDescription: string;
  icon;
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
    label: "Organization-Wide",
    description: "All tenant hotels & staff",
    detailedDescription: "General company-wide document published across all tenant hotels (brand standards, group policies, organization calendar).",
    icon: <Globe className="w-3.5 h-3.5" />,
    color: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-200",
      hover: "hover:bg-gray-200",
    },
    accessDescription: "Organization-Wide (All Hotels)",
    examples: [
      "Tenant Announcements",
      "Brand Guidelines & Standards",
      "Code of Business Conduct",
      "Annual Calendar",
    ],
  },
  internal: {
    level: "internal",
    label: "Hotel-Level",
    description: "Specific hotel & department staff",
    detailedDescription: "Operational standard document accessible only to staff and team members in the assigned hotel property and department.",
    icon: <Building2 className="w-3.5 h-3.5" />,
    color: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-200",
      hover: "hover:bg-blue-200",
    },
    accessDescription: "Assigned Property Staff",
    examples: [
      "Property Standard Operating Procedures",
      "Department Duty Checklists",
      "Local Supplier Directories",
      "Shift Schedules & Handover Logs",
    ],
  },
  confidential: {
    level: "confidential",
    label: "Management",
    description: "HODs & Supervisors only",
    detailedDescription: "Management-level document containing sensitive operational, financial, or personnel information.",
    icon: <Lock className="w-3.5 h-3.5" />,
    color: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200",
      hover: "hover:bg-amber-200",
    },
    accessDescription: "Department Heads & GMs",
    examples: [
      "P&L Budgets & Department Forecasts",
      "Vendor Contracts & Pricing Agreements",
      "Internal Quality & Compliance Audits",
      "Staff Performance Appraisals",
    ],
  },
  restricted: {
    level: "restricted",
    label: "Executive",
    description: "Corporate leadership & HR/Legal",
    detailedDescription: "Highly restricted document accessible only to Super Admins, Corporate Executives, and designated Legal/HR owners.",
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    color: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-200",
      hover: "hover:bg-red-200",
    },
    accessDescription: "Executive Leadership Only",
    examples: [
      "Executive Board Memos",
      "Executive Compensation & Payroll",
      "Legal Compliance & Dispute Records",
      "Hotel Acquisition & Strategic Plans",
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
        variant === "card" && "block w-full text-start h-auto",
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

// Legend component for displaying all levels
interface ConfidentialityLegendProps {
  className?: string;
}

// Compact indicator for lists
interface ConfidentialityIndicatorProps {
  level: ConfidentialityLevel;
  showLabel?: boolean;
  className?: string;
}

export default DocumentConfidentialityBadge;
