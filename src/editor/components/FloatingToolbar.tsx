import ToolbarButton from '@/editor/toolbar/ToolbarButton'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    Italic,
    Link2,
    Sparkles,
    Strikethrough,
    Trash2,
    Underline,
} from 'lucide-react'

interface FloatingToolbarProps {
  editor: Editor | null
  disabled?: boolean
  onOpenAiPanel: () => void
}

function parseWidth(width?: string): number {
  if (!width) return 100
  const numeric = Number(String(width).replace('%', ''))
  if (Number.isNaN(numeric)) return 100
  return Math.min(Math.max(numeric, 20), 100)
}

export function FloatingToolbar({ editor, disabled = false, onOpenAiPanel }: FloatingToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            isImage: e.isActive('image'),
            imageAlign: (e.getAttributes('image').align as string) || 'center',
            imageWidth: parseWidth(e.getAttributes('image').width as string | undefined),
            isBold: e.isActive('bold'),
            isItalic: e.isActive('italic'),
            isUnderline: e.isActive('underline'),
            isStrike: e.isActive('strike'),
            isLink: e.isActive('link'),
          }
        : null,
  })

  if (!editor || disabled) return null

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="editorBubbleMenu"
      updateDelay={150}
      resizeDelay={120}
      options={{ placement: 'top', offset: 8, flip: true, shift: { padding: 8 } }}
      shouldShow={({ editor: e, state: pmState, from, to }) => {
        if (!e.isEditable || !e.isFocused) return false
        if (e.isActive('image')) return true
        // Only for a real, non-collapsed text selection inside a text block —
        // not while dragging over images/tables/code.
        if (from === to) return false
        if (e.isActive('codeBlock')) return false
        const slice = pmState.doc.textBetween(from, to, ' ').trim()
        return slice.length > 0
      }}
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl ring-1 ring-white/10">
        {state?.isImage ? (
          <>
            <ToolbarButton
              variant="floating"
              icon={AlignLeft}
              label="Float left"
              active={state.imageAlign === 'left'}
              onClick={() => {
                const w = editor.getAttributes('image').width || '100%'
                editor.chain().focus().updateAttributes('image', {
                  align: 'left',
                  width: w === '100%' ? '50%' : w,
                }).run()
              }}
            />
            <ToolbarButton
              variant="floating"
              icon={AlignCenter}
              label="Center"
              active={state.imageAlign === 'center'}
              onClick={() => editor.chain().focus().updateAttributes('image', { align: 'center' }).run()}
            />
            <ToolbarButton
              variant="floating"
              icon={AlignRight}
              label="Float right"
              active={state.imageAlign === 'right'}
              onClick={() => {
                const w = editor.getAttributes('image').width || '100%'
                editor.chain().focus().updateAttributes('image', {
                  align: 'right',
                  width: w === '100%' ? '50%' : w,
                }).run()
              }}
            />
            <div className="mx-1 h-6 w-px bg-slate-700" />
            {[25, 50, 75, 100].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => editor.chain().focus().updateAttributes('image', { width: `${w}%` }).run()}
                className={cn(
                  'h-7 min-w-[34px] rounded px-1.5 text-[10px] font-bold transition-colors',
                  state.imageWidth === w
                    ? 'bg-hotel-gold text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white',
                )}
              >
                {w}%
              </button>
            ))}
            <div className="mx-1 h-6 w-px bg-slate-700" />
            <ToolbarButton
              variant="floating"
              icon={Trash2}
              label="Delete image"
              className="text-red-400 hover:bg-red-900 hover:text-white"
              onClick={() => editor.chain().focus().deleteSelection().run()}
            />
          </>
        ) : (
          <>
            <ToolbarButton variant="floating" icon={Bold} label="Bold" active={state?.isBold} onClick={() => editor.chain().focus().toggleBold().run()} />
            <ToolbarButton variant="floating" icon={Italic} label="Italic" active={state?.isItalic} onClick={() => editor.chain().focus().toggleItalic().run()} />
            <ToolbarButton variant="floating" icon={Underline} label="Underline" active={state?.isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()} />
            <ToolbarButton variant="floating" icon={Strikethrough} label="Strikethrough" active={state?.isStrike} onClick={() => editor.chain().focus().toggleStrike().run()} />
            <ToolbarButton
              variant="floating"
              icon={Link2}
              label="Link"
              active={state?.isLink}
              onClick={() => {
                const prev = (editor.getAttributes('link').href as string) || ''
                const url = window.prompt('Link URL', prev)
                if (url === null) return
                if (url.trim() === '') {
                  editor.chain().focus().unsetLink().run()
                  return
                }
                const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
                editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run()
              }}
            />
            <div className="mx-0.5 h-6 w-px bg-slate-700" />
            <button
              type="button"
              className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-hotel-gold transition-colors hover:bg-slate-700 hover:text-white"
              onClick={onOpenAiPanel}
            >
              <Sparkles className="me-1 h-3.5 w-3.5" />
              AI
            </button>
          </>
        )}
      </div>
    </BubbleMenu>
  )
}

export default FloatingToolbar
