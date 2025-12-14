import { supabase } from '@/lib/supabase'

/**
 * Audit log event types for tracking user actions
 */
export type AuditEventType =
    | 'user.login'
    | 'user.logout'
    | 'user.password_change'
    | 'user.profile_update'
    | 'user.created'
    | 'user.deactivated'
    | 'user.activated'
    | 'document.created'
    | 'document.updated'
    | 'document.deleted'
    | 'document.viewed'
    | 'document.downloaded'
    | 'approval.created'
    | 'approval.approved'
    | 'approval.rejected'
    | 'approval.delegated'
    | 'training.completed'
    | 'training.assigned'
    | 'sop.acknowledged'
    | 'sop.version_created'
    | 'job.posting_created'
    | 'job.application_received'
    | 'job.referral_submitted'
    | 'maintenance.ticket_created'
    | 'maintenance.ticket_resolved'
    | 'message.sent'
    | 'settings.changed'
    | 'export.data'
    | 'import.data'
    | 'admin.action'

export interface AuditLogEntry {
    event_type: AuditEventType
    entity_type?: string // 'user' | 'document' | 'approval' | etc.
    entity_id?: string
    description?: string
    metadata?: Record<string, any>
    ip_address?: string
    user_agent?: string
}

/**
 * Record an audit log entry
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData?.user?.id

        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: userId,
                event_type: entry.event_type,
                entity_type: entry.entity_type,
                entity_id: entry.entity_id,
                description: entry.description,
                metadata: entry.metadata || {},
                ip_address: entry.ip_address,
                user_agent: entry.user_agent || navigator.userAgent
            })

        if (error) {
            console.error('Audit log error:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err: any) {
        console.error('Audit log exception:', err)
        return { success: false, error: err.message }
    }
}

/**
 * Convenience methods for common audit events
 */
export const auditLog = {
    // User events
    login: () => logAuditEvent({
        event_type: 'user.login',
        entity_type: 'user',
        description: 'User logged in'
    }),

    logout: () => logAuditEvent({
        event_type: 'user.logout',
        entity_type: 'user',
        description: 'User logged out'
    }),

    passwordChange: () => logAuditEvent({
        event_type: 'user.password_change',
        entity_type: 'user',
        description: 'Password changed'
    }),

    profileUpdate: (userId: string, changes: Record<string, any>) => logAuditEvent({
        event_type: 'user.profile_update',
        entity_type: 'user',
        entity_id: userId,
        description: 'Profile updated',
        metadata: { changes }
    }),

    // Document events
    documentViewed: (docId: string, docName: string) => logAuditEvent({
        event_type: 'document.viewed',
        entity_type: 'document',
        entity_id: docId,
        description: `Viewed document: ${docName}`,
        metadata: { document_name: docName }
    }),

    documentDownloaded: (docId: string, docName: string) => logAuditEvent({
        event_type: 'document.downloaded',
        entity_type: 'document',
        entity_id: docId,
        description: `Downloaded document: ${docName}`,
        metadata: { document_name: docName }
    }),

    // Approval events
    approvalAction: (
        action: 'approved' | 'rejected' | 'delegated',
        approvalId: string,
        approvalType: string,
        metadata?: Record<string, any>
    ) => logAuditEvent({
        event_type: `approval.${action}` as AuditEventType,
        entity_type: 'approval',
        entity_id: approvalId,
        description: `${approvalType} ${action}`,
        metadata: { approval_type: approvalType, ...metadata }
    }),

    // Training events
    trainingCompleted: (moduleId: string, moduleName: string) => logAuditEvent({
        event_type: 'training.completed',
        entity_type: 'training_module',
        entity_id: moduleId,
        description: `Completed training: ${moduleName}`,
        metadata: { module_name: moduleName }
    }),

    // SOP events
    sopAcknowledged: (sopId: string, sopTitle: string) => logAuditEvent({
        event_type: 'sop.acknowledged',
        entity_type: 'sop',
        entity_id: sopId,
        description: `Acknowledged SOP: ${sopTitle}`,
        metadata: { sop_title: sopTitle }
    }),

    // Export events
    dataExported: (exportType: string, recordCount: number) => logAuditEvent({
        event_type: 'export.data',
        entity_type: 'export',
        description: `Exported ${recordCount} ${exportType} records`,
        metadata: { export_type: exportType, record_count: recordCount }
    }),

    // Admin events
    adminAction: (action: string, details?: Record<string, any>) => logAuditEvent({
        event_type: 'admin.action',
        entity_type: 'admin',
        description: action,
        metadata: details
    })
}
