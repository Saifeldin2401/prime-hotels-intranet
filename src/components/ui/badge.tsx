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
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

