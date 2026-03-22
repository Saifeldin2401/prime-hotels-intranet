import type { SaveState } from '@/editor/types'
import { CheckCircle2, Loader2, Save, XCircle } from 'lucide-react'

interface EditorStatusBarProps {
  wordCount: number
  characterCount: number
  saveState: SaveState
  lastSavedAt?: string | null
}

function formatTime(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function EditorStatusBar({
  wordCount,
  characterCount,
  saveState,
  lastSavedAt,
}: EditorStatusBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>{wordCount.toLocaleString()} words</span>
        <span>{characterCount.toLocaleString()} characters</span>
      </div>

      <div className="flex items-center gap-2">
        {saveState === 'saving' && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Saving...</span>
          </>
        )}
        {saveState === 'saved' && (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{lastSavedAt ? `Saved ${formatTime(lastSavedAt)}` : 'Saved'}</span>
          </>
        )}
        {saveState === 'error' && (
          <>
            <XCircle className="h-3.5 w-3.5 text-red-600" />
            <span>Autosave failed</span>
          </>
        )}
        {saveState === 'idle' && (
          <>
            <Save className="h-3.5 w-3.5" />
            <span>Ready</span>
          </>
        )}
      </div>
    </div>
  )
}

export default EditorStatusBar
