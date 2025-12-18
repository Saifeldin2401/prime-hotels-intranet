/**
 * Approval Notification Service
 * 
 * Handles sending notifications when approvals are required.
 * Integrates with leave requests, promotions, transfers, and other workflows.
 */

import { supabase } from '@/lib/supabase'

export type ApprovalType =
    | 'leave_request'
    | 'promotion'
    | 'transfer'
    | 'job_application'
    | 'expense_claim'
    | 'document_review'

interface ApprovalNotificationParams {
    type: ApprovalType
    entityId: string
    requesterId: string
    requesterName: string
    approverId: string
    title: string
    description?: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    link: string
    metadata?: Record<string, unknown>
}

interface ApprovalOutcome {
    type: ApprovalType
    entityId: string
    requesterId: string
    approverId: string
    approverName: string
    approved: boolean
    reason?: string
    link: string
}

/**
 * Send notification to approver when a new request is submitted
 */
export async function notifyApprovalRequired({
    type,
    entityId,
    requesterId,
    requesterName,
    approverId,
    title,
    description,
    priority = 'normal',
    link,
    metadata = {}
}: ApprovalNotificationParams): Promise<void> {
    const typeLabels: Record<ApprovalType, string> = {
        leave_request: 'Leave Request',
        promotion: 'Promotion Request',
        transfer: 'Transfer Request',
        job_application: 'Job Application',
        expense_claim: 'Expense Claim',
        document_review: 'Document Review'
    }

    const priorityEmoji: Record<string, string> = {
        low: '🔵',
        normal: '🟡',
        high: '🟠',
        urgent: '🔴'
    }

    try {
        await supabase.from('notifications').insert({
            user_id: approverId,
            type: `approval_required_${type}`,
            title: `${priorityEmoji[priority]} ${typeLabels[type]} Pending Approval`,
            message: `${requesterName} has submitted a ${typeLabels[type].toLowerCase()}: "${title}"${description ? ` - ${description}` : ''}`,
            link,
            data: {
                approval_type: type,
                entity_id: entityId,
                requester_id: requesterId,
                requester_name: requesterName,
                priority,
                ...metadata
            }
        })
    } catch (error) {
        console.error('Failed to send approval notification:', error)
    }
}

/**
 * Notify requester of approval outcome
 */
export async function notifyApprovalOutcome({
    type,
    entityId,
    requesterId,
    approverId,
    approverName,
    approved,
    reason,
    link
}: ApprovalOutcome): Promise<void> {
    const typeLabels: Record<ApprovalType, string> = {
        leave_request: 'leave request',
        promotion: 'promotion request',
        transfer: 'transfer request',
        job_application: 'job application',
        expense_claim: 'expense claim',
        document_review: 'document'
    }

    const status = approved ? 'approved' : 'rejected'
    const emoji = approved ? '✅' : '❌'

    try {
        await supabase.from('notifications').insert({
            user_id: requesterId,
            type: `approval_${status}_${type}`,
            title: `${emoji} Your ${typeLabels[type]} has been ${status}`,
            message: reason
                ? `${approverName} has ${status} your ${typeLabels[type]}. Reason: "${reason}"`
                : `${approverName} has ${status} your ${typeLabels[type]}.`,
            link,
            data: {
                approval_type: type,
                entity_id: entityId,
                approver_id: approverId,
                approver_name: approverName,
                approved,
                reason
            }
        })
    } catch (error) {
        console.error('Failed to send approval outcome notification:', error)
    }
}

/**
 * Send reminder for pending approvals
 */
export async function sendApprovalReminder(
    approverId: string,
    pendingCount: number,
    oldestDays: number
): Promise<void> {
    try {
        await supabase.from('notifications').insert({
            user_id: approverId,
            type: 'approval_reminder',
            title: `⏰ You have ${pendingCount} pending approval${pendingCount > 1 ? 's' : ''}`,
            message: `Please review your pending approvals. The oldest has been waiting ${oldestDays} day${oldestDays > 1 ? 's' : ''}.`,
            link: '/approvals',
            data: {
                pending_count: pendingCount,
                oldest_days: oldestDays
            }
        })
    } catch (error) {
        console.error('Failed to send approval reminder:', error)
    }
}

/**
 * Batch send escalation notices when approvals are overdue
 */
export async function escalateOverdueApprovals(
    overdueItems: Array<{
        type: ApprovalType
        entityId: string
        currentApproverId: string
        escalateToId: string
        title: string
        daysOverdue: number
        link: string
    }>
): Promise<void> {
    const notifications = overdueItems.map(item => ({
        user_id: item.escalateToId,
        type: 'approval_escalated',
        title: `⚠️ Escalated: ${item.title}`,
        message: `This ${item.type.replace('_', ' ')} has been pending for ${item.daysOverdue} days and requires your attention.`,
        link: item.link,
        data: {
            type: item.type,
            entity_id: item.entityId,
            original_approver_id: item.currentApproverId,
            days_overdue: item.daysOverdue
        }
    }))

    try {
        if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications)
        }
    } catch (error) {
        console.error('Failed to send escalation notifications:', error)
    }
}
