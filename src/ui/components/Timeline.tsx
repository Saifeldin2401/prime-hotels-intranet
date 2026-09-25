import React from 'react'
import { Check } from 'lucide-react'

export interface TimelineStep {
  id: string
  label: string
  date?: string
  status: 'completed' | 'current' | 'upcoming'
}

export interface TimelineProps {
  steps: TimelineStep[]
  className?: string
}

export const Timeline: React.FC<TimelineProps> = ({ steps, className = '' }) => {
  return (
    <div className={`w-full font-sans ${className}`}>
      <ol className="flex items-center w-full">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1
          const isCompleted = step.status === 'completed'
          const isCurrent = step.status === 'current'

          return (
            <li
              key={step.id}
              className={`flex items-center ${isLast ? 'flex-none' : 'flex-1'}`}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                    isCompleted
                      ? 'bg-ds-success text-white'
                      : isCurrent
                      ? 'bg-ds-brass text-white ring-4 ring-ds-brass/20'
                      : 'bg-ds-surface-subtle text-ds-muted'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span
                  className={`mt-1.5 text-[11px] font-medium whitespace-nowrap text-center ${
                    isCurrent
                      ? 'font-semibold text-ds-ink'
                      : 'text-ds-muted'
                  }`}
                >
                  {step.label}
                </span>
                {step.date && (
                  <span className="text-[10px] font-mono text-ds-muted">
                    {step.date}
                  </span>
                )}
              </div>

              {!isLast && (
                <div
                  className={`h-0.5 w-full mx-3 ${
                    isCompleted
                      ? 'bg-ds-success'
                      : 'bg-ds-border'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
