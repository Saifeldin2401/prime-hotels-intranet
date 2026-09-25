import React from 'react'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: number | string
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  className = '',
}) => {
  return (
    <div className={`w-full border-b border-ds-border ${className}`}>
      <nav className="flex space-x-6 rtl:space-x-reverse -mb-px overflow-x-auto" aria-label="Tabs">
        {items.map((tab) => {
          const isActive = tab.id === activeId

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`group inline-flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? 'border-ds-brass text-ds-ink font-semibold'
                  : 'border-transparent text-ds-muted hover:text-ds-ink hover:border-ds-border'
              }`}
            >
              {tab.icon && (
                <span
                  className={
                    isActive
                      ? 'text-ds-brass'
                      : 'text-ds-muted group-hover:text-ds-ink'
                  }
                >
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`ms-1.5 px-2 py-0.5 text-[11px] font-mono font-medium rounded-full ${
                    isActive
                      ? 'bg-ds-accent-soft text-ds-brass'
                      : 'bg-ds-surface-subtle text-ds-muted'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
