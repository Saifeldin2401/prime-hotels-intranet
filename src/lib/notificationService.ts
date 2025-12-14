/**
 * Notification Service
 * 
 * Provides comprehensive notification creation and management
 * for all system events across modules
 */

import { supabase } from './supabase'

// Extended notification types covering all system events
export type NotificationType =
  // Approval workflow
  | 'approval_required'
  | 'request_approved'
  | 'request_rejected'
  | 'request_submitted'
  | 'request_returned'
  | 'request_closed'
  // Comments
  | 'comment_added'
  // Training
  | 'training_assigned'
  | 'training_deadline'
  | 'training_completed'
  | 'training_overdue'
  // Documents
  | 'document_published'
  | 'document_acknowledgment_required'
  | 'document_approved'
  | 'document_rejected'
  // Announcements
  | 'announcement_new'
  // Escalation
  | 'escalation_alert'
  // HR
  | 'referral_status_update'
  | 'promotion_approved'
  | 'transfer_approved'
  // Maintenance
  | 'maintenance_assigned'
  | 'maintenance_resolved'
  | 'maintenance_updated'
  // Messaging
  | 'message_received'
  | 'mention'
  // Tasks
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_completed'
  // SOP
  | 'sop_assigned'
  | 'sop_quiz_required'
  | 'sop_quiz_passed'
  | 'sop_quiz_failed'
  // System
  | 'system'

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export interface BulkNotificationParams {
  userIds: string[]
  type: NotificationType
  title: string
  message: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

/**
 * Create a single notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { userId, type, title, message, entityType, entityId, metadata } = params

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    entity_type: entityType || null,
    entity_id: entityId || null,
    metadata: metadata || null,
  })

  if (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

/**
 * Create notifications for multiple users (e.g., department-wide announcements)
 */
export async function createBulkNotifications(params: BulkNotificationParams): Promise<void> {
  const { userIds, type, title, message, entityType, entityId, metadata } = params

  if (userIds.length === 0) return

  const notifications = userIds.map(userId => ({
    user_id: userId,
    type,
    title,
    message,
    entity_type: entityType || null,
    entity_id: entityId || null,
    metadata: metadata || null,
  }))

  const { error } = await supabase.from('notifications').insert(notifications)

  if (error) {
    console.error('Error creating bulk notifications:', error)
    throw error
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}

/**
 * Delete old notifications (for cleanup)
 */
export async function deleteOldNotifications(userId: string, olderThanDays: number = 30): Promise<void> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', cutoffDate.toISOString())

  if (error) {
    console.error('Error deleting old notifications:', error)
    throw error
  }
}

// ============================================
// Pre-built notification templates
// ============================================

export const NotificationTemplates = {
  // Approval workflow
  approvalRequired: (entityType: string, entityTitle: string, requesterName: string) => ({
    title: 'Approval Required',
    message: `${requesterName} submitted a ${entityType} "${entityTitle}" for your approval.`,
  }),

  requestApproved: (entityType: string, entityTitle: string, approverName: string) => ({
    title: 'Request Approved',
    message: `Your ${entityType} "${entityTitle}" has been approved by ${approverName}.`,
  }),

  requestRejected: (entityType: string, entityTitle: string, approverName: string, reason?: string) => ({
    title: 'Request Rejected',
    message: `Your ${entityType} "${entityTitle}" was rejected by ${approverName}.${reason ? ` Reason: ${reason}` : ''}`,
  }),

  // Training
  trainingAssigned: (moduleTitle: string, deadline?: string) => ({
    title: 'Training Assigned',
    message: `You have been assigned to complete "${moduleTitle}".${deadline ? ` Due by ${deadline}.` : ''}`,
  }),

  trainingDeadline: (moduleTitle: string, daysRemaining: number) => ({
    title: 'Training Deadline Approaching',
    message: `Reminder: "${moduleTitle}" is due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`,
  }),

  trainingCompleted: (moduleTitle: string, score?: number) => ({
    title: 'Training Completed',
    message: `Congratulations! You completed "${moduleTitle}"${score !== undefined ? ` with a score of ${score}%` : ''}.`,
  }),

  // Tasks
  taskAssigned: (taskTitle: string, assignerName: string) => ({
    title: 'New Task Assigned',
    message: `${assignerName} assigned you a task: "${taskTitle}".`,
  }),

  taskDueSoon: (taskTitle: string, dueDate: string) => ({
    title: 'Task Due Soon',
    message: `Task "${taskTitle}" is due on ${dueDate}.`,
  }),

  taskCompleted: (taskTitle: string, completedBy: string) => ({
    title: 'Task Completed',
    message: `${completedBy} completed the task "${taskTitle}".`,
  }),

  // Maintenance
  maintenanceAssigned: (ticketTitle: string, location: string) => ({
    title: 'Maintenance Ticket Assigned',
    message: `You have been assigned to handle: "${ticketTitle}" at ${location}.`,
  }),

  maintenanceResolved: (ticketTitle: string, resolvedBy: string) => ({
    title: 'Maintenance Resolved',
    message: `Ticket "${ticketTitle}" has been resolved by ${resolvedBy}.`,
  }),

  // Messages
  messageReceived: (senderName: string, subject: string) => ({
    title: 'New Message',
    message: `${senderName} sent you a message: "${subject}".`,
  }),

  mention: (mentionerName: string, context: string) => ({
    title: 'You were mentioned',
    message: `${mentionerName} mentioned you in ${context}.`,
  }),

  // SOP
  sopAssigned: (sopTitle: string, deadline?: string) => ({
    title: 'SOP Review Required',
    message: `You have been assigned to review "${sopTitle}".${deadline ? ` Due by ${deadline}.` : ''}`,
  }),

  sopQuizRequired: (sopTitle: string) => ({
    title: 'Quiz Required',
    message: `Complete the quiz for "${sopTitle}" to confirm your understanding.`,
  }),

  // HR
  leaveApproved: (startDate: string, endDate: string, approverName: string) => ({
    title: 'Leave Request Approved',
    message: `Your leave request (${startDate} - ${endDate}) has been approved by ${approverName}.`,
  }),

  leaveRejected: (startDate: string, endDate: string, approverName: string, reason?: string) => ({
    title: 'Leave Request Rejected',
    message: `Your leave request (${startDate} - ${endDate}) was rejected by ${approverName}.${reason ? ` Reason: ${reason}` : ''}`,
  }),

  // Announcements
  newAnnouncement: (title: string, priority: string) => ({
    title: priority === 'critical' ? '🚨 Critical Announcement' : 'New Announcement',
    message: `${title}`,
  }),

  // Documents
  documentPublished: (documentTitle: string) => ({
    title: 'New Document Published',
    message: `A new document "${documentTitle}" has been published.`,
  }),

  documentAcknowledgmentRequired: (documentTitle: string) => ({
    title: 'Acknowledgment Required',
    message: `Please acknowledge that you have read "${documentTitle}".`,
  }),
}
