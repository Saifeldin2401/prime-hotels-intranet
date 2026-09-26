import React from 'react'
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu'

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
  /** A single focusable element (usually a button) that opens the menu. */
  trigger: React.ReactNode
  items: DropdownMenuItemConfig[]
  align?: 'start' | 'end'
  /** Optional content above the items, e.g. who is signed in. */
  header?: React.ReactNode
  className?: string
}

/**
 * Action menu on Radix: arrow-key navigation, typeahead, Escape to close and
 * focus returned to the trigger.
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items, align = 'end', header, className = '' }) => (
  <MenuPrimitive.Root>
    <MenuPrimitive.Trigger asChild>{trigger}</MenuPrimitive.Trigger>
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        align={align}
        sideOffset={6}
        className={`z-50 min-w-[220px] rounded-[6px] border border-ds-border bg-ds-surface p-1 font-sans shadow-lg shadow-black/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none ${className}`}
      >
        {header && <div className="px-3 pb-2 pt-2.5">{header}</div>}
        {items.map((item) =>
          item.divider ? (
            <MenuPrimitive.Separator key={item.id} className="my-1 h-px bg-ds-border" />
          ) : (
            <MenuPrimitive.Item
              key={item.id}
              disabled={item.disabled}
              onSelect={() => item.onClick?.()}
              className={`flex min-h-[40px] cursor-pointer select-none items-center gap-2.5 rounded-[4px] px-3 text-sm outline-none transition-colors data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 ${
                item.destructive
                  ? 'text-ds-danger data-[highlighted]:bg-ds-danger-soft'
                  : 'text-ds-ink data-[highlighted]:bg-ds-surface-subtle'
              }`}
            >
              {item.icon && <span className="shrink-0 text-ds-muted" aria-hidden="true">{item.icon}</span>}
              <span className="truncate">{item.label}</span>
            </MenuPrimitive.Item>
          )
        )}
      </MenuPrimitive.Content>
    </MenuPrimitive.Portal>
  </MenuPrimitive.Root>
)
