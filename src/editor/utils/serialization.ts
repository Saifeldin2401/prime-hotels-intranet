import type { Editor } from '@tiptap/react'
import TurndownService from 'turndown'
import type { EditorOutput } from '@/editor/types'

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})

export function serializeEditorContent(editor: Editor): EditorOutput {
  const html = editor.getHTML()
  const json = editor.getJSON()
  const text = editor.getText({ blockSeparator: '\n' })
  const normalizedText = text.trim()
  const wordCount = normalizedText ? normalizedText.split(/\s+/).length : 0
  const characterCount = text.length

  let markdown = ''
  try {
    markdown = turndownService.turndown(html)
  } catch {
    markdown = text
  }

  return {
    html,
    json,
    markdown,
    text,
    wordCount,
    characterCount,
    updatedAt: new Date().toISOString(),
  }
}
