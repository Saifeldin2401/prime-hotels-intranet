import { type Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
    Bold,
    Italic,
    Strikethrough,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Heading1,
    Heading2,
    Heading3,
    Table as TableIcon,
    Plus,
    Trash2,
} from 'lucide-react';

type ToolbarProps = {
    editor: Editor | null;
};

export function Toolbar({ editor }: ToolbarProps) {
    if (!editor) {
        return null;
    }

    return (
        <div className="border-b p-2 flex flex-wrap gap-1 items-center bg-muted/40 sticky top-0 z-10">
            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().chain().focus().undo().run()}
                >
                    <Undo className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().chain().focus().redo().run()}
                >
                    <Redo className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button
                    variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                >
                    <Bold className="w-4 h-4" />
                </Button>
                <Button
                    variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                >
                    <Italic className="w-4 h-4" />
                </Button>
                <Button
                    variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                >
                    <Strikethrough className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button
                    variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                >
                    <Heading1 className="w-4 h-4" />
                </Button>
                <Button
                    variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                    <Heading2 className="w-4 h-4" />
                </Button>
                <Button
                    variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                >
                    <Heading3 className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button
                    variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <List className="w-4 h-4" />
                </Button>
                <Button
                    variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <ListOrdered className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button
                    variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign && editor.chain().focus().setTextAlign('left').run()}
                >
                    <AlignLeft className="w-4 h-4" />
                </Button>
                <Button
                    variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign && editor.chain().focus().setTextAlign('center').run()}
                >
                    <AlignCenter className="w-4 h-4" />
                </Button>
                <Button
                    variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign && editor.chain().focus().setTextAlign('right').run()}
                >
                    <AlignRight className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                    <Quote className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                >
                    <TableIcon className="w-4 h-4" />
                </Button>
                {editor.isActive('table') && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().addColumnAfter().run()}
                            title="Add Column"
                        >
                            <Plus className="w-4 h-4 rotate-90" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().addRowAfter().run()}
                            title="Add Row"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().deleteTable().run()}
                            title="Delete Table"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
