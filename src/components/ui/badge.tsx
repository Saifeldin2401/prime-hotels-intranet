import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
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
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const dotColorMap: Record<NonNullable<VariantProps<typeof badgeVariants>['variant']>, string> = {
  default: "bg-hotel-navy",
  secondary: "bg-secondary",
  destructive: "bg-destructive",
  outline: "border border-input bg-transparent",
  gold: "bg-hotel-gold",
  navy: "bg-hotel-navy",
  "outline-gold": "bg-hotel-gold",
  success: "bg-success",
  warning: "bg-warning",
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot, ...props }: BadgeProps) {
  if (dot) {
    return (
      <div className={cn("h-2.5 w-2.5 rounded-full", dotColorMap[variant ?? 'default'], className)} />
    )
  }
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

