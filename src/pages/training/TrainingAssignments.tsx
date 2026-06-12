
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useLearningProgress, type LearningProgress } from '@/hooks/useLearningProgress'
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers'
import { usePagination } from '@/hooks/usePagination'
import {
  getLearningAssignmentErrorMessage,
  persistLearningAssignments,
} from '@/lib/learningAssignmentMutations'
import { supabase } from '@/lib/supabase'
import type { TrainingModule } from '@/lib/types'
import { cn } from '@/lib/utils'
import { learningService } from '@/services/learningService'
import type { ModuleAssigneeRosterEntry } from '@/types/learning'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    BarChart3,
    Bell,
    Edit,
    Settings
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AssignmentsTab } from './TrainingAssignments/AssignmentsTab'
import { CreateAssignmentDialog } from './TrainingAssignments/CreateAssignmentDialog'
import { ManageAssigneesDialog } from './TrainingAssignments/ManageAssigneesDialog'
import { OverviewTab } from './TrainingAssignments/OverviewTab'
import { ProgressDetailDialog } from './TrainingAssignments/ProgressDetailDialog'
import {
  describeAssignmentMutationResult,
  getAssignmentStatus,
  progressStatusOrder,
  sortPropertyNames
} from './TrainingAssignments/helpers'
import type {
  EmployeeProgressGroup,
  EnrichedProgressRecord,
  LearningAssignment,
  TrainingAssignmentsPanelProps
} from './TrainingAssignments/types'

const isPriorityPropertyName = (name: string) => /head office|prime group/i.test(name)

const ROSTER_PAGE_SIZE = 10

export function TrainingAssignmentsPanel({
  embedded = false,
  initialTab = 'overview',
  defaultModuleId,
  autoOpen = false,
  hideCreateButton = false,
  hideHeaderActions = false
}: TrainingAssignmentsPanelProps) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation('training')
  const { toast } = useToast()
  const isRTL = i18n.dir() === 'rtl'
  const { notifyTrainingAssigned } = useNotificationTriggers()

  // State
  const [search, setSearch] = useState('')
  const [statusFilter] = useState<string>('all')
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(autoOpen)
  const [prevAutoOpen, setPrevAutoOpen] = useState(autoOpen)
  if (autoOpen !== prevAutoOpen) {
    if (autoOpen) setShowAssignmentDialog(true)
    setPrevAutoOpen(autoOpen)
  }

  const [activeTab, setActiveTab] = useState<'overview' | 'assignments'>(initialTab)
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)
  if (initialTab !== prevInitialTab) {
    if (initialTab) setActiveTab(initialTab)
    setPrevInitialTab(initialTab)
  }

  // Progress Data
  const { data: progressData, isLoading: isLoadingProgress } = useLearningProgress()

  // Overview Tab Specific Filters
  const [overviewSearch, setOverviewSearch] = useState('')
  const [overviewFilterStatus, setOverviewFilterStatus] = useState<string>('all')
  const [overviewFilterDept, setOverviewFilterDept] = useState<string>('all')
  const [overviewFilterProp, setOverviewFilterProp] = useState<string>('all')
  const [selectedProgressId, setSelectedProgressId] = useState<string | null>(null)

  // Form state
  const [formModuleId, setFormModuleId] = useState(defaultModuleId || '')
  const [prevDefaultModuleId, setPrevDefaultModuleId] = useState(defaultModuleId)
  if (defaultModuleId !== prevDefaultModuleId) {
    if (defaultModuleId) setFormModuleId(defaultModuleId)
    setPrevDefaultModuleId(defaultModuleId)
  }
  const [formTargetType, setFormTargetType] = useState<'all' | 'users' | 'departments' | 'properties'>('all')
  const [formTargetIds, setFormTargetIds] = useState<string[]>([])
  const [formDeadline, setFormDeadline] = useState('')
  const [formValidFrom, setFormValidFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [formExpiresAt, setFormExpiresAt] = useState('')
  const [formPriority, setFormPriority] = useState<'normal' | 'high' | 'compliance'>('normal')
  const [formInstructions, setFormInstructions] = useState('')
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(false)
  const [sendNotifications, setSendNotifications] = useState(true)
  const [notifyOnDue, setNotifyOnDue] = useState(true)
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number[]>([])
  const [propertyFilters, setPropertyFilters] = useState<string[]>([])
  const [targetSearch, setTargetSearch] = useState('')
  const [manageModuleId, setManageModuleId] = useState<string | null>(null)
  const [manageModuleTitle, setManageModuleTitle] = useState('')
  const [reassignEntry, setReassignEntry] = useState<ModuleAssigneeRosterEntry | null>(null)
  const [reassignUserId, setReassignUserId] = useState('')
  const [reassignReason, setReassignReason] = useState('')
  const [overrideEntry, setOverrideEntry] = useState<ModuleAssigneeRosterEntry | null>(null)
  const [overrideDueDate, setOverrideDueDate] = useState('')
  const [overridePriority, setOverridePriority] = useState<'inherit' | 'normal' | 'high' | 'compliance'>('inherit')
  const [overrideInstructions, setOverrideInstructions] = useState('')
  const [removeReason, setRemoveReason] = useState('')
  // View and Organization State
  const [assignmentsViewMode, setAssignmentsViewMode] = useState<'grid' | 'list'>('grid')
  const [assignmentsSortBy, setAssignmentsSortBy] = useState<'date' | 'priority' | 'module' | 'dueDate'>('date')
  const [assignmentsFilterPriority, setAssignmentsFilterPriority] = useState<string>('all')
  const [assignmentsFilterTargetType, setAssignmentsFilterTargetType] = useState<string>('all')
  const [assignmentsFilterDueStatus, setAssignmentsFilterDueStatus] = useState<string>('all')
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const activeRosterPagination = usePagination(ROSTER_PAGE_SIZE)
  const exemptedRosterPagination = usePagination(ROSTER_PAGE_SIZE)

  const resetReassignDialog = useCallback(() => {
    setReassignEntry(null)
    setReassignUserId('')
    setReassignReason('')
  }, [])

  const resetOrganizationState = useCallback(() => {
    setAssignmentsSortBy('date')
    setAssignmentsFilterPriority('all')
    setAssignmentsFilterTargetType('all')
    setAssignmentsFilterDueStatus('all')
    setSearch('')
    setSelectedAssignments(new Set())
  }, [])

  const openReassignDialog = useCallback((entry: ModuleAssigneeRosterEntry) => {
    setReassignEntry(entry)
    setReassignUserId(entry.user_id)
    setReassignReason(entry.exemption?.reason || '')
  }, [])



  // Fetch assignments
  const { data: rawAssignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['learning-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_assignments')
        .select('*')
        .eq('content_type', 'module')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  const { data: moduleExemptions = [] } = useQuery({
    queryKey: ['learning-assignment-exemptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_assignment_exemptions')
        .select('*')
        .eq('content_type', 'module')
      if (error) throw error
      return data || []
    }
  })

  // Fetch Modules
  const { data: modules, refetch: refetchAssignableModules } = useQuery({
    queryKey: ['training-modules', 'assignable'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_modules')
        .select('id, title, description, status, is_active')
        .eq('status', 'published')
        .eq('is_active', true)
        .order('title')
      if (error) throw error
      return data as TrainingModule[]
    }
  })

  const { data: moduleRoster, isLoading: isLoadingModuleRoster } = useQuery({
    queryKey: ['module-assignment-roster', manageModuleId],
    queryFn: () => learningService.getModuleAssignmentRoster(manageModuleId!),
    enabled: !!manageModuleId
  })

  useEffect(() => {
    activeRosterPagination.setPage(1)
    exemptedRosterPagination.setPage(1)
  }, [manageModuleId])

  useEffect(() => {
    if (!showAssignmentDialog) return
    void refetchAssignableModules()
  }, [showAssignmentDialog, refetchAssignableModules])

  useEffect(() => {
    activeRosterPagination.setTotalCount(moduleRoster?.active.length || 0)
    exemptedRosterPagination.setTotalCount(moduleRoster?.exempted.length || 0)
  }, [moduleRoster?.active.length, moduleRoster?.exempted.length])

  const paginatedActiveRoster = useMemo(() => (
    (moduleRoster?.active || []).slice(activeRosterPagination.from, activeRosterPagination.to + 1)
  ), [activeRosterPagination.from, activeRosterPagination.to, moduleRoster?.active])

  const paginatedExemptedRoster = useMemo(() => (
    (moduleRoster?.exempted || []).slice(exemptedRosterPagination.from, exemptedRosterPagination.to + 1)
  ), [exemptedRosterPagination.from, exemptedRosterPagination.to, moduleRoster?.exempted])

  // Combine assignments with modules
  const assignments = useMemo(() => {
    if (!rawAssignments || !modules) return []
    return rawAssignments.map(a => ({
      ...a,
      training_modules: modules.find(m => m.id === a.content_id)
    })) as LearningAssignment[]
  }, [rawAssignments, modules])

  // Lookups
  const { data: userDepartments } = useQuery({
    queryKey: ['user-departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_departments').select('user_id, department:departments(id, name)')
      if (error) throw error
      return data
    }
  })

  const { data: userProperties } = useQuery({
    queryKey: ['user-properties'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_properties').select('user_id, property:properties(id, name)')
      if (error) throw error
      return data
    }
  })

  // Basic lookups
  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').order('full_name')
      if (error) throw error
      return data || []
    }
  })

  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('id, name, property_id, property:properties(name)').order('name')
      if (error) throw error
      // Format with property name for disambiguation
      return (data || []).map((d) => {
        const propertyName = Array.isArray(d.property) && d.property.length > 0
          ? d.property[0]?.name
          : (d.property as { name?: string } | null)?.name
        return {
          id: d.id,
          name: propertyName ? `${d.name} (${propertyName})` : d.name,
          propertyName: propertyName,
          rawName: d.name
        }
      })
    }
  })

  const { data: properties } = useQuery({
    queryKey: ['properties-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data || []
    }
  })

  // Mutations
  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
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
          // Send bulk notifications to affected users
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
            // Get all active user IDs
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
            // Resolve users from departments
            const departmentIds = changedAssignments
              .map((assignment) => assignment.target_id)
              .filter((targetId): targetId is string => typeof targetId === 'string' && targetId.length > 0)
            const { data: deptUsers } = await supabase
              .from('user_departments')
              .select('user_id')
              .in('department_id', departmentIds)
            userIdsToNotify = [...new Set(deptUsers?.map(d => d.user_id) || [])]
          } else if (formTargetType === 'properties') {
            // Resolve users from properties
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

          // Use bulk notification system for 10+ users, direct for smaller groups
          if (userIdsToNotify.length >= 10) {
            // Queue for bulk processing
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
                // Notifications queued for bulk processing
              } catch (err) {
                console.error('Bulk notification error:', err)
              }
            }
          } else {
            // Small group - send directly
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
      const summary = describeAssignmentMutationResult(result, t)
      toast({
        title: summary.title,
        description: summary.description,
      })
      setShowAssignmentDialog(false)
      resetForm()
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

  const invalidateAssignmentControlQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })
    queryClient.invalidateQueries({ queryKey: ['learning-progress'] })
    queryClient.invalidateQueries({ queryKey: ['learning-assignment-exemptions'] })
    queryClient.invalidateQueries({ queryKey: ['module-assignment-roster'] })
    queryClient.invalidateQueries({ queryKey: ['learning-assignments-module-links'] })
    queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
  }, [queryClient])

  const exemptUserMutation = useMutation({
    mutationFn: async ({ moduleId, userId, reason }: { moduleId: string; userId: string; reason?: string }) => {
      await learningService.exemptUserFromModule(moduleId, userId, reason)
    },
    onSuccess: () => {
      invalidateAssignmentControlQueries()
      setRemoveReason('')
    }
  })

  const restoreUserMutation = useMutation({
    mutationFn: async ({ moduleId, userId }: { moduleId: string; userId: string }) => {
      await learningService.restoreUserModuleAccess(moduleId, userId)
    },
    onSuccess: () => {
      invalidateAssignmentControlQueries()
      resetReassignDialog()
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
      setOverrideEntry(null)
      setOverrideDueDate('')
      setOverridePriority('inherit')
      setOverrideInstructions('')
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
      resetReassignDialog()
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

  const resetForm = () => {
    setFormModuleId('')
    setFormTargetType('all')
    setFormTargetIds([])
    setFormDeadline('')
    setFormValidFrom(format(new Date(), 'yyyy-MM-dd'))
    setFormExpiresAt('')
    setFormPriority('normal')
    setFormInstructions('')
    setRequiresAcknowledgement(false)
    setSendNotifications(true)
    setNotifyOnDue(true)
    setReminderDaysBefore([])
    setPropertyFilters([])
    setTargetSearch('')
  }

  const openManageAssignees = useCallback((moduleId: string, moduleTitle?: string) => {
    setManageModuleId(moduleId)
    setManageModuleTitle(moduleTitle || t('unknownModule'))
  }, [t])

  const closeManageAssignees = useCallback(() => {
    setManageModuleId(null)
    setManageModuleTitle('')
    resetReassignDialog()
    setOverrideEntry(null)
    setOverrideDueDate('')
    setOverridePriority('inherit')
    setOverrideInstructions('')
    setRemoveReason('')
  }, [resetReassignDialog])

  const handleDelete = (id: string) => {
    if (confirm(t('confirmAssignmentDelete'))) {
      deleteAssignmentMutation.mutate(id)
    }
  }

  const openOverrideDialog = useCallback((entry: ModuleAssigneeRosterEntry) => {
    setOverrideEntry(entry)
    setOverrideDueDate(entry.override?.due_date ? format(new Date(entry.override.due_date), 'yyyy-MM-dd') : '')
    setOverridePriority(entry.override?.priority || 'inherit')
    setOverrideInstructions(entry.override?.instructions || '')
  }, [])

  const submitReassign = useCallback(() => {
    if (!reassignEntry || !reassignUserId || !manageModuleId) return

    if (reassignUserId === reassignEntry.user_id) {
      if (reassignEntry.exemption) {
        restoreUserMutation.mutate({ moduleId: manageModuleId, userId: reassignEntry.user_id })
      }
      return
    }

    reassignUserMutation.mutate({
      moduleId: manageModuleId,
      fromUserId: reassignEntry.user_id,
      toUserId: reassignUserId,
      reason: reassignReason || undefined
    })
  }, [manageModuleId, reassignEntry, reassignReason, reassignUserId, reassignUserMutation, restoreUserMutation])

  // Helpers
  const departmentLookup = useMemo(() => {
    return new Map((departments || []).map((dept) => [dept.id, dept]))
  }, [departments])

  const propertyLookup = useMemo(() => {
    return new Map((properties || []).map((property) => [property.id, property]))
  }, [properties])

  const userLookup = useMemo(() => {
    return new Map((users || []).map((user) => [user.id, user]))
  }, [users])

  const exemptedModuleUserKeys = useMemo(() => {
    return new Set(
      moduleExemptions.map((row) => `${row.content_id}:${row.user_id}`)
    )
  }, [moduleExemptions])

  const exemptionCountByModule = useMemo(() => {
    const counts = new Map<string, number>()
    moduleExemptions.forEach((row) => {
      counts.set(row.content_id, (counts.get(row.content_id) || 0) + 1)
    })
    return counts
  }, [moduleExemptions])

  const getTargetDetails = useCallback((assignment: LearningAssignment) => {
    switch (assignment.target_type) {
      case 'department': {
        const dept = departmentLookup.get(assignment.target_id ?? '')
        const name = dept?.rawName || dept?.name || t('department', 'Department')
        const propertyName = dept?.propertyName || t('unknownProperty', 'Unknown property')
        return { label: name, meta: propertyName }
      }
      case 'property': {
        const property = propertyLookup.get(assignment.target_id ?? '')
        const name = property?.name || t('property', 'Property')
        return { label: name, meta: undefined }
      }
      case 'user': {
        const user = userLookup.get(assignment.target_id ?? '')
        if (!user) {
          return {
            label: assignment.target_id
              ? `${t('unknownUser', 'Unknown')} (${assignment.target_id.slice(0, 8)}...)`
              : t('unknownUser', 'Unknown User'),
            meta: undefined
          }
        }
        const name = user.full_name || user.email || t('unknownUser', 'Unknown User')
        return { label: name, meta: user.email && user.email !== name ? user.email : undefined }
      }
      default:
        return { label: t('allUsers'), meta: undefined }
    }
  }, [departmentLookup, propertyLookup, userLookup, t])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')
  }

  const formatDuration = useCallback((seconds?: number | null) => {
    if (!seconds || seconds <= 0) return '-'

    const totalMinutes = Math.floor(seconds / 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h`
    if (totalMinutes > 0) return `${totalMinutes}m`
    return '< 1m'
  }, [])

  const escapeCsvValue = useCallback((value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined || value === '') return '""'
    return `"${String(value).replace(/"/g, '""')}"`
  }, [])

  const getProgressStatusMeta = useCallback((status: LearningProgress['status']) => {
    switch (status) {
      case 'completed':
        return {
          badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
          label: t('completed'),
          progressClass: '[&>div]:bg-emerald-600'
        }
      case 'in_progress':
        return {
          badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
          label: t('inProgress'),
          progressClass: '[&>div]:bg-sky-600'
        }
      case 'overdue':
        return {
          badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
          label: t('overdue'),
          progressClass: '[&>div]:bg-rose-600'
        }
      case 'excused':
        return {
          badgeClass: 'border-slate-200 bg-slate-100 text-slate-600',
          label: t('excused', 'Excused'),
          progressClass: '[&>div]:bg-slate-500'
        }
      case 'assigned':
      default:
        return {
          badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
          label: t('assigned'),
          progressClass: '[&>div]:bg-amber-500'
        }
    }
  }, [t])

  // Enhanced Filtered Assignments with Priority, Target Type, and Due Status filtering
  const filteredAssignments = useMemo(() => {
    return assignments?.filter(assignment => {
      if (
        assignment.target_type === 'user'
        && assignment.target_id
        && exemptedModuleUserKeys.has(`${assignment.content_id}:${assignment.target_id}`)
      ) {
        return false
      }

      const moduleTitle = assignment.training_modules?.title || ''
      const searchValue = search.trim().toLowerCase()
      const targetDetails = getTargetDetails(assignment)
      const matchesSearch = !searchValue
        || moduleTitle.toLowerCase().includes(searchValue)
        || targetDetails.label.toLowerCase().includes(searchValue)
        || (targetDetails.meta?.toLowerCase().includes(searchValue) ?? false)

      // Priority Filter
      const matchesPriority = assignmentsFilterPriority === 'all' || assignment.priority === assignmentsFilterPriority

      // Target Type Filter
      const matchesTargetType = assignmentsFilterTargetType === 'all' || assignment.target_type === assignmentsFilterTargetType

      // Due Status Filter
      let matchesDueStatus = true
      if (assignmentsFilterDueStatus !== 'all') {
        const status = getAssignmentStatus(assignment)
        matchesDueStatus = status === assignmentsFilterDueStatus
      }

      return matchesSearch && matchesPriority && matchesTargetType && matchesDueStatus
    }) || []
  }, [assignments, exemptedModuleUserKeys, search, assignmentsFilterPriority, assignmentsFilterTargetType, assignmentsFilterDueStatus, getTargetDetails])

  // Enhanced Grouped Assignments with Sorting
  const groupedAssignments = useMemo(() => {
    const groups = new Map<string, {
      key: string
      assignments: LearningAssignment[]
      latestCreatedAt: string
      moduleTitle: string
      priority: string
      dueDate: string | null
    }>()

    filteredAssignments.forEach((assignment) => {
      const key = [
        assignment.content_id,
        assignment.target_type,
        assignment.priority,
        assignment.due_date ?? '',
        assignment.valid_from ?? '',
        assignment.expires_at ?? '',
        assignment.requires_acknowledgement ? '1' : '0'
      ].join('|')

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          assignments: [],
          latestCreatedAt: assignment.created_at,
          moduleTitle: assignment.training_modules?.title || '',
          priority: assignment.priority || 'normal',
          dueDate: assignment.due_date
        })
      }

      const group = groups.get(key)!
      group.assignments.push(assignment)
      if (new Date(assignment.created_at) > new Date(group.latestCreatedAt)) {
        group.latestCreatedAt = assignment.created_at
      }
    })

    const sortedGroups = Array.from(groups.values())

    // Apply sorting based on selected sort option
    sortedGroups.sort((a, b) => {
      switch (assignmentsSortBy) {
        case 'date':
          return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
        case 'priority': {
          const priorityOrder = { compliance: 0, high: 1, normal: 2 }
          return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
                 (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
        }
        case 'module':
          return a.moduleTitle.localeCompare(b.moduleTitle)
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        default:
          return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
      }
    })

    return sortedGroups
  }, [filteredAssignments, assignmentsSortBy])

  // Assignment Stats Summary
  const assignmentStats = useMemo(() => {
    const total = filteredAssignments.length
    const byPriority = {
      compliance: filteredAssignments.filter(a => a.priority === 'compliance').length,
      high: filteredAssignments.filter(a => a.priority === 'high').length,
      normal: filteredAssignments.filter(a => !a.priority || a.priority === 'normal').length
    }
    const byTargetType = {
      everyone: filteredAssignments.filter(a => a.target_type === 'everyone').length,
      user: filteredAssignments.filter(a => a.target_type === 'user').length,
      department: filteredAssignments.filter(a => a.target_type === 'department').length,
      property: filteredAssignments.filter(a => a.target_type === 'property').length
    }
    const overdue = filteredAssignments.filter(a => {
      const status = getAssignmentStatus(a)
      return status === 'overdue'
    }).length
    const dueSoon = filteredAssignments.filter(a => {
      const status = getAssignmentStatus(a)
      return status === 'due_soon'
    }).length

    return { total, byPriority, byTargetType, overdue, dueSoon }
  }, [filteredAssignments])

  // Overview Tab: Filtered Progress Logic with NEW filters
  const filteredProgress = useMemo(() => {
    if (!progressData) return []
    return progressData.filter(item => {
      if (item.content_type !== 'module') return false

      // 1. Search Filter
      if (overviewSearch) {
        const searchLower = overviewSearch.toLowerCase()
        const user = users?.find(u => u.id === item.user_id)
        const userName = item.profiles?.full_name || user?.full_name || ''
        const moduleTitle = modules?.find(m => m.id === item.content_id)?.title || ''

        if (!userName.toLowerCase().includes(searchLower) && !moduleTitle.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // 2. Status Filter
      if (overviewFilterStatus !== 'all' && item.status !== overviewFilterStatus) return false

      // Resolve user dept/prop for filtering - use userDepartments query for IDs (for filter dropdowns)
      const userDeptId = (userDepartments?.find(ud => ud.user_id === item.user_id)?.department as any)?.id
      const userPropId = (userProperties?.find(up => up.user_id === item.user_id)?.property as any)?.id

      // 3. Department Filter
      if (overviewFilterDept !== 'all' && userDeptId !== overviewFilterDept) return false

      // 4. Property Filter
      if (overviewFilterProp !== 'all' && userPropId !== overviewFilterProp) return false

      return true
    })
  }, [progressData, overviewSearch, overviewFilterStatus, overviewFilterDept, overviewFilterProp, userDepartments, userProperties, users, modules])

  const selectedProgress = useMemo(() => (
    filteredProgress.find((item) => item.id === selectedProgressId)
    || progressData?.find((item) => item.id === selectedProgressId)
    || null
  ), [filteredProgress, progressData, selectedProgressId])

  const { data: selectedModuleBlocks } = useQuery({
    queryKey: ['training-progress-details-blocks', selectedProgress?.content_id],
    queryFn: async () => {
      if (!selectedProgress?.content_id) return []

      const { data, error } = await supabase
        .from('training_content_blocks')
        .select('id, title, type, "order", content_data')
        .eq('training_module_id', selectedProgress.content_id)
        .eq('is_deleted', false)
        .order('order', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!selectedProgress?.content_id
  })

  // Overview Tab: Progress Metrics based on Filtered Data
  const progressMetrics = useMemo(() => {
    const sourceData = filteredProgress
    return {
      total: sourceData.length,
      completed: sourceData.filter(p => p.status === 'completed').length,
      in_progress: sourceData.filter(p => p.status === 'in_progress').length,
      overdue: sourceData.filter(p => p.status === 'overdue').length,
      uniqueModules: new Set(sourceData.map(p => p.content_id)).size
    }
  }, [filteredProgress])

  const enrichedProgress = useMemo<EnrichedProgressRecord[]>(() => {
    return filteredProgress.map((item) => {
      const joinedDepartmentName = item.profiles?.user_departments?.[0]?.departments?.name || ''
      const joinedPropertyName = item.profiles?.user_properties?.[0]?.properties?.name || ''
      const departmentData = userDepartments?.find((department) => department.user_id === item.user_id)?.department as
        | { name?: string }
        | Array<{ name?: string }>
        | null
        | undefined
      const propertyData = userProperties?.find((property) => property.user_id === item.user_id)?.property as
        | { name?: string }
        | Array<{ name?: string }>
        | null
        | undefined
      const fallbackDepartmentName = Array.isArray(departmentData) ? departmentData[0]?.name || '' : departmentData?.name || ''
      const fallbackPropertyName = Array.isArray(propertyData) ? propertyData[0]?.name || '' : propertyData?.name || ''
      const user = users?.find((entry) => entry.id === item.user_id)
      const resolvedUserName = item.profiles?.full_name || user?.full_name || t('unknownUser')
      const resolvedModuleTitle = item.training_modules?.title || modules?.find((module) => module.id === item.content_id)?.title || t('unknownModule')
      const resolvedProgress = item.status === 'completed' ? item.progress_percentage : Math.min(item.progress_percentage, 99)
      const parsedScore = item.score_percentage === undefined || item.score_percentage === null
        ? null
        : Number(item.score_percentage)
      const statusMeta = getProgressStatusMeta(item.status)
      const lastTouchedAt = item.last_accessed_at || item.completed_at || item.updated_at || item.created_at
      const normalizedName = resolvedUserName.trim()
      const userInitials = normalizedName
        .split(/\s+/)
        .filter(Boolean)
        .map((name) => name[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'NA'

      const resolvedDepartmentName = joinedDepartmentName || fallbackDepartmentName
      const resolvedPropertyName = joinedPropertyName || fallbackPropertyName

      return {
        ...item,
        resolvedDepartmentName,
        resolvedModuleTitle,
        resolvedProgress,
        resolvedPropertyName,
        resolvedScore: parsedScore !== null && Number.isFinite(parsedScore) ? parsedScore : null,
        resolvedUserName,
        statusLabel: statusMeta.label,
        userInitials,
        lastTouchedAt,
        locationLabel: resolvedDepartmentName || resolvedPropertyName || t('noDept')
      }
    })
  }, [filteredProgress, getProgressStatusMeta, modules, t, userDepartments, userProperties, users])

  const employeeProgressGroups = useMemo<EmployeeProgressGroup[]>(() => {
    const groupedRecords = new Map<string, EmployeeProgressGroup>()

    enrichedProgress.forEach((record) => {
      if (!groupedRecords.has(record.user_id)) {
        groupedRecords.set(record.user_id, {
          activeModules: 0,
          assignedModules: 0,
          attentionCount: 0,
          averageProgress: 0,
          averageScore: null,
          avatarUrl: record.profiles?.avatar_url || undefined,
          completedModules: 0,
          departmentName: record.resolvedDepartmentName,
          excusedModules: 0,
          highlightModule: null,
          inProgressModules: 0,
          lastTouchedAt: record.lastTouchedAt,
          locationLabel: record.locationLabel,
          overdueModules: 0,
          propertyName: record.resolvedPropertyName,
          records: [],
          totalModules: 0,
          userId: record.user_id,
          userInitials: record.userInitials,
          userName: record.resolvedUserName
        })
      }

      const group = groupedRecords.get(record.user_id)!
      group.records.push(record)
      if (!group.lastTouchedAt || new Date(record.lastTouchedAt) > new Date(group.lastTouchedAt)) {
        group.lastTouchedAt = record.lastTouchedAt
      }
    })

    return Array.from(groupedRecords.values())
      .map((group) => {
        const records = [...group.records].sort((a, b) => {
          const statusDifference = progressStatusOrder[a.status] - progressStatusOrder[b.status]
          if (statusDifference !== 0) return statusDifference
          return new Date(b.lastTouchedAt).getTime() - new Date(a.lastTouchedAt).getTime()
        })

        const completedModules = records.filter((record) => record.status === 'completed').length
        const inProgressModules = records.filter((record) => record.status === 'in_progress').length
        const assignedModules = records.filter((record) => record.status === 'assigned').length
        const overdueModules = records.filter((record) => record.status === 'overdue').length
        const excusedModules = records.filter((record) => record.status === 'excused').length
        const activeModules = records.filter((record) => !['completed', 'excused'].includes(record.status)).length
        const averageProgress = records.length > 0
          ? Math.round(records.reduce((sum, record) => sum + record.resolvedProgress, 0) / records.length)
          : 0
        const scoreValues = records
          .map((record) => record.resolvedScore)
          .filter((score): score is number => score !== null)
        const averageScore = scoreValues.length > 0
          ? Math.round(scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length)
          : null
        const highlightModule = records.find((record) => record.status === 'overdue')
          || records.find((record) => record.status === 'in_progress')
          || records.find((record) => record.status === 'assigned')
          || records[0]
          || null
        const attentionCount = overdueModules > 0
          ? overdueModules + Math.max(0, activeModules - 1)
          : (assignedModules > 1 ? assignedModules - 1 : 0) + (activeModules >= 4 ? 1 : 0)

        return {
          ...group,
          activeModules,
          assignedModules,
          attentionCount,
          averageProgress,
          averageScore,
          completedModules,
          excusedModules,
          highlightModule,
          inProgressModules,
          overdueModules,
          records,
          totalModules: records.length
        }
      })
      .sort((a, b) => {
        if (b.attentionCount !== a.attentionCount) return b.attentionCount - a.attentionCount
        if (b.activeModules !== a.activeModules) return b.activeModules - a.activeModules
        if ((b.lastTouchedAt || '') !== (a.lastTouchedAt || '')) {
          return new Date(b.lastTouchedAt || 0).getTime() - new Date(a.lastTouchedAt || 0).getTime()
        }
        return a.userName.localeCompare(b.userName)
      })
  }, [enrichedProgress])

  const employeeTrackingSummary = useMemo(() => {
    const employeeCount = employeeProgressGroups.length
    const averageModulesPerEmployee = employeeCount > 0
      ? Number((progressMetrics.total / employeeCount).toFixed(1))
      : 0
    const employeesNeedingFollowUp = employeeProgressGroups.filter((group) => group.attentionCount > 0 || group.overdueModules > 0).length
    const heavyLoadEmployees = employeeProgressGroups.filter((group) => group.totalModules >= 4).length
    const averageProgress = employeeCount > 0
      ? Math.round(employeeProgressGroups.reduce((sum, group) => sum + group.averageProgress, 0) / employeeCount)
      : 0
    const scoreValues = employeeProgressGroups
      .map((group) => group.averageScore)
      .filter((score): score is number => score !== null)
    const averageScore = scoreValues.length > 0
      ? Math.round(scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length)
      : null
    const completionRate = progressMetrics.total > 0
      ? Math.round((progressMetrics.completed / progressMetrics.total) * 100)
      : 0

    return {
      averageModulesPerEmployee,
      averageProgress,
      averageScore,
      completionRate,
      employeeCount,
      employeesNeedingFollowUp,
      heavyLoadEmployees
    }
  }, [employeeProgressGroups, progressMetrics.completed, progressMetrics.total])

  const followUpQueue = useMemo(() => {
    return employeeProgressGroups
      .filter((group) => group.attentionCount > 0 || group.overdueModules > 0)
      .slice(0, 5)
  }, [employeeProgressGroups])

  const moduleLoadLeaders = useMemo(() => {
    return [...employeeProgressGroups]
      .sort((a, b) => {
        if (b.totalModules !== a.totalModules) return b.totalModules - a.totalModules
        if (b.activeModules !== a.activeModules) return b.activeModules - a.activeModules
        return a.averageProgress - b.averageProgress
      })
      .slice(0, 5)
  }, [employeeProgressGroups])

  const describeFollowUp = useCallback((group: EmployeeProgressGroup) => {
    const reasons: string[] = []

    if (group.overdueModules > 0) {
      reasons.push(`${group.overdueModules} ${t('overdue')}`)
    }
    if (group.assignedModules > 0) {
      reasons.push(`${group.assignedModules} ${t('assigned')}`)
    }
    if (group.activeModules >= 4) {
      reasons.push(t('heavyLoad', 'Heavy load'))
    }

    return reasons.length > 0 ? reasons.join(' • ') : t('onTime')
  }, [t])

  const selectedProgressMetadata = useMemo(() => {
    const metadata = selectedProgress?.metadata
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
    return metadata as Record<string, unknown>
  }, [selectedProgress])

  const selectedBlockId = useMemo(() => {
    const activeBlockId = selectedProgressMetadata.active_block_id
    if (typeof activeBlockId === 'string' && activeBlockId.length > 0) return activeBlockId
    return selectedProgress?.last_block_id || null
  }, [selectedProgress?.last_block_id, selectedProgressMetadata])

  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null
    return selectedModuleBlocks?.find((block) => block.id === selectedBlockId) || null
  }, [selectedBlockId, selectedModuleBlocks])

  const selectedModuleQuizIds = useMemo(() => (
    Array.from(new Set(
      (selectedModuleBlocks || [])
        .filter((block) => block.type === 'quiz')
        .map((block) => {
          const contentData = block.content_data as Record<string, unknown> | null | undefined
          return typeof contentData?.quiz_id === 'string' && contentData.quiz_id.length > 0
            ? contentData.quiz_id
            : null
        })
        .filter((quizId): quizId is string => typeof quizId === 'string' && quizId.length > 0)
    ))
  ), [selectedModuleBlocks])

  const { data: selectedQuizProgressRows = [] } = useQuery({
    queryKey: ['training-progress-details-quiz-progress', selectedProgress?.user_id, selectedModuleQuizIds],
    queryFn: async () => {
      if (!selectedProgress?.user_id || selectedModuleQuizIds.length === 0) return []

      const { data, error } = await supabase
        .from('learning_progress')
        .select('content_id, score_percentage, passed, completed_at, updated_at, metadata')
        .eq('user_id', selectedProgress.user_id)
        .eq('content_type', 'quiz')
        .in('content_id', selectedModuleQuizIds)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!selectedProgress?.user_id && selectedModuleQuizIds.length > 0
  })

  const parseOptionalNumber = useCallback((value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }, [])

  const getQuizResultReviewItems = useCallback((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []

    const candidate = value as Record<string, unknown>
    if (Array.isArray(candidate.reviewItems)) return candidate.reviewItems
    if (Array.isArray(candidate.review_items)) return candidate.review_items
    return []
  }, [])

  const selectedQuizResults = useMemo(() => {
    const rawResults = selectedProgressMetadata.quiz_results_by_id
    const mergedResults = new Map<string, any>()

    if (rawResults && typeof rawResults === 'object' && !Array.isArray(rawResults)) {
      Object.values(rawResults as Record<string, any>)
        .filter((item) => item && typeof item === 'object')
        .forEach((item) => {
          const quizId = item.quizId || item.quiz_id
          if (typeof quizId === 'string' && quizId.length > 0) {
            mergedResults.set(quizId, {
              ...item,
              quizId,
              score: parseOptionalNumber(item.score),
              correctCount: parseOptionalNumber(item.correctCount ?? item.correct_count),
              totalQuestions: parseOptionalNumber(item.totalQuestions ?? item.total_questions),
              reviewItems: getQuizResultReviewItems(item)
            })
          }
        })
    }

    selectedQuizProgressRows.forEach((row) => {
      const metadata = (
        row.metadata &&
        typeof row.metadata === 'object' &&
        !Array.isArray(row.metadata)
      ) ? row.metadata as Record<string, any> : null
      const latestQuizResult = (
        metadata?.latest_quiz_result &&
        typeof metadata.latest_quiz_result === 'object' &&
        !Array.isArray(metadata.latest_quiz_result)
      ) ? metadata.latest_quiz_result : null

      if (!latestQuizResult) return

      const quizId = latestQuizResult.quizId || latestQuizResult.quiz_id || row.content_id
      if (typeof quizId !== 'string' || quizId.length === 0) return

      const existingResult = mergedResults.get(quizId)
      const latestReviewItems = getQuizResultReviewItems(latestQuizResult)
      const existingReviewItems = getQuizResultReviewItems(existingResult)
      const resolvedScore = (
        parseOptionalNumber(existingResult?.score)
        ?? parseOptionalNumber(latestQuizResult.score)
        ?? parseOptionalNumber(row.score_percentage)
      )
      const resolvedCorrectCount = (
        parseOptionalNumber(existingResult?.correctCount ?? existingResult?.correct_count)
        ?? parseOptionalNumber(latestQuizResult.correctCount ?? latestQuizResult.correct_count)
        ?? (latestReviewItems.length > 0
          ? latestReviewItems.filter((item: any) => item?.correct === true).length
          : null)
      )
      const resolvedTotalQuestions = (
        parseOptionalNumber(existingResult?.totalQuestions ?? existingResult?.total_questions)
        ?? parseOptionalNumber(latestQuizResult.totalQuestions ?? latestQuizResult.total_questions)
        ?? (latestReviewItems.length > 0 ? latestReviewItems.length : null)
      )

      mergedResults.set(quizId, {
        ...latestQuizResult,
        ...existingResult,
        quizId,
        score: resolvedScore,
        passed: typeof existingResult?.passed === 'boolean'
          ? existingResult.passed
          : typeof latestQuizResult.passed === 'boolean'
            ? latestQuizResult.passed
            : row.passed,
        completedAt: existingResult?.completedAt
          || existingResult?.completed_at
          || latestQuizResult.completedAt
          || latestQuizResult.completed_at
          || row.completed_at
          || row.updated_at,
        correctCount: resolvedCorrectCount,
        totalQuestions: resolvedTotalQuestions,
        reviewItems: existingReviewItems.length > 0 ? existingReviewItems : latestReviewItems
      })
    })

    return Array.from(mergedResults.values()).sort((a, b) => {
      const aTime = new Date(a.completedAt || a.completed_at || 0).getTime()
      const bTime = new Date(b.completedAt || b.completed_at || 0).getTime()
      return bTime - aTime
    })
  }, [getQuizResultReviewItems, parseOptionalNumber, selectedProgressMetadata, selectedQuizProgressRows])

  const selectedQuizResultsMessage = useMemo(() => {
    if (selectedQuizResults.length > 0) {
      return t('quizResultsDesc', 'Latest question-level review saved from the learner session.')
    }

    if (selectedModuleQuizIds.length > 0 && selectedProgress?.status === 'completed') {
      return t(
        'legacyQuizResultsUnavailable',
        'This completion was recovered from legacy progress data. Detailed quiz answers were not recoverable for this attempt.'
      )
    }

    return t('noQuizResultsSaved', 'No detailed quiz review has been saved for this progress record yet.')
  }, [selectedModuleQuizIds.length, selectedProgress?.status, selectedQuizResults.length, t])

  // Get unique properties from departments
  const normalizedTargetSearch = targetSearch.trim().toLowerCase()
  const matchesTargetSearch = useCallback((value: string, secondary?: string) => {
    if (!normalizedTargetSearch) return true
    const primary = value?.toLowerCase() ?? ''
    const secondaryValue = secondary?.toLowerCase() ?? ''
    return primary.includes(normalizedTargetSearch) || secondaryValue.includes(normalizedTargetSearch)
  }, [normalizedTargetSearch])

  const departmentProperties = useMemo(() => {
    if (!departments) return []
    const props = new Set<string>()
    departments.forEach(d => {
      if (d.propertyName) {
        props.add(d.propertyName)
      } else {
        props.add(t('other', 'Other'))
      }
    })
    return Array.from(props).sort(sortPropertyNames)
  }, [departments, t])

  const departmentGroups = useMemo(() => {
    if (!departments) return []
    const filters = new Set(propertyFilters)
    const groups = new Map<string, { name: string; items: Array<{ id: string; name: string }> }>()

    departments.forEach((dept) => {
      const propertyName = dept.propertyName || t('other', 'Other')
      if (propertyFilters.length > 0 && !filters.has(propertyName)) return

      const displayName = dept.rawName || dept.name.replace(/\s*\(.+\)$/, '')
      if (!matchesTargetSearch(displayName, propertyName)) return

      if (!groups.has(propertyName)) {
        groups.set(propertyName, { name: propertyName, items: [] })
      }

      groups.get(propertyName)!.items.push({
        id: dept.id,
        name: displayName
      })
    })

    return Array.from(groups.values())
      .map(group => ({
        ...group,
        items: group.items.sort((a, b) => a.name.localeCompare(b.name))
      }))
      .sort((a, b) => sortPropertyNames(a.name, b.name))
  }, [departments, propertyFilters, matchesTargetSearch, t])

  const assignableModules = modules || []
  const selectedAssignableModule = assignableModules.find((module) => module.id === formModuleId)
  const moduleSelectValue = selectedAssignableModule ? formModuleId : ''

  // Form List Items
  const currentListItems = useMemo(() => {
    switch (formTargetType) {
      case 'users':
        return (users || [])
          .map(u => ({ id: u.id, name: u.full_name || u.email || '', details: u.email }))
          .filter(u => matchesTargetSearch(u.name, u.details))
      case 'departments':
        return departmentGroups.flatMap(group => group.items)
      case 'properties':
        return (properties || [])
          .map(p => ({ id: p.id, name: p.name }))
          .filter(p => matchesTargetSearch(p.name))
      default:
        return []
    }
  }, [formTargetType, users, properties, departmentGroups, matchesTargetSearch])

  const togglePropertyFilter = useCallback((propertyName: string, enabled: boolean) => {
    setPropertyFilters(prev => {
      const next = new Set(prev)
      if (enabled) {
        next.add(propertyName)
      } else {
        next.delete(propertyName)
      }
      return Array.from(next)
    })
  }, [])

  const toggleGroupSelection = useCallback((items: Array<{ id: string }>, shouldSelect: boolean) => {
    const itemIds = items.map(item => item.id)
    setFormTargetIds(prev => {
      if (shouldSelect) {
        return Array.from(new Set([...prev, ...itemIds]))
      }
      return prev.filter(id => !itemIds.includes(id))
    })
  }, [])

  const validationErrors = useMemo(() => {
    const errors: string[] = []
    if (!moduleSelectValue) errors.push(t('moduleRequired'))
    if (formTargetType !== 'all' && formTargetIds.length === 0) errors.push(t('selectTargetsRequired', 'Select at least one target.'))
    return errors
  }, [formTargetIds.length, formTargetType, moduleSelectValue, t])

  const selectedModuleName = selectedAssignableModule?.title || t('unknownModule')
  const selectedTargetsLabel = formTargetType === 'all'
    ? t('allUsers')
    : `${formTargetIds.length} ${t('selected')}`

  const handleExport = () => {
    if (!enrichedProgress.length) return

    const employeeLookup = new Map(employeeProgressGroups.map((group) => [group.userId, group]))

    const headers = [
      t('employee'),
      t('email', 'Email'),
      t('department'),
      t('property'),
      t('module'),
      t('status'),
      t('progress'),
      t('score'),
      t('passed', 'Passed'),
      t('timeSpent', 'Time spent'),
      t('lastAccess'),
      t('completedAt', 'Completed at'),
      t('currentStep', 'Current step'),
      t('totalEnrollments'),
      t('completed', 'Completed') + ` ${t('modules', 'Modules')}`,
      t('inProgress') + ` ${t('modules', 'Modules')}`,
      t('overdue') + ` ${t('modules', 'Modules')}`,
      t('assigned') + ` ${t('modules', 'Modules')}`,
      t('employeeCompletionRate', 'Employee completion rate'),
      t('analytics.avgScore', 'Avg Score'),
      t('followUpFlag', 'Follow-up flag'),
      t('followUpReason', 'Follow-up reason')
    ]

    const csvRows = employeeProgressGroups.flatMap((group) => {
      return group.records.map((record) => {
        const user = users?.find((entry) => entry.id === record.user_id)
        const currentStep = record.last_block_index !== null && record.last_block_index !== undefined
          ? t('blockTitle', { number: record.last_block_index + 1 })
          : '-'
        const completionRate = group.totalModules > 0
          ? `${Math.round((group.completedModules / group.totalModules) * 100)}%`
          : '0%'
        const followUpFlag = group.attentionCount > 0 || group.overdueModules > 0
          ? t('requiredAction', 'Required Action')
          : t('onTime')

        return [
          escapeCsvValue(group.userName),
          escapeCsvValue(record.profiles?.email || user?.email || '-'),
          escapeCsvValue(group.departmentName || '-'),
          escapeCsvValue(group.propertyName || '-'),
          escapeCsvValue(record.resolvedModuleTitle),
          escapeCsvValue(record.statusLabel),
          escapeCsvValue(`${record.resolvedProgress}%`),
          escapeCsvValue(record.resolvedScore !== null ? `${Math.round(record.resolvedScore)}%` : '-'),
          escapeCsvValue(
            record.passed === undefined || record.passed === null
              ? '-'
              : record.passed
                ? t('yes', 'Yes')
                : t('no', 'No')
          ),
          escapeCsvValue(formatDuration(record.time_spent_seconds)),
          escapeCsvValue(formatDate(record.lastTouchedAt)),
          escapeCsvValue(record.completed_at ? formatDate(record.completed_at) : '-'),
          escapeCsvValue(currentStep),
          escapeCsvValue(group.totalModules),
          escapeCsvValue(group.completedModules),
          escapeCsvValue(group.inProgressModules),
          escapeCsvValue(group.overdueModules),
          escapeCsvValue(group.assignedModules),
          escapeCsvValue(completionRate),
          escapeCsvValue(group.averageScore !== null ? `${group.averageScore}%` : '-'),
          escapeCsvValue(followUpFlag),
          escapeCsvValue(describeFollowUp(employeeLookup.get(record.user_id) || group))
        ].join(',')
      })
    })

    const csvContent = [headers.map(escapeCsvValue).join(','), ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `training_progress_tracker_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {!embedded && (
        <PageHeader
          title={t('trainingCenter')}
          description={t('trainingDescription')}
          actions={
            hideHeaderActions ? undefined : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/notifications')}
                  className="hidden md:flex"
                >
                  <Bell className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                  {t('batchStatus')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/training/assignments/rules')}
                  className="hidden md:flex"
                >
                  <Settings className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                  {t('autoAssignRules')}
                </Button>
              </div>
            )
          }
        />
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'assignments')} className="space-y-6">
        <TabsList className="w-full sm:w-auto bg-white p-1 border rounded-lg">
          <TabsTrigger value="overview" className="flex-1 sm:flex-none data-[state=active]:bg-hotel-navy data-[state=active]:text-white">
            <BarChart3 className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
            {t('overview')}
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex-1 sm:flex-none data-[state=active]:bg-hotel-navy data-[state=active]:text-white">
            <Edit className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
            {t('manageAssignments')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab
            isRTL={isRTL}
            overviewSearch={overviewSearch}
            onOverviewSearchChange={setOverviewSearch}
            overviewFilterDept={overviewFilterDept}
            onOverviewFilterDeptChange={setOverviewFilterDept}
            overviewFilterProp={overviewFilterProp}
            onOverviewFilterPropChange={setOverviewFilterProp}
            overviewFilterStatus={overviewFilterStatus}
            onOverviewFilterStatusChange={setOverviewFilterStatus}
            departments={departments}
            properties={properties}
            progressMetrics={progressMetrics}
            employeeTrackingSummary={employeeTrackingSummary}
            employeeProgressGroups={employeeProgressGroups}
            followUpQueue={followUpQueue}
            moduleLoadLeaders={moduleLoadLeaders}
            isLoadingProgress={isLoadingProgress}
            onViewDetails={setSelectedProgressId}
            onExport={handleExport}
            onResetProgress={(userId, moduleId) => resetProgressMutation.mutate({ userId, moduleId })}
            onRevokeCertificate={() => {
              toast({
                title: t('certificateRevoked', 'Certificate Revoked'),
                description: t('certificateRevokedDesc', 'The certificate has been revoked successfully.')
              })
            }}
            onExemptUser={(userId, moduleId) => exemptUserMutation.mutate({ moduleId, userId })}
            onRestoreUser={(userId, moduleId) => restoreUserMutation.mutate({ moduleId, userId })}
            formatDate={formatDate}
            formatDuration={formatDuration}
            getProgressStatusMeta={getProgressStatusMeta}
            describeFollowUp={describeFollowUp}
            modules={modules}
          />

          <ProgressDetailDialog
            selectedProgressId={selectedProgressId}
            onClose={() => setSelectedProgressId(null)}
            selectedProgress={selectedProgress}
            selectedBlock={selectedBlock}
            selectedProgressMetadata={selectedProgressMetadata}
            selectedQuizResults={selectedQuizResults}
            selectedQuizResultsMessage={selectedQuizResultsMessage}
            users={users}
            modules={modules}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <AssignmentsTab
            isRTL={isRTL}
            isLoadingAssignments={isLoadingAssignments}
            hideCreateButton={hideCreateButton}
            search={search}
            onSearchChange={setSearch}
            assignmentsViewMode={assignmentsViewMode}
            onAssignmentsViewModeChange={setAssignmentsViewMode}
            assignmentsSortBy={assignmentsSortBy}
            onAssignmentsSortByChange={setAssignmentsSortBy}
            showFilters={showFilters}
            onShowFiltersChange={setShowFilters}
            assignmentsFilterPriority={assignmentsFilterPriority}
            onAssignmentsFilterPriorityChange={setAssignmentsFilterPriority}
            assignmentsFilterTargetType={assignmentsFilterTargetType}
            onAssignmentsFilterTargetTypeChange={setAssignmentsFilterTargetType}
            assignmentsFilterDueStatus={assignmentsFilterDueStatus}
            onAssignmentsFilterDueStatusChange={setAssignmentsFilterDueStatus}
            onResetOrganizationState={resetOrganizationState}
            assignmentStats={assignmentStats}
            groupedAssignments={groupedAssignments}
            exemptionCountByModule={exemptionCountByModule}
            getTargetDetails={getTargetDetails}
            formatDate={formatDate}
            onDelete={handleDelete}
            onOpenManageAssignees={openManageAssignees}
            onOpenCreateDialog={() => setShowAssignmentDialog(true)}
          />
        </TabsContent>
      </Tabs>

      <ManageAssigneesDialog
        manageModuleId={manageModuleId}
        manageModuleTitle={manageModuleTitle}
        onClose={closeManageAssignees}
        moduleRoster={moduleRoster}
        isLoadingModuleRoster={isLoadingModuleRoster}
        paginatedActiveRoster={paginatedActiveRoster}
        paginatedExemptedRoster={paginatedExemptedRoster}
        activeRosterPagination={activeRosterPagination}
        exemptedRosterPagination={exemptedRosterPagination}
        removeReason={removeReason}
        onRemoveReasonChange={setRemoveReason}
        reassignEntry={reassignEntry}
        reassignUserId={reassignUserId}
        reassignReason={reassignReason}
        onReassignUserIdChange={setReassignUserId}
        onReassignReasonChange={setReassignReason}
        onResetReassignDialog={resetReassignDialog}
        onSubmitReassign={submitReassign}
        reassignUserMutationPending={reassignUserMutation.isPending}
        restoreUserMutationPending={restoreUserMutation.isPending}
        overrideEntry={overrideEntry}
        overrideDueDate={overrideDueDate}
        overridePriority={overridePriority}
        overrideInstructions={overrideInstructions}
        onOverrideDueDateChange={setOverrideDueDate}
        onOverridePriorityChange={setOverridePriority}
        onOverrideInstructionsChange={setOverrideInstructions}
        onCloseOverrideDialog={() => setOverrideEntry(null)}
        onSaveOverride={() => overrideEntry && saveOverrideMutation.mutate({
          moduleId: manageModuleId!,
          userId: overrideEntry.user_id,
          dueDate: overrideDueDate ? new Date(`${overrideDueDate}T00:00:00`).toISOString() : null,
          priority: overridePriority === 'inherit' ? null : overridePriority,
          instructions: overrideInstructions || null
        })}
        onClearOverride={() => overrideEntry && clearOverrideMutation.mutate({ moduleId: manageModuleId!, userId: overrideEntry.user_id })}
        saveOverrideMutationPending={saveOverrideMutation.isPending}
        clearOverrideMutationPending={clearOverrideMutation.isPending}
        resetProgressMutationPending={resetProgressMutation.isPending}
        exemptUserMutationPending={exemptUserMutation.isPending}
        resendNotificationMutationPending={resendNotificationMutation.isPending}
        users={users}
        onOpenReassignDialog={openReassignDialog}
        onOpenOverrideDialog={openOverrideDialog}
        onResetProgress={(moduleId, userId) => resetProgressMutation.mutate({ moduleId, userId })}
        onResendNotification={(userId, moduleId, moduleTitle, deadline) => resendNotificationMutation.mutate({ userId, moduleId, moduleTitle, deadline })}
        onExemptUser={(moduleId, userId, reason) => exemptUserMutation.mutate({ moduleId, userId, reason })}
        onRestoreUser={(moduleId, userId) => restoreUserMutation.mutate({ moduleId, userId })}
        formatDate={formatDate}
      />

      {showAssignmentDialog && (
        <CreateAssignmentDialog
          open={showAssignmentDialog}
          onOpenChange={setShowAssignmentDialog}
          isRTL={isRTL}
          validationErrors={validationErrors}
          formModuleId={formModuleId}
          onFormModuleIdChange={setFormModuleId}
          assignableModules={assignableModules}
          moduleSelectValue={moduleSelectValue}
          formTargetType={formTargetType}
          onFormTargetTypeChange={(value) => {
            setFormTargetType(value)
            setFormTargetIds([])
            setPropertyFilters([])
            setTargetSearch('')
          }}
          formTargetIds={formTargetIds}
          onFormTargetIdsChange={setFormTargetIds}
          targetSearch={targetSearch}
          onTargetSearchChange={setTargetSearch}
          currentListItems={currentListItems}
          departmentGroups={departmentGroups}
          departmentProperties={departmentProperties}
          propertyFilters={propertyFilters}
          onTogglePropertyFilter={togglePropertyFilter}
          onClearPropertyFilters={() => setPropertyFilters([])}
          onToggleGroupSelection={toggleGroupSelection}
          formValidFrom={formValidFrom}
          onFormValidFromChange={setFormValidFrom}
          formDeadline={formDeadline}
          onFormDeadlineChange={setFormDeadline}
          formExpiresAt={formExpiresAt}
          onFormExpiresAtChange={setFormExpiresAt}
          formPriority={formPriority}
          onFormPriorityChange={setFormPriority}
          sendNotifications={sendNotifications}
          onSendNotificationsChange={setSendNotifications}
          formInstructions={formInstructions}
          onFormInstructionsChange={setFormInstructions}
          requiresAcknowledgement={requiresAcknowledgement}
          onRequiresAcknowledgementChange={setRequiresAcknowledgement}
          notifyOnDue={notifyOnDue}
          onNotifyOnDueChange={setNotifyOnDue}
          reminderDaysBefore={reminderDaysBefore}
          onReminderDaysBeforeChange={setReminderDaysBefore}
          selectedModuleName={selectedModuleName}
          selectedTargetsLabel={selectedTargetsLabel}
          onSubmit={() => createAssignmentMutation.mutate()}
          onCancel={() => {
            setShowAssignmentDialog(false)
            resetForm()
          }}
          isSubmitting={createAssignmentMutation.isPending}
        />
      )}
    </div>
  )
}

export default function TrainingAssignments() {
  return <TrainingAssignmentsPanel />
}
