import React, { useState } from 'react'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'start' | 'end'
  className?: string
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false)

  const positionStyles = {
    top: 'bottom-full start-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full start-1/2 -translate-x-1/2 mt-1.5',
    start: 'end-full top-1/2 -translate-y-1/2 me-1.5',
    end: 'start-full top-1/2 -translate-y-1/2 ms-1.5',
  }

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none px-2 py-1 text-[11px] font-medium leading-none text-white bg-ds-ink rounded-[4px] shadow-md shadow-black/10 dark:shadow-black/40 whitespace-nowrap font-sans transition-opacity duration-150 ${positionStyles[position]}`}
        >
          {content}
        </div>
      )}
    </div>
  )
}
