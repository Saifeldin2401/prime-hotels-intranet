import { useMemo } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Sparkles,
  Strikethrough,
  Trash2,
  Underline,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ToolbarButton from '@/editor/toolbar/ToolbarButton'

interface FloatingToolbarProps {
  editor: Editor | null
  disabled?: boolean
  onOpenAiPanel: () => void
}

function parseWidth(width?: string): number {
  if (!width) return 100
  const numeric = Number(width.replace('%', ''))
  if (Number.isNaN(numeric)) return 100
  return Math.min(Math.max(numeric, 20), 100)
}

export function FloatingToolbar({ editor, disabled = false, onOpenAiPanel }: FloatingToolbarProps) {
  const imageWidth = useMemo(() => {
    if (!editor?.isActive('image')) return 100
    return parseWidth(editor.getAttributes('image').width)
  }, [editor, editor?.state.selection.from, editor?.state.selection.to])

  if (!editor || disabled) return null

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ state, editor }) => {
        // Don't show if editor is not focused
        if (!editor.isFocused) return false

        const isImage = editor.isActive('image')
        const isSelected = !state.selection.empty
        return isImage || isSelected
      }}
    >
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-2xl ring-1 ring-white/10">
        {editor.isActive('image') ? (
          <div className="flex items-center gap-1.5 px-2 py-1">
            <div className="flex items-center gap-1">
              <ToolbarButton
                variant="floating"
                icon={AlignLeft}
                label="Float left"
                active={editor.getAttributes('image').align === 'left'}
                onClick={() => {
                  const currentWidth = editor.getAttributes('image').width || '100%'
                  editor.chain().focus().updateAttributes('image', {
                    align: 'left',
                    width: currentWidth === '100%' ? '50%' : currentWidth
                  }).run()
                }}
              />
              <ToolbarButton
                variant="floating"
                icon={AlignCenter}
                label="Center block"
                active={editor.getAttributes('image').align === 'center' || (!editor.getAttributes('image').align)}
                onClick={() => editor.chain().focus().updateAttributes('image', { align: 'center' }).run()}
              />
              <ToolbarButton
                variant="floating"
                icon={AlignRight}
                label="Float right"
                active={editor.getAttributes('image').align === 'right'}
                onClick={() => {
                  const currentWidth = editor.getAttributes('image').width || '100%'
                  editor.chain().focus().updateAttributes('image', {
                    align: 'right',
                    width: currentWidth === '100%' ? '50%' : currentWidth
                  }).run()
                }}
              />
            </div>

            <div className="mx-1 h-6 w-px bg-slate-700" />

            <div className="flex items-center gap-1">
              {[25, 50, 75, 100].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => editor.chain().focus().updateAttributes('image', { width: `${w}%` }).run()}
                  className={cn(
                    'h-7 min-w-[32px] rounded px-1.5 text-[10px] font-bold uppercase transition-colors',
                    parseWidth(editor.getAttributes('image').width) === w
                      ? 'bg-hotel-gold text-white'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  )}
                >
                  {w}%
                </button>
              ))}
            </div>

            <div className="mx-1 h-6 w-px bg-slate-700" />

            <ToolbarButton
              variant="floating"
              icon={Trash2}
              label="Delete image"
              className="border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-900 hover:text-white"
              onClick={() => editor.chain().focus().deleteSelection().run()}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <ToolbarButton
              variant="floating"
              icon={Bold}
              label="Bold"
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              variant="floating"
              icon={Italic}
              label="Italic"
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              variant="floating"
              icon={Underline}
              label="Underline"
              active={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
            <ToolbarButton
              variant="floating"
              icon={Strikethrough}
              label="Strikethrough"
              active={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            />
            <button
              type="button"
              className="ml-1 inline-flex h-8 items-center rounded-md border border-slate-700 bg-slate-800 px-2 text-xs font-medium text-hotel-gold transition-colors hover:bg-slate-700 hover:text-white"
              onClick={onOpenAiPanel}
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              AI Assist
            </button>
          </div>
        )}
      </div>
    </BubbleMenu>
  )
}

export default FloatingToolbar
