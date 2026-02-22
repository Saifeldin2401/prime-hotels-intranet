import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'

const resolveAlignmentStyle = (align?: string): string => {
  if (align === 'left') return 'float: left; margin: 0 1.5rem 1rem 0; clear: left;'
  if (align === 'right') return 'float: right; margin: 0 0 1rem 1.5rem; clear: right;'
  return 'display: block; margin: 1rem auto; float: none; clear: both;'
}

export const AlignedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: (element) => element.getAttribute('data-width') || element.style.width || '100%',
        renderHTML: (attributes) => {
          if (!attributes.width) return {}
          return {
            'data-width': attributes.width,
            style: `width: ${attributes.width}`,
          }
        },
      },
      align: {
        default: 'center',
        keepOnSplit: false,
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => {
          if (!attributes.align) return {}
          return {
            'data-align': attributes.align,
          }
        },
      },
    }
  },

  selectable: true,
  draggable: true,

  renderHTML({ HTMLAttributes }) {
    const width = HTMLAttributes.width || '100%'
    const align = HTMLAttributes.align || 'center'
    const existingStyle = typeof HTMLAttributes.style === 'string' ? HTMLAttributes.style : ''

    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: `${existingStyle}; max-width: 100%; height: auto; border-radius: 0.75rem; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.12); ${resolveAlignmentStyle(align)}`,
        'data-width': width,
        'data-align': align,
      }),
    ]
  },
})

export default AlignedImage
