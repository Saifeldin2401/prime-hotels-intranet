import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out hover:shadow-md hover:border-border hover:-translate-y-0.5",
  {
    variants: {
      variant: {
        default: "",
        glass: "bg-card/75 backdrop-blur-xl border-white/30 dark:border-white/10 shadow-sm hover:shadow-md hover:border-white/50",
        gold: "bg-hotel-cream dark:bg-hotel-navy/60 border-hotel-gold/30 text-card-foreground shadow-sm hover:shadow-md hover:border-hotel-gold/60",
        navy: "bg-hotel-navy text-white border-hotel-navy-light shadow-lg hover:shadow-xl hover:border-hotel-gold/40",
        copper: "bg-card border-altus-copper/25 text-card-foreground shadow-sm hover:shadow-md hover:border-altus-copper/50",
        elevated: "shadow-lg hover:shadow-xl ring-1 ring-black/5 dark:ring-white/10 hover:border-border",
        premium: "bg-gradient-to-br from-card via-card to-hotel-cream/40 dark:to-hotel-navy/40 border-hotel-gold/30 shadow-lg relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-br after:from-hotel-gold/5 after:to-transparent after:pointer-events-none hover:shadow-xl hover:border-hotel-gold/50",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof cardVariants> { }

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 sm:p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 sm:p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants }
