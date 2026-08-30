import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import type { Editor } from '@tiptap/react'
import { Code2, Heading2, Image as ImageIcon, List, ListOrdered, Minus, Quote, Sparkles, Table as TableIcon, Video } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'

interface QuickInsertMenuProps {
  editor: Editor
  /** Screen coords of the caret / click. The menu anchors just below this. */
  position: { x: number; y: number }
  onClose: () => void
  onUploadImage: () => void
  onAddVideo: () => void
  onOpenAiPanel: () => void
}

const MENU_W = 232
const MENU_MAX_H = 320

export function QuickInsertMenu({ editor, position, onClose, onUploadImage, onAddVideo, onOpenAiPanel }: QuickInsertMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Clamp into the viewport; flip above the caret if it would overflow the bottom.
  const coords = useMemo(() => {
    const pad = 8
    const vw = typeof window === 'undefined' ? 1024 : window.innerWidth
    const vh = typeof window === 'undefined' ? 768 : window.innerHeight
    let left = position.x
    let top = position.y + 6
    if (left + MENU_W + pad > vw) left = vw - MENU_W - pad
    if (left < pad) left = pad
    if (top + MENU_MAX_H + pad > vh) top = Math.max(pad, position.y - MENU_MAX_H - 6)
    return { left, top }
  }, [position.x, position.y])

  // Dismiss on outside click, scroll, resize, Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // If the menu was opened by typing "/", remove that slash on selection.
  const run = (fn: () => void) => {
    const { $from, empty } = editor.state.selection
    if (empty && $from.parent.textContent.endsWith('/')) {
      editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).run()
    }
    fn()
    onClose()
  }

  const items = [
    { key: 'h2', label: 'Heading', icon: Heading2, act: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: 'bullet', label: 'Bulleted list', icon: List, act: () => editor.chain().focus().toggleBulletList().run() },
    { key: 'ordered', label: 'Numbered list', icon: ListOrdered, act: () => editor.chain().focus().toggleOrderedList().run() },
    { key: 'quote', label: 'Quote', icon: Quote, act: () => editor.chain().focus().toggleBlockquote().run() },
    { key: 'code', label: 'Code block', icon: Code2, act: () => editor.chain().focus().toggleCodeBlock().run() },
    { key: 'divider', label: 'Divider', icon: Minus, act: () => editor.chain().focus().setHorizontalRule().run() },
    { key: 'table', label: 'Table', icon: TableIcon, act: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { key: 'image', label: 'Image', icon: ImageIcon, act: onUploadImage },
    { key: 'video', label: 'Video', icon: Video, act: onAddVideo },
    { key: 'ai', label: 'AI Assist', icon: Sparkles, act: onOpenAiPanel },
  ]

  return (
    <div
      ref={ref}
      className="fixed z-[120] w-[232px] overflow-hidden rounded-xl border bg-popover shadow-xl"
      style={{ left: coords.left, top: coords.top }}
    >
      <Command loop>
        <CommandInput placeholder="Insert…" className="h-9 text-xs" autoFocus />
        <CommandList className="max-h-[280px]">
          <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">No blocks</CommandEmpty>
          <CommandGroup>
            {items.map((it) => (
              <CommandItem key={it.key} value={it.label} onSelect={() => run(it.act)} className="gap-2 text-xs">
                <it.icon className="h-3.5 w-3.5 text-muted-foreground" />
                {it.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
}
