/**
 * useNotificationTriggers
 * 
 * Hook for triggering notifications from mutations across the application.
 * Provides pre-built notification methods for common system events.
 */

import { useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
    createNotification,
    createBulkNotifications,
    NotificationTemplates,
    type NotificationType
} from '@/lib/notificationService'

interface Profile {
    id: string
    full_name: string | null
    email: string
}

export function useNotificationTriggers() {
    const { user, profile } = useAuth()

    const currentUserName = profile?.full_name || user?.email || 'Someone'

    // ============================================
    // Approval Workflow Notifications
    // ============================================

    const notifyApprovalRequired = useCallback(async (
        approverId: string,
        entityType: string,
        entityId: string,
        entityTitle: string
    ) => {
        const template = NotificationTemplates.approvalRequired(entityType, entityTitle, currentUserName)
        await createNotification({
            userId: approverId,
            type: 'approval_required',
            ...template,
            entityType,
            entityId,
            metadata: { requester_id: user?.id, requester_name: currentUserName }
        })
    }, [user?.id, currentUserName])

    const notifyRequestApproved = useCallback(async (
        requesterId: string,
        entityType: string,
        entityId: string,
        entityTitle: string
    ) => {
        const template = NotificationTemplates.requestApproved(entityType, entityTitle, currentUserName)
        await createNotification({
            userId: requesterId,
            type: 'request_approved',
            ...template,
            entityType,
            entityId,
            metadata: { approver_id: user?.id, approver_name: currentUserName }
        })
    }, [user?.id, currentUserName])

    const notifyRequestRejected = useCallback(async (
        requesterId: string,
        entityType: string,
        entityId: string,
        entityTitle: string,
        reason?: string
    ) => {
        const template = NotificationTemplates.requestRejected(entityType, entityTitle, currentUserName, reason)
        await createNotification({
            userId: requesterId,
            type: 'request_rejected',
            ...template,
            entityType,
            entityId,
            metadata: { approver_id: user?.id, approver_name: currentUserName, reason }
        })
    }, [user?.id, currentUserName])

    // ============================================
    // Training Notifications
    // ============================================

    const notifyTrainingAssigned = useCallback(async (
        assigneeId: string,
        moduleId: string,
        moduleTitle: string,
        deadline?: string
    ) => {
        const template = NotificationTemplates.trainingAssigned(moduleTitle, deadline)
        await createNotification({
            userId: assigneeId,
            type: 'training_assigned',
            ...template,
            entityType: 'training_module',
            entityId: moduleId,
            metadata: { assigner_id: user?.id, assigner_name: currentUserName, deadline }
        })
    }, [user?.id, currentUserName])

    const notifyTrainingAssignedBulk = useCallback(async (
        assigneeIds: string[],
        moduleId: string,
        moduleTitle: string,
        deadline?: string
    ) => {
        const template = NotificationTemplates.trainingAssigned(moduleTitle, deadline)
        await createBulkNotifications({
            userIds: assigneeIds,
            type: 'training_assigned',
            ...template,
            entityType: 'training_module',
            entityId: moduleId,
            metadata: { assigner_id: user?.id, assigner_name: currentUserName, deadline }
        })
    }, [user?.id, currentUserName])

    const notifyTrainingDeadline = useCallback(async (
        userId: string,
        moduleId: string,
        moduleTitle: string,
        daysRemaining: number
    ) => {
        const template = NotificationTemplates.trainingDeadline(moduleTitle, daysRemaining)
        await createNotification({
            userId,
            type: 'training_deadline',
            ...template,
            entityType: 'training_module',
            entityId: moduleId,
            metadata: { days_remaining: daysRemaining }
        })
    }, [])

    const notifyTrainingCompleted = useCallback(async (
        supervisorId: string,
        moduleId: string,
        moduleTitle: string,
        completedByName: string,
        score?: number
    ) => {
        await createNotification({
            userId: supervisorId,
            type: 'training_completed',
            title: 'Training Completed',
            message: `${completedByName} completed "${moduleTitle}"${score !== undefined ? ` with ${score}%` : ''}.`,
            entityType: 'training_module',
            entityId: moduleId,
            metadata: { completed_by: user?.id, score }
        })
    }, [user?.id])

    // ============================================
    // Task Notifications
    // ============================================

    const notifyTaskAssigned = useCallback(async (
        assigneeId: string,
        taskId: string,
        taskTitle: string
    ) => {
        const template = NotificationTemplates.taskAssigned(taskTitle, currentUserName)
        await createNotification({
            userId: assigneeId,
            type: 'task_assigned',
            ...template,
            entityType: 'task',
            entityId: taskId,
            metadata: { assigner_id: user?.id, assigner_name: currentUserName }
        })
    }, [user?.id, currentUserName])

    const notifyTaskCompleted = useCallback(async (
        creatorId: string,
        taskId: string,
        taskTitle: string
    ) => {
        const template = NotificationTemplates.taskCompleted(taskTitle, currentUserName)
        await createNotification({
            userId: creatorId,
            type: 'task_completed',
            ...template,
            entityType: 'task',
            entityId: taskId,
            metadata: { completed_by: user?.id, completed_by_name: currentUserName }
        })
    }, [user?.id, currentUserName])

    // ============================================
    // Maintenance Notifications
    // ============================================

    const notifyMaintenanceAssigned = useCallback(async (
        assigneeId: string,
        ticketId: string,
        ticketTitle: string,
        location: string
    ) => {
        const template = NotificationTemplates.maintenanceAssigned(ticketTitle, location)
        await createNotification({
            userId: assigneeId,
            type: 'maintenance_assigned',
            ...template,
            entityType: 'maintenance_ticket',
            entityId: ticketId,
            metadata: { assigner_id: user?.id, location }
        })
    }, [user?.id])

    const notifyMaintenanceResolved = useCallback(async (
        reporterId: string,
        ticketId: string,
        ticketTitle: string
    ) => {
        const template = NotificationTemplates.maintenanceResolved(ticketTitle, currentUserName)
        await createNotification({
            userId: reporterId,
            type: 'maintenance_resolved',
            ...template,
            entityType: 'maintenance_ticket',
            entityId: ticketId,
            metadata: { resolved_by: user?.id, resolved_by_name: currentUserName }
        })
    }, [user?.id, currentUserName])

    // ============================================
    // Message Notifications
    // ============================================

    const notifyMessageReceived = useCallback(async (
        recipientId: string,
        messageId: string,
        subject: string
    ) => {
        const template = NotificationTemplates.messageReceived(currentUserName, subject)
        await createNotification({
            userId: recipientId,
            type: 'message_received',
            ...template,
            entityType: 'message',
            entityId: messageId,
            metadata: { sender_id: user?.id, sender_name: currentUserName }
        })
    }, [user?.id, currentUserName])

    const notifyMention = useCallback(async (
        mentionedUserId: string,
        entityType: string,
        entityId: string,
        context: string
    ) => {
        const template = NotificationTemplates.mention(currentUserName, context)
        await createNotification({
            userId: mentionedUserId,
            type: 'mention',
            ...template,
            entityType,
            entityId,
            metadata: { mentioner_id: user?.id, mentioner_name: currentUserName }
        })
    }, [user?.id, currentUserName])

    // ============================================
    // SOP Notifications
    // ============================================

    const notifySOPAssigned = useCallback(async (
        assigneeId: string,
        sopId: string,
        sopTitle: string,
        deadline?: string
    ) => {
        const template = NotificationTemplates.sopAssigned(sopTitle, deadline)
        await createNotification({
            userId: assigneeId,
            type: 'sop_assigned',
            ...template,
            entityType: 'sop_document',
            entityId: sopId,
            metadata: { assigner_id: user?.id, deadline }
        })
    }, [user?.id])

    const notifySOPQuizRequired = useCallback(async (
        userId: string,
        sopId: string,
        sopTitle: string
    ) => {
        const template = NotificationTemplates.sopQuizRequired(sopTitle)
        await createNotification({
            userId,
            type: 'sop_quiz_required',
            ...template,
            entityType: 'sop_document',
            entityId: sopId,
        })
    }, [])

    // ============================================
    // Leave/HR Notifications
    // ============================================

    const notifyLeaveApproved = useCallback(async (
        requesterId: string,
        requestId: string,
        startDate: string,
        endDate: string
    ) => {
        const template = NotificationTemplates.leaveApproved(startDate, endDate, currentUserName)
        await createNotification({
            userId: requesterId,
            type: 'request_approved',
            ...template,
            entityType: 'leave_request',
            entityId: requestId,
            metadata: { approver_id: user?.id, start_date: startDate, end_date: endDate }
        })
    }, [user?.id, currentUserName])

    const notifyLeaveRejected = useCallback(async (
        requesterId: string,
        requestId: string,
        startDate: string,
        endDate: string,
        reason?: string
    ) => {
        const template = NotificationTemplates.leaveRejected(startDate, endDate, currentUserName, reason)
        await createNotification({
            userId: requesterId,
            type: 'request_rejected',
            ...template,
            entityType: 'leave_request',
            entityId: requestId,
            metadata: { approver_id: user?.id, start_date: startDate, end_date: endDate, reason }
        })
    }, [user?.id, currentUserName])

    // ============================================
    // Announcement Notifications
    // ============================================

    const notifyNewAnnouncement = useCallback(async (
        userIds: string[],
        announcementId: string,
        title: string,
        priority: string
    ) => {
        const template = NotificationTemplates.newAnnouncement(title, priority)
        await createBulkNotifications({
            userIds,
            type: 'announcement_new',
            ...template,
            entityType: 'announcement',
            entityId: announcementId,
            metadata: { priority }
        })
    }, [])

    // ============================================
    // Document Notifications
    // ============================================

    const notifyDocumentPublished = useCallback(async (
        userIds: string[],
        documentId: string,
        documentTitle: string
    ) => {
        const template = NotificationTemplates.documentPublished(documentTitle)
        await createBulkNotifications({
            userIds,
            type: 'document_published',
            ...template,
            entityType: 'document',
            entityId: documentId,
        })
    }, [])

    const notifyDocumentAcknowledgmentRequired = useCallback(async (
        userId: string,
        documentId: string,
        documentTitle: string
    ) => {
        const template = NotificationTemplates.documentAcknowledgmentRequired(documentTitle)
        await createNotification({
            userId,
            type: 'document_acknowledgment_required',
            ...template,
            entityType: 'document',
            entityId: documentId,
        })
    }, [])

    // ============================================
    // Comment Notification
    // ============================================

    const notifyCommentAdded = useCallback(async (
        userId: string,
        entityType: string,
        entityId: string,
        entityTitle: string
    ) => {
        await createNotification({
            userId,
            type: 'comment_added',
            title: 'New Comment',
            message: `${currentUserName} commented on "${entityTitle}".`,
            entityType,
            entityId,
            metadata: { commenter_id: user?.id, commenter_name: currentUserName }
        })
    }, [user?.id, currentUserName])

    return {
        // Approvals
        notifyApprovalRequired,
        notifyRequestApproved,
        notifyRequestRejected,
        // Training
        notifyTrainingAssigned,
        notifyTrainingAssignedBulk,
        notifyTrainingDeadline,
        notifyTrainingCompleted,
        // Tasks
        notifyTaskAssigned,
        notifyTaskCompleted,
        // Maintenance
        notifyMaintenanceAssigned,
        notifyMaintenanceResolved,
        // Messages
        notifyMessageReceived,
        notifyMention,
        // SOP
        notifySOPAssigned,
        notifySOPQuizRequired,
        // Leave/HR
        notifyLeaveApproved,
        notifyLeaveRejected,
        // Announcements
        notifyNewAnnouncement,
        // Documents
        notifyDocumentPublished,
        notifyDocumentAcknowledgmentRequired,
        // Comments
        notifyCommentAdded,
    }
}
