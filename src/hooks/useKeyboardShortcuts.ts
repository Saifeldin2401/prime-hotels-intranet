import { useEffect, useCallback } from 'react'

interface KeyboardShortcut {
  key: string
  modifier?: 'ctrl' | 'meta' | 'alt' | 'shift'
  handler: () => void
  description: string
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      shortcuts.forEach((shortcut) => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
        
        let modifierMatches = true
        if (shortcut.modifier) {
          switch (shortcut.modifier) {
            case 'ctrl':
              modifierMatches = event.ctrlKey || event.metaKey
              break
            case 'meta':
              modifierMatches = event.metaKey
              break
            case 'alt':
              modifierMatches = event.altKey
              break
            case 'shift':
              modifierMatches = event.shiftKey
              break
          }
        }

        if (keyMatches && modifierMatches) {
          // Don't trigger if user is typing in an input
          const target = event.target as HTMLElement
          if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
          ) {
            return
          }

          event.preventDefault()
          shortcut.handler()
        }
      })
    },
    [shortcuts, enabled]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Predefined shortcut hooks for common operations
export function useReviewShortcuts({
  onNext,
  onPrevious,
  onClose,
  onRespond,
  onAssign,
  onEscalate,
  enabled = true,
}: {
  onNext?: () => void
  onPrevious?: () => void
  onClose?: () => void
  onRespond?: () => void
  onAssign?: () => void
  onEscalate?: () => void
  enabled?: boolean
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'j',
      handler: () => onNext?.(),
      description: 'Go to next review',
    },
    {
      key: 'k',
      handler: () => onPrevious?.(),
      description: 'Go to previous review',
    },
    {
      key: 'Escape',
      handler: () => onClose?.(),
      description: 'Close review dialog',
    },
    {
      key: 'r',
      handler: () => onRespond?.(),
      description: 'Open respond tab',
    },
    {
      key: 'a',
      handler: () => onAssign?.(),
      description: 'Assign review',
    },
    {
      key: 'e',
      modifier: 'ctrl',
      handler: () => onEscalate?.(),
      description: 'Escalate review',
    },
  ]

  useKeyboardShortcuts({ shortcuts, enabled })

  return shortcuts
}

export function useFilterShortcuts({
  onFocusSearch,
  onClearFilters,
  onSaveFilter,
  enabled = true,
}: {
  onFocusSearch?: () => void
  onClearFilters?: () => void
  onSaveFilter?: () => void
  enabled?: boolean
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: '/',
      handler: () => onFocusSearch?.(),
      description: 'Focus search',
    },
    {
      key: 'c',
      modifier: 'ctrl',
      handler: () => onClearFilters?.(),
      description: 'Clear all filters',
    },
    {
      key: 's',
      modifier: 'ctrl',
      handler: () => onSaveFilter?.(),
      description: 'Save filter preset',
    },
  ]

  useKeyboardShortcuts({ shortcuts, enabled })

  return shortcuts
}

export function useBulkShortcuts({
  onSelectAll,
  onDeselectAll,
  onDelete,
  onExport,
  enabled = true,
}: {
  onSelectAll?: () => void
  onDeselectAll?: () => void
  onDelete?: () => void
  onExport?: () => void
  enabled?: boolean
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'a',
      modifier: 'ctrl',
      handler: () => onSelectAll?.(),
      description: 'Select all reviews',
    },
    {
      key: 'd',
      modifier: 'ctrl',
      handler: () => onDeselectAll?.(),
      description: 'Deselect all',
    },
    {
      key: 'Delete',
      handler: () => onDelete?.(),
      description: 'Delete selected',
    },
    {
      key: 'e',
      modifier: 'ctrl',
      handler: () => onExport?.(),
      description: 'Export selected',
    },
  ]

  useKeyboardShortcuts({ shortcuts, enabled })

  return shortcuts
}

export function getShortcutHelp(): { category: string; shortcuts: { key: string; desc: string }[] }[] {
  return [
    {
      category: 'Navigation',
      shortcuts: [
        { key: 'j', desc: 'Next review' },
        { key: 'k', desc: 'Previous review' },
        { key: 'Esc', desc: 'Close dialog' },
        { key: '/', desc: 'Focus search' },
      ],
    },
    {
      category: 'Actions',
      shortcuts: [
        { key: 'r', desc: 'Open respond' },
        { key: 'a', desc: 'Assign' },
        { key: 'Ctrl+E', desc: 'Escalate' },
      ],
    },
    {
      category: 'Filters',
      shortcuts: [
        { key: 'Ctrl+C', desc: 'Clear filters' },
        { key: 'Ctrl+S', desc: 'Save filter' },
      ],
    },
    {
      category: 'Bulk',
      shortcuts: [
        { key: 'Ctrl+A', desc: 'Select all' },
        { key: 'Ctrl+D', desc: 'Deselect all' },
        { key: 'Delete', desc: 'Delete selected' },
        { key: 'Ctrl+E', desc: 'Export' },
      ],
    },
  ]
}
