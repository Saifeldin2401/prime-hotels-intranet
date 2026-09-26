import type { ContentRow } from './api'

export type ContentStage = 'draft' | 'in_review' | 'changes_requested' | 'published' | 'archived'

export interface ContentItem extends ContentRow {
  stage: ContentStage
}

/** Courses and quizzes use lower-case statuses; articles use upper-case. */
export function stageOf(status: string): ContentStage {
  switch (status.toLowerCase()) {
    case 'pending_review':
    case 'in_review':
    case 'approved': // approved article waiting to be published to the knowledge base
      return 'in_review'
    case 'rejected':
    case 'changes_requested':
      return 'changes_requested'
    case 'published':
      return 'published'
    case 'archived':
      return 'archived'
    default:
      return 'draft'
  }
}

export function toContentItems(rows: ContentRow[]): ContentItem[] {
  return rows
    .map((r) => ({ ...r, stage: stageOf(r.status) }))
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
}

export function editHref(item: ContentRow): string {
  if (item.type === 'course') return `/studio/courses/${item.id}`
  if (item.type === 'quiz') return `/studio/quizzes/${item.id}`
  return `/studio/articles/${item.id}/edit`
}
