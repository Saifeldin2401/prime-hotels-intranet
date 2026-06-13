import type { ContentBlockForm, TrainingSection } from './trainingBuilderTypes'

export const deepClone = <T,>(input: T, seen = new WeakMap<object, unknown>()): T => {
  if (input === null || typeof input !== 'object') {
    return input
  }

  if (input instanceof Date) {
    return new Date(input.getTime()) as T
  }

  if (Array.isArray(input)) {
    return input.map((item) => deepClone(item, seen)) as T
  }

  const obj = input as Record<string, unknown>
  if (seen.has(obj)) {
    return seen.get(obj) as T
  }

  const output: Record<string, unknown> = {}
  seen.set(obj, output)

  for (const [key, value] of Object.entries(obj)) {
    output[key] = deepClone(value, seen)
  }

  return output as T
}

export const cloneSections = (value: TrainingSection[]): TrainingSection[] => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return deepClone(value)
}

export const normalizeDurationMinutes = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return undefined
  if (value <= 0) return undefined
  if (value > 120) return Math.round(value / 60)
  return value
}

export const toDurationSeconds = (minutes?: number | null) => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return null
  if (minutes <= 0) return null
  return Math.round(minutes * 60)
}

export const normalizeEstimatedDuration = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  if (value <= 0) return ''
  if (value > 240) return Math.max(1, Math.round(value / 60))
  return Math.round(value)
}

export const estimateBlockDurationMinutes = (block: ContentBlockForm) => {
  if (block.duration && block.duration > 0) return block.duration
  if (block.type === 'text') {
    let previous: string;
    let text = block.content || '';
    do {
      previous = text;
      text = previous.replace(/<[^>]*>/g, ' ');
    } while (text !== previous);
    text = text.replace(/\s+/g, ' ').trim()
    const words = text ? text.split(' ').length : 0
    if (!words) return 0
    return Math.max(1, Math.round(words / 180))
  }
  switch (block.type) {
    case 'image':
      return 2
    case 'document_link':
      return 3
    case 'quiz':
      return 5
    case 'sop_reference':
      return 4
    case 'audio':
    case 'video':
    case 'interactive':
      return 5
    default:
      return 0
  }
}

export const deriveTitleFromUrl = (value: string) => {
  if (!value) return ''
  try {
    const url = new URL(value)
    const path = url.pathname.split('/').filter(Boolean)
    const last = path[path.length - 1]
    if (last) {
      return decodeURIComponent(last)
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim()
    }
    return url.hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export const stripHtml = (value: string) => {
  let previous: string;
  let result = value;
  do {
    previous = result;
    result = previous.replace(/<[^>]*>/g, ' ');
  } while (result !== previous);
  return result
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export const buildSectionSourceText = (section: TrainingSection) => {
  const sectionParts = [section.title, section.description || ''].filter(Boolean)

  const itemParts = section.items.map(item => {
    if (item.type === 'text') {
      return stripHtml(item.content || '')
    }
    if (item.type === 'sop_reference') {
      return item.title ? `SOP Reference: ${item.title}` : 'SOP Reference'
    }
    if (item.title) return item.title
    return item.type
  })

  return [...sectionParts, ...itemParts].filter(Boolean).join('\n')
}

export const buildModuleSourceText = (sections: TrainingSection[]) => {
  return sections
    .map(section => buildSectionSourceText(section))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 8000)
}

export function getBlockValidation(block: ContentBlockForm, t: (key: string, options?: Record<string, unknown>) => string) {
  const contentData = block.content_data as { quiz_id?: string; sop_id?: string }
  if (block.type === 'quiz' && !contentData.quiz_id) {
    return { ok: false, message: t('builder.missingQuiz') }
  }
  if (block.type === 'sop_reference' && !contentData.sop_id) {
    return { ok: false, message: t('builder.missingSop') }
  }
  if (['video', 'audio', 'image', 'document_link', 'interactive'].includes(block.type) && !block.content_url) {
    return { ok: false, message: t('builder.missingUrl') }
  }
  if (block.type === 'text' && !block.content.trim()) {
    return { ok: false, message: t('builder.missingContent') }
  }
  return { ok: true, message: t('builder.readyToSave', { defaultValue: 'Ready to save' }) }
}
