import React, { useState, useRef, useEffect } from 'react'

export interface DropdownMenuItemConfig {
  id: string
  label: React.ReactNode
  icon?: React.ReactNode
  onClick?: () => void
  destructive?: boolean
  disabled?: boolean
  divider?: boolean
}

export interface DropdownMenuProps {
  trigger: React.ReactNode
  items: DropdownMenuItemConfig[]
  align?: 'start' | 'end'
  className?: string
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  align = 'end',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={menuRef} className={`relative inline-flex ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)} role="button" tabIndex={0}>
        {trigger}
      </div>

      {isOpen && (
        <div
          role="menu"
          className={`absolute z-50 mt-1.5 min-w-[180px] p-1 bg-ds-surface border border-ds-border rounded-[8px] shadow-lg shadow-black/10 dark:shadow-black/40 font-sans transition-all duration-150 motion-reduce:transition-none ${
            align === 'end' ? 'end-0' : 'start-0'
          }`}
        >
          {items.map((item) => {
            if (item.divider) {
              return (
                <div
                  key={item.id}
                  className="my-1 border-t border-ds-border/60"
                  role="separator"
                />
              )
            }

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick?.()
                    setIsOpen(false)
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[6px] text-start transition-colors duration-150 min-h-[36px] ${
                  item.destructive
                    ? 'text-ds-danger hover:bg-ds-danger-soft/40'
                    : 'text-ds-ink hover:bg-ds-surface-subtle'
                } ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
