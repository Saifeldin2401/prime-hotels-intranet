/**
 * contentLifecycle
 * ----------------------------------------------------------------------------
 * The shared content-lifecycle state machine for the learning platform.
 *
 * One machine spans all three content kinds:
 *   course      -> training_modules
 *   article     -> documents
 *   assessment  -> learning_quizzes
 *
 * States (mirror the `content_status` Postgres enum):
 *   draft -> in_review -> approved -> published -> archived
 *
 * This module is pure: no network, no Supabase. The service layer
 * (src/services/contentLifecycleService.ts) persists the transitions the
 * machine says are legal.
 */

export const CONTENT_STATUSES = [
  'draft',
  'in_review',
  'approved',
  'published',
  'archived',
] as const

export type ContentStatus = (typeof CONTENT_STATUSES)[number]

export const CONTENT_TYPES = ['course', 'article', 'assessment'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

/**
 * Who is acting, relative to the piece of content.
 *  - `owner`   : the content's owner/author (owner_id / created_by)
 *  - `manager` : a content manager (training / knowledge / admin roles)
 *  - `viewer`  : anyone else
 */
export type LifecycleActor = 'owner' | 'manager' | 'viewer'

export type LifecycleTransition =
  | 'submitForReview'
  | 'approve'
  | 'requestChanges'
  | 'publish'
  | 'archive'
  | 'restore'

interface TransitionSpec {
  from: ContentStatus[]
  to: ContentStatus
  /** Roles allowed to perform the transition. */
  actors: LifecycleActor[]
  label: string
}

/**
 * The single source of truth for legal transitions.
 * Read as: performing `transition` moves content from one of `from` to `to`,
 * and only `actors` may do it.
 */
export const TRANSITIONS: Record<LifecycleTransition, TransitionSpec> = {
  submitForReview: {
    from: ['draft'],
    to: 'in_review',
    actors: ['owner', 'manager'],
    label: 'Submit for review',
  },
  approve: {
    from: ['in_review'],
    to: 'approved',
    actors: ['manager'],
    label: 'Approve',
  },
  requestChanges: {
    from: ['in_review'],
    to: 'draft',
    actors: ['manager'],
    label: 'Request changes',
  },
  publish: {
    from: ['approved'],
    to: 'published',
    actors: ['manager'],
    label: 'Publish',
  },
  archive: {
    from: ['draft', 'in_review', 'approved', 'published'],
    to: 'archived',
    actors: ['owner', 'manager'],
    label: 'Archive',
  },
  restore: {
    from: ['archived'],
    to: 'draft',
    actors: ['manager'],
    label: 'Restore to draft',
  },
}

export interface TransitionCheck {
  allowed: boolean
  /** Populated when `allowed` is false. */
  reason?: string
  /** The resulting status when `allowed` is true. */
  nextStatus?: ContentStatus
}

/**
 * Can `actor` perform `transition` on content currently in `status`?
 */
export function canTransition(
  transition: LifecycleTransition,
  status: ContentStatus,
  actor: LifecycleActor,
): TransitionCheck {
  const spec = TRANSITIONS[transition]
  if (!spec) {
    return { allowed: false, reason: `Unknown transition "${transition}"` }
  }
  if (!spec.from.includes(status)) {
    return {
      allowed: false,
      reason: `Cannot "${transition}" content in "${status}" (expected: ${spec.from.join(', ')})`,
    }
  }
  if (!spec.actors.includes(actor)) {
    return {
      allowed: false,
      reason: `Role "${actor}" may not "${transition}" (allowed: ${spec.actors.join(', ')})`,
    }
  }
  return { allowed: true, nextStatus: spec.to }
}

/**
 * Apply a transition, returning the next status.
 * Throws if the transition is not legal for the given status/actor.
 */
export function applyTransition(
  transition: LifecycleTransition,
  status: ContentStatus,
  actor: LifecycleActor,
): ContentStatus {
  const check = canTransition(transition, status, actor)
  if (!check.allowed || !check.nextStatus) {
    throw new Error(check.reason ?? 'Illegal transition')
  }
  return check.nextStatus
}

/** Every transition an actor could perform from the current status. */
export function availableTransitions(
  status: ContentStatus,
  actor: LifecycleActor,
): LifecycleTransition[] {
  return (Object.keys(TRANSITIONS) as LifecycleTransition[]).filter(
    (t) => canTransition(t, status, actor).allowed,
  )
}

/** Resolve an actor label from ownership + manager flag. */
export function resolveActor(opts: {
  isOwner: boolean
  isManager: boolean
}): LifecycleActor {
  if (opts.isManager) return 'manager'
  if (opts.isOwner) return 'owner'
  return 'viewer'
}

/** Role names (app_role) that count as content managers for the queue. */
export const CONTENT_MANAGER_ROLES = [
  'super_admin',
  'corporate_admin',
  'regional_admin',
  'regional_hr',
  'property_manager',
  'property_hr',
] as const

export function isContentManagerRole(role: string | null | undefined): boolean {
  return !!role && (CONTENT_MANAGER_ROLES as readonly string[]).includes(role)
}

// ---------------------------------------------------------------------------
// Named helpers -- thin wrappers the service/UI call by intent.
// ---------------------------------------------------------------------------
export const submitForReview = (s: ContentStatus, a: LifecycleActor) =>
  applyTransition('submitForReview', s, a)
export const approve = (s: ContentStatus, a: LifecycleActor) =>
  applyTransition('approve', s, a)
export const requestChanges = (s: ContentStatus, a: LifecycleActor) =>
  applyTransition('requestChanges', s, a)
export const publish = (s: ContentStatus, a: LifecycleActor) =>
  applyTransition('publish', s, a)
export const archive = (s: ContentStatus, a: LifecycleActor) =>
  applyTransition('archive', s, a)

/** Which DB table backs each content type. */
export const CONTENT_TABLE: Record<ContentType, string> = {
  course: 'training_modules',
  article: 'documents',
  assessment: 'learning_quizzes',
}
