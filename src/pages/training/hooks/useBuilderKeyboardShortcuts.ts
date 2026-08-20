import { useEffect } from 'react'

interface BuilderKeyboardShortcutOptions {
  onSave?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onPreview?: () => void
  onMagic?: () => void
  canUndo?: boolean
  canRedo?: boolean
  isSaving?: boolean
}

export function useBuilderKeyboardShortcuts({
  onSave,
  onUndo,
  onRedo,
  onPreview,
  onMagic,
  canUndo = true,
  canRedo = true,
  isSaving = false,
}: BuilderKeyboardShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // Check if user is typing in a contenteditable or deep text input where we shouldn't hijack simple keys
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.classList.contains('tiptap') ||
          target.classList.contains('ProseMirror'))

      // Save: Ctrl+S / Cmd+S
      if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (onSave && !isSaving) {
          onSave()
        }
        return
      }

      // Preview: Ctrl+Shift+P / Cmd+Shift+P
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        onPreview?.()
        return
      }

      // AI Wizard: Ctrl+Shift+A / Cmd+Shift+A
      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        onMagic?.()
        return
      }

      // Undo / Redo outside rich text editor
      if (!isInput) {
        if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
          e.preventDefault()
          if (canUndo) onUndo?.()
          return
        }

        if (
          (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') ||
          (isCmdOrCtrl && e.key.toLowerCase() === 'y')
        ) {
          e.preventDefault()
          if (canRedo) onRedo?.()
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSave, onUndo, onRedo, onPreview, onMagic, canUndo, canRedo, isSaving])
}
