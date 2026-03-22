import AIAssistPanel from '@/editor/ai/AIAssistPanel'
import EditorStatusBar from '@/editor/components/EditorStatusBar'
import FloatingToolbar from '@/editor/components/FloatingToolbar'
import { QuickInsertMenu } from '@/editor/components/QuickInsertMenu'
import { createEditorExtensions } from '@/editor/plugins/extensions'
import '@/editor/styles.css'
import EditorToolbar from '@/editor/toolbar/EditorToolbar'
import { mergeToolbarConfig } from '@/editor/toolbar/toolbarConfig'
import type { EditorOutput, RichTextEditorProps, SaveState } from '@/editor/types'
import { copyToClipboard } from '@/editor/utils/clipboard'
import { serializeEditorContent } from '@/editor/utils/serialization'
import { uploadImageToSupabase } from '@/editor/utils/supabaseUpload'
import { sanitizeHtml } from '@/lib/sanitize'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

function buildEmptyOutput(): EditorOutput {
  return {
    html: '',
    json: { type: 'doc', content: [] },
    markdown: '',
    text: '',
    wordCount: 0,
    characterCount: 0,
    updatedAt: new Date().toISOString(),
  }
}

export function CustomRichTextEditor({
  value,
  onChange,
  onContentChange,
  placeholder = 'Start typing your content here...',
  className,
  minHeight = 320,
  disabled = false,
  direction = 'ltr',
  toolbarConfig,
  autosave,
  ai,
  supabaseBucket = 'documents',
}: RichTextEditorProps) {
  // 1. Config & State
  const mergedToolbarConfig = useMemo(() => mergeToolbarConfig(toolbarConfig), [toolbarConfig])
  const aiEnabled = ai?.enabled !== false
  const sanitizedValue = useMemo(() => sanitizeHtml(value || ''), [value])
  const extensions = useMemo(() => createEditorExtensions({ placeholder }), [placeholder])

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [changeVersion, setChangeVersion] = useState(0)
  const [quickInsertPos, setQuickInsertPos] = useState<{ x: number; y: number } | null>(null)

  // 2. Refs
  const editorRef = useRef<Editor | null>(null)
  const latestOutputRef = useRef<EditorOutput>(buildEmptyOutput())
  const autosaveTimerRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isMountedRef = useRef(false)

  // 3. Editor Hook
  const editor = useEditor({
    extensions,
    content: sanitizedValue,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'phg-editor-content prose max-w-none focus:outline-none',
        dir: direction,
      },
      handleDrop: (view, event) => {
        const droppedFiles = Array.from(event.dataTransfer?.files || []).filter((file) => file.type.startsWith('image/'))
        if (!droppedFiles.length) return false

        event.preventDefault()
        const position = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        // We use the ref here to avoid TDZ issues during initialization
        void handleImageUpload(droppedFiles, position)
        return true
      },
      handlePaste: (_view, event) => {
        const pastedFiles = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith('image/'))
        if (!pastedFiles.length) return false

        event.preventDefault()
        void handleImageUpload(pastedFiles)
        return true
      },
    },
    onCreate: ({ editor: currentEditor }) => {
      editorRef.current = currentEditor
      emitContentChange(currentEditor, false)
    },
    onUpdate: ({ editor: currentEditor }) => {
      emitContentChange(currentEditor)
    },
    onDestroy: () => {
      editorRef.current = null
    },
  })

  // 4. Callbacks
  const emitContentChange = useCallback(
    (currentEditor: Editor, notifyExternal = true) => {
      const output = serializeEditorContent(currentEditor)
      latestOutputRef.current = output

      if (!isMountedRef.current) return

      if (notifyExternal) {
        onChange?.(output.html)
        onContentChange?.(output)
      }

      setChangeVersion((version) => version + 1)
      setSaveState((state) => (state === 'saving' ? state : 'idle'))
    },
    [onChange, onContentChange],
  )

  const handleImageUpload = useCallback(
    async (files: File[], position?: number) => {
      const currentEditor = editorRef.current || editor
      if (!currentEditor || !isMountedRef.current) return

      const imageFiles = files.filter((file) => file.type.startsWith('image/'))
      if (!imageFiles.length) return

      setIsUploadingImage(true)
      try {
        for (const file of imageFiles) {
          const publicUrl = await uploadImageToSupabase(file, supabaseBucket)
          if (!publicUrl) continue

          const chain = currentEditor.chain().focus()
          if (typeof position === 'number') {
            chain.setTextSelection(position)
          }

          chain
            .insertContent({
              type: 'image',
              attrs: {
                src: publicUrl,
                alt: file.name,
                title: file.name,
                width: '100%',
                align: 'center',
              },
            })
            .run()
        }
        toast.success('Image uploaded successfully')
      } catch (error) {
        toast.error((error as Error).message || 'Image upload failed')
      } finally {
        if (isMountedRef.current) {
          setIsUploadingImage(false)
        }
      }
    },
    [editor, supabaseBucket],
  )

  // 5. Effects
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    editorRef.current = editor || null
  }, [editor])

  useEffect(() => {
    if (!editor || !isMountedRef.current) return
    const incoming = sanitizedValue
    const current = editor.getHTML()

    if (incoming !== current && !editor.isFocused && !isUploadingImage) {
      editor.commands.setContent(incoming, { emitUpdate: false })
      latestOutputRef.current = serializeEditorContent(editor)
    }
  }, [sanitizedValue, editor, isUploadingImage])

  useEffect(() => {
    if (!autosave?.enabled || !autosave.onAutosave) return
    if (!changeVersion) return

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
    }

    const delay = autosave.delayMs ?? 1200
    autosaveTimerRef.current = window.setTimeout(async () => {
      setSaveState('saving')
      try {
        await autosave.onAutosave(latestOutputRef.current)
        setSaveState('saved')
        setLastSavedAt(new Date().toISOString())
      } catch {
        setSaveState('error')
      }
    }, delay)

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [autosave, changeVersion])

  // 6. Handlers
  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    await handleImageUpload(files)
    event.target.value = ''
  }

  const copyHtml = async () => {
    const success = await copyToClipboard(latestOutputRef.current.html)
    if (success) toast.success('HTML copied')
    else toast.error('Failed to copy HTML')
  }

  const copyMarkdown = async () => {
    const success = await copyToClipboard(latestOutputRef.current.markdown)
    if (success) toast.success('Markdown copied')
    else toast.error('Failed to copy Markdown')
  }

  const handleDoubleClick = (event: React.MouseEvent) => {
    if (disabled || !editor) return

    const target = event.target as HTMLElement
    // Ignore if clicked on image or already in a menu
    if (target.tagName === 'IMG' || target.closest('.editor-image') || target.closest('.bubble-menu')) return

    const view = editor.view
    const coords = { left: event.clientX, top: event.clientY }
    const pos = view.posAtCoords(coords)?.pos

    if (typeof pos === 'number') {
      try {
        editor.chain().focus(pos).run()
      } catch (_err) {
        editor.commands.focus()
      }

      setQuickInsertPos({ x: event.clientX, y: event.clientY })
    }
  }

  return (
    <div
      className={cn(
        'phg-rich-editor rounded-xl border bg-card shadow-sm',
        isFullscreen && 'phg-rich-editor--fullscreen',
        className,
      )}
      dir={direction}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <EditorToolbar
        editor={editor}
        disabled={disabled}
        config={mergedToolbarConfig}
        onUploadImage={() => fileInputRef.current?.click()}
        onOpenAiPanel={() => setIsAiPanelOpen(!isAiPanelOpen)}
        onCopyHtml={copyHtml}
        onCopyMarkdown={copyMarkdown}
        onToggleFullscreen={() => setIsFullscreen((state) => !state)}
        isFullscreen={isFullscreen}
      />

      <div className="relative">
        <FloatingToolbar
          editor={editor}
          disabled={disabled}
          onOpenAiPanel={() => setIsAiPanelOpen(true)}
        />

        <div
          className="phg-editor-surface px-3 py-3"
          style={{ minHeight }}
          onDoubleClick={handleDoubleClick}
        >
          <EditorContent editor={editor} />

          {isUploadingImage && (
            <div className="editor-uploading-banner">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading image...
            </div>
          )}
        </div>
      </div>

      {mergedToolbarConfig.features.aiAssist && aiEnabled && editor && isAiPanelOpen && (
        <div className="ai-assist-panel-inline">
          <div className="max-w-4xl mx-auto">
            <AIAssistPanel
              editor={editor}
              open={isAiPanelOpen}
              onOpenChange={setIsAiPanelOpen}
              aiConfig={ai}
              direction={direction}
            />
          </div>
        </div>
      )}

      <EditorStatusBar
        wordCount={latestOutputRef.current.wordCount}
        characterCount={latestOutputRef.current.characterCount}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
      />

      {quickInsertPos && editor && !isAiPanelOpen && (
        <QuickInsertMenu
          editor={editor}
          position={quickInsertPos}
          onClose={() => setQuickInsertPos(null)}
          onUploadImage={() => fileInputRef.current?.click()}
          onOpenAiPanel={() => setIsAiPanelOpen(true)}
        />
      )}
    </div>
  )
}

export default CustomRichTextEditor
