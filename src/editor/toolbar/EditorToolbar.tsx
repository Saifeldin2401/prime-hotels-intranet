import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import ToolbarButton from '@/editor/toolbar/ToolbarButton'
import type { RichEditorToolbarConfig } from '@/editor/types'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    Code2,
    Copy,
    Eraser,
    FileCode2,
    FolderOpen,
    Image as ImageIcon,
    Italic,
    Link2,
    List,
    ListOrdered,
    Maximize,
    Minimize,
    Minus,
    MoreHorizontal,
    Plus,
    Quote,
    Redo2,
    Sparkles,
    Strikethrough,
    Table2,
    Underline,
    Undo2,
    UploadCloud,
    Video,
    Youtube,
} from 'lucide-react'
import { useMemo, useState } from 'react'

interface EditorToolbarProps {
  editor: Editor | null
  disabled?: boolean
  config: RichEditorToolbarConfig
  onUploadImage: () => void
  onUploadVideo: () => void
  onOpenAiPanel: () => void
  onCopyHtml: () => void
  onCopyMarkdown: () => void
  onToggleFullscreen: () => void
  isFullscreen: boolean
  /** Open the host app's media library. Enables "from library" entries. */
  onPickMedia?: (kind: 'image' | 'video') => void
}

const headingOptions = [
  { label: 'Normal text', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Heading 4', value: 'h4' },
]

export function EditorToolbar({
  editor,
  disabled = false,
  config,
  onUploadImage,
  onUploadVideo,
  onOpenAiPanel,
  onCopyHtml,
  onCopyMarkdown,
  onToggleFullscreen,
  isFullscreen,
  onPickMedia,
}: EditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('')
  const [linkInNewTab, setLinkInNewTab] = useState(true)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [embedUrl, setEmbedUrl] = useState('')

  // One subscription; the toolbar re-renders only when a flag below flips —
  // not on every keystroke.
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null
      return {
        heading: e.isActive('heading', { level: 1 })
          ? 'h1'
          : e.isActive('heading', { level: 2 })
            ? 'h2'
            : e.isActive('heading', { level: 3 })
              ? 'h3'
              : e.isActive('heading', { level: 4 })
                ? 'h4'
                : 'paragraph',
        isBold: e.isActive('bold'),
        isItalic: e.isActive('italic'),
        isUnderline: e.isActive('underline'),
        isStrike: e.isActive('strike'),
        isBulletList: e.isActive('bulletList'),
        isOrderedList: e.isActive('orderedList'),
        isBlockquote: e.isActive('blockquote'),
        isCodeBlock: e.isActive('codeBlock'),
        isLink: e.isActive('link'),
        inTable: e.isActive('table'),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      }
    },
  })

  const setHeading = (value: string) => {
    if (!editor) return
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run()
      return
    }
    const level = Number(value.replace('h', ''))
    if (Number.isFinite(level)) {
      editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 }).run()
    }
  }

  const applyLink = () => {
    if (!editor) return
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const normalized = /^https?:\/\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({
        href: normalized,
        target: linkInNewTab ? '_blank' : null,
        rel: linkInNewTab ? 'noopener noreferrer' : null,
      })
      .run()
    setLinkUrl('')
  }

  const insertEmbed = () => {
    const url = embedUrl.trim()
    if (!editor || !url) return
    editor.chain().focus().setYoutubeVideo({ src: url, width: 720, height: 405 }).run()
    setEmbedUrl('')
    setVideoDialogOpen(false)
  }

  const insertTable = () =>
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()

  const disabledAll = disabled || !editor
  const primaryBtn = 'h-8 gap-1 px-2 text-xs'

  const activeCls = useMemo(() => 'border-hotel-gold/60 bg-hotel-gold/15 text-hotel-navy', [])

  return (
    <>
      <div className="editor-toolbar sticky top-0 z-20 rounded-t-xl border-b bg-card p-1.5">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {config.features.history && (
            <>
              <ToolbarButton icon={Undo2} label="Undo (Ctrl+Z)" disabled={disabledAll || !s?.canUndo} onClick={() => editor?.chain().focus().undo().run()} />
              <ToolbarButton icon={Redo2} label="Redo (Ctrl+Shift+Z)" disabled={disabledAll || !s?.canRedo} onClick={() => editor?.chain().focus().redo().run()} />
              <Separator orientation="vertical" className="mx-1 h-6" />
            </>
          )}

          {config.features.headings && (
            <Select value={s?.heading ?? 'paragraph'} onValueChange={setHeading} disabled={disabledAll}>
              <SelectTrigger className="h-8 w-[128px] text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {headingOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {config.features.formatting && (
            <>
              <Separator orientation="vertical" className="mx-1 h-6" />
              <ToolbarButton icon={Bold} label="Bold (Ctrl+B)" active={s?.isBold} disabled={disabledAll} onClick={() => editor?.chain().focus().toggleBold().run()} />
              <ToolbarButton icon={Italic} label="Italic (Ctrl+I)" active={s?.isItalic} disabled={disabledAll} onClick={() => editor?.chain().focus().toggleItalic().run()} />
              <ToolbarButton icon={Underline} label="Underline (Ctrl+U)" active={s?.isUnderline} disabled={disabledAll} onClick={() => editor?.chain().focus().toggleUnderline().run()} />
            </>
          )}

          {config.features.lists && (
            <>
              <Separator orientation="vertical" className="mx-1 h-6" />
              <ToolbarButton icon={List} label="Bullet list" active={s?.isBulletList} disabled={disabledAll} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
              <ToolbarButton icon={ListOrdered} label="Numbered list" active={s?.isOrderedList} disabled={disabledAll} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
            </>
          )}

          {config.features.links && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Link"
                  aria-label="Link"
                  disabled={disabledAll}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 ${s?.isLink ? activeCls : ''}`}
                >
                  <Link2 className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Link URL</Label>
                  <Input placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyLink()} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="open-new-tab" className="text-xs">Open in new tab</Label>
                  <Switch id="open-new-tab" checked={linkInNewTab} onCheckedChange={setLinkInNewTab} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={applyLink}>Apply</Button>
                  <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().unsetLink().run()}>Remove</Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Insert menu — everything that adds a block lives here */}
          <Separator orientation="vertical" className="mx-1 h-6" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={primaryBtn} disabled={disabledAll}>
                <Plus className="h-4 w-4" /> Insert
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {config.features.media && (
                <>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Media</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={onUploadImage}>
                    <ImageIcon className="me-2 h-4 w-4" /> Upload image
                  </DropdownMenuItem>
                  {onPickMedia && (
                    <DropdownMenuItem onSelect={() => onPickMedia('image')}>
                      <FolderOpen className="me-2 h-4 w-4" /> Image from library
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => setVideoDialogOpen(true)}>
                    <Video className="me-2 h-4 w-4" /> Add video…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Blocks</DropdownMenuLabel>
              {config.features.tables && (
                <DropdownMenuItem onSelect={insertTable}>
                  <Table2 className="me-2 h-4 w-4" /> Table (3×3)
                </DropdownMenuItem>
              )}
              {config.features.codeBlock && (
                <>
                  <DropdownMenuItem onSelect={() => editor?.chain().focus().toggleBlockquote().run()}>
                    <Quote className="me-2 h-4 w-4" /> Quote
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => editor?.chain().focus().toggleCodeBlock().run()}>
                    <Code2 className="me-2 h-4 w-4" /> Code block
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => editor?.chain().focus().setHorizontalRule().run()}>
                    <Minus className="me-2 h-4 w-4" /> Divider
                  </DropdownMenuItem>
                </>
              )}
              {s?.inTable && config.features.tables && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Table</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => editor?.chain().focus().addRowAfter().run()}>Add row</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => editor?.chain().focus().addColumnAfter().run()}>Add column</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => editor?.chain().focus().deleteRow().run()}>Delete row</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => editor?.chain().focus().deleteColumn().run()}>Delete column</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600" onSelect={() => editor?.chain().focus().deleteTable().run()}>Delete table</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {config.features.aiAssist && (
            <Button
              variant="outline"
              size="sm"
              className={`${primaryBtn} border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200`}
              onClick={onOpenAiPanel}
              disabled={disabledAll}
            >
              <Sparkles className="h-4 w-4" /> AI Assist
            </Button>
          )}

          <div className="ms-auto flex items-center gap-0.5">
            {/* Everything rarely-used collapses here */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" title="More" aria-label="More options" disabled={disabledAll} className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => editor?.chain().focus().toggleStrike().run()}>
                  <Strikethrough className="me-2 h-4 w-4" /> Strikethrough
                </DropdownMenuItem>
                {config.features.alignment && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <AlignLeft className="me-2 h-4 w-4" /> Align
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onSelect={() => editor?.chain().focus().setTextAlign('left').run()}><AlignLeft className="me-2 h-4 w-4" /> Left</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => editor?.chain().focus().setTextAlign('center').run()}><AlignCenter className="me-2 h-4 w-4" /> Center</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => editor?.chain().focus().setTextAlign('right').run()}><AlignRight className="me-2 h-4 w-4" /> Right</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => editor?.chain().focus().setTextAlign('justify').run()}><AlignJustify className="me-2 h-4 w-4" /> Justify</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                {config.features.clearFormatting && (
                  <DropdownMenuItem onSelect={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}>
                    <Eraser className="me-2 h-4 w-4" /> Clear formatting
                  </DropdownMenuItem>
                )}
                {config.features.copyActions && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onCopyHtml}><Copy className="me-2 h-4 w-4" /> Copy as HTML</DropdownMenuItem>
                    <DropdownMenuItem onSelect={onCopyMarkdown}><FileCode2 className="me-2 h-4 w-4" /> Copy as Markdown</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {config.features.fullscreen && (
              <ToolbarButton
                icon={isFullscreen ? Minimize : Maximize}
                label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                onClick={onToggleFullscreen}
              />
            )}
          </div>
        </div>
      </div>

      {/* Add video — one place: upload (auto-compressed), library, or embed URL */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4 text-red-500" /> Add a video
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                onUploadVideo()
                setVideoDialogOpen(false)
              }}
              className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 p-5 text-center transition-colors hover:border-hotel-gold hover:bg-hotel-gold/5 dark:border-slate-700"
            >
              <UploadCloud className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Upload a video file</span>
              <span className="text-[11px] text-muted-foreground">
                mp4 / webm / mov · large files are compressed automatically
              </span>
            </button>

            {onPickMedia && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  onPickMedia('video')
                  setVideoDialogOpen(false)
                }}
              >
                <FolderOpen className="h-4 w-4" /> Choose from media library
              </Button>
            )}

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Youtube className="h-3.5 w-3.5 text-red-500" /> Or embed a YouTube / Vimeo link
              </Label>
              <div className="flex gap-2">
                <Input
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && insertEmbed()}
                  placeholder="https://youtube.com/watch?v=…"
                  className="h-9 text-xs"
                />
                <Button size="sm" onClick={insertEmbed} disabled={!embedUrl.trim()}>Embed</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default EditorToolbar
