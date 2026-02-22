const AI_CLASS_NAMES = [
  'ai-article',
  'ai-title',
  'ai-subtitle',
  'ai-meta',
  'ai-section',
  'ai-section-title',
  'ai-subsection-title',
  'ai-highlight-box',
  'ai-warning-box',
  'ai-info-box',
  'ai-tip-box',
  'ai-key-takeaways',
  'ai-table',
  'ai-quote',
  'ai-divider',
  'ai-list',
  'ai-ordered-list',
  'ai-header',
  'ai-content',
  'ai-footer',
  'ai-generated-toc',
  'ai-generated-summary-table',
  'ai-generated-callout',
  'ai-generated-mermaid',
] as const

const LEGACY_CLASS_NAMES = [
  'editor-image',
  'editor-table',
  'editor-code-block',
  'editor-youtube',
  'table-of-contents',
  'section-title',
  'procedure-list',
  'bullet-list',
  'styled-table',
  'responsive-table',
  'summary-table',
  'main-title',
  'subsection-title',
  'minor-title',
  'hotel-quote',
  'section-divider',
  'emphasis-bold',
  'emphasis-italic',
  'list-disc',
  'list-decimal',
  'pl-6',
  'pl-4',
  'space-y-2',
  'space-y-1',
  'text-xs',
  'text-sm',
  'font-semibold',
  'font-bold',
  'alert-important',
  'alert-warning',
  'alert-note',
  'alert-tip',
  'alert-remember',
  'mermaid',
] as const

const ALLOWED_CLASS_SET = new Set<string>([...AI_CLASS_NAMES, ...LEGACY_CLASS_NAMES])
const ALLOWED_CLASS_PREFIXES = ['ai-', 'editor-', 'alert-', 'language-']

export const AI_PREDEFINED_CLASSES = AI_CLASS_NAMES

export const AI_HTML_SYSTEM_PROMPT =
  'You are a professional content designer and editor. Generate structured, beautifully formatted HTML content using semantic tags and predefined CSS classes. Do not return plain text. Do not include explanations. Return only clean HTML.'

export const AI_HTML_OUTPUT_REQUIREMENTS = [
  'Return HTML only (no markdown, no code fences, no JSON).',
  'Use semantic structure: <article>, <section>, <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <blockquote>, <table>, <hr>.',
  'Use predefined classes: ai-title, ai-section, ai-highlight-box, ai-warning-box, ai-info-box, ai-table, ai-quote, ai-divider.',
  'Do not include <script>, <style>, or inline event handlers.',
  'Keep output editable and production-safe.',
].join(' ')

export function sanitizeClassNameList(rawClassName: string | null | undefined): string | null {
  if (!rawClassName) return null

  const cleanedTokens = rawClassName
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter(
      (token) =>
        ALLOWED_CLASS_SET.has(token) || ALLOWED_CLASS_PREFIXES.some((prefix) => token.startsWith(prefix)),
    )

  if (!cleanedTokens.length) return null
  return Array.from(new Set(cleanedTokens)).join(' ')
}

export function isAllowedDirection(value: string | null | undefined): value is 'ltr' | 'rtl' {
  return value === 'ltr' || value === 'rtl'
}
