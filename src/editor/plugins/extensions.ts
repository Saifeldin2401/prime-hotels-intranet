import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Youtube from '@tiptap/extension-youtube'
import BubbleMenu from '@tiptap/extension-bubble-menu'
import { AlignedImage } from '@/editor/plugins/image/AlignedImage'
import {
  AICalloutBlock,
  ArticleBlock,
  SectionBlock,
  HeaderBlock,
  FooterBlock,
  SemanticClassAttributes,
} from '@/editor/plugins/semanticBlocks'

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
    BubbleMenu.configure({
      shouldShow: ({ editor, state }) => {
        // We'll manage visibility logic in the component, but the extension is needed
        return !state.selection.empty || editor.isActive('image') || editor.isActive('table')
      },
    }),
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
