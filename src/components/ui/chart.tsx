import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const chartVariants = cva(
  "relative aspect-video overflow-hidden rounded-lg border",
  {
    variants: {
      variant: {
        default: "bg-background",
        secondary: "bg-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface ChartProps
  extends React.CanvasHTMLAttributes<HTMLCanvasElement>,
    VariantProps<typeof chartVariants> {}

const Chart = React.forwardRef<HTMLCanvasElement, ChartProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div className={cn(chartVariants({ variant }), className)}>
        <canvas ref={ref} {...props} />
      </div>
    )
  }
)
Chart.displayName = "Chart"

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("w-full", className)} {...props} />
))
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute z-50 rounded-lg border bg-popover p-2 text-sm shadow-md",
      className
    )}
    {...props}
  />
))
ChartTooltip.displayName = "ChartTooltip"

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "grid gap-2 rounded-lg bg-popover p-2 text-sm shadow-md",
      className
    )}
    {...props}
  />
))
ChartTooltipContent.displayName = "ChartTooltipContent"

export { Chart, ChartContainer, ChartTooltip, ChartTooltipContent }
