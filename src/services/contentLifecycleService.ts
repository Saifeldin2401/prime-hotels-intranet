/**
 * contentLifecycleService
 * ----------------------------------------------------------------------------
 * CRUD against `content_reviews` + the lifecycle transitions defined by
 * src/lib/contentLifecycle.ts.
 *
 * The state machine decides what is legal; this module persists it:
 *   - writes/updates the `content_reviews` row
 *   - moves `lifecycle_status` on the backing content table
 *   - (the DB trigger writes `content_change_log` -- nothing to do here)
 *
 * Tables touched here (content_reviews, source_change_flags, the lifecycle_*
 * columns) are newer than the committed generated types, so this file uses a
 * loosely-typed client handle -- same pattern as aiPlatformConfigService.ts.
 */

import { supabase } from '@/lib/supabase'
import {
  CONTENT_TABLE,
  applyTransition,
  canTransition,
  resolveActor,
  type ContentStatus,
  type ContentType,
  type LifecycleActor,
  type LifecycleTransition,
} from '@/lib/contentLifecycle'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any }

export interface ContentReview {
  id: string
  content_type: ContentType
  content_id: string
  status: ContentStatus
  submitted_by: string | null
  reviewed_by: string | null
  review_notes: string | null
  submitted_at: string
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface SourceChangeFlag {
  id: string
  training_module_id: string
  document_id: string
  source_updated_at: string
  course_last_reviewed_at: string | null
  flagged_at: string
  resolved_at: string | null
  resolved_by: string | null
}

export interface ReviewQueueItem {
  review: ContentReview
  title: string
  ownerId: string | null
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** All reviews for one piece of content, newest first. */
export async function listReviewsForContent(
  contentType: ContentType,
  contentId: string,
): Promise<ContentReview[]> {
  const { data, error } = await db
    .from('content_reviews')
    .select('*')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ContentReview[]
}

/** The single open (in_review) review for a piece of content, if any. */
export async function getOpenReview(
  contentType: ContentType,
  contentId: string,
): Promise<ContentReview | null> {
  const { data, error } = await db
    .from('content_reviews')
    .select('*')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .eq('status', 'in_review')
    .maybeSingle()
  if (error) throw error
  return (data as ContentReview) ?? null
}

const TITLE_COLUMN: Record<ContentType, string> = {
  course: 'title',
  article: 'title',
  assessment: 'title',
}

/**
 * The review queue: every open (in_review) review across all content types,
 * enriched with the backing content's title + owner. Optionally filter by type.
 */
export async function listReviewQueue(opts?: {
  contentType?: ContentType
  ownerId?: string
}): Promise<ReviewQueueItem[]> {
  let query = db
    .from('content_reviews')
    .select('*')
    .eq('status', 'in_review')
    .order('submitted_at', { ascending: true })

  if (opts?.contentType) query = query.eq('content_type', opts.contentType)
  if (opts?.ownerId) query = query.eq('submitted_by', opts.ownerId)

  const { data, error } = await query
  if (error) throw error

  const reviews = (data ?? []) as ContentReview[]

  const items = await Promise.all(
    reviews.map(async (review) => {
      const table = CONTENT_TABLE[review.content_type]
      const titleCol = TITLE_COLUMN[review.content_type]
      const { data: content } = await db
        .from(table)
        .select(`${titleCol}, owner_id`)
        .eq('id', review.content_id)
        .maybeSingle()
      return {
        review,
        title: (content?.[titleCol] as string) ?? '(untitled)',
        ownerId: (content?.owner_id as string) ?? review.submitted_by ?? null,
      }
    }),
  )

  return items
}

/** Open source-change flags (courses whose grounding doc moved on). */
export async function listOpenSourceChangeFlags(): Promise<SourceChangeFlag[]> {
  const { data, error } = await db
    .from('source_change_flags')
    .select('*')
    .is('resolved_at', null)
    .order('flagged_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SourceChangeFlag[]
}

// ---------------------------------------------------------------------------
// Writes -- transitions
// ---------------------------------------------------------------------------

async function currentStatus(
  contentType: ContentType,
  contentId: string,
): Promise<ContentStatus> {
  const table = CONTENT_TABLE[contentType]
  const { data, error } = await db
    .from(table)
    .select('lifecycle_status')
    .eq('id', contentId)
    .single()
  if (error) throw error
  return (data?.lifecycle_status as ContentStatus) ?? 'draft'
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  const id = data.user?.id
  if (!id) throw new Error('Not authenticated')
  return id
}

async function setLifecycleStatus(
  contentType: ContentType,
  contentId: string,
  status: ContentStatus,
  extra?: Record<string, unknown>,
): Promise<void> {
  const table = CONTENT_TABLE[contentType]
  const { error } = await db
    .from(table)
    .update({ lifecycle_status: status, ...extra })
    .eq('id', contentId)
  if (error) throw error
}

export interface TransitionInput {
  contentType: ContentType
  contentId: string
  /** Caller's actor role relative to this content. */
  actor: LifecycleActor
  notes?: string
}

/**
 * Submit a piece of content for review.
 * Creates the `content_reviews` row and flips lifecycle_status -> in_review.
 */
export async function submitForReview(input: TransitionInput): Promise<ContentReview> {
  const status = await currentStatus(input.contentType, input.contentId)
  applyTransition('submitForReview', status, input.actor) // throws if illegal

  const userId = await currentUserId()
  const { data, error } = await db
    .from('content_reviews')
    .insert({
      content_type: input.contentType,
      content_id: input.contentId,
      status: 'in_review',
      submitted_by: userId,
      review_notes: input.notes ?? null,
    })
    .select('*')
    .single()
  if (error) throw error

  await setLifecycleStatus(input.contentType, input.contentId, 'in_review')
  return data as ContentReview
}

async function resolveOpenReview(
  input: TransitionInput,
  transition: LifecycleTransition,
  reviewStatus: ContentStatus,
): Promise<ContentReview> {
  const status = await currentStatus(input.contentType, input.contentId)
  const check = canTransition(transition, status, input.actor)
  if (!check.allowed) throw new Error(check.reason)

  const userId = await currentUserId()
  const open = await getOpenReview(input.contentType, input.contentId)

  let review: ContentReview
  if (open) {
    const { data, error } = await db
      .from('content_reviews')
      .update({
        status: reviewStatus,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        review_notes: input.notes ?? open.review_notes ?? null,
      })
      .eq('id', open.id)
      .select('*')
      .single()
    if (error) throw error
    review = data as ContentReview
  } else {
    // No open review row (e.g. content submitted before this system existed):
    // record the decision anyway.
    const { data, error } = await db
      .from('content_reviews')
      .insert({
        content_type: input.contentType,
        content_id: input.contentId,
        status: reviewStatus,
        submitted_by: userId,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        review_notes: input.notes ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    review = data as ContentReview
  }

  const extra =
    check.nextStatus === 'approved' || check.nextStatus === 'published'
      ? { last_reviewed_at: new Date().toISOString() }
      : undefined
  await setLifecycleStatus(input.contentType, input.contentId, check.nextStatus!, extra)
  return review
}

export const approve = (input: TransitionInput) =>
  resolveOpenReview(input, 'approve', 'approved')

export const requestChanges = (input: TransitionInput) =>
  resolveOpenReview(input, 'requestChanges', 'draft')

export const publish = (input: TransitionInput) =>
  resolveOpenReview(input, 'publish', 'published')

export const archive = (input: TransitionInput) =>
  resolveOpenReview(input, 'archive', 'archived')

/** Mark a source-change flag as reviewed. */
export async function resolveSourceChangeFlag(flagId: string): Promise<void> {
  const userId = await currentUserId()
  const { error } = await db
    .from('source_change_flags')
    .update({ resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq('id', flagId)
  if (error) throw error
}

/** Run the DB scanner that raises source-change flags. Returns count raised. */
export async function scanSourceChanges(): Promise<number> {
  const { data, error } = await db.rpc('scan_source_change_flags')
  if (error) throw error
  return (data as number) ?? 0
}

export { resolveActor }
