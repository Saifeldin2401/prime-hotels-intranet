import type { AISuggestion } from './types'

export const DOCS_RECENTLY_VIEWED_KEY = 'docs_recently_viewed'
export const MAX_RECENT_DOCS = 20
export const MAX_BULK_OPERATION_IDS = 200

export function assertBulkOperationSize(ids: string[], operationLabel: string): void {
  if (ids.length > MAX_BULK_OPERATION_IDS) {
    throw new Error(`${operationLabel} limited to ${MAX_BULK_OPERATION_IDS} items per operation. Selected: ${ids.length}`)
  }
}

export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export function saveRecentlyViewedDocument(userId: string, documentId: string): void {
  if (!isValidUUID(documentId)) return
  try {
    const storageKey = `${DOCS_RECENTLY_VIEWED_KEY}_${userId}`
    let raw: string | null = null
    try {
      raw = localStorage.getItem(storageKey)
    } catch {
      // localStorage not available (Safari private mode, etc.)
      return
    }
    const existing = raw ? (JSON.parse(raw) as { id: string; viewedAt: string }[]) : []

    const filtered = Array.isArray(existing) ? existing.filter((i) => i?.id !== documentId) : []
    const updated = [{ id: documentId, viewedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_RECENT_DOCS)
    localStorage.setItem(storageKey, JSON.stringify(updated))
  } catch (e) {
    console.warn('Failed to record recently viewed document:', e)
  }
}

export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0

  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 100

  const track: number[][] = Array(shorter.length + 1).fill(null).map(() =>
    Array(longer.length + 1).fill(null)
  )

  for (let i = 0; i <= longer.length; i += 1) {
    track[0][i] = i
  }
  for (let j = 0; j <= shorter.length; j += 1) {
    track[j][0] = j
  }

  for (let j = 1; j <= shorter.length; j += 1) {
    for (let i = 1; i <= longer.length; i += 1) {
      const indicator = longer[i - 1].toLowerCase() === shorter[j - 1].toLowerCase() ? 0 : 1
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      )
    }
  }

  const distance = track[shorter.length][longer.length]
  return Math.round(((longer.length - distance) / longer.length) * 100)
}

export function extractTagKeywords(title: string, content?: string, description?: string): AISuggestion[] {
  const text = `${title} ${description || ''} ${content || ''}`.toLowerCase()
  const keywords: AISuggestion[] = []

  const keywordPatterns: Array<[RegExp, string, string]> = [
    [/\b(hr|human resources|hiring|onboarding|termination|performance)\b/, 'hr', 'Human Resources'],
    [/\b(finance|accounting|budget|invoice|payment|expense)\b/, 'finance', 'Finance & Accounting'],
    [/\b(operations|ops|daily|routine|workflow)\b/, 'operations', 'Operations'],
    [/\b(safety|emergency|fire|evacuation|first aid|incident)\b/, 'safety', 'Safety & Emergency'],
    [/\b(security|access|key|lock|surveillance)\b/, 'security', 'Security'],
    [/\b(training|learning|development|certification|course)\b/, 'training', 'Training & Development'],
    [/\b(policy|procedure|guideline|compliance|regulation)\b/, 'policy', 'Policies & Compliance'],
    [/\b(maintenance|repair|engineering|facility)\b/, 'maintenance', 'Maintenance & Engineering'],
    [/\b(front desk|reception|checkin|checkout|guest|concierge)\b/, 'front-desk', 'Front Desk'],
    [/\b(housekeeping|cleaning|room|hk)\b/, 'housekeeping', 'Housekeeping'],
    [/\b(f&b|food|beverage|restaurant|kitchen|menu|dining)\b/, 'food-beverage', 'Food & Beverage'],
    [/\b(sales|marketing|promotion|booking|reservation)\b/, 'sales-marketing', 'Sales & Marketing'],
    [/\b(it|technology|system|software|hardware|network)\b/, 'it', 'IT & Technology'],
    [/\b(legal|contract|agreement|liability|insurance)\b/, 'legal', 'Legal'],
  ]

  for (const [pattern, tag, reason] of keywordPatterns) {
    if (pattern.test(text)) {
      keywords.push({
        value: tag,
        confidence: 'high',
        reason
      })
    }
  }

  if (/\b(sop|procedure|step|process|how to|instruction)\b/.test(text)) {
    keywords.push({ value: 'sop', confidence: 'high', reason: 'Standard operating procedure' })
  }
  if (/\b(form|template|application|request)\b/.test(text)) {
    keywords.push({ value: 'form', confidence: 'medium', reason: 'Form or template' })
  }
  if (/\b(report|analysis|summary|review)\b/.test(text)) {
    keywords.push({ value: 'report', confidence: 'medium', reason: 'Report document' })
  }
  if (/\b(checklist|verify|confirm|ensure|review|audit)\b/.test(text)) {
    keywords.push({ value: 'checklist', confidence: 'medium', reason: 'Contains verification steps' })
  }

  return keywords.slice(0, 8)
}
