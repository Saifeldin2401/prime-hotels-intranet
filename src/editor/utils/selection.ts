import type { Editor } from '@tiptap/react'
import { DOMSerializer } from '@tiptap/pm/model'
import type { SelectedContent } from '@/editor/types'

export function getSelectedContent(editor: Editor): SelectedContent | null {
  const { from, to, empty } = editor.state.selection
  if (empty) return null

  const slice = editor.state.selection.content()
  const serializer = DOMSerializer.fromSchema(editor.state.schema)
  const container = document.createElement('div')
  container.appendChild(serializer.serializeFragment(slice.content))

  const html = container.innerHTML
  const text = editor.state.doc.textBetween(from, to, ' ').trim()

  if (!html && !text) return null

  return {
    from,
    to,
    html,
    text,
  }
}
