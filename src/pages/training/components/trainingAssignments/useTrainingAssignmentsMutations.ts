import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers'
import {
  getLearningAssignmentErrorMessage,
  persistLearningAssignments,
  type PersistLearningAssignmentsResult
} from '@/lib/learningAssignmentMutations'
import { supabase } from '@/lib/supabase'
import type { TrainingModule } from '@/lib/types'
import { learningService } from '@/services/learningService'
import type { ModuleAssigneeRosterEntry } from '@/types/learning'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface DescribeResultOptions {
  result: PersistLearningAssignmentsResult
  t: ReturnType<typeof useTranslation>['t']
}

function describeAssignmentMutationResult({ result, t }: DescribeResultOptions) {
  if (result.inserted === 0 && result.reactivated === 0) {
    return {
      title: t('assignmentNoChanges', 'No assignment changes'),
      description: t(
        'assignmentNoChangesDesc',
        'All selected targets already had active assignments for this module.'
      ),
    }
  }

  const summaryParts = [
    result.inserted > 0 ? t('assignmentInsertedSummary', '{{count}} new', { count: result.inserted }) : null,
    result.reactivated > 0 ? t('assignmentReactivatedSummary', '{{count}} restored', { count: result.reactivated }) : null,
    result.skipped > 0 ? t('assignmentSkippedSummary', '{{count}} already active', { count: result.skipped }) : null,
  ].filter(Boolean)

  return {
    title: t('assignmentUpdated', 'Assignments updated'),
    description: summaryParts.join(' | '),
  }
}

export interface CreateAssignmentParams {
  formModuleId: string
  formTargetType: 'all' | 'users' | 'departments' | 'properties'
  formTargetIds: string[]
  formDeadline: string
  formValidFrom: string
  formExpiresAt: string
  formPriority: 'normal' | 'high' | 'compliance'
  formInstructions: string
  requiresAcknowledgement: boolean
  sendNotifications: boolean
  notifyOnDue: boolean
  reminderDaysBefore: number[]
  modules: TrainingModule[] | undefined
  selectedAssignableModule: TrainingModule | undefined
}

export function useTrainingAssignmentsMutations(options: {
  onCreateSuccess: () => void
  onReassignSuccess: () => void
}) {
  const { profile } = useAuth()
  const { currentOrganization } = useTenant()
  const queryClient = useQueryClient()
  const { t } = useTranslation('training')
  const { toast } = useToast()
  const { notifyTrainingAssigned } = useNotificationTriggers()

  const invalidateAssignmentControlQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })
    queryClient.invalidateQueries({ queryKey: ['learning-progress'] })
    queryClient.invalidateQueries({ queryKey: ['learning-assignment-exemptions'] })
    queryClient.invalidateQueries({ queryKey: ['module-assignment-roster'] })
    queryClient.invalidateQueries({ queryKey: ['learning-assignments-module-links'] })
    queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
  }, [queryClient])

  const createAssignmentMutation = useMutation({
    mutationFn: async (params: CreateAssignmentParams) => {
      const {
        formModuleId,
        formTargetType,
        formTargetIds,
        formDeadline,
        formValidFrom,
        formExpiresAt,
        formPriority,
        formInstructions,
        requiresAcknowledgement,
        sendNotifications,
        notifyOnDue,
        reminderDaysBefore,
        modules,
        selectedAssignableModule,
      } = params

      if (!formModuleId) throw new Error(t('moduleRequired'))
      if (!selectedAssignableModule) {
        throw new Error(t('moduleMustBePublishedAndActive', 'Only active, published modules can be assigned.'))
      }

      const assignments = []
      const typeMap: Record<string, string> = {
        users: 'user',
        departments: 'department',
        properties: 'property'
      }
      const normalizedReminderDaysBefore = Array.from(
        new Set(reminderDaysBefore.filter((value) => Number.isInteger(value) && value > 0))
      ).sort((a, b) => a - b)
      const normalizedTargetIds = Array.from(
        new Set(formTargetIds.map((id) => id.trim()).filter(Boolean))
      )

      if (formTargetType === 'all') {
        assignments.push({
          target_type: 'everyone',
          target_id: null,
          content_type: 'module',
          content_id: formModuleId,
          organization_id: currentOrganization?.id || null,
          assigned_by: profile?.id,
          due_date: formDeadline || null,
          valid_from: formValidFrom ? new Date(formValidFrom).toISOString() : new Date().toISOString(),
          expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
          priority: formPriority,
          instructions: formInstructions || null,
          requires_acknowledgement: requiresAcknowledgement,
          notify_on_due: notifyOnDue,
          reminder_days_before: normalizedReminderDaysBefore
        })
      } else {
        if (normalizedTargetIds.length === 0) {
          throw new Error(t('selectTargetsRequired', 'Select at least one target.'))
        }

        normalizedTargetIds.forEach(id => {
          assignments.push({
            target_type: typeMap[formTargetType],
            target_id: id,
            content_type: 'module',
            content_id: formModuleId,
            organization_id: currentOrganization?.id || null,
            assigned_by: profile?.id,
            due_date: formDeadline || null,
            valid_from: formValidFrom ? new Date(formValidFrom).toISOString() : new Date().toISOString(),
            expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
            priority: formPriority,
            instructions: formInstructions || null,
            requires_acknowledgement: requiresAcknowledgement,
            notify_on_due: notifyOnDue,
            reminder_days_before: normalizedReminderDaysBefore
          })
        })
      }

      const assignmentResult = await persistLearningAssignments(assignments)

      if (!sendNotifications || (assignmentResult.inserted === 0 && assignmentResult.reactivated === 0)) {
        return assignmentResult
      }

      const notifyUsers = async () => {
        try {
          const moduleTitle = modules?.find(m => m.id === formModuleId)?.title || t('unknownModule')
          const notificationData = {
            title: t('trainingNotifications.newAssignmentTitle'),
            message: t('trainingNotifications.newAssignmentMessage', { title: moduleTitle }),
            moduleId: formModuleId,
            deadline: formDeadline || undefined
          }

          let userIdsToNotify: string[] = []
          const changedAssignments = assignmentResult.changedAssignments

          if (changedAssignments.some((assignment) => assignment.target_type === 'everyone')) {
            const { data: allUsers } = await supabase
              .from('profiles')
              .select('id')
              .eq('is_active', true)
            userIdsToNotify = allUsers?.map(u => u.id) || []
          } else if (formTargetType === 'users') {
            userIdsToNotify = changedAssignments
              .map((assignment) => assignment.target_id)
              .filter((targetId): targetId is string => typeof targetId === 'string' && targetId.length > 0)
          } else if (formTargetType === 'departments') {
            const departmentIds = changedAssignments
              .map((assignment) => assignment.target_id)
              .filter((targetId): targetId is string => typeof targetId === 'string' && targetId.length > 0)
            const { data: deptUsers } = await supabase
              .from('user_departments')
              .select('user_id')
              .in('department_id', departmentIds)
            userIdsToNotify = [...new Set(deptUsers?.map(d => d.user_id) || [])]
          } else if (formTargetType === 'properties') {
            const propertyIds = changedAssignments
              .map((assignment) => assignment.target_id)
              .filter((targetId): targetId is string => typeof targetId === 'string' && targetId.length > 0)
            const { data: propUsers } = await supabase
              .from('user_properties')
              .select('user_id')
              .in('property_id', propertyIds)
            userIdsToNotify = [...new Set(propUsers?.map(p => p.user_id) || [])]
          }

          if (userIdsToNotify.length === 0) return

          if (userIdsToNotify.length >= 10) {
            const { data: session } = await supabase.auth.getSession()
            if (session?.session?.access_token) {
              try {
                await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-notification-processor`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.session.access_token}`
                  },
                  body: JSON.stringify({
                    action: 'create_batch',
                    userIds: userIdsToNotify,
                    notificationType: 'training_assigned',
                    businessDomain: 'operations',
                    templateKey: 'operations_incident_alert',
                    channels: ['in_app', 'email'],
                    sendEmail: true,
                    notificationData: {
                      ...notificationData,
                      link: `/learning/training/${formModuleId}`
                    }
                  })
                })
              } catch (err) {
                console.error('Bulk notification error:', err)
              }
            }
          } else {
            await Promise.all(
              userIdsToNotify.map(userId =>
                notifyTrainingAssigned(userId, formModuleId, moduleTitle, formDeadline || undefined)
              )
            )
          }
        } catch (err) {
          console.error('Notification dispatch failed:', err)
        }
      }

      void notifyUsers()
      return assignmentResult
    },
    onError: (error: unknown) => {
      const errorMessage = getLearningAssignmentErrorMessage(error)
      toast({
        title: t('createAssignmentFailed', 'Failed to create assignment'),
        description: errorMessage,
        variant: 'destructive'
      })
    },
    onSuccess: (result) => {
      invalidateAssignmentControlQueries()
      const summary = describeAssignmentMutationResult({ result, t })
      toast({
        title: summary.title,
        description: summary.description,
      })
      options.onCreateSuccess()
    }
  })

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('learning_assignments')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['learning-assignments'] })
      const previousAssignments = queryClient.getQueryData<any[]>(['learning-assignments'])
      if (previousAssignments) {
        queryClient.setQueryData(
          ['learning-assignments'],
          previousAssignments.filter(assignment => assignment.id !== id)
        )
      }
      return { previousAssignments }
    },
    onError: (_error, _id, context) => {
      if (context?.previousAssignments) {
        queryClient.setQueryData(['learning-assignments'], context.previousAssignments)
      }
    },
    onSuccess: () => {
      invalidateAssignmentControlQueries()
    }
  })

  const exemptUserMutation = useMutation({
    mutationFn: async ({ moduleId, userId, reason }: { moduleId: string; userId: string; reason?: string }) => {
      await learningService.exemptUserFromModule(moduleId, userId, reason)
    },
    onSuccess: () => {
      invalidateAssignmentControlQueries()
    }
  })

  const restoreUserMutation = useMutation({
    mutationFn: async ({ moduleId, userId }: { moduleId: string; userId: string }) => {
      await learningService.restoreUserModuleAccess(moduleId, userId)
    },
    onSuccess: () => {
      invalidateAssignmentControlQueries()
      options.onReassignSuccess()
    }
  })

  const resetProgressMutation = useMutation({
    mutationFn: async ({ moduleId, userId }: { moduleId: string; userId: string }) => {
      await learningService.resetModuleProgress(moduleId, userId)
    },
    onSuccess: () => invalidateAssignmentControlQueries()
  })

  const saveOverrideMutation = useMutation({
    mutationFn: async ({
      moduleId,
      userId,
      dueDate,
      priority,
      instructions
    }: {
      moduleId: string
      userId: string
      dueDate?: string | null
      priority?: 'normal' | 'high' | 'compliance' | null
      instructions?: string | null
    }) => {
      await learningService.setModuleUserOverride({
        moduleId,
        userId,
        dueDate,
        priority,
        instructions
      })
    },
    onSuccess: () => {
      invalidateAssignmentControlQueries()
    }
  })

  const clearOverrideMutation = useMutation({
    mutationFn: async ({ moduleId, userId }: { moduleId: string; userId: string }) => {
      await learningService.clearModuleUserOverride(moduleId, userId)
    },
    onSuccess: () => invalidateAssignmentControlQueries()
  })

  const reassignUserMutation = useMutation({
    mutationFn: async ({ moduleId, fromUserId, toUserId, reason }: { moduleId: string; fromUserId: string; toUserId: string; reason?: string }) => {
      await learningService.reassignModuleUser({ moduleId, fromUserId, toUserId, reason })
    },
    onSuccess: () => {
      invalidateAssignmentControlQueries()
      options.onReassignSuccess()
    }
  })

  const resendNotificationMutation = useMutation({
    mutationFn: async ({ userId, moduleId, moduleTitle, deadline }: { userId: string; moduleId: string; moduleTitle: string; deadline?: string | null }) => {
      await notifyTrainingAssigned(userId, moduleId, moduleTitle, deadline || undefined)
    },
    onSuccess: () => {
      toast({
        title: t('notificationSent', 'Notification sent'),
        description: t('notificationSentDesc', 'The learner has been reminded about this module.')
      })
    }
  })

  const resetForm = useCallback(() => {
    return {
      formModuleId: '',
      formTargetType: 'all' as const,
      formTargetIds: [] as string[],
      formDeadline: '',
      formValidFrom: format(new Date(), 'yyyy-MM-dd'),
      formExpiresAt: '',
      formPriority: 'normal' as const,
      formInstructions: '',
      requiresAcknowledgement: false,
      sendNotifications: true,
      notifyOnDue: true,
      reminderDaysBefore: [] as number[],
      propertyFilters: [] as string[],
      targetSearch: '',
    }
  }, [])

  return {
    clearOverrideMutation,
    createAssignmentMutation,
    deleteAssignmentMutation,
    exemptUserMutation,
    invalidateAssignmentControlQueries,
    reassignUserMutation,
    resendNotificationMutation,
    resetForm,
    resetProgressMutation,
    restoreUserMutation,
    saveOverrideMutation,
  }
}
