import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-hotel-navy text-white hover:bg-hotel-navy-light",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-red-700",
        outline: "border border-input text-foreground bg-transparent",
        gold: "border-transparent bg-hotel-gold text-white hover:bg-hotel-gold-dark",
        navy: "border-transparent bg-hotel-navy text-white hover:bg-hotel-navy-light",
        "outline-gold": "text-hotel-gold border-hotel-gold hover:bg-hotel-gold/10",
        success: "border-success/20 bg-success text-success-foreground",
        warning: "border-warning/20 bg-warning text-warning-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
  VariantProps<typeof badgeVariants> {
  /** Renders a small filled dot instead of a label */
  dot?: boolean
  /** Numeric count to display; overrides children when set */
  count?: number
  /** Max count before showing "N+" (default 99) */
  maxCount?: number
}

function Badge({ className, variant, size, dot, count, maxCount = 99, children, ...props }: BadgeProps) {
  if (dot) {
    const dotSizes: Record<string, string> = { sm: "h-2 w-2", md: "h-2.5 w-2.5", lg: "h-3 w-3" }
    return (
      <span
        className={cn(
          "rounded-full",
          badgeVariants({ variant }),
          dotSizes[size ?? "md"],
          className
        )}
        {...props}
      />
    )
  }

  const displayCount = count !== undefined
    ? (count > maxCount ? `${maxCount}+` : count)
    : undefined

  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {displayCount !== undefined ? displayCount : children}
    </span>
  )
}

export { Badge, badgeVariants }
