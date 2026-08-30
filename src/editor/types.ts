import type { JSONContent } from '@tiptap/core'

export type TextDirection = 'ltr' | 'rtl'

export type AIAssistCommandId =
  | 'beautify'
  | 'beautify_modern'
  | 'beautify_report'
  | 'clarity'
  | 'grammar'
  | 'professional'
  | 'simplify'
  | 'expand'
  | 'create_article'
  | 'blog_post'
  | 'summarize'
  | 'translate'

export interface AIAssistCommand {
  id: AIAssistCommandId
  label: string
  instruction: string
  needsTargetLanguage?: boolean
}

export interface EditorOutput {
  html: string
  json: JSONContent
  markdown: string
  text: string
  wordCount: number
  characterCount: number
  updatedAt: string
}

export interface ToolbarFeatureConfig {
  history: boolean
  headings: boolean
  formatting: boolean
  lists: boolean
  alignment: boolean
  links: boolean
  media: boolean
  tables: boolean
  codeBlock: boolean
  clearFormatting: boolean
  copyActions: boolean
  fullscreen: boolean
  aiAssist: boolean
}

export interface RichEditorToolbarConfig {
  features: ToolbarFeatureConfig
}

export interface AutoSaveConfig {
  enabled: boolean
  delayMs?: number
  onAutosave: (output: EditorOutput) => Promise<void> | void
}

export interface AIConfig {
  enabled?: boolean
  endpoint?: string
  apiKey?: string
  model?: string
  temperature?: number
  maxOutputTokens?: number
  commands?: AIAssistCommand[]
}

export interface RichTextEditorProps {
  value: string
  onChange?: (html: string) => void
  onContentChange?: (output: EditorOutput) => void
  placeholder?: string
  className?: string
  minHeight?: number
  disabled?: boolean
  direction?: TextDirection
  toolbarConfig?: Partial<RichEditorToolbarConfig>
  autosave?: AutoSaveConfig
  ai?: AIConfig
  supabaseBucket?: string
  /**
   * Open the host application's media library and resolve with the chosen
   * asset's public URL (or null if cancelled). When provided, the editor shows
   * "from library" options next to its own upload buttons.
   */
  onPickMedia?: (kind: 'image' | 'video') => Promise<string | null>
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface SelectedContent {
  from: number
  to: number
  html: string
  text: string
}

export interface AIRequestPayload {
  command: AIAssistCommand
  selectedHtml: string
  selectedText: string
  targetLanguage?: string
  model: string
  temperature: number
  maxOutputTokens: number
}
