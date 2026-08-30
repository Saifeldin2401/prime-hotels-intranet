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
import { uploadFileToSupabase } from '@/editor/utils/supabaseUpload'
import { uploadVideoWithCompression, type VideoUploadPhase } from '@/editor/utils/videoUpload'
import { sanitizeHtml } from '@/lib/sanitize'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
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

function phaseLabel(phase: VideoUploadPhase | null): string | null {
  if (!phase) return null
  switch (phase.stage) {
    case 'loading-engine':
      return 'Preparing video compressor…'
    case 'compressing':
      return phase.progress != null
        ? `Compressing video… ${Math.round(phase.progress * 100)}%`
        : 'Compressing video…'
    case 'uploading':
      return 'Uploading video…'
    default:
      return null
  }
}

export function CustomRichTextEditor({
  value,
  onChange,
  onContentChange,
  placeholder = 'Start writing your content here…',
  className,
  minHeight = 320,
  disabled = false,
  direction = 'ltr',
  toolbarConfig,
  autosave,
  ai,
  // Editor uploads get embedded into saved HTML as <img src>, so they need a
  // durable URL -- 'documents' is private and would embed a URL that 404s.
  supabaseBucket = 'content-media',
  onPickMedia,
}: RichTextEditorProps) {
  const mergedToolbarConfig = useMemo(() => mergeToolbarConfig(toolbarConfig), [toolbarConfig])
  const aiEnabled = ai?.enabled !== false
  const sanitizedValue = useMemo(() => sanitizeHtml(value || ''), [value])
  const extensions = useMemo(() => createEditorExtensions({ placeholder }), [placeholder])

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [videoPhase, setVideoPhase] = useState<VideoUploadPhase | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [quickInsertPos, setQuickInsertPos] = useState<{ x: number; y: number } | null>(null)

  const editorRef = useRef<Editor | null>(null)
  const latestOutputRef = useRef<EditorOutput>(buildEmptyOutput())
  const autosaveTimerRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const videoFileInputRef = useRef<HTMLInputElement | null>(null)
  const isMountedRef = useRef(false)
  const autosaveRef = useRef(autosave)
  autosaveRef.current = autosave

  const scheduleAutosave = useCallback(() => {
    const cfg = autosaveRef.current
    if (!cfg?.enabled || !cfg.onAutosave) return
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(async () => {
      setSaveState('saving')
      try {
        await cfg.onAutosave(latestOutputRef.current)
        if (!isMountedRef.current) return
        setSaveState('saved')
        setLastSavedAt(new Date().toISOString())
      } catch {
        if (isMountedRef.current) setSaveState('error')
      }
    }, cfg.delayMs ?? 1200)
  }, [])

  const emitContentChange = useCallback(
    (currentEditor: Editor, notifyExternal = true) => {
      const output = serializeEditorContent(currentEditor)
      latestOutputRef.current = output
      if (!isMountedRef.current) return
      if (notifyExternal) {
        onChange?.(output.html)
        onContentChange?.(output)
        setSaveState((state) => (state === 'saving' ? state : 'idle'))
        scheduleAutosave()
      }
    },
    [onChange, onContentChange, scheduleAutosave],
  )

  const editor = useEditor({
    extensions,
    content: sanitizedValue,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'altus-editor-content prose max-w-none focus:outline-none',
        dir: direction,
      },
      handleDrop: (view, event) => {
        const dropped = Array.from(event.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'))
        if (!dropped.length) return false
        event.preventDefault()
        const position = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        void handleImageUpload(dropped, position)
        return true
      },
      handlePaste: (_view, event) => {
        const pasted = Array.from(event.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'))
        if (!pasted.length) return false
        event.preventDefault()
        void handleImageUpload(pasted)
        return true
      },
      handleKeyDown: (view, event) => {
        // "/" at the start of an empty paragraph opens the quick-insert menu.
        if (event.key !== '/') return false
        const { $from, empty } = view.state.selection
        if (!empty) return false
        const inEmptyParagraph = $from.parent.type.name === 'paragraph' && $from.parent.content.size === 0
        if (!inEmptyParagraph) return false
        const coords = view.coordsAtPos($from.pos)
        setQuickInsertPos({ x: coords.left, y: coords.bottom })
        return false
      },
    },
    onCreate: ({ editor: e }) => {
      editorRef.current = e
      emitContentChange(e, false)
    },
    onUpdate: ({ editor: e }) => emitContentChange(e),
    onDestroy: () => {
      editorRef.current = null
    },
  })

  // Counts come straight off the CharacterCount extension — no per-keystroke
  // React state, no re-serialization.
  const counts = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      words: (e?.storage.characterCount?.words?.() as number | undefined) ?? 0,
      characters: (e?.storage.characterCount?.characters?.() as number | undefined) ?? 0,
    }),
  }) ?? { words: 0, characters: 0 }

  const handleImageUpload = useCallback(
    async (files: File[], position?: number) => {
      const currentEditor = editorRef.current || editor
      if (!currentEditor || !isMountedRef.current) return
      const imageFiles = files.filter((f) => f.type.startsWith('image/'))
      if (!imageFiles.length) return

      setIsUploadingImage(true)
      try {
        for (const file of imageFiles) {
          const url = await uploadFileToSupabase(file, supabaseBucket)
          if (!url) continue
          const chain = currentEditor.chain().focus()
          if (typeof position === 'number') chain.setTextSelection(position)
          chain.insertContent({
            type: 'image',
            attrs: { src: url, alt: file.name, title: file.name, width: '100%', align: 'center' },
          }).run()
        }
        toast.success('Image added')
      } catch (error) {
        toast.error((error as Error).message || 'Image upload failed')
      } finally {
        if (isMountedRef.current) setIsUploadingImage(false)
      }
    },
    [editor, supabaseBucket],
  )

  const handleVideoUpload = useCallback(
    async (files: File[]) => {
      const currentEditor = editorRef.current || editor
      if (!currentEditor || !isMountedRef.current) return
      const file = files.find((f) => f.type.startsWith('video/'))
      if (!file) return

      setVideoPhase({ stage: 'idle' })
      try {
        const { url } = await uploadVideoWithCompression(file, {
          onPhase: (p) => isMountedRef.current && setVideoPhase(p),
        })
        currentEditor.chain().focus().setVideo({ src: url }).run()
        toast.success('Video added')
      } catch (error) {
        toast.error((error as Error).message || 'Video upload failed')
      } finally {
        if (isMountedRef.current) setVideoPhase(null)
      }
    },
    [editor],
  )

  const handlePickFromLibrary = useCallback(
    async (kind: 'image' | 'video') => {
      const currentEditor = editorRef.current || editor
      if (!currentEditor || !onPickMedia) return
      const url = await onPickMedia(kind)
      if (!url) return
      if (kind === 'image') {
        currentEditor.chain().focus().insertContent({
          type: 'image',
          attrs: { src: url, alt: '', width: '100%', align: 'center' },
        }).run()
      } else {
        currentEditor.chain().focus().setVideo({ src: url }).run()
      }
    },
    [editor, onPickMedia],
  )

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [])

  useEffect(() => {
    editorRef.current = editor || null
  }, [editor])

  useEffect(() => {
    if (!editor || !isMountedRef.current) return
    const incoming = sanitizedValue
    if (incoming !== editor.getHTML() && !editor.isFocused && !isUploadingImage && !videoPhase) {
      editor.commands.setContent(incoming, { emitUpdate: false })
      latestOutputRef.current = serializeEditorContent(editor)
    }
  }, [sanitizedValue, editor, isUploadingImage, videoPhase])

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length) await handleImageUpload(files)
  }

  const handleVideoFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length) await handleVideoUpload(files)
  }

  const copyHtml = async () => {
    const ok = await copyToClipboard(latestOutputRef.current.html)
    toast[ok ? 'success' : 'error'](ok ? 'HTML copied' : 'Failed to copy HTML')
  }

  const copyMarkdown = async () => {
    const ok = await copyToClipboard(latestOutputRef.current.markdown)
    toast[ok ? 'success' : 'error'](ok ? 'Markdown copied' : 'Failed to copy Markdown')
  }

  const handleDoubleClick = (event: React.MouseEvent) => {
    if (disabled || !editor) return
    const target = event.target as HTMLElement
    if (target.tagName === 'IMG' || target.closest('.editor-image') || target.closest('[data-tippy-root]')) return
    const pos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
    if (typeof pos !== 'number') return
    try {
      editor.chain().focus(pos).run()
    } catch {
      editor.commands.focus()
    }
    setQuickInsertPos({ x: event.clientX, y: event.clientY })
  }

  const videoBanner = phaseLabel(videoPhase)

  return (
    <div
      className={cn(
        'altus-rich-editor rounded-xl border bg-card shadow-sm',
        isFullscreen && 'altus-rich-editor--fullscreen',
        className,
      )}
      dir={direction}
    >
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />
      <input ref={videoFileInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoFileInputChange} />

      <EditorToolbar
        editor={editor}
        disabled={disabled}
        config={mergedToolbarConfig}
        onUploadImage={() => fileInputRef.current?.click()}
        onUploadVideo={() => videoFileInputRef.current?.click()}
        onOpenAiPanel={() => setIsAiPanelOpen((s) => !s)}
        onCopyHtml={copyHtml}
        onCopyMarkdown={copyMarkdown}
        onToggleFullscreen={() => setIsFullscreen((s) => !s)}
        isFullscreen={isFullscreen}
        onPickMedia={onPickMedia ? handlePickFromLibrary : undefined}
      />

      <div className="relative">
        <FloatingToolbar editor={editor} disabled={disabled} onOpenAiPanel={() => setIsAiPanelOpen(true)} />

        <div className="altus-editor-surface px-3 py-3" style={{ minHeight }} onDoubleClick={handleDoubleClick}>
          <EditorContent editor={editor} />

          {isUploadingImage && (
            <div className="editor-uploading-banner">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading image…
            </div>
          )}
          {videoBanner && (
            <div className="editor-uploading-banner">
              <Loader2 className="h-4 w-4 animate-spin" /> {videoBanner}
            </div>
          )}
        </div>
      </div>

      {mergedToolbarConfig.features.aiAssist && aiEnabled && editor && isAiPanelOpen && (
        <div className="ai-assist-panel-inline">
          <div className="mx-auto max-w-4xl">
            <AIAssistPanel editor={editor} open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen} aiConfig={ai} direction={direction} />
          </div>
        </div>
      )}

      <EditorStatusBar
        wordCount={counts.words}
        characterCount={counts.characters}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
      />

      {quickInsertPos && editor && !isAiPanelOpen && (
        <QuickInsertMenu
          editor={editor}
          position={quickInsertPos}
          onClose={() => setQuickInsertPos(null)}
          onUploadImage={() => fileInputRef.current?.click()}
          onAddVideo={() => videoFileInputRef.current?.click()}
          onOpenAiPanel={() => setIsAiPanelOpen(true)}
        />
      )}
    </div>
  )
}

export default CustomRichTextEditor
