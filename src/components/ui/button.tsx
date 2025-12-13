import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#0B1C3E] text-white hover:bg-[#1a3a6e] shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-red-700 shadow-sm",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm", // bg-background is solid white in light mode
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary shadow-sm",
        ghost: "bg-muted text-secondary-foreground hover:bg-muted shadow-sm", // Changed from transparent to solid muted
        link: "text-primary underline-offset-4 hover:underline",
        gold: "bg-hotel-gold text-white hover:bg-hotel-gold-dark shadow-sm",
        navy: "bg-hotel-navy text-white hover:bg-hotel-navy-light shadow-sm",
      },
      size: {
        default: "h-11 px-4 py-2.5 text-sm",
        sm: "h-10 rounded-md px-3",
        lg: "h-12 rounded-md px-8",
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

