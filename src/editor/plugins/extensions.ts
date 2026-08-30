import { AlignedImage } from '@/editor/plugins/image/AlignedImage'
import {
    AICalloutBlock,
    ArticleBlock,
    FooterBlock,
    HeaderBlock,
    SectionBlock,
    SemanticClassAttributes,
} from '@/editor/plugins/semanticBlocks'
import { VideoExtension } from '@/editor/plugins/video/VideoExtension'
import CharacterCount from '@tiptap/extension-character-count'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TextAlign from '@tiptap/extension-text-align'
import Youtube from '@tiptap/extension-youtube'
import StarterKit from '@tiptap/starter-kit'

interface ExtensionOptions {
  placeholder: string
}

export function createEditorExtensions(options: ExtensionOptions) {
  return [
    ArticleBlock,
    SectionBlock,
    HeaderBlock,
    FooterBlock,
    AICalloutBlock,
    VideoExtension,
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4],
      },
      codeBlock: {
        HTMLAttributes: {
          class: 'editor-code-block',
        },
      },
      // Exclude Link from StarterKit since we're adding it separately
      // Note: Underline might be included in StarterKit in newer versions
      link: false,
    }),
    // NOTE: the BubbleMenu *extension* is intentionally NOT registered here.
    // The <BubbleMenu> React component (@tiptap/react/menus) registers its own
    // ProseMirror plugin; adding the extension too creates a second plugin under
    // the same key, which is what made the floating toolbar flicker and misplace.
    SemanticClassAttributes,
    TextAlign.configure({
      types: ['heading', 'paragraph', 'articleBlock', 'sectionBlock', 'aiCalloutBlock', 'headerBlock', 'footerBlock'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
      },
    }),
    Placeholder.configure({
      placeholder: options.placeholder,
    }),
    CharacterCount,
    AlignedImage.configure({
      allowBase64: false,
      HTMLAttributes: {
        class: 'editor-image',
      },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'editor-table',
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
    Youtube.configure({
      controls: true,
      nocookie: true,
      allowFullscreen: true,
      HTMLAttributes: {
        class: 'editor-youtube',
      },
      inline: false,
    }),
  ]
}
