
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { GroupedDepartmentSelector } from '@/components/shared/GroupedDepartmentSelector'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import {
  Plus,
  Users,
  Building,
  MapPin,
  Trash2,
  Edit,
  Search,
  Bell,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  Download,
  Eye,
  Settings,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrainingModule } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { useLearningProgress } from '@/hooks/useLearningProgress'
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers'
import { addDays, format } from 'date-fns'

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



  // Fetch assignments
  const { data: rawAssignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['learning-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_assignments')
        .select('*')
        .eq('content_type', 'module')
        .order('created_at', { ascending: false })
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
      return (data || []).map((d: any) => ({
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

      const assignments: any[] = []
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
  const handleDelete = (id: string) => {
    if (confirm(t('confirmAssignmentDelete'))) {
      deleteAssignmentMutation.mutate(id)
    }
  }

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

  const getStatusColor = (status: AssignmentStatus) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'due_soon': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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

  // Filtered Assignments (For the Assignments Tab)
  const filteredAssignments = useMemo(() => {
    return assignments?.filter(assignment => {
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
  }, [assignments, search, statusFilter, getTargetDetails])

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
        .select('id, title, type, "order"')
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
      overdue: sourceData.filter(p => p.status === 'overdue').length
    }
  }, [filteredProgress])

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
    return selectedModuleBlocks?.find((block: any) => block.id === selectedBlockId) || null
  }, [selectedBlockId, selectedModuleBlocks])

  const selectedQuizResults = useMemo(() => {
    const rawResults = selectedProgressMetadata.quiz_results_by_id
    if (!rawResults || typeof rawResults !== 'object' || Array.isArray(rawResults)) return []

    return Object.values(rawResults as Record<string, any>)
      .filter((item) => item && typeof item === 'object')
      .sort((a: any, b: any) => {
        const aTime = new Date(a.completedAt || a.completed_at || 0).getTime()
        const bTime = new Date(b.completedAt || b.completed_at || 0).getTime()
        return bTime - aTime
      })
  }, [selectedProgressMetadata])

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
    if (!filteredProgress.length) return

    const headers = [
      t('employee'),
      t('department') + '/' + t('property'),
      t('module'),
      t('status'),
      t('progress'),
      t('score'),
      t('lastAccess')
    ]
    const csvContent = [
      headers.join(','),
      ...filteredProgress.map(item => {
        const deptData = userDepartments?.find(d => d.user_id === item.user_id)?.department
        const propData = userProperties?.find(p => p.user_id === item.user_id)?.property
        const deptName = Array.isArray(deptData) ? deptData[0]?.name : (deptData as any)?.name
        const propName = Array.isArray(propData) ? propData[0]?.name : (propData as any)?.name
        const user = users?.find(u => u.id === item.user_id)
        const moduleTitle = modules?.find(m => m.id === item.content_id)?.title || t('unknownModule')
        const displayProgress = item.status === 'completed' ? item.progress_percentage : Math.min(item.progress_percentage, 99)

        return [
          `"${item.profiles?.full_name || user?.full_name || t('unknownUser')}"`,
          `"${deptName || propName || '-'}"`,
          `"${moduleTitle}"`,
          t(item.status),
          `${displayProgress}%`,
          item.score_percentage !== undefined && item.score_percentage !== null ? `${item.score_percentage}%` : '-',
          formatDate(item.last_accessed_at || item.created_at)
        ].join(',')
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `training_progress_${new Date().toISOString().split('T')[0]}.csv`)
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
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50 p-4 rounded-lg border">
            <div className="flex flex-1 items-center gap-4 w-full md:w-auto flex-wrap">
              <div className="relative flex-1 w-full md:w-64 min-w-0">
                <Search className={cn("absolute top-2.5 h-4 w-4 text-gray-500", isRTL ? "right-3" : "left-3")} />
                <Input
                  placeholder={t('searchEmployeeOrModule')}
                  value={overviewSearch}
                  onChange={(e) => setOverviewSearch(e.target.value)}
                  className={cn(isRTL ? "pr-9" : "pl-9", "bg-white")}
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
                className="w-full sm:w-[180px] bg-white"
              />
              <Select value={overviewFilterProp} onValueChange={setOverviewFilterProp}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white">
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
                <SelectTrigger className="w-full sm:w-[150px] bg-white">
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
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t('clearFilters')}
                </Button>
              )}
              <Button variant="outline" onClick={handleExport} className="bg-white">
                <Download className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('export')}
              </Button>
            </div>
          </div>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('totalEnrollments')}</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{progressMetrics.total}</h3>
                  </div>
                  <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('completed')}</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{progressMetrics.completed}</h3>
                  </div>
                  <div className="h-12 w-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('inProgress')}</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{progressMetrics.in_progress}</h3>
                  </div>
                  <div className="h-12 w-12 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('overdue')}</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{progressMetrics.overdue}</h3>
                  </div>
                  <div className="h-12 w-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Table */}
          <Card className="shadow-md border-t-4 border-t-hotel-navy">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <CardTitle className="text-xl font-heading text-hotel-navy">{t('employeeProgress')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingProgress ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-10 h-10 animate-spin text-hotel-gold" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className={cn("py-4 uppercase text-xs font-bold tracking-wider text-slate-500", isRTL ? "text-right" : "")}>{t('employee')}</TableHead>
                          <TableHead className={cn("py-4 uppercase text-xs font-bold tracking-wider text-slate-500", isRTL ? "text-right" : "")}>{t('module')}</TableHead>
                          <TableHead className={cn("py-4 uppercase text-xs font-bold tracking-wider text-slate-500", isRTL ? "text-right" : "")}>{t('status')}</TableHead>
                          <TableHead className={cn("py-4 uppercase text-xs font-bold tracking-wider text-slate-500", isRTL ? "text-right" : "")}>{t('progress')}</TableHead>
                          <TableHead className={cn("py-4 uppercase text-xs font-bold tracking-wider text-slate-500", isRTL ? "text-right" : "")}>{t('score')}</TableHead>
                          <TableHead className={cn("py-4 uppercase text-xs font-bold tracking-wider text-slate-500", isRTL ? "text-right" : "")}>{t('lastAccess')}</TableHead>
                          <TableHead className={cn("py-4 uppercase text-xs font-bold tracking-wider text-slate-500", isRTL ? "text-left" : "text-right")}>{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProgress.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                              <div className="flex flex-col items-center gap-3">
                                <Search className="h-10 w-10 text-slate-300" />
                                <p>{t('noProgressFound')}</p>
                                <p className="text-xs text-slate-400">{t('adjustFilters')}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredProgress.map((item) => {
                            // Prefer dept/prop data joined directly in the hook (avoids RLS issues on user_departments)
                            const joinedDepts = item.profiles?.user_departments
                            const joinedProps = item.profiles?.user_properties
                            const deptName = (joinedDepts && joinedDepts.length > 0)
                              ? joinedDepts[0]?.departments?.name
                              : userDepartments?.find((d: any) => d.user_id === item.user_id)?.department?.name
                            const propName = (joinedProps && joinedProps.length > 0)
                              ? joinedProps[0]?.properties?.name
                              : userProperties?.find((p: any) => p.user_id === item.user_id)?.property?.name

                            const user = users?.find(u => u.id === item.user_id)
                            const userName = item.profiles?.full_name || user?.full_name || t('unknownUser')
                            const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                            const displayProgress = item.status === 'completed' ? item.progress_percentage : Math.min(item.progress_percentage, 99)

                            return (
                              <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                <TableCell className="py-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm group-hover:border-blue-100 transition-all">
                                      <AvatarImage src={item.profiles?.avatar_url || ''} />
                                      <AvatarFallback className="bg-hotel-navy/5 text-hotel-navy font-bold text-xs">
                                        {userInitials}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-slate-900 group-hover:text-hotel-navy transition-colors">{userName}</span>
                                      <span className="text-xs text-muted-foreground max-w-[180px] truncate" title={deptName || propName || t('noDept')}>
                                        {deptName || propName || t('noDept')}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium text-slate-700 py-4">
                                  {item.training_modules?.title || modules?.find(m => m.id === item.content_id)?.title || t('unknownModule')}
                                </TableCell>
                                <TableCell className="py-4">
                                  <Badge variant="outline" className={cn(
                                    "capitalize px-3 py-1 rounded-full text-xs font-semibold shadow-sm border-0",
                                    item.status === 'completed' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                      item.status === 'in_progress' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                                        item.status === 'overdue' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                          'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  )}>
                                    {t(item.status)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="w-[150px] py-4">
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between text-xs mb-1">
                                      <span className="font-medium text-slate-700">{displayProgress}%</span>
                                    </div>
                                    <Progress value={displayProgress} className={cn("h-2",
                                      displayProgress === 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-hotel-gold"
                                    )} />
                                  </div>
                                </TableCell>
                                <TableCell className="py-4">
                                  {item.score_percentage !== undefined && item.score_percentage !== null ? (
                                    <span className={cn(
                                      "font-bold text-sm",
                                      item.passed ? "text-green-600" : "text-red-500"
                                    )}>
                                      {Number(item.score_percentage).toFixed(0)}%
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground py-4">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    {formatDate(item.last_accessed_at || item.created_at)}
                                  </div>
                                </TableCell>
                                <TableCell className={cn("py-4", isRTL ? "text-left" : "text-right")}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedProgressId(item.id)}
                                  >
                                    <Eye className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                    {t('details', 'Details')}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="grid grid-cols-1 gap-4 md:hidden">
                    {filteredProgress.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                        {t('noProgressFound')}
                      </div>
                    ) : (
                      filteredProgress.map((item) => {
                        // Prefer joined data from hook
                        const joinedDepts2 = item.profiles?.user_departments
                        const joinedProps2 = item.profiles?.user_properties
                        const deptName = (joinedDepts2 && joinedDepts2.length > 0)
                          ? joinedDepts2[0]?.departments?.name
                          : userDepartments?.find((d: any) => d.user_id === item.user_id)?.department?.name
                        const propName = (joinedProps2 && joinedProps2.length > 0)
                          ? joinedProps2[0]?.properties?.name
                          : userProperties?.find((p: any) => p.user_id === item.user_id)?.property?.name
                        const user = users?.find(u => u.id === item.user_id)
                        const module = item.training_modules || modules?.find(m => m.id === item.content_id)
                        const displayProgress = item.status === 'completed' ? item.progress_percentage : Math.min(item.progress_percentage, 99)

                        return (
                          <div key={item.id} className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{item.profiles?.full_name || user?.full_name || t('unknownUser')}</h4>
                                <p className="text-xs text-muted-foreground">{deptName || propName || t('noDept')}</p>
                              </div>
                              <Badge className={cn(getStatusColor(item.status as AssignmentStatus))}>
                                {t(item.status)}
                              </Badge>
                            </div>

                            <div>
                              <p className="text-sm font-medium text-slate-700">{module?.title || t('unknownModule')}</p>
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>{t('progress')}: {displayProgress}%</span>
                                <span>{item.score_percentage !== undefined && item.score_percentage !== null ? `${t('score')}: ${item.score_percentage}%` : ''}</span>
                              </div>
                              <Progress value={displayProgress} className="h-1.5 mt-1" />
                            </div>

                            <div className="pt-2 border-t flex justify-between items-center text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(item.last_accessed_at || item.created_at)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => setSelectedProgressId(item.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card >

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
                        {selectedQuizResults.length > 0
                          ? t('quizResultsDesc', 'Latest question-level review saved from the learner session.')
                          : t('noQuizResultsSaved', 'No detailed quiz review has been saved for this progress record yet.')}
                      </DialogDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedQuizResults.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          {t('noQuizResultsSaved', 'No detailed quiz review has been saved for this progress record yet.')}
                        </div>
                      ) : (
                        selectedQuizResults.map((quizResult: any) => (
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
                              {(quizResult.reviewItems || quizResult.review_items || []).map((reviewItem: any, index: number) => (
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
