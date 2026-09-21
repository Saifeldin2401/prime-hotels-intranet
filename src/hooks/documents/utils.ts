const DOCS_RECENTLY_VIEWED_KEY = 'docs_recently_viewed'
const MAX_RECENT_DOCS = 20
const MAX_BULK_OPERATION_IDS = 200

export function assertBulkOperationSize(ids: string[], operationLabel: string): void {
  if (ids.length > MAX_BULK_OPERATION_IDS) {
    throw new Error(`${operationLabel} limited to ${MAX_BULK_OPERATION_IDS} items per operation. Selected: ${ids.length}`)
  }
}

function isValidUUID(str: string): boolean {
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
