import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Tokenized base. Tactile press feedback (active:scale-[0.98]) with Apple/Emil snappy transition curve. Motion is auto-disabled via prefers-reduced-motion.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline:
          "border border-input bg-background/80 hover:bg-accent hover:text-accent-foreground shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground", // Transparent by default — recedes until hovered
        link: "text-primary underline-offset-4 hover:underline",
        gold: "bg-hotel-gold text-white hover:bg-hotel-gold-dark shadow-sm",
        navy: "bg-hotel-navy text-white hover:bg-hotel-navy-light shadow-sm",
        copper: "bg-altus-copper text-white hover:bg-altus-copper/90 shadow-sm",
        sand: "bg-altus-sand text-hotel-navy hover:bg-altus-sand/80 shadow-sm",
      },
      size: {
        default: "h-11 px-4 py-2.5 text-sm",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
        "mobile": "h-12 px-5 py-3 text-base w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const DARK_BG_REGEX = /\bbg-(?:hotel-navy|hotel-navy-dark|hotel-navy-light|altus-copper|altus-charcoal|slate-(?:700|800|900|950)|gray-(?:700|800|900|950)|zinc-(?:700|800|900|950)|neutral-(?:700|800|900|950)|stone-(?:700|800|900|950)|black|blue-(?:600|700|800|900)|indigo-(?:600|700|800|900)|purple-(?:600|700|800|900)|rose-(?:600|700|800|900)|red-(?:600|700|800|900)|emerald-(?:600|700|800|900)|green-(?:600|700|800|900))\b/
const HAS_TEXT_COLOR_REGEX = /\btext-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|hotel|altus|primary|secondary|muted|accent|destructive)\b/

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const needsTextWhite = className && DARK_BG_REGEX.test(className) && !HAS_TEXT_COLOR_REGEX.test(className)
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), needsTextWhite ? "text-white" : undefined, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

