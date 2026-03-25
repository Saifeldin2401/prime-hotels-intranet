/**
 * Shared notification link resolution utility.
 *
 * Determines the correct navigation target for any notification,
 * using an explicit `link` when available and falling back to
 * type-based routing otherwise.
 */

/**
 * Resolve the navigation link for a notification.
 *
 * @param notification  The notification object
 * @param options       Optional helpers (e.g. permission checks)
 * @returns             A route string or null when no target exists
 */
export function getNotificationLink(
  notification: { type: string; link?: string | null; entity_id?: string | null },
  options?: {
    /** Check whether the current user has a given permission. */
    hasPermission?: (permission: string) => boolean
  },
): string | null {
  // Type-based routing takes priority over stored links because the DB
  // may contain stale/incorrect values from older notification triggers.
  // The stored link is only used as a last-resort fallback for unknown types.
  const type = notification.type

  switch (type) {
    // ── Approval workflow ──────────────────────────────────
    case 'approval_required':
    case 'request_approved':
    case 'request_rejected':
    case 'request_submitted':
    case 'request_returned':
    case 'request_closed':
      return '/approvals'

    // ── Training / Learning ────────────────────────────────
    case 'training_assigned':
    case 'training_deadline':
    case 'training_overdue':
      return '/learning/my'

    case 'training_completed':
      return '/training/certificates'

    // ── Knowledge / Documents ──────────────────────────────
    case 'document_published':
    case 'document_acknowledgment_required':
    case 'document_approved':
    case 'document_rejected':
    case 'document_review_pending':
      return '/knowledge'

    // ── SOPs ───────────────────────────────────────────────
    case 'sop_assigned':
    case 'sop_quiz_required':
    case 'sop_quiz_passed':
    case 'sop_quiz_failed':
      return '/knowledge'

    // ── Announcements ──────────────────────────────────────
    case 'announcement_new':
      return '/announcements'

    // ── Certificates ──────────────────────────────────────
    case 'certificate_issued':
    case 'certificate_expiring':
      return '/training/certificates'

    // ── Maintenance ────────────────────────────────────────
    case 'maintenance_assigned':
    case 'maintenance_resolved':
    case 'maintenance_updated':
      return '/maintenance'

    // ── Tasks ──────────────────────────────────────────────
    case 'task_assigned':
    case 'task_due_soon':
    case 'task_overdue':
    case 'task_completed':
      return '/tasks'

    // ── HR / Referrals ─────────────────────────────────────
    case 'referral_status_update': {
      const isHR = options?.hasPermission?.('hr.manage_referrals')
      return isHR ? '/hr/referrals' : '/jobs/referrals'
    }
    case 'promotion_approved':
    case 'transfer_approved':
      return '/approvals'

    // ── Messaging ──────────────────────────────────────────
    case 'message_received':
    case 'mention':
      return '/messaging'

    // ── Escalation ─────────────────────────────────────────
    case 'escalation_alert':
      return '/approvals'

    // ── Comments ───────────────────────────────────────────
    case 'comment_added':
      return null // Context-dependent; no single target

    // ── Employee of the Month ──────────────────────────────
    case 'employee_of_the_month_winner':
      return '/hr/employee-of-month'

    // ── System / unknown ───────────────────────────────────
    case 'system':
    default:
      // Last resort: use the stored link for unmapped types
      return notification.link || null
  }
}
