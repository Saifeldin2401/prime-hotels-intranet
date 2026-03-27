
import { PageHeader } from '@/components/layout/PageHeader'
import { GroupedDepartmentSelector } from '@/components/shared/GroupedDepartmentSelector'
import { EmployeeProgressTracker } from '@/components/training/EmployeeProgressTracker'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useLearningProgress, type LearningProgress } from '@/hooks/useLearningProgress'
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers'
import { supabase } from '@/lib/supabase'
import type { TrainingModule } from '@/lib/types'
import { cn } from '@/lib/utils'
import { learningService } from '@/services/learningService'
import type { ModuleAssigneeRosterEntry } from '@/types/learning'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import {
    AlertCircle,
    AlertTriangle,
    BarChart3,
    Bell,
    BookOpen,
    Building,
    CheckCircle2,
    Clock,
    Download,
    Edit,
    Loader2,
    MapPin,
    Plus,
    Search,
    Settings,
    Trash2,
    TrendingUp,
    Users,
    X
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const isPriorityPropertyName = (name: string) => /head office|prime group/i.test(name)

const sortPropertyNames = (a: string, b: string) => {
  if (isPriorityPropertyName(a) && !isPriorityPropertyName(b)) return -1
  if (!isPriorityPropertyName(a) && isPriorityPropertyName(b)) return 1
  return a.localeCompare(b)
}

// Interface for learning_assignments table
interface LearningAssignment {
  id: string
  target_type: 'all' | 'everyone' | 'user' | 'department' | 'property'
  target_id: string | null
  content_type: string
  content_id: string
  assigned_by: string | null
  due_date: string | null
  valid_from: string
  expires_at?: string | null
  priority: string
  instructions?: string | null
  requires_acknowledgement?: boolean | null
  notify_on_due?: boolean | null
  reminder_days_before?: number[] | null
  created_at: string
  // Joined data
  training_modules?: TrainingModule
  profiles?: { id: string; full_name: string }
}

type AssignmentStatus = 'active' | 'completed' | 'overdue' | 'due_soon'

type EnrichedProgressRecord = LearningProgress & {
  resolvedDepartmentName: string
  resolvedModuleTitle: string
  resolvedProgress: number
  resolvedPropertyName: string
  resolvedScore: number | null
  resolvedUserName: string
  statusLabel: string
  userInitials: string
  lastTouchedAt: string
  locationLabel: string
}

interface EmployeeProgressGroup {
  activeModules: number
  assignedModules: number
  attentionCount: number
  averageProgress: number
  averageScore: number | null
  completedModules: number
  departmentName: string
  excusedModules: number
  highlightModule: EnrichedProgressRecord | null
  inProgressModules: number
  lastTouchedAt: string | null
  locationLabel: string
  overdueModules: number
  propertyName: string
  records: EnrichedProgressRecord[]
  totalModules: number
  userId: string
  userInitials: string
  userName: string
  avatarUrl?: string
}

const progressStatusOrder: Record<LearningProgress['status'], number> = {
  overdue: 0,
  in_progress: 1,
  assigned: 2,
  completed: 3,
  excused: 4
}

interface TrainingAssignmentsPanelProps {
  embedded?: boolean
  initialTab?: 'overview' | 'assignments'
  defaultModuleId?: string
  autoOpen?: boolean
  hideCreateButton?: boolean
  hideHeaderActions?: boolean
}

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

  const resetReassignDialog = useCallback(() => {
    setReassignEntry(null)
    setReassignUserId('')
    setReassignReason('')
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
  const { data: modules } = useQuery({
    queryKey: ['training-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_modules')
        .select('id, title, description')
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
      return (data || []).map((d) => ({
        id: d.id,
        name: d.property?.name ? `${d.name} (${d.property.name})` : d.name,
        propertyName: d.property?.name,
        rawName: d.name
      }))
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

      const assignments = []
      const typeMap: Record<string, string> = {
        users: 'user',
        departments: 'department',
        properties: 'property'
      }

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
          reminder_days_before: reminderDaysBefore
        })
      } else {
        formTargetIds.forEach(id => {
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
            reminder_days_before: reminderDaysBefore
          })
        })
      }

      const makeKey = (entry: { target_type: string; target_id: string | null }) =>
        `${entry.target_type}:${entry.target_id ?? '__everyone__'}`

      const { data: existingAssignments, error: existingError } = await supabase
        .from('learning_assignments')
        .select('target_type, target_id')
        .eq('content_type', 'module')
        .eq('content_id', formModuleId)
        .or('is_deleted.is.null,is_deleted.eq.false')
      if (existingError) throw existingError

      const existingKeys = new Set((existingAssignments || []).map(a => makeKey({
        target_type: a.target_type,
        target_id: a.target_id
      })))

      const assignmentsToInsert = assignments.filter(a => !existingKeys.has(makeKey({
        target_type: a.target_type,
        target_id: a.target_id ?? null
      })))

      if (assignmentsToInsert.length > 0) {
        const { error } = await supabase
          .from('learning_assignments')
          .insert(assignmentsToInsert)
        if (error) throw error
      }

      if (!sendNotifications || assignmentsToInsert.length === 0) {
        return {
          inserted: assignmentsToInsert.length,
          skipped: assignments.length - assignmentsToInsert.length
        }
      }

      const notifyUsers = async () => {
        try {
          // Send bulk notifications to affected users
          const moduleTitle = modules?.find(m => m.id === formModuleId)?.title || t('unknownModule')
          const notificationData = {
            title: t('notifications.newAssignmentTitle'),
            message: t('notifications.newAssignmentMessage', { title: moduleTitle }),
            moduleId: formModuleId,
            deadline: formDeadline || undefined
          }

          let userIdsToNotify: string[] = []

          if (formTargetType === 'all') {
            // Get all active user IDs
            const { data: allUsers } = await supabase
              .from('profiles')
              .select('id')
              .eq('is_active', true)
            userIdsToNotify = allUsers?.map(u => u.id) || []
          } else if (formTargetType === 'users') {
            userIdsToNotify = formTargetIds
          } else if (formTargetType === 'departments') {
            // Resolve users from departments
            const { data: deptUsers } = await supabase
              .from('user_departments')
              .select('user_id')
              .in('department_id', formTargetIds)
            userIdsToNotify = [...new Set(deptUsers?.map(d => d.user_id) || [])]
          } else if (formTargetType === 'properties') {
            // Resolve users from properties
            const { data: propUsers } = await supabase
              .from('user_properties')
              .select('user_id')
              .in('property_id', formTargetIds)
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
      return {
        inserted: assignmentsToInsert.length,
        skipped: assignments.length - assignmentsToInsert.length
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })
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
      queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })
    }
  })

  const invalidateAssignmentControlQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })
    queryClient.invalidateQueries({ queryKey: ['learning-progress'] })
    queryClient.invalidateQueries({ queryKey: ['learning-assignment-exemptions'] })
    queryClient.invalidateQueries({ queryKey: ['module-assignment-roster'] })
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
  const getAssignmentStatus = (assignment: LearningAssignment): AssignmentStatus => {
    if (!assignment.due_date) return 'active'
    const now = new Date()
    const deadline = new Date(assignment.due_date)
    const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntil < 0) return 'overdue'
    if (daysUntil <= 7) return 'due_soon'
    return 'active'
  }

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'all':
      case 'everyone': return <Users className="w-4 h-4" />
      case 'user': return <Users className="w-4 h-4" />
      case 'department': return <Building className="w-4 h-4" />
      case 'property': return <MapPin className="w-4 h-4" />
      default: return <Users className="w-4 h-4" />
    }
  }

  const getTargetLabel = (type: string) => {
    switch (type) {
      case 'all':
      case 'everyone': return t('allUsers')
      case 'user': return t('specificUser')
      case 'department': return t('department')
      case 'property': return t('property')
      default: return t('allUsers')
    }
  }

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
        const name = user?.full_name || user?.email || t('specificUser', 'User')
        return { label: name, meta: user?.email }
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

  // Filtered Assignments (For the Assignments Tab)
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
      const status = getAssignmentStatus(assignment)
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      return matchesSearch && matchesStatus
    }) || []
  }, [assignments, exemptedModuleUserKeys, search, statusFilter, getTargetDetails])

  const groupedAssignments = useMemo(() => {
    const groups = new Map<string, {
      key: string
      assignments: LearningAssignment[]
      latestCreatedAt: string
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
          latestCreatedAt: assignment.created_at
        })
      }

      const group = groups.get(key)!
      group.assignments.push(assignment)
      if (new Date(assignment.created_at) > new Date(group.latestCreatedAt)) {
        group.latestCreatedAt = assignment.created_at
      }
    })

    return Array.from(groups.values()).sort((a, b) => {
      return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
    })
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
    if (!formModuleId) errors.push(t('moduleRequired'))
    if (formTargetType !== 'all' && formTargetIds.length === 0) errors.push(t('selectTargetsRequired', 'Select at least one target.'))
    return errors
  }, [formModuleId, formTargetIds.length, formTargetType, t])

  const dueDatePresets = [
    { label: t('in_1_week', 'In 1 week'), days: 7 },
    { label: t('in_2_weeks', 'In 2 weeks'), days: 14 },
    { label: t('in_1_month', 'In 1 month'), days: 30 },
  ]

  const reminderOptions = [
    { label: t('reminder_1_day', '1 day before'), value: 1 },
    { label: t('reminder_3_days', '3 days before'), value: 3 },
    { label: t('reminder_7_days', '7 days before'), value: 7 }
  ]

  const selectedModuleName = modules?.find(m => m.id === formModuleId)?.title || t('unknownModule')
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

        {/* PROGRESS TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Overview Filters Toolbar */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-1 items-center gap-3 w-full md:w-auto flex-wrap">
              <div className="relative w-full md:w-64 min-w-0">
                <Search className={cn("absolute top-2.5 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                <Input
                  placeholder={t('searchEmployeeOrModule')}
                  value={overviewSearch}
                  onChange={(e) => setOverviewSearch(e.target.value)}
                  className={cn(isRTL ? "pr-9" : "pl-9", "bg-slate-50/50 border-slate-200")}
                />
              </div>
              <GroupedDepartmentSelector
                departments={departments}
                properties={properties}
                value={overviewFilterDept}
                onValueChange={setOverviewFilterDept}
                placeholder={t('filterByDept')}
                generalLabel={t('allDepartments')}
                generalValue="all"
                className="w-full sm:w-[180px] bg-slate-50/50 border-slate-200"
              />
              <Select value={overviewFilterProp} onValueChange={setOverviewFilterProp}>
                <SelectTrigger className="w-full sm:w-[180px] bg-slate-50/50 border-slate-200">
                  <SelectValue placeholder={t('filterByProp')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allProperties')}</SelectItem>
                  {properties?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={overviewFilterStatus} onValueChange={setOverviewFilterStatus}>
                <SelectTrigger className="w-full sm:w-[150px] bg-slate-50/50 border-slate-200">
                  <SelectValue placeholder={t('filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="completed">{t('completed')}</SelectItem>
                  <SelectItem value="in_progress">{t('inProgress')}</SelectItem>
                  <SelectItem value="overdue">{t('overdue')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 w-full md:w-auto justify-end">
              {(overviewSearch || overviewFilterDept !== 'all' || overviewFilterProp !== 'all' || overviewFilterStatus !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOverviewSearch('')
                    setOverviewFilterDept('all')
                    setOverviewFilterProp('all')
                    setOverviewFilterStatus('all')
                  }}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  {t('clearFilters')}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('export')}
              </Button>
            </div>
          </div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <Card className="border-s-4 border-s-hotel-gold">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                    <BookOpen className="size-4 text-hotel-gold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-slate-900">{progressMetrics.uniqueModules}</p>
                    <p className="truncate text-xs text-muted-foreground">{t('modules', 'Modules')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-s-4 border-s-indigo-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                    <Users className="size-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-slate-900">{employeeTrackingSummary.employeeCount}</p>
                    <p className="truncate text-xs text-muted-foreground">{t('staff', 'Staff')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-s-4 border-s-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <TrendingUp className="size-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-slate-900">{progressMetrics.total}</p>
                    <p className="truncate text-xs text-muted-foreground">{t('totalEnrollments', 'Total Enrollments')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-s-4 border-s-sky-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50">
                    <Clock className="size-4 text-sky-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-slate-900">{progressMetrics.in_progress}</p>
                    <p className="truncate text-xs text-muted-foreground">{t('inProgress')} · {employeeTrackingSummary.averageProgress}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-s-4 border-s-rose-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-50">
                    <AlertTriangle className="size-4 text-rose-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-slate-900">{progressMetrics.overdue}</p>
                    <p className="truncate text-xs text-muted-foreground">{t('overdue')} · {employeeTrackingSummary.employeesNeedingFollowUp} {t('followUpFlag', 'follow-up')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-s-4 border-s-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-slate-900">{progressMetrics.completed}</p>
                    <p className="truncate text-xs text-muted-foreground">{t('completed')} · {employeeTrackingSummary.completionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <EmployeeProgressTracker
            describeFollowUp={describeFollowUp}
            followUpQueue={followUpQueue}
            formatDate={formatDate}
            formatDuration={formatDuration}
            getProgressStatusMeta={getProgressStatusMeta}
            groups={employeeProgressGroups}
            isLoading={isLoadingProgress}
            isRTL={isRTL}
            metrics={progressMetrics}
            moduleLoadLeaders={moduleLoadLeaders}
            onViewDetails={setSelectedProgressId}
            summary={employeeTrackingSummary}
          />

          <Dialog open={!!selectedProgressId} onOpenChange={(open) => !open && setSelectedProgressId(null)}>
            <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('details', 'Details')}</DialogTitle>
                <DialogDescription>
                  {selectedProgress?.profiles?.full_name || users?.find((user) => user.id === selectedProgress?.user_id)?.full_name || t('unknownUser')}
                  {' | '}
                  {selectedProgress?.training_modules?.title || modules?.find((module) => module.id === selectedProgress?.content_id)?.title || t('unknownModule')}
                </DialogDescription>
              </DialogHeader>

              {selectedProgress && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('status')}</p>
                        <p className="mt-2 font-semibold capitalize">{t(selectedProgress.status)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('progress')}</p>
                        <p className="mt-2 font-semibold">
                          {selectedProgress.status === 'completed'
                            ? selectedProgress.progress_percentage
                            : Math.min(selectedProgress.progress_percentage, 99)}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('score')}</p>
                        <p className="mt-2 font-semibold">
                          {selectedProgress.score_percentage !== undefined && selectedProgress.score_percentage !== null
                            ? `${Number(selectedProgress.score_percentage).toFixed(0)}%`
                            : '-'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('lastAccess')}</p>
                        <p className="mt-2 font-semibold">{formatDate(selectedProgress.last_accessed_at || selectedProgress.created_at)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{t('progress', 'Progress')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('timeSpent', 'Time spent')}</p>
                          <p className="mt-1 font-medium">
                            {selectedProgress.time_spent_seconds
                              ? `${Math.floor(selectedProgress.time_spent_seconds / 60)}m ${selectedProgress.time_spent_seconds % 60}s`
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('currentStep', 'Current step')}</p>
                          <p className="mt-1 font-medium">
                            {selectedBlock?.title || (selectedBlock ? `${t('blockTitle', { number: (selectedBlock.order || 0) + 1 })}` : '-')}
                          </p>
                          {selectedBlock && (
                            <p className="text-xs text-muted-foreground capitalize">{selectedBlock.type.replace('_', ' ')}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('blocksCompleted', 'Blocks completed')}</p>
                          <p className="mt-1 font-medium">
                            {Array.isArray(selectedProgressMetadata.completed_blocks) ? selectedProgressMetadata.completed_blocks.length : 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('mediaCompleted', 'Media completed')}</p>
                          <p className="mt-1 font-medium">
                            {Array.isArray(selectedProgressMetadata.completed_media_blocks) ? selectedProgressMetadata.completed_media_blocks.length : 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('quizParts', 'Quiz parts')}</p>
                          <p className="mt-1 font-medium">{selectedQuizResults.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{t('quizResults', 'Quiz results')}</CardTitle>
                      <DialogDescription>
                        {selectedQuizResultsMessage}
                      </DialogDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedQuizResults.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          {selectedQuizResultsMessage}
                        </div>
                      ) : (
                        selectedQuizResults.map((quizResult) => (
                          <div key={quizResult.quizId || quizResult.quiz_id} className="space-y-4 rounded-xl border p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <h4 className="font-semibold text-slate-900">{quizResult.quizTitle || quizResult.quiz_title || t('knowledgeCheck')}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(quizResult.completedAt || quizResult.completed_at || selectedProgress.completed_at || selectedProgress.updated_at || selectedProgress.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={quizResult.passed ? 'default' : 'destructive'}>
                                  {quizResult.passed ? t('passed', 'Passed') : t('failed', 'Failed')}
                                </Badge>
                                <Badge variant="outline">
                                  {typeof quizResult.score === 'number' ? `${quizResult.score}%` : '-'}
                                </Badge>
                              </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3 text-sm">
                              <div>
                                <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('correct', 'Correct')}</p>
                                <p className="mt-1 font-medium">{quizResult.correctCount ?? quizResult.correct_count ?? 0}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('totalQuestions', 'Total questions')}</p>
                                <p className="mt-1 font-medium">{quizResult.totalQuestions ?? quizResult.total_questions ?? 0}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('score')}</p>
                                <p className="mt-1 font-medium">{typeof quizResult.score === 'number' ? `${quizResult.score}%` : '-'}</p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {(quizResult.reviewItems || quizResult.review_items || []).map((reviewItem, index: number) => (
                                <div key={`${quizResult.quizId || quizResult.quiz_id}-${reviewItem.questionId || reviewItem.question_id || index}`} className="rounded-lg border bg-slate-50 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-medium text-slate-900">{reviewItem.questionText || reviewItem.question_text || t('question', 'Question')}</p>
                                      <p className="mt-2 text-sm text-slate-600">
                                        <span className="font-medium text-slate-800">{t('yourAnswer', 'Your answer')}:</span> {reviewItem.selectedAnswer || reviewItem.selected_answer || '-'}
                                      </p>
                                      <p className="mt-1 text-sm text-slate-600">
                                        <span className="font-medium text-slate-800">{t('correctAnswer', 'Correct answer')}:</span> {reviewItem.correctAnswer || reviewItem.correct_answer || '-'}
                                      </p>
                                      {(reviewItem.explanation || reviewItem.feedback) && (
                                        <p className="mt-2 text-sm text-muted-foreground">{reviewItem.explanation || reviewItem.feedback}</p>
                                      )}
                                    </div>
                                    <Badge variant={reviewItem.correct ? 'default' : 'destructive'}>
                                      {reviewItem.correct ? t('correct', 'Correct') : t('incorrect', 'Incorrect')}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent >

        {/* ASSIGNMENTS TAB */}
        < TabsContent value="assignments" className="space-y-6" >
          <div className={cn(
            "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-4 rounded-lg border shadow-sm",
            hideCreateButton ? "justify-start" : "justify-between"
          )}>
            <div className="relative flex-1 max-w-none sm:max-w-sm">
              <Search className={cn("absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4", isRTL ? "right-3" : "left-3")} />
              <Input
                placeholder={t('searchAssignments')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={isRTL ? "pr-10 text-right" : "pl-10"}
              />
            </div>
            {!hideCreateButton && (
              <Button onClick={() => setShowAssignmentDialog(true)} className={cn("bg-hotel-navy w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}>
                <Plus className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('createAssignment')}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingAssignments ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-hotel-gold" />
              </div>
            ) : groupedAssignments.length > 0 ? (
              groupedAssignments.map((group) => {
                const primaryAssignment = group.assignments[0]
                const targetType = primaryAssignment.target_type
                const targetTypeLabel = getTargetLabel(targetType)
                const exemptedCount = exemptionCountByModule.get(primaryAssignment.content_id) || 0
                const targets = group.assignments.map((assignment) => ({
                  assignmentId: assignment.id,
                  ...getTargetDetails(assignment)
                }))

                return (
                  <Card key={group.key} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                            {t('module')}
                          </Badge>
                          <Badge variant="outline" className="bg-slate-50 text-slate-700">
                            {t(primaryAssignment.priority || 'normal', primaryAssignment.priority || 'normal')}
                          </Badge>
                          {primaryAssignment.requires_acknowledgement && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700">
                              {t('ackRequired', 'Ack required')}
                            </Badge>
                          )}
                        </div>
                        {targets.length > 1 && (
                          <Badge variant="outline" className="bg-hotel-gold/10 text-hotel-navy">
                            {targets.length} {t('targets', 'targets')}
                          </Badge>
                        )}
                        {exemptedCount > 0 && (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700">
                            {exemptedCount} {t('exempted', 'exempted')}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg mt-2 line-clamp-1" title={primaryAssignment.training_modules?.title}>
                        {primaryAssignment.training_modules?.title || t('unknownModule')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-3">
                        <div className={cn("flex items-center text-sm text-gray-600", isRTL ? "flex-row-reverse" : "")}>
                          {getTargetIcon(targetType)}
                          <span className={cn("truncate max-w-[220px] font-medium", isRTL ? "mr-2" : "ml-2")} title={targetTypeLabel}>
                            {targetTypeLabel}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2">
                          {targets.map((target) => (
                            <div
                              key={target.assignmentId}
                              className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 px-2 py-2"
                            >
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-sm font-semibold text-slate-700 truncate">
                                  {target.label}
                                </span>
                                {target.meta && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    {target.meta}
                                  </span>
                                )}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-400 hover:text-red-600"
                                onClick={() => handleDelete(target.assignmentId)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                          <span className={cn("flex items-center", isRTL ? "flex-row-reverse" : "")}>
                            <Clock className={cn("w-3 h-3", isRTL ? "ml-1" : "mr-1")} />
                            {formatDate(primaryAssignment.created_at)}
                          </span>
                          {primaryAssignment.due_date && (
                            <span className={`${new Date(primaryAssignment.due_date) < new Date() ? 'text-red-500 font-medium' : ''}`}>
                              {t('due')}: {formatDate(primaryAssignment.due_date)}
                            </span>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => openManageAssignees(primaryAssignment.content_id, primaryAssignment.training_modules?.title)}
                        >
                          <Users className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                          {t('manageAssignees', 'Manage assignees')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed">
                <div className="mx-auto h-12 w-12 text-gray-300">
                  <Edit className="h-12 w-12" />
                </div>
                <h3 className="mt-2 text-sm font-semibold text-gray-900">{t('noAssignments')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('startAssigning')}</p>
                {!hideCreateButton && (
                  <div className="mt-6">
                    <Button onClick={() => setShowAssignmentDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('createAssignment')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent >
      </Tabs >

      <Dialog open={!!manageModuleId} onOpenChange={(open) => !open && closeManageAssignees()}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('manageAssignees', 'Manage assignees')}</DialogTitle>
            <DialogDescription>
              {manageModuleTitle}
            </DialogDescription>
          </DialogHeader>

          {isLoadingModuleRoster ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('activeAssignees', 'Active assignees')}</p>
                    <p className="mt-2 text-3xl font-bold">{moduleRoster?.active.length || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('exempted', 'Exempted')}</p>
                    <p className="mt-2 text-3xl font-bold">{moduleRoster?.exempted.length || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('withOverrides', 'With overrides')}</p>
                    <p className="mt-2 text-3xl font-bold">{moduleRoster?.active.filter((entry) => entry.has_override).length || 0}</p>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="active">{t('active', 'Active')}</TabsTrigger>
                  <TabsTrigger value="exempted">{t('exempted', 'Exempted')}</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                  <div className="rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('employee')}</TableHead>
                          <TableHead>{t('source', 'Source')}</TableHead>
                          <TableHead>{t('status')}</TableHead>
                          <TableHead>{t('due')}</TableHead>
                          <TableHead>{t('score')}</TableHead>
                          <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(moduleRoster?.active || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                              {t('noActiveAssignees', 'No active assignees found for this module.')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          (moduleRoster?.active || []).map((entry) => (
                            <TableRow key={entry.user_id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage src={entry.avatar_url || ''} />
                                    <AvatarFallback>{entry.full_name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{entry.full_name}</div>
                                    <div className="text-xs text-muted-foreground">{entry.email || entry.department_name || t('unknownUser')}</div>
                                    {(entry.department_name || entry.property_name) && (
                                      <div className="text-xs text-muted-foreground">
                                        {[entry.department_name, entry.property_name].filter(Boolean).join(' | ')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {entry.sources.map((source) => (
                                    <Badge key={`${entry.user_id}-${source.assignment_id}`} variant="outline">
                                      {source.label}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant={entry.status === 'completed' ? 'default' : 'secondary'}>
                                    {t(entry.status)}
                                  </Badge>
                                  {entry.has_override && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700">
                                      {t('override', 'Override')}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {entry.effective_due_date ? formatDate(entry.effective_due_date) : '-'}
                              </TableCell>
                              <TableCell>
                                {entry.score_percentage !== null && entry.score_percentage !== undefined ? `${entry.score_percentage}%` : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openReassignDialog(entry)}
                                  >
                                    {t('reassign', 'Reassign')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openOverrideDialog(entry)}
                                  >
                                    {t('override', 'Override')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => resetProgressMutation.mutate({ moduleId: manageModuleId!, userId: entry.user_id })}
                                    disabled={resetProgressMutation.isPending}
                                  >
                                    {t('resetProgress', 'Reset progress & quiz attempts')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => resendNotificationMutation.mutate({
                                      userId: entry.user_id,
                                      moduleId: manageModuleId!,
                                      moduleTitle: manageModuleTitle,
                                      deadline: entry.effective_due_date || null
                                    })}
                                    disabled={resendNotificationMutation.isPending}
                                  >
                                    {t('resend', 'Resend')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => exemptUserMutation.mutate({
                                      moduleId: manageModuleId!,
                                      userId: entry.user_id,
                                      reason: removeReason || 'Removed from module'
                                    })}
                                    disabled={exemptUserMutation.isPending}
                                  >
                                    {t('removeFromModule', 'Remove from module')}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="remove-reason">{t('removeReason', 'Removal reason')}</Label>
                    <Input
                      id="remove-reason"
                      value={removeReason}
                      onChange={(event) => setRemoveReason(event.target.value)}
                      placeholder={t('removeReasonPlaceholder', 'Optional note for exemption history')}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="exempted" className="space-y-4">
                  <div className="rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('employee')}</TableHead>
                          <TableHead>{t('reason', 'Reason')}</TableHead>
                          <TableHead>{t('source', 'Source')}</TableHead>
                          <TableHead>{t('updated', 'Updated')}</TableHead>
                          <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(moduleRoster?.exempted || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                              {t('noExemptedAssignees', 'No exempted users for this module.')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          (moduleRoster?.exempted || []).map((entry) => (
                            <TableRow key={entry.user_id}>
                              <TableCell>
                                <div className="font-medium">{entry.full_name}</div>
                                <div className="text-xs text-muted-foreground">{entry.email || entry.department_name || t('unknownUser')}</div>
                              </TableCell>
                              <TableCell>{entry.exemption?.reason || '-'}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {entry.sources.length > 0 ? entry.sources.map((source) => (
                                    <Badge key={`${entry.user_id}-${source.assignment_id}`} variant="outline">
                                      {source.label}
                                    </Badge>
                                  )) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{entry.exemption?.updated_at ? formatDate(entry.exemption.updated_at) : '-'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => restoreUserMutation.mutate({ moduleId: manageModuleId!, userId: entry.user_id })}
                                    disabled={restoreUserMutation.isPending}
                                  >
                                    {t('restore', 'Restore')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openReassignDialog(entry)}
                                  >
                                    {t('reassign', 'Reassign')}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!reassignEntry} onOpenChange={(open) => !open && resetReassignDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('reassign', 'Reassign')}</DialogTitle>
            <DialogDescription>
              {reassignEntry?.full_name} {'->'} {manageModuleTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('selectUser', 'Select user')}</Label>
              <Select value={reassignUserId} onValueChange={setReassignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectUser', 'Select user')} />
                </SelectTrigger>
                <SelectContent>
                  {(users || [])
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {(user.full_name || user.email) + (user.id === reassignEntry?.user_id ? ` ${t('currentAssignee', '(current assignee)')}` : '')}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('reason', 'Reason')}</Label>
              <Input
                value={reassignReason}
                onChange={(event) => setReassignReason(event.target.value)}
                placeholder={t('reassignReasonPlaceholder', 'Optional reassignment note')}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetReassignDialog}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                onClick={submitReassign}
                disabled={
                  !reassignUserId ||
                  reassignUserMutation.isPending ||
                  restoreUserMutation.isPending ||
                  (reassignUserId === reassignEntry?.user_id && !reassignEntry?.exemption)
                }
              >
                {(reassignUserMutation.isPending || restoreUserMutation.isPending)
                  ? t('saving', 'Saving...')
                  : reassignUserId === reassignEntry?.user_id && !reassignEntry?.exemption
                    ? t('alreadyAssigned', 'Already assigned')
                  : reassignUserId === reassignEntry?.user_id && reassignEntry?.exemption
                    ? t('restore', 'Restore')
                    : t('confirmReassign', 'Confirm reassign')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!overrideEntry} onOpenChange={(open) => !open && setOverrideEntry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('overrideAssignment', 'Override assignment')}</DialogTitle>
            <DialogDescription>
              {overrideEntry?.full_name} {'|'} {manageModuleTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('due')}</Label>
              <Input type="date" value={overrideDueDate} onChange={(event) => setOverrideDueDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('priority')}</Label>
              <Select value={overridePriority} onValueChange={(value) => setOverridePriority(value as typeof overridePriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">{t('inherit', 'Inherit')}</SelectItem>
                  <SelectItem value="normal">{t('normal', 'Normal')}</SelectItem>
                  <SelectItem value="high">{t('high', 'High')}</SelectItem>
                  <SelectItem value="compliance">{t('compliance', 'Compliance')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('instructions', 'Instructions')}</Label>
              <Input value={overrideInstructions} onChange={(event) => setOverrideInstructions(event.target.value)} placeholder={t('overrideInstructionsPlaceholder', 'Optional user-specific instructions')} />
            </div>
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => overrideEntry && clearOverrideMutation.mutate({ moduleId: manageModuleId!, userId: overrideEntry.user_id })}
                disabled={!overrideEntry?.has_override || clearOverrideMutation.isPending}
              >
                {t('clearOverride', 'Clear override')}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOverrideEntry(null)}>
                  {t('cancel', 'Cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={() => overrideEntry && saveOverrideMutation.mutate({
                    moduleId: manageModuleId!,
                    userId: overrideEntry.user_id,
                    dueDate: overrideDueDate ? new Date(`${overrideDueDate}T00:00:00`).toISOString() : null,
                    priority: overridePriority === 'inherit' ? null : overridePriority,
                    instructions: overrideInstructions || null
                  })}
                  disabled={saveOverrideMutation.isPending}
                >
                  {saveOverrideMutation.isPending ? t('saving', 'Saving...') : t('save', 'Save')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CREATE DIALOG */}
      {
        showAssignmentDialog && (
          <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle>
                  {t('createAssignment')}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  {t('createAssignmentDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {validationErrors.length > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {validationErrors.map((message) => (
                      <p key={message}>{message}</p>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t('selectModule')}</Label>
                  <select
                    value={formModuleId}
                    onChange={(e) => setFormModuleId(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
                  >
                    <option value="">{t('selectModule')}</option>
                    {modules?.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>{t('assignTo')}</Label>
                  <select
                    value={formTargetType}
                    onChange={(e) => {
                      setFormTargetType(e.target.value as any)
                      setFormTargetIds([])
                      setPropertyFilters([])
                      setTargetSearch('')
                    }}
                    className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
                  >
                    <option value="all">{t('allUsers')}</option>
                    <option value="users">{t('specificEmployees')}</option>
                    <option value="departments">{t('entireDepartments')}</option>
                    <option value="properties">{t('entireProperties')}</option>
                  </select>
                </div>

                {formTargetType !== 'all' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Label>
                        {formTargetType === 'users' ? t('selectUsers') :
                          formTargetType === 'departments' ? t('selectDepartments') :
                            t('selectProperties')}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormTargetIds(currentListItems.map(item => item.id))}
                          disabled={currentListItems.length === 0}
                        >
                          {t('selectAll', 'Select all')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormTargetIds([])}
                        >
                          {t('clear', 'Clear')}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400", isRTL ? "right-3" : "left-3")} />
                          <Input
                            value={targetSearch}
                            onChange={(e) => setTargetSearch(e.target.value)}
                            placeholder={
                              formTargetType === 'users'
                                ? t('searchUsers', 'Search users...')
                                : formTargetType === 'departments'
                                  ? t('searchDepartments', 'Search departments or properties...')
                                  : t('searchProperties', 'Search properties...')
                            }
                            className={cn(isRTL ? "pr-9 text-right" : "pl-9", "bg-white")}
                          />
                        </div>

                        {formTargetType === 'departments' && departmentProperties.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-10">
                                {t('filterByProperty')}
                                {propertyFilters.length > 0 && (
                                  <span className="ms-2 text-xs text-muted-foreground">({propertyFilters.length})</span>
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              <DropdownMenuLabel>{t('filterByProperty')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuCheckboxItem
                                checked={propertyFilters.length === 0}
                                onCheckedChange={() => setPropertyFilters([])}
                              >
                                {t('allProperties')}
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuSeparator />
                              {departmentProperties.map(propertyName => (
                                <DropdownMenuCheckboxItem
                                  key={propertyName}
                                  checked={propertyFilters.includes(propertyName)}
                                  onCheckedChange={(checked) => togglePropertyFilter(propertyName, Boolean(checked))}
                                >
                                  {propertyName}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto border rounded-md p-2 bg-gray-50">
                      {formTargetType === 'departments' ? (
                        departmentGroups.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            {departmentGroups.map((group) => {
                              const groupIds = group.items.map(item => item.id)
                              const selectedCount = groupIds.filter(id => formTargetIds.includes(id)).length
                              const allSelected = selectedCount === group.items.length && group.items.length > 0

                              return (
                                <div key={group.name} className="rounded-md border bg-white">
                                  <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-gray-700">{group.name}</span>
                                      <span className="text-xs text-gray-500">
                                        {selectedCount}/{group.items.length}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleGroupSelection(group.items, !allSelected)}
                                      >
                                        {allSelected ? t('clear', 'Clear') : t('selectAll', 'Select all')}
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 p-2">
                                    {group.items.map((item) => (
                                      <label key={item.id} className="flex items-center gap-2 rounded p-2 hover:bg-gray-50 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={formTargetIds.includes(item.id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setFormTargetIds([...formTargetIds, item.id])
                                            } else {
                                              setFormTargetIds(formTargetIds.filter(id => id !== item.id))
                                            }
                                          }}
                                          className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <span className="text-sm text-gray-700">{item.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-center py-6 text-gray-500 text-sm">
                            {t('noItemsFound')}
                          </p>
                        )
                      ) : currentListItems.length > 0 ? (
                        currentListItems.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formTargetIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormTargetIds([...formTargetIds, item.id])
                                } else {
                                  setFormTargetIds(formTargetIds.filter(id => id !== item.id))
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-sm">{item.name}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-center py-4 text-gray-500 text-sm">
                          {t('noItemsFound')}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formTargetIds.length} {t('selected')}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('validFrom', 'Valid from')}</Label>
                    <input
                      type="date"
                      value={formValidFrom}
                      onChange={(e) => setFormValidFrom(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('deadline')} ({t('optional')})</Label>
                    <input
                      type="date"
                      value={formDeadline}
                      onChange={(e) => setFormDeadline(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
                    />
                    <div className="flex flex-wrap gap-2">
                      {dueDatePresets.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormDeadline(format(addDays(new Date(), preset.days), 'yyyy-MM-dd'))}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('expiresAt', 'Expires at')}</Label>
                    <input
                      type="date"
                      value={formExpiresAt}
                      onChange={(e) => setFormExpiresAt(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('priority_label', 'Priority')}</Label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as any)}
                      className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
                    >
                      <option value="normal">{t('normal', 'Normal')}</option>
                      <option value="high">{t('high', 'High')}</option>
                      <option value="compliance">{t('complianceMandatory')}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{t('sendNotifications', 'Send notifications')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('notifications.toggle_desc', 'Notify recipients when assignments are created.')}
                    </p>
                  </div>
                  <Switch checked={sendNotifications} onCheckedChange={setSendNotifications} />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">{t('assignmentControls', 'Assignment controls')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('assignmentControlsDesc', 'Add safeguards, reminders, and instructions.')}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t('instructions', 'Instructions')}</Label>
                      <textarea
                        value={formInstructions}
                        onChange={(e) => setFormInstructions(e.target.value)}
                        placeholder={t('instructionsPlaceholder', 'Optional notes for assignees...')}
                        className="w-full min-h-[90px] px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold text-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <span>{t('requiresAcknowledgement', 'Requires acknowledgement')}</span>
                        <Switch checked={requiresAcknowledgement} onCheckedChange={setRequiresAcknowledgement} />
                      </label>
                      <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <span>{t('notifyOnDue', 'Notify when due')}</span>
                        <Switch checked={notifyOnDue} onCheckedChange={setNotifyOnDue} />
                      </label>
                      <div className="rounded-md border p-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">{t('reminders', 'Reminders')}</p>
                        <div className="flex flex-wrap gap-2">
                          {reminderOptions.map((option) => {
                            const isSelected = reminderDaysBefore.includes(option.value)
                            return (
                              <Button
                                key={option.value}
                                type="button"
                                variant={isSelected ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  setReminderDaysBefore((prev) => {
                                    if (prev.includes(option.value)) {
                                      return prev.filter((v) => v !== option.value)
                                    }
                                    return [...prev, option.value].sort((a, b) => a - b)
                                  })
                                }}
                              >
                                {option.label}
                              </Button>
                            )
                          })}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {reminderDaysBefore.length > 0
                            ? t('reminderSummary', '{{count}} reminders selected', { count: reminderDaysBefore.length })
                            : t('reminderNone', 'No reminders selected')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('summary', 'Summary')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-muted-foreground">{t('module')}</p>
                      <p className="font-medium">{selectedModuleName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('assignTo')}</p>
                      <p className="font-medium">{selectedTargetsLabel}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('deadline')}</p>
                      <p className="font-medium">{formDeadline ? format(new Date(formDeadline), 'PPP') : t('none', 'None')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('priority_label', 'Priority')}</p>
                      <p className="font-medium capitalize">{formPriority}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('acknowledgement', 'Acknowledgement')}</p>
                      <p className="font-medium">{requiresAcknowledgement ? t('required', 'Required') : t('notRequired', 'Not required')}</p>
                    </div>
                  </div>
                  {formValidFrom && (
                    <p className="text-[11px] text-muted-foreground">
                      {t('validFrom', 'Valid from')}: {format(new Date(formValidFrom), 'PPP')}
                    </p>
                  )}
                  {formExpiresAt && (
                    <p className="text-[11px] text-muted-foreground">
                      {t('expiresAt', 'Expires at')}: {format(new Date(formExpiresAt), 'PPP')}
                    </p>
                  )}
                  {formInstructions && (
                    <p className="text-[11px] text-muted-foreground">
                      {t('instructions', 'Instructions')}: {formInstructions}
                    </p>
                  )}
                </div>

                <div className={cn("flex justify-end gap-3 pt-4 border-t", isRTL ? "flex-row-reverse" : "")}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAssignmentDialog(false)
                      resetForm()
                    }}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={() => createAssignmentMutation.mutate()}
                    disabled={validationErrors.length > 0 || createAssignmentMutation.isPending}
                    className={cn("bg-hotel-navy text-white hover:bg-hotel-navy-light", isRTL ? "flex-row-reverse" : "")}
                  >
                    {createAssignmentMutation.isPending ? (
                      <Loader2 className={cn("w-4 h-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
                    ) : null}
                    {t('create')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      }
    </div >
  )
}

export default function TrainingAssignments() {
  return <TrainingAssignmentsPanel />
}
