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



