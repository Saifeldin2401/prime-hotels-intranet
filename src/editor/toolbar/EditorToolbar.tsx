import { useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize,
  Minimize,
  Minus,
  Quote,
  Redo2,
  Sparkles,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
  Video,
  Copy,
  FileCode2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import ToolbarButton from '@/editor/toolbar/ToolbarButton'
import type { RichEditorToolbarConfig } from '@/editor/types'

interface EditorToolbarProps {
  editor: Editor | null
  disabled?: boolean
  config: RichEditorToolbarConfig
  onUploadImage: () => void
  onOpenAiPanel: () => void
  onCopyHtml: () => void
  onCopyMarkdown: () => void
  onToggleFullscreen: () => void
  isFullscreen: boolean
}

const headingOptions = [
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'H1', value: 'h1' },
  { label: 'H2', value: 'h2' },
  { label: 'H3', value: 'h3' },
  { label: 'H4', value: 'h4' },
]

export function EditorToolbar({
  editor,
  disabled = false,
  config,
  onUploadImage,
  onOpenAiPanel,
  onCopyHtml,
  onCopyMarkdown,
  onToggleFullscreen,
  isFullscreen,
}: EditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('')
  const [linkInNewTab, setLinkInNewTab] = useState(true)
  const [videoUrl, setVideoUrl] = useState('')

  const currentHeading = useMemo(() => {
    if (!editor) return 'paragraph'
    if (editor.isActive('heading', { level: 1 })) return 'h1'
    if (editor.isActive('heading', { level: 2 })) return 'h2'
    if (editor.isActive('heading', { level: 3 })) return 'h3'
    if (editor.isActive('heading', { level: 4 })) return 'h4'
    return 'paragraph'
  }, [editor, editor?.state.selection.from, editor?.state.selection.to])

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
  }

  const insertYoutube = () => {
    if (!editor || !videoUrl.trim()) return

    editor
      .chain()
      .focus()
      .setYoutubeVideo({
        src: videoUrl.trim(),
        width: 720,
        height: 405,
      })
      .run()

    setVideoUrl('')
  }

  const inTable = editor?.isActive('table') || false

  return (
    <div className="editor-toolbar sticky top-0 z-20 rounded-t-xl border-b bg-card/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="flex flex-wrap items-center gap-2">
        {config.features.history && (
          <>
            <ToolbarButton
              icon={Undo2}
              label="Undo"
              disabled={disabled || !editor?.can().undo()}
              onClick={() => editor?.chain().focus().undo().run()}
            />
            <ToolbarButton
              icon={Redo2}
              label="Redo"
              disabled={disabled || !editor?.can().redo()}
              onClick={() => editor?.chain().focus().redo().run()}
            />
            <Separator orientation="vertical" className="mx-1 h-6" />
          </>
        )}

        {config.features.headings && (
          <Select value={currentHeading} onValueChange={setHeading} disabled={disabled || !editor}>
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {headingOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {config.features.formatting && (
          <>
            <ToolbarButton
              icon={Bold}
              label="Bold (Ctrl+B)"
              active={editor?.isActive('bold')}
              disabled={disabled || !editor?.can().toggleBold()}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              icon={Italic}
              label="Italic (Ctrl+I)"
              active={editor?.isActive('italic')}
              disabled={disabled || !editor?.can().toggleItalic()}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              icon={Underline}
              label="Underline (Ctrl+U)"
              active={editor?.isActive('underline')}
              disabled={disabled || !editor?.can().toggleUnderline()}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            />
            <ToolbarButton
              icon={Strikethrough}
              label="Strikethrough"
              active={editor?.isActive('strike')}
              disabled={disabled || !editor?.can().toggleStrike()}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            />
          </>
        )}

        {config.features.lists && (
          <>
            <ToolbarButton
              icon={List}
              label="Bullet List"
              active={editor?.isActive('bulletList')}
              disabled={disabled || !editor?.can().toggleBulletList()}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              icon={ListOrdered}
              label="Numbered List"
              active={editor?.isActive('orderedList')}
              disabled={disabled || !editor?.can().toggleOrderedList()}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
          </>
        )}

        {config.features.codeBlock && (
          <>
            <ToolbarButton
              icon={Quote}
              label="Blockquote"
              active={editor?.isActive('blockquote')}
              disabled={disabled || !editor?.can().toggleBlockquote()}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            />
            <ToolbarButton
              icon={Code2}
              label="Code Block"
              active={editor?.isActive('codeBlock')}
              disabled={disabled || !editor?.can().toggleCodeBlock()}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            />
            <ToolbarButton
              icon={Minus}
              label="Horizontal Rule"
              disabled={disabled || !editor?.can().setHorizontalRule()}
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            />
          </>
        )}

        {config.features.alignment && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2">
                <AlignLeft className="mr-1 h-4 w-4" />
                Align
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => editor?.chain().focus().setTextAlign('left').run()}>
                <AlignLeft className="mr-2 h-4 w-4" /> Left
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor?.chain().focus().setTextAlign('center').run()}>
                <AlignCenter className="mr-2 h-4 w-4" /> Center
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor?.chain().focus().setTextAlign('right').run()}>
                <AlignRight className="mr-2 h-4 w-4" /> Right
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor?.chain().focus().setTextAlign('justify').run()}>
                <AlignJustify className="mr-2 h-4 w-4" /> Justify
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {config.features.links && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2" disabled={disabled || !editor}>
                <Link2 className="mr-1 h-4 w-4" /> Link
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">URL</Label>
                <Input
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="open-new-tab" className="text-xs">
                  Open in new tab
                </Label>
                <Switch id="open-new-tab" checked={linkInNewTab} onCheckedChange={setLinkInNewTab} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={applyLink}>
                  Apply
                </Button>
                <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().unsetLink().run()}>
                  Remove
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {config.features.tables && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2" disabled={disabled || !editor}>
                <Table2 className="mr-1 h-4 w-4" /> Table
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                Insert 3 x 3
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!inTable} onSelect={() => editor?.chain().focus().addColumnBefore().run()}>
                Add Column Before
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!inTable} onSelect={() => editor?.chain().focus().addColumnAfter().run()}>
                Add Column After
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!inTable} onSelect={() => editor?.chain().focus().deleteColumn().run()}>
                Delete Column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!inTable} onSelect={() => editor?.chain().focus().addRowBefore().run()}>
                Add Row Before
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!inTable} onSelect={() => editor?.chain().focus().addRowAfter().run()}>
                Add Row After
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!inTable} onSelect={() => editor?.chain().focus().deleteRow().run()}>
                Delete Row
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!inTable} onSelect={() => editor?.chain().focus().deleteTable().run()}>
                Delete Table
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {config.features.media && (
          <>
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={onUploadImage} disabled={disabled || !editor}>
              <ImagePlus className="mr-1 h-4 w-4" /> Image
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2" disabled={disabled || !editor}>
                  <Video className="mr-1 h-4 w-4" /> Video
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">YouTube URL</Label>
                  <Input
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <Button size="sm" onClick={insertYoutube}>
                  Embed Video
                </Button>
              </PopoverContent>
            </Popover>
          </>
        )}

        {config.features.clearFormatting && (
          <ToolbarButton
            icon={Eraser}
            label="Clear formatting"
            disabled={disabled || !editor}
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .clearNodes()
                .unsetAllMarks()
                .run()
            }
          />
        )}

        {config.features.aiAssist && (
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={onOpenAiPanel} disabled={disabled || !editor}>
            <Sparkles className="mr-1 h-4 w-4" /> AI Assist
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {config.features.copyActions && (
            <>
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={onCopyHtml}>
                <Copy className="mr-1 h-4 w-4" /> HTML
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={onCopyMarkdown}>
                <FileCode2 className="mr-1 h-4 w-4" /> Markdown
              </Button>
            </>
          )}

          {config.features.fullscreen && (
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={onToggleFullscreen}>
              {isFullscreen ? (
                <>
                  <Minimize className="mr-1 h-4 w-4" /> Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize className="mr-1 h-4 w-4" /> Fullscreen
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default EditorToolbar
