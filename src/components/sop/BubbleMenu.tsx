import { BubbleMenu, type Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
    Bold,
    Italic,
    Strikethrough,
    Link,
} from 'lucide-react';

type BubbleMenuProps = {
    editor: Editor | null;
};

export function BubbleMenuComponent({ editor }: BubbleMenuProps) {
    if (!editor) {
        return null;
    }

    return (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex bg-popover border shadow-md rounded-md overflow-hidden">
            <Button
                variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0 rounded-none"
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <Bold className="w-4 h-4" />
            </Button>
            <Button
                variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0 rounded-none"
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <Italic className="w-4 h-4" />
            </Button>
            <Button
                variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0 rounded-none"
                onClick={() => editor.chain().focus().toggleStrike().run()}
            >
                <Strikethrough className="w-4 h-4" />
            </Button>
            <Button
                variant={editor.isActive('link') ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0 rounded-none"
                onClick={() => {
                    const previousUrl = editor.getAttributes('link').href;
                    const url = window.prompt('URL', previousUrl);

                    if (url === null) {
                        return;
                    }

                    if (url === '') {
                        editor.chain().focus().extendMarkRange('link').unsetLink().run();
                        return;
                    }

                    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                }}
            >
                <Link className="w-4 h-4" />
            </Button>
        </BubbleMenu>
    );
}
