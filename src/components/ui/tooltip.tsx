"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface TooltipProviderProps {
  children: React.ReactNode
  delayDuration?: number
}

const TooltipContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>
}

interface TooltipProps {
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Tooltip({ children }: TooltipProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </TooltipContext.Provider>
  )
}

interface TooltipTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

const TooltipTrigger = React.forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  ({ children, asChild }, ref) => {
    const context = React.useContext(TooltipContext)
    if (!context) throw new Error("TooltipTrigger must be used within Tooltip")
    
    const { setOpen } = context
    
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
        onFocus: () => setOpen(true),
        onBlur: () => setOpen(false),
        ref,
      })
    }
    
    return (
      <span
        ref={ref}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-block"
      >
        {children}
      </span>
    )
  }
)
TooltipTrigger.displayName = "TooltipTrigger"

interface TooltipContentProps {
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  sideOffset?: number
  className?: string
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ children, className, side = "top", align = "center", sideOffset = 4 }, ref) => {
    const context = React.useContext(TooltipContext)
    if (!context) throw new Error("TooltipContent must be used within Tooltip")
    
    const { open } = context
    
    if (!open) return null
    
    const positionClasses = {
      top: "bottom-full mb-2",
      bottom: "top-full mt-2",
      left: "end-full me-2",
      right: "start-full ms-2",
    }
    
    const alignClasses = {
      start: side === "top" || side === "bottom" ? "start-0" : "top-0",
      center: side === "top" || side === "bottom" ? "start-1/2 -translate-x-1/2" : "top-1/2 -translate-y-1/2",
      end: side === "top" || side === "bottom" ? "end-0" : "bottom-0",
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "absolute z-[12000] px-2 py-1 text-xs rounded-md bg-slate-800 text-white whitespace-nowrap",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          positionClasses[side],
          alignClasses[align],
          className
        )}
        style={{ 
          marginTop: side === "bottom" ? sideOffset : undefined,
          marginBottom: side === "top" ? sideOffset : undefined,
          marginLeft: side === "right" ? sideOffset : undefined,
          marginRight: side === "left" ? sideOffset : undefined,
        }}
      >
        {children}
      </div>
    )
  }
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
