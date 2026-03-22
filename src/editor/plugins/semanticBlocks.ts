import { isAllowedDirection, sanitizeClassNameList } from '@/lib/aiHtml'
import { Extension, mergeAttributes, Node } from '@tiptap/core'

const sanitizeId = (value: string | null | undefined): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return /^[A-Za-z][\w\-:.]*$/.test(trimmed) ? trimmed : null
}

const sharedAttributes = {
  class: {
    default: null,
    parseHTML: (element: HTMLElement) => sanitizeClassNameList(element.getAttribute('class')),
    renderHTML: (attributes: Record<string, unknown>) =>
      typeof attributes.class === 'string' ? { class: attributes.class } : {},
  },
  id: {
    default: null,
    parseHTML: (element: HTMLElement) => sanitizeId(element.getAttribute('id')),
    renderHTML: (attributes: Record<string, unknown>) =>
      typeof attributes.id === 'string' ? { id: attributes.id } : {},
  },
  dir: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const dir = element.getAttribute('dir')
      return isAllowedDirection(dir) ? dir : null
    },
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.dir === 'rtl' || attributes.dir === 'ltr' ? { dir: attributes.dir } : {},
  },
}

export const SemanticClassAttributes = Extension.create({
  name: 'semanticClassAttributes',
  addGlobalAttributes() {
    return [
      {
        types: [
          'paragraph',
          'heading',
          'blockquote',
          'bulletList',
          'orderedList',
          'listItem',
          'codeBlock',
          'horizontalRule',
          'table',
          'tableRow',
          'tableHeader',
          'tableCell',
          'image',
          'articleBlock',
          'sectionBlock',
          'aiCalloutBlock',
          'headerBlock',
          'footerBlock',
        ],
        attributes: sharedAttributes,
      },
    ]
  },
})

export const ArticleBlock = Node.create({
  name: 'articleBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return sharedAttributes
  },
  parseHTML() {
    return [{ tag: 'article' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['article', mergeAttributes(HTMLAttributes), 0]
  },
})

export const SectionBlock = Node.create({
  name: 'sectionBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return sharedAttributes
  },
  parseHTML() {
    return [{ tag: 'section' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(HTMLAttributes), 0]
  },
})

export const AICalloutBlock = Node.create({
  name: 'aiCalloutBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return sharedAttributes
  },
  parseHTML() {
    return [
      { tag: 'div.ai-highlight-box' },
      { tag: 'div.ai-warning-box' },
      { tag: 'div.ai-info-box' },
      { tag: 'div.ai-tip-box' },
      { tag: 'div.ai-key-takeaways' },
      { tag: 'div.ai-section' },
      { tag: 'div.ai-content' },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },
})

export const HeaderBlock = Node.create({
  name: 'headerBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return sharedAttributes
  },
  parseHTML() {
    return [{ tag: 'header' }, { tag: 'section.ai-header' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['header', mergeAttributes(HTMLAttributes), 0]
  },
})

export const FooterBlock = Node.create({
  name: 'footerBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return sharedAttributes
  },
  parseHTML() {
    return [{ tag: 'footer' }, { tag: 'section.ai-footer' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['footer', mergeAttributes(HTMLAttributes), 0]
  },
})
