import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-hotel-navy text-white hover:bg-hotel-navy-light shadow-sm",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "border-border text-foreground bg-transparent",
        gold: "border-transparent bg-hotel-gold text-white hover:bg-hotel-gold-dark shadow-sm",
        navy: "border-transparent bg-hotel-navy text-white hover:bg-hotel-navy-light shadow-sm",
        copper: "border-transparent bg-altus-copper text-white hover:bg-altus-copper/90 shadow-sm",
        emerald: "border-transparent bg-altus-emerald text-white hover:bg-altus-emerald/90 shadow-sm",
        sand: "border-altus-sand/40 bg-altus-sand/20 text-hotel-navy dark:text-altus-sand-light font-semibold",
        "outline-gold": "text-hotel-gold border-hotel-gold/40 hover:bg-hotel-gold/10",
        "outline-copper": "text-altus-copper border-altus-copper/40 hover:bg-altus-copper/10",
        success: "border-success/20 bg-success/15 text-success dark:text-success-foreground font-semibold",
        warning: "border-warning/20 bg-warning/15 text-warning dark:text-warning-foreground font-semibold",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
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

  const isNumeric = count !== undefined || typeof children === 'number'

  return (
    <span className={cn(badgeVariants({ variant, size }), isNumeric && "font-mono tracking-tight", className)} {...props}>
      {displayCount !== undefined ? displayCount : children}
    </span>
  )
}

export { Badge, badgeVariants }
