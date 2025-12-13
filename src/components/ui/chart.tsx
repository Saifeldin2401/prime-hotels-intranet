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
  VariantProps<typeof chartVariants> { }

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
      "absolute z-50 rounded-lg border bg-white dark:bg-slate-950 p-2 text-sm shadow-md",
      className
    )}
    {...props}
  />
))
ChartTooltip.displayName = "ChartTooltip"

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  }
>(({ className, sideOffset = 4, hideLabel = false, hideIndicator = false, indicator = "dot", nameKey, labelKey, ...props }, ref) => {
  const {
    active,
    payload,
    label,
    contentStyle,
    itemStyle,
    labelStyle,
    cursor,
    filterNull,
    isAnimationActive,
    itemSorter,
    reverseDirection,
    useTranslate3d,
    wrapperStyle,
    activeIndex,
    accessibilityLayer,
    ...otherProps
  } = props as any

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs shadow-xl transition-all ease-in-out animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      )}
      {...otherProps}
    >
      {!hideLabel && (
        <div className={cn("font-medium", "mb-1")}>
          {label}
        </div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item: any, index: number) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          const indicatorColor = item.payload.fill || item.color

          return (
            <div
              key={key}
              className={cn(
                "flex w-full items-center gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                indicator === "dot" && "items-center"
              )}
            >
              {!hideIndicator && (
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: indicatorColor }}
                />
              )}
              <div className="flex flex-1 justify-between leading-none gap-4">
                <span className="text-muted-foreground capitalize">
                  {itemConfig?.label || item.name}
                </span>
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {item.value.toLocaleString()}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

// Helper to safely get config (since config isn't passed here in this lightweight version, we fallback safely)
// Actually, 'config' is usually passed via context in shadcn charts, but here we don't see the context provider.
// We will stick to using item.name and item.color directly for simplicity as per the current setup.
function getPayloadConfigFromPayload(config: any, payload: unknown, key: string) {
  return undefined
}
const config = {} // Mock config for standalone safety

export { Chart, ChartContainer, ChartTooltip, ChartTooltipContent }
