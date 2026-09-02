import { useAuth } from '@/hooks/useAuth'
import type { AppRole } from '@/lib/constants'
import { useMemo } from 'react'

export interface MessagingPermissions {
  canSendMessage: boolean
  canSendBroadcast: boolean
  canSendSystemMessage: boolean
  canViewAllMessages: boolean
  canDeleteMessages: boolean
  canManageNotifications: boolean
  maxRecipientsPerMessage: number
  allowedMessageTypes: ('direct' | 'broadcast' | 'system')[]
  allowedPriorities: ('low' | 'medium' | 'high' | 'urgent')[]
}

export function useMessagingPermissions(): MessagingPermissions {
  const { profile, primaryRole } = useAuth()

  return useMemo(() => {
    const baseMessageTypes: MessagingPermissions['allowedMessageTypes'] = ['direct']
    const basePriorities: MessagingPermissions['allowedPriorities'] = ['low', 'medium', 'high']
    const permissions: MessagingPermissions = {
      // Base permissions for all authenticated users
      canSendMessage: !!profile?.is_active,
      canSendBroadcast: false,
      canSendSystemMessage: false,
      canViewAllMessages: false,
      canDeleteMessages: false,
      canManageNotifications: false,
      maxRecipientsPerMessage: 10,
      allowedMessageTypes: baseMessageTypes,
      allowedPriorities: basePriorities
    }

    // Role-based permissions
    if (!primaryRole) return permissions

    switch (primaryRole) {
      case 'administrator':
      case 'super_admin':
      case 'corporate_admin':
        return {
          ...permissions,
          canSendBroadcast: true,
          canSendSystemMessage: true,
          canViewAllMessages: true,
          canDeleteMessages: true,
          canManageNotifications: true,
          maxRecipientsPerMessage: 1000,
          allowedMessageTypes: ['direct', 'broadcast', 'system'],
          allowedPriorities: ['low', 'medium', 'high', 'urgent']
        }

      case 'training_manager':
      case 'regional_admin':
        return {
          ...permissions,
          canSendBroadcast: true,
          canSendSystemMessage: true,
          canViewAllMessages: true,
          canDeleteMessages: true,
          canManageNotifications: true,
          maxRecipientsPerMessage: 1000,
          allowedMessageTypes: ['direct', 'broadcast', 'system'],
          allowedPriorities: ['low', 'medium', 'high', 'urgent']
        }

      case 'knowledge_manager':
      case 'regional_hr':
        return {
          ...permissions,
          canSendBroadcast: true,
          canSendSystemMessage: false,
          canViewAllMessages: true,
          canDeleteMessages: false,
          canManageNotifications: true,
          maxRecipientsPerMessage: 500,
          allowedMessageTypes: ['direct', 'broadcast'],
          allowedPriorities: ['low', 'medium', 'high', 'urgent']
        }

      case 'property_manager':
        return {
          ...permissions,
          canSendBroadcast: true,
          canSendSystemMessage: false,
          canViewAllMessages: false,
          canDeleteMessages: true,
          canManageNotifications: true,
          maxRecipientsPerMessage: 100,
          allowedMessageTypes: ['direct', 'broadcast'],
          allowedPriorities: ['low', 'medium', 'high', 'urgent']
        }

      case 'property_hr':
        return {
          ...permissions,
          canSendBroadcast: true,
          canSendSystemMessage: false,
          canViewAllMessages: false,
          canDeleteMessages: false,
          canManageNotifications: true,
          maxRecipientsPerMessage: 50,
          allowedMessageTypes: ['direct', 'broadcast'],
          allowedPriorities: ['low', 'medium', 'high']
        }

      case 'author':
      case 'department_head':
        return {
          ...permissions,
          canSendBroadcast: false,
          canSendSystemMessage: false,
          canViewAllMessages: false,
          canDeleteMessages: false,
          canManageNotifications: false,
          maxRecipientsPerMessage: 25,
          allowedMessageTypes: ['direct'],
          allowedPriorities: ['low', 'medium', 'high']
        }

      case 'learner':
      case 'staff':
        return {
          ...permissions,
          canSendBroadcast: false,
          canSendSystemMessage: false,
          canViewAllMessages: false,
          canDeleteMessages: false,
          canManageNotifications: false,
          maxRecipientsPerMessage: 10,
          allowedMessageTypes: ['direct'],
          allowedPriorities: ['low', 'medium']
        }

      default:
        return permissions
    }
  }, [profile?.is_active, primaryRole])
}

export function canSendMessageTo(
  senderRole: AppRole | undefined,
  recipientRole: AppRole | undefined
): boolean {
  if (!senderRole || !recipientRole) return false

  // Users can always message their direct manager or subordinates
  const roleHierarchy = ['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'manager', 'author', 'learner', 'staff']
  const senderIndex = roleHierarchy.indexOf(senderRole)
  const recipientIndex = roleHierarchy.indexOf(recipientRole)

  // Can message up the hierarchy (to managers)
  if (recipientIndex < senderIndex) return true

  // Can message down the hierarchy (to subordinates)
  if (recipientIndex > senderIndex) return true

  // Can message peers (same level)
  if (senderIndex === recipientIndex) return true

  return true // Default to allow for now
}

export function validateMessageContent(
  content: string,
  messageType: 'direct' | 'broadcast' | 'system',
  userRole: AppRole | undefined
): { isValid: boolean; error?: string } {
  if (!content.trim()) {
    return { isValid: false, error: 'Message content cannot be empty' }
  }

  if (content.length > 10000) {
    return { isValid: false, error: 'Message content is too long (max 10,000 characters)' }
  }

  // System messages require higher privileges
  if (messageType === 'system' && !['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'regional_admin', 'regional_hr'].includes(userRole || '')) {
    return { isValid: false, error: 'You do not have permission to send system messages' }
  }

  return { isValid: true }
}
