import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useLearningProgress, type LearningProgress } from '@/hooks/useLearningProgress'
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers'
import { usePagination } from '@/hooks/usePagination'
import {
  getLearningAssignmentErrorMessage,
  persistLearningAssignments,
  type PersistLearningAssignmentsResult
} from '@/lib/learningAssignmentMutations'
import { supabase } from '@/lib/supabase'
import type { TrainingModule } from '@/lib/types'
import { learningService } from '@/services/learningService'
import type { ModuleAssigneeRosterEntry } from '@/types/learning'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────────

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

const ROSTER_PAGE_SIZE = 10

const isPriorityPropertyName = (name: string) => /head office|prime group/i.test(name)

const sortPropertyNames = (a: string, b: string) => {
  if (isPriorityPropertyName(a) && !isPriorityPropertyName(b)) return -1
  if (!isPriorityPropertyName(a) && isPriorityPropertyName(b)) return 1
  return a.localeCompare(b)
}

const describeAssignmentMutationResult = (
  result: PersistLearningAssignmentsResult,
  t: ReturnType<typeof useTranslation>['t']
) => {
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

// ─── Context Value Interface ───────────────────────────────────────────────────

export interface TrainingAssignmentsContextValue {
  // i18n / layout
  isRTL: boolean
  t: ReturnType<typeof useTranslation<'training'>>['t']
  navigate: ReturnType<typeof useNavigate>

  // Panel props (passed through)
  embedded: boolean
  hideCreateButton: boolean
  hideHeaderActions: boolean

  // Tab state
  activeTab: 'overview' | 'assignments'
  setActiveTab: Dispatch<SetStateAction<'overview' | 'assignments'>>

  // Assignment dialog
  showAssignmentDialog: boolean
  setShowAssignmentDialog: Dispatch<SetStateAction<boolean>>

  // Assignment search / filter / sort / view state
  search: string
  setSearch: Dispatch<SetStateAction<string>>
  assignmentsViewMode: 'grid' | 'list'
  setAssignmentsViewMode: Dispatch<SetStateAction<'grid' | 'list'>>
  assignmentsSortBy: 'date' | 'priority' | 'module' | 'dueDate'
  setAssignmentsSortBy: Dispatch<SetStateAction<'date' | 'priority' | 'module' | 'dueDate'>>
  assignmentsFilterPriority: string
  setAssignmentsFilterPriority: Dispatch<SetStateAction<string>>
  assignmentsFilterTargetType: string
  setAssignmentsFilterTargetType: Dispatch<SetStateAction<string>>
  assignmentsFilterDueStatus: string
  setAssignmentsFilterDueStatus: Dispatch<SetStateAction<string>>
  showFilters: boolean
  setShowFilters: Dispatch<SetStateAction<boolean>>
  resetOrganizationState: () => void

  // Overview filters
  overviewSearch: string
  setOverviewSearch: Dispatch<SetStateAction<string>>
  overviewFilterStatus: string
  setOverviewFilterStatus: Dispatch<SetStateAction<string>>
  overviewFilterDept: string
  setOverviewFilterDept: Dispatch<SetStateAction<string>>
  overviewFilterProp: string
  setOverviewFilterProp: Dispatch<SetStateAction<string>>

  // Selected progress detail
  selectedProgressId: string | null
  setSelectedProgressId: Dispatch<SetStateAction<string | null>>
  selectedProgress: LearningProgress | null
  selectedBlock: { id: string; title: string; type: string; order?: number | null } | null
  selectedProgressMetadata: Record<string, unknown>
  selectedQuizResults: any[]
  selectedQuizResultsMessage: string

  // Form state (create assignment)
  formModuleId: string
  setFormModuleId: Dispatch<SetStateAction<string>>
  formTargetType: 'all' | 'users' | 'departments' | 'properties'
  setFormTargetType: Dispatch<SetStateAction<'all' | 'users' | 'departments' | 'properties'>>
  formTargetIds: string[]
  setFormTargetIds: Dispatch<SetStateAction<string[]>>
  formDeadline: string
  setFormDeadline: Dispatch<SetStateAction<string>>
  formValidFrom: string
  setFormValidFrom: Dispatch<SetStateAction<string>>
  formExpiresAt: string
  setFormExpiresAt: Dispatch<SetStateAction<string>>
  formPriority: 'normal' | 'high' | 'compliance'
  setFormPriority: Dispatch<SetStateAction<'normal' | 'high' | 'compliance'>>
  formInstructions: string
  setFormInstructions: Dispatch<SetStateAction<string>>
  requiresAcknowledgement: boolean
  setRequiresAcknowledgement: Dispatch<SetStateAction<boolean>>
  sendNotifications: boolean
  setSendNotifications: Dispatch<SetStateAction<boolean>>
  notifyOnDue: boolean
  setNotifyOnDue: Dispatch<SetStateAction<boolean>>
  reminderDaysBefore: number[]
  setReminderDaysBefore: Dispatch<SetStateAction<number[]>>
  propertyFilters: string[]
  setPropertyFilters: Dispatch<SetStateAction<string[]>>
  targetSearch: string
  setTargetSearch: Dispatch<SetStateAction<string>>
  validationErrors: string[]
  moduleSelectValue: string
  selectedModuleName: string
  selectedTargetsLabel: string
  assignableModules: TrainingModule[]
  currentListItems: Array<{ id: string; name: string; details?: string }>
  departmentGroups: Array<{ name: string; items: Array<{ id: string; name: string }> }>
  departmentProperties: string[]
  togglePropertyFilter: (propertyName: string, enabled: boolean) => void
  toggleGroupSelection: (items: Array<{ id: string }>, shouldSelect: boolean) => void
  resetForm: () => void

  // Manage assignees dialog state
  manageModuleId: string | null
  manageModuleTitle: string
  openManageAssignees: (moduleId: string, moduleTitle?: string) => void
  closeManageAssignees: () => void

  // Roster pagination
  moduleRoster: { active: ModuleAssigneeRosterEntry[]; exempted: ModuleAssigneeRosterEntry[] } | undefined
  isLoadingModuleRoster: boolean
  paginatedActiveRoster: ModuleAssigneeRosterEntry[]
  paginatedExemptedRoster: ModuleAssigneeRosterEntry[]
  activeRosterPagination: ReturnType<typeof usePagination>
  exemptedRosterPagination: ReturnType<typeof usePagination>

  // Reassign state
  removeReason: string
  setRemoveReason: Dispatch<SetStateAction<string>>
  reassignEntry: ModuleAssigneeRosterEntry | null
  reassignUserId: string
  setReassignUserId: Dispatch<SetStateAction<string>>
  reassignReason: string
  setReassignReason: Dispatch<SetStateAction<string>>
  resetReassignDialog: () => void
  openReassignDialog: (entry: ModuleAssigneeRosterEntry) => void

  // Override state
  overrideEntry: ModuleAssigneeRosterEntry | null
  overrideDueDate: string
  setOverrideDueDate: Dispatch<SetStateAction<string>>
  overridePriority: 'inherit' | 'normal' | 'high' | 'compliance'
  setOverridePriority: Dispatch<SetStateAction<'inherit' | 'normal' | 'high' | 'compliance'>>
  overrideInstructions: string
  setOverrideInstructions: Dispatch<SetStateAction<string>>
  openOverrideDialog: (entry: ModuleAssigneeRosterEntry) => void
  closeOverrideDialog: () => void

  // Data
  users: Array<{ id: string; full_name: string; email: string }> | undefined
  modules: TrainingModule[] | undefined
  departments: Array<{ id: string; name: string; propertyName?: string; rawName?: string }> | undefined
  properties: Array<{ id: string; name: string }> | undefined

  // Derived data
  groupedAssignments: Array<{
    key: string
    assignments: LearningAssignment[]
    latestCreatedAt: string
    moduleTitle: string
    priority: string
    dueDate: string | null
  }>
  assignmentStats: {
    total: number
    byPriority: { compliance: number; high: number; normal: number }
    byTargetType: { everyone: number; user: number; department: number; property: number }
    overdue: number
    dueSoon: number
  }
  exemptionCountByModule: Map<string, number>
  progressMetrics: {
    total: number
    completed: number
    in_progress: number
    overdue: number
    uniqueModules: number
  }
  employeeTrackingSummary: {
    averageModulesPerEmployee: number
    averageProgress: number
    averageScore: number | null
    completionRate: number
    employeeCount: number
    employeesNeedingFollowUp: number
    heavyLoadEmployees: number
  }
  employeeProgressGroups: EmployeeProgressGroup[]
  followUpQueue: EmployeeProgressGroup[]
  moduleLoadLeaders: EmployeeProgressGroup[]

  // Loading states
  isLoadingAssignments: boolean
  isLoadingProgress: boolean

  // Helpers
  getTargetDetails: (assignment: LearningAssignment) => { label: string; meta?: string }
  formatDate: (dateStr: string) => string
  formatDuration: (seconds?: number | null) => string
  getProgressStatusMeta: (status: LearningProgress['status']) => {
    badgeClass: string
    label: string
    progressClass: string
  }
  describeFollowUp: (group: EmployeeProgressGroup) => string

  // Submit callbacks
  submitCreateAssignment: () => void
  submitReassign: () => void
  submitSaveOverride: () => void
  submitClearOverride: () => void
  submitResetProgress: (moduleId: string, userId: string) => void
  submitExemptUser: (moduleId: string, userId: string, reason?: string) => void
  submitRestoreUser: (moduleId: string, userId: string) => void
  submitResendNotification: (userId: string, moduleId: string, moduleTitle: string, deadline?: string | null) => void
  handleDelete: (id: string) => void
  handleExport: () => void

  // Mutation pending states
  createAssignmentMutationPending: boolean
  reassignUserMutationPending: boolean
  restoreUserMutationPending: boolean
  resetProgressMutationPending: boolean
  exemptUserMutationPending: boolean
  saveOverrideMutationPending: boolean
  clearOverrideMutationPending: boolean
  resendNotificationMutationPending: boolean

  // Toast
  toast: ReturnType<typeof useToast>['toast']
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TrainingAssignmentsContext = createContext<TrainingAssignmentsContextValue | null>(null)

export function useTrainingAssignmentsContext(): TrainingAssignmentsContextValue {
  const ctx = useContext(TrainingAssignmentsContext)
  if (!ctx) {
    throw new Error('useTrainingAssignmentsContext must be used within TrainingAssignmentsProvider')
  }
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface TrainingAssignmentsProviderProps {
  children: ReactNode
  embedded?: boolean
  initialTab?: 'overview' | 'assignments'
  defaultModuleId?: string
  autoOpen?: boolean
  hideCreateButton?: boolean
  hideHeaderActions?: boolean
}

export function TrainingAssignmentsProvider({
  children,
  embedded = false,
  initialTab = 'overview',
  defaultModuleId,
  autoOpen = false,
  hideCreateButton = false,
  hideHeaderActions = false,
}: TrainingAssignmentsProviderProps) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation('training')
  const { toast } = useToast()
  const isRTL = i18n.dir() === 'rtl'
  const { notifyTrainingAssigned } = useNotificationTriggers()

  // ─── State ───────────────────────────────────────────────────────────────────

  const [search, setSearch] = useState('')
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

  // Overview filters
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

  // Manage assignees dialog
  const [manageModuleId, setManageModuleId] = useState<string | null>(null)
  const [manageModuleTitle, setManageModuleTitle] = useState('')

  // Reassign dialog
  const [reassignEntry, setReassignEntry] = useState<ModuleAssigneeRosterEntry | null>(null)
  const [reassignUserId, setReassignUserId] = useState('')
  const [reassignReason, setReassignReason] = useState('')

  // Override dialog
  const [overrideEntry, setOverrideEntry] = useState<ModuleAssigneeRosterEntry | null>(null)
  const [overrideDueDate, setOverrideDueDate] = useState('')
  const [overridePriority, setOverridePriority] = useState<'inherit' | 'normal' | 'high' | 'compliance'>('inherit')
  const [overrideInstructions, setOverrideInstructions] = useState('')
  const [removeReason, setRemoveReason] = useState('')

  // View / sort / filter for assignments tab
  const [assignmentsViewMode, setAssignmentsViewMode] = useState<'grid' | 'list'>('grid')
  const [assignmentsSortBy, setAssignmentsSortBy] = useState<'date' | 'priority' | 'module' | 'dueDate'>('date')
  const [assignmentsFilterPriority, setAssignmentsFilterPriority] = useState<string>('all')
  const [assignmentsFilterTargetType, setAssignmentsFilterTargetType] = useState<string>('all')
  const [assignmentsFilterDueStatus, setAssignmentsFilterDueStatus] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Pagination
  const activeRosterPagination = usePagination(ROSTER_PAGE_SIZE)
  const exemptedRosterPagination = usePagination(ROSTER_PAGE_SIZE)

  // ─── Data Queries ─────────────────────────────────────────────────────────────

  const { data: progressData, isLoading: isLoadingProgress } = useLearningProgress()

  const { data: rawAssignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['learning-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_assignment_rules')
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
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, property_id, property:properties(name)')
        .order('name')
      if (error) throw error
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

  // Progress detail queries
  const selectedProgress = useMemo(() => {
    if (!selectedProgressId) return null
    return (
      progressData?.find((item) => item.id === selectedProgressId) || null
    )
  }, [progressData, selectedProgressId])

  const { data: selectedModuleBlocks } = useQuery({
    queryKey: ['training-progress-details-blocks', selectedProgress?.content_id],
    queryFn: async () => {
      if (!selectedProgress?.content_id) return []
      // training_content_blocks consolidated into documents (content_type='training_block').
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, block_type, block_order, content_data')
        .eq('content_type', 'training_block')
        .eq('training_module_id', selectedProgress.content_id)
        .eq('is_deleted', false)
        .order('block_order', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!selectedProgress?.content_id
  })

  const selectedModuleQuizIds = useMemo(() => (
    Array.from(new Set(
      (selectedModuleBlocks || [])
        .filter((block) => block.block_type === 'quiz')
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
        .from('training_progress')
        .select('content_id:training_id, score_percentage, passed, completed_at, updated_at, metadata')
        .eq('user_id', selectedProgress.user_id)
        .eq('lp_content_type', 'quiz')
        .in('training_id', selectedModuleQuizIds)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!selectedProgress?.user_id && selectedModuleQuizIds.length > 0
  })

  // ─── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    activeRosterPagination.setPage(1)
    exemptedRosterPagination.setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageModuleId])

  useEffect(() => {
    if (!showAssignmentDialog) return
    void refetchAssignableModules()
  }, [showAssignmentDialog, refetchAssignableModules])

  useEffect(() => {
    activeRosterPagination.setTotalCount(moduleRoster?.active.length || 0)
    exemptedRosterPagination.setTotalCount(moduleRoster?.exempted.length || 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleRoster?.active.length, moduleRoster?.exempted.length])

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const invalidateAssignmentControlQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })
    queryClient.invalidateQueries({ queryKey: ['learning-progress'] })
    queryClient.invalidateQueries({ queryKey: ['learning-assignment-exemptions'] })
    queryClient.invalidateQueries({ queryKey: ['module-assignment-roster'] })
    queryClient.invalidateQueries({ queryKey: ['learning-assignments-module-links'] })
    queryClient.invalidateQueries({ queryKey: ['my-assignments'] })
  }, [queryClient])

  const resetReassignDialog = useCallback(() => {
    setReassignEntry(null)
    setReassignUserId('')
    setReassignReason('')
  }, [])

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!formModuleId) throw new Error(t('moduleRequired'))
      const selectedAssignableModule = (modules || []).find((m) => m.id === formModuleId)
      if (!selectedAssignableModule) {
        throw new Error(t('moduleMustBePublishedAndActive', 'Only active, published modules can be assigned.'))
      }

      const assignmentRows: any[] = []
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
        assignmentRows.push({
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
          assignmentRows.push({
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

      const assignmentResult = await persistLearningAssignments(assignmentRows)

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
        .from('training_assignment_rules')
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
      await learningService.setModuleUserOverride({ moduleId, userId, dueDate, priority, instructions })
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

  // ─── Computed Values ──────────────────────────────────────────────────────────

  const assignments = useMemo(() => {
    if (!rawAssignments || !modules) return []
    return rawAssignments.map(a => ({
      ...a,
      training_modules: modules.find(m => m.id === a.content_id)
    })) as LearningAssignment[]
  }, [rawAssignments, modules])

  const paginatedActiveRoster = useMemo(() => (
    (moduleRoster?.active || []).slice(activeRosterPagination.from, activeRosterPagination.to + 1)
  ), [activeRosterPagination.from, activeRosterPagination.to, moduleRoster?.active])

  const paginatedExemptedRoster = useMemo(() => (
    (moduleRoster?.exempted || []).slice(exemptedRosterPagination.from, exemptedRosterPagination.to + 1)
  ), [exemptedRosterPagination.from, exemptedRosterPagination.to, moduleRoster?.exempted])

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
    return new Set(moduleExemptions.map((row) => `${row.content_id}:${row.user_id}`))
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

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')
  }, [i18n.language])

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
        return { badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: t('completed'), progressClass: '[&>div]:bg-emerald-600' }
      case 'in_progress':
        return { badgeClass: 'border-sky-200 bg-sky-50 text-sky-700', label: t('inProgress'), progressClass: '[&>div]:bg-sky-600' }
      case 'overdue':
        return { badgeClass: 'border-rose-200 bg-rose-50 text-rose-700', label: t('overdue'), progressClass: '[&>div]:bg-rose-600' }
      case 'excused':
        return { badgeClass: 'border-slate-200 bg-slate-100 text-slate-600', label: t('excused', 'Excused'), progressClass: '[&>div]:bg-slate-500' }
      case 'assigned':
      default:
        return { badgeClass: 'border-amber-200 bg-amber-50 text-amber-700', label: t('assigned'), progressClass: '[&>div]:bg-amber-500' }
    }
  }, [t])

  const getAssignmentStatus = useCallback((assignment: LearningAssignment): AssignmentStatus => {
    if (!assignment.due_date) return 'active'
    const now = new Date()
    const deadline = new Date(assignment.due_date)
    const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntil < 0) return 'overdue'
    if (daysUntil <= 7) return 'due_soon'
    return 'active'
  }, [])

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
      const matchesPriority = assignmentsFilterPriority === 'all' || assignment.priority === assignmentsFilterPriority
      const matchesTargetType = assignmentsFilterTargetType === 'all' || assignment.target_type === assignmentsFilterTargetType
      let matchesDueStatus = true
      if (assignmentsFilterDueStatus !== 'all') {
        const status = getAssignmentStatus(assignment)
        matchesDueStatus = status === assignmentsFilterDueStatus
      }
      return matchesSearch && matchesPriority && matchesTargetType && matchesDueStatus
    }) || []
  }, [assignments, exemptedModuleUserKeys, search, assignmentsFilterPriority, assignmentsFilterTargetType, assignmentsFilterDueStatus, getTargetDetails, getAssignmentStatus])

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
    const overdue = filteredAssignments.filter(a => getAssignmentStatus(a) === 'overdue').length
    const dueSoon = filteredAssignments.filter(a => getAssignmentStatus(a) === 'due_soon').length
    return { total, byPriority, byTargetType, overdue, dueSoon }
  }, [filteredAssignments, getAssignmentStatus])

  const filteredProgress = useMemo(() => {
    if (!progressData) return []
    return progressData.filter(item => {
      if (item.content_type !== 'module') return false
      if (overviewSearch) {
        const searchLower = overviewSearch.toLowerCase()
        const user = users?.find(u => u.id === item.user_id)
        const userName = item.profiles?.full_name || user?.full_name || ''
        const moduleTitle = modules?.find(m => m.id === item.content_id)?.title || ''
        if (!userName.toLowerCase().includes(searchLower) && !moduleTitle.toLowerCase().includes(searchLower)) return false
      }
      if (overviewFilterStatus !== 'all' && item.status !== overviewFilterStatus) return false
      const userDeptId = (userDepartments?.find(ud => ud.user_id === item.user_id)?.department as any)?.id
      const userPropId = (userProperties?.find(up => up.user_id === item.user_id)?.property as any)?.id
      if (overviewFilterDept !== 'all' && userDeptId !== overviewFilterDept) return false
      if (overviewFilterProp !== 'all' && userPropId !== overviewFilterProp) return false
      return true
    })
  }, [progressData, overviewSearch, overviewFilterStatus, overviewFilterDept, overviewFilterProp, userDepartments, userProperties, users, modules])

  const progressMetrics = useMemo(() => ({
    total: filteredProgress.length,
    completed: filteredProgress.filter(p => p.status === 'completed').length,
    in_progress: filteredProgress.filter(p => p.status === 'in_progress').length,
    overdue: filteredProgress.filter(p => p.status === 'overdue').length,
    uniqueModules: new Set(filteredProgress.map(p => p.content_id)).size
  }), [filteredProgress])

  const enrichedProgress = useMemo<EnrichedProgressRecord[]>(() => {
    return filteredProgress.map((item) => {
      const joinedDepartmentName = item.profiles?.user_departments?.[0]?.departments?.name || ''
      const joinedPropertyName = item.profiles?.user_properties?.[0]?.properties?.name || ''
      const departmentData = userDepartments?.find((d) => d.user_id === item.user_id)?.department as
        | { name?: string } | Array<{ name?: string }> | null | undefined
      const propertyData = userProperties?.find((p) => p.user_id === item.user_id)?.property as
        | { name?: string } | Array<{ name?: string }> | null | undefined
      const fallbackDepartmentName = Array.isArray(departmentData) ? departmentData[0]?.name || '' : departmentData?.name || ''
      const fallbackPropertyName = Array.isArray(propertyData) ? propertyData[0]?.name || '' : propertyData?.name || ''
      const user = users?.find((entry) => entry.id === item.user_id)
      const resolvedUserName = item.profiles?.full_name || user?.full_name || t('unknownUser')
      const resolvedModuleTitle = item.training_modules?.title || modules?.find((m) => m.id === item.content_id)?.title || t('unknownModule')
      const resolvedProgress = item.status === 'completed' ? item.progress_percentage : Math.min(item.progress_percentage, 99)
      const parsedScore = item.score_percentage === undefined || item.score_percentage === null
        ? null : Number(item.score_percentage)
      const statusMeta = getProgressStatusMeta(item.status)
      const lastTouchedAt = item.last_accessed_at || item.completed_at || item.updated_at || item.created_at
      const normalizedName = resolvedUserName.trim()
      const userInitials = normalizedName.split(/\s+/).filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'NA'
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
          activeModules: 0, assignedModules: 0, attentionCount: 0,
          averageProgress: 0, averageScore: null,
          avatarUrl: record.profiles?.avatar_url || undefined,
          completedModules: 0, departmentName: record.resolvedDepartmentName,
          excusedModules: 0, highlightModule: null, inProgressModules: 0,
          lastTouchedAt: record.lastTouchedAt, locationLabel: record.locationLabel,
          overdueModules: 0, propertyName: record.resolvedPropertyName,
          records: [], totalModules: 0, userId: record.user_id,
          userInitials: record.userInitials, userName: record.resolvedUserName
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
          const diff = progressStatusOrder[a.status] - progressStatusOrder[b.status]
          if (diff !== 0) return diff
          return new Date(b.lastTouchedAt).getTime() - new Date(a.lastTouchedAt).getTime()
        })
        const completedModules = records.filter((r) => r.status === 'completed').length
        const inProgressModules = records.filter((r) => r.status === 'in_progress').length
        const assignedModules = records.filter((r) => r.status === 'assigned').length
        const overdueModules = records.filter((r) => r.status === 'overdue').length
        const excusedModules = records.filter((r) => r.status === 'excused').length
        const activeModules = records.filter((r) => !['completed', 'excused'].includes(r.status)).length
        const averageProgress = records.length > 0
          ? Math.round(records.reduce((sum, r) => sum + r.resolvedProgress, 0) / records.length) : 0
        const scoreValues = records.map((r) => r.resolvedScore).filter((s): s is number => s !== null)
        const averageScore = scoreValues.length > 0
          ? Math.round(scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length) : null
        const highlightModule = records.find((r) => r.status === 'overdue')
          || records.find((r) => r.status === 'in_progress')
          || records.find((r) => r.status === 'assigned')
          || records[0] || null
        const attentionCount = overdueModules > 0
          ? overdueModules + Math.max(0, activeModules - 1)
          : (assignedModules > 1 ? assignedModules - 1 : 0) + (activeModules >= 4 ? 1 : 0)
        return {
          ...group, activeModules, assignedModules, attentionCount, averageProgress, averageScore,
          completedModules, excusedModules, highlightModule, inProgressModules, overdueModules,
          records, totalModules: records.length
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
      ? Number((progressMetrics.total / employeeCount).toFixed(1)) : 0
    const employeesNeedingFollowUp = employeeProgressGroups.filter((g) => g.attentionCount > 0 || g.overdueModules > 0).length
    const heavyLoadEmployees = employeeProgressGroups.filter((g) => g.totalModules >= 4).length
    const averageProgress = employeeCount > 0
      ? Math.round(employeeProgressGroups.reduce((sum, g) => sum + g.averageProgress, 0) / employeeCount) : 0
    const scoreValues = employeeProgressGroups.map((g) => g.averageScore).filter((s): s is number => s !== null)
    const averageScore = scoreValues.length > 0
      ? Math.round(scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length) : null
    const completionRate = progressMetrics.total > 0
      ? Math.round((progressMetrics.completed / progressMetrics.total) * 100) : 0
    return {
      averageModulesPerEmployee, averageProgress, averageScore, completionRate,
      employeeCount, employeesNeedingFollowUp, heavyLoadEmployees
    }
  }, [employeeProgressGroups, progressMetrics.completed, progressMetrics.total])

  const followUpQueue = useMemo(() => (
    employeeProgressGroups.filter((g) => g.attentionCount > 0 || g.overdueModules > 0).slice(0, 5)
  ), [employeeProgressGroups])

  const moduleLoadLeaders = useMemo(() => (
    [...employeeProgressGroups]
      .sort((a, b) => {
        if (b.totalModules !== a.totalModules) return b.totalModules - a.totalModules
        if (b.activeModules !== a.activeModules) return b.activeModules - a.activeModules
        return a.averageProgress - b.averageProgress
      })
      .slice(0, 5)
  ), [employeeProgressGroups])

  const describeFollowUp = useCallback((group: EmployeeProgressGroup) => {
    const reasons: string[] = []
    if (group.overdueModules > 0) reasons.push(`${group.overdueModules} ${t('overdue')}`)
    if (group.assignedModules > 0) reasons.push(`${group.assignedModules} ${t('assigned')}`)
    if (group.activeModules >= 4) reasons.push(t('heavyLoad', 'Heavy load'))
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
    const found = selectedModuleBlocks?.find((block) => block.id === selectedBlockId)
    if (!found) return null
    return { id: found.id, title: found.title, type: found.block_type, order: found.block_order }
  }, [selectedBlockId, selectedModuleBlocks])

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
              ...item, quizId,
              score: parseOptionalNumber(item.score),
              correctCount: parseOptionalNumber(item.correctCount ?? item.correct_count),
              totalQuestions: parseOptionalNumber(item.totalQuestions ?? item.total_questions),
              reviewItems: getQuizResultReviewItems(item)
            })
          }
        })
    }

    selectedQuizProgressRows.forEach((row) => {
      const metadata = (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata))
        ? row.metadata as Record<string, any> : null
      const latestQuizResult = (metadata?.latest_quiz_result && typeof metadata.latest_quiz_result === 'object'
        && !Array.isArray(metadata.latest_quiz_result)) ? metadata.latest_quiz_result : null
      if (!latestQuizResult) return
      const quizId = latestQuizResult.quizId || latestQuizResult.quiz_id || row.content_id
      if (typeof quizId !== 'string' || quizId.length === 0) return
      const existingResult = mergedResults.get(quizId)
      const latestReviewItems = getQuizResultReviewItems(latestQuizResult)
      const existingReviewItems = getQuizResultReviewItems(existingResult)
      const resolvedScore = (parseOptionalNumber(existingResult?.score) ?? parseOptionalNumber(latestQuizResult.score) ?? parseOptionalNumber(row.score_percentage))
      const resolvedCorrectCount = (
        parseOptionalNumber(existingResult?.correctCount ?? existingResult?.correct_count) ??
        parseOptionalNumber(latestQuizResult.correctCount ?? latestQuizResult.correct_count) ??
        (latestReviewItems.length > 0 ? latestReviewItems.filter((item: any) => item?.correct === true).length : null)
      )
      const resolvedTotalQuestions = (
        parseOptionalNumber(existingResult?.totalQuestions ?? existingResult?.total_questions) ??
        parseOptionalNumber(latestQuizResult.totalQuestions ?? latestQuizResult.total_questions) ??
        (latestReviewItems.length > 0 ? latestReviewItems.length : null)
      )
      mergedResults.set(quizId, {
        ...latestQuizResult, ...existingResult, quizId, score: resolvedScore,
        passed: typeof existingResult?.passed === 'boolean' ? existingResult.passed
          : typeof latestQuizResult.passed === 'boolean' ? latestQuizResult.passed : row.passed,
        completedAt: existingResult?.completedAt || existingResult?.completed_at
          || latestQuizResult.completedAt || latestQuizResult.completed_at || row.completed_at || row.updated_at,
        correctCount: resolvedCorrectCount, totalQuestions: resolvedTotalQuestions,
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
    if (selectedQuizResults.length > 0) return t('quizResultsDesc', 'Latest question-level review saved from the learner session.')
    if (selectedModuleQuizIds.length > 0 && selectedProgress?.status === 'completed') {
      return t('legacyQuizResultsUnavailable', 'This completion was recovered from legacy progress data. Detailed quiz answers were not recoverable for this attempt.')
    }
    return t('noQuizResultsSaved', 'No detailed quiz review has been saved for this progress record yet.')
  }, [selectedModuleQuizIds.length, selectedProgress?.status, selectedQuizResults.length, t])

  // Form helpers
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
      props.add(d.propertyName || t('other', 'Other'))
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
      if (!groups.has(propertyName)) groups.set(propertyName, { name: propertyName, items: [] })
      groups.get(propertyName)!.items.push({ id: dept.id, name: displayName })
    })
    return Array.from(groups.values())
      .map(group => ({ ...group, items: group.items.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => sortPropertyNames(a.name, b.name))
  }, [departments, propertyFilters, matchesTargetSearch, t])

  const assignableModules = modules || []
  const selectedAssignableModule = assignableModules.find((module) => module.id === formModuleId)
  const moduleSelectValue = selectedAssignableModule ? formModuleId : ''

  const currentListItems = useMemo(() => {
    switch (formTargetType) {
      case 'users':
        return (users || [])
          .map(u => ({ id: u.id, name: u.full_name || u.email || '', details: u.email }))
          .filter(u => matchesTargetSearch(u.name, u.details))
      case 'departments':
        return departmentGroups.flatMap(group => group.items)
      case 'properties':
        return (properties || []).map(p => ({ id: p.id, name: p.name })).filter(p => matchesTargetSearch(p.name))
      default:
        return []
    }
  }, [formTargetType, users, properties, departmentGroups, matchesTargetSearch])

  const togglePropertyFilter = useCallback((propertyName: string, enabled: boolean) => {
    setPropertyFilters(prev => {
      const next = new Set(prev)
      if (enabled) next.add(propertyName)
      else next.delete(propertyName)
      return Array.from(next)
    })
  }, [])

  const toggleGroupSelection = useCallback((items: Array<{ id: string }>, shouldSelect: boolean) => {
    const itemIds = items.map(item => item.id)
    setFormTargetIds(prev => {
      if (shouldSelect) return Array.from(new Set([...prev, ...itemIds]))
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
  const selectedTargetsLabel = formTargetType === 'all' ? t('allUsers') : `${formTargetIds.length} ${t('selected')}`

  // ─── Callbacks ────────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
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
  }, [])

  const resetOrganizationState = useCallback(() => {
    setAssignmentsSortBy('date')
    setAssignmentsFilterPriority('all')
    setAssignmentsFilterTargetType('all')
    setAssignmentsFilterDueStatus('all')
    setSearch('')
  }, [])

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

  const openReassignDialog = useCallback((entry: ModuleAssigneeRosterEntry) => {
    setReassignEntry(entry)
    setReassignUserId(entry.user_id)
    setReassignReason(entry.exemption?.reason || '')
  }, [])

  const openOverrideDialog = useCallback((entry: ModuleAssigneeRosterEntry) => {
    setOverrideEntry(entry)
    setOverrideDueDate(entry.override?.due_date ? format(new Date(entry.override.due_date), 'yyyy-MM-dd') : '')
    setOverridePriority(entry.override?.priority || 'inherit')
    setOverrideInstructions(entry.override?.instructions || '')
  }, [])

  const closeOverrideDialog = useCallback(() => {
    setOverrideEntry(null)
    setOverrideDueDate('')
    setOverridePriority('inherit')
    setOverrideInstructions('')
  }, [])

  const handleDelete = useCallback((id: string) => {
    if (confirm(t('confirmAssignmentDelete'))) {
      deleteAssignmentMutation.mutate(id)
    }
  }, [deleteAssignmentMutation, t])

  const submitCreateAssignment = useCallback(() => {
    createAssignmentMutation.mutate()
  }, [createAssignmentMutation])

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

  const submitSaveOverride = useCallback(() => {
    if (!overrideEntry || !manageModuleId) return
    saveOverrideMutation.mutate({
      moduleId: manageModuleId,
      userId: overrideEntry.user_id,
      dueDate: overrideDueDate || null,
      priority: overridePriority === 'inherit' ? null : overridePriority,
      instructions: overrideInstructions || null
    })
  }, [manageModuleId, overrideDueDate, overrideEntry, overrideInstructions, overridePriority, saveOverrideMutation])

  const submitClearOverride = useCallback(() => {
    if (!overrideEntry || !manageModuleId) return
    clearOverrideMutation.mutate({ moduleId: manageModuleId, userId: overrideEntry.user_id })
  }, [clearOverrideMutation, manageModuleId, overrideEntry])

  const submitResetProgress = useCallback((moduleId: string, userId: string) => {
    resetProgressMutation.mutate({ moduleId, userId })
  }, [resetProgressMutation])

  const submitExemptUser = useCallback((moduleId: string, userId: string, reason?: string) => {
    exemptUserMutation.mutate({ moduleId, userId, reason })
  }, [exemptUserMutation])

  const submitRestoreUser = useCallback((moduleId: string, userId: string) => {
    restoreUserMutation.mutate({ moduleId, userId })
  }, [restoreUserMutation])

  const submitResendNotification = useCallback((userId: string, moduleId: string, moduleTitle: string, deadline?: string | null) => {
    resendNotificationMutation.mutate({ userId, moduleId, moduleTitle, deadline })
  }, [resendNotificationMutation])

  const handleExport = useCallback(() => {
    if (!enrichedProgress.length) return
    const employeeLookup = new Map(employeeProgressGroups.map((group) => [group.userId, group]))
    const headers = [
      t('employee'), t('email', 'Email'), t('department'), t('property'),
      t('module'), t('status'), t('progress'), t('score'), t('passed', 'Passed'),
      t('timeSpent', 'Time spent'), t('lastAccess'), t('completedAt', 'Completed at'),
      t('currentStep', 'Current step'), t('totalEnrollments'),
      t('completed', 'Completed') + ` ${t('modules', 'Modules')}`,
      t('inProgress') + ` ${t('modules', 'Modules')}`,
      t('overdue') + ` ${t('modules', 'Modules')}`,
      t('assigned') + ` ${t('modules', 'Modules')}`,
      t('employeeCompletionRate', 'Employee completion rate'),
      t('analytics.avgScore', 'Avg Score'),
      t('followUpFlag', 'Follow-up flag'), t('followUpReason', 'Follow-up reason')
    ]
    const csvRows = employeeProgressGroups.flatMap((group) => {
      return group.records.map((record) => {
        const user = users?.find((entry) => entry.id === record.user_id)
        const currentStep = record.last_block_index !== null && record.last_block_index !== undefined
          ? t('blockTitle', { number: record.last_block_index + 1 }) : '-'
        const completionRate = group.totalModules > 0
          ? `${Math.round((group.completedModules / group.totalModules) * 100)}%` : '0%'
        const followUpFlag = group.attentionCount > 0 || group.overdueModules > 0
          ? t('requiredAction', 'Required Action') : t('onTime')
        return [
          escapeCsvValue(group.userName), escapeCsvValue(record.profiles?.email || user?.email || '-'),
          escapeCsvValue(group.departmentName || '-'), escapeCsvValue(group.propertyName || '-'),
          escapeCsvValue(record.resolvedModuleTitle), escapeCsvValue(record.statusLabel),
          escapeCsvValue(`${record.resolvedProgress}%`),
          escapeCsvValue(record.resolvedScore !== null ? `${Math.round(record.resolvedScore)}%` : '-'),
          escapeCsvValue(record.passed === undefined || record.passed === null ? '-' : record.passed ? t('yes', 'Yes') : t('no', 'No')),
          escapeCsvValue(formatDuration(record.time_spent_seconds)),
          escapeCsvValue(formatDate(record.lastTouchedAt)),
          escapeCsvValue(record.completed_at ? formatDate(record.completed_at) : '-'),
          escapeCsvValue(currentStep), escapeCsvValue(group.totalModules),
          escapeCsvValue(group.completedModules), escapeCsvValue(group.inProgressModules),
          escapeCsvValue(group.overdueModules), escapeCsvValue(group.assignedModules),
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
  }, [enrichedProgress, employeeProgressGroups, t, escapeCsvValue, formatDuration, formatDate, describeFollowUp, users])

  // ─── Context Value ────────────────────────────────────────────────────────────

  const value: TrainingAssignmentsContextValue = {
    // i18n / layout
    isRTL, t, navigate,

    // Panel props
    embedded, hideCreateButton, hideHeaderActions,

    // Tab state
    activeTab, setActiveTab,

    // Dialog
    showAssignmentDialog, setShowAssignmentDialog,

    // Assignment tab state
    search, setSearch,
    assignmentsViewMode, setAssignmentsViewMode,
    assignmentsSortBy, setAssignmentsSortBy,
    assignmentsFilterPriority, setAssignmentsFilterPriority,
    assignmentsFilterTargetType, setAssignmentsFilterTargetType,
    assignmentsFilterDueStatus, setAssignmentsFilterDueStatus,
    showFilters, setShowFilters,
    resetOrganizationState,

    // Overview filters
    overviewSearch, setOverviewSearch,
    overviewFilterStatus, setOverviewFilterStatus,
    overviewFilterDept, setOverviewFilterDept,
    overviewFilterProp, setOverviewFilterProp,

    // Selected progress
    selectedProgressId, setSelectedProgressId,
    selectedProgress,
    selectedBlock,
    selectedProgressMetadata,
    selectedQuizResults,
    selectedQuizResultsMessage,

    // Form state
    formModuleId, setFormModuleId,
    formTargetType, setFormTargetType,
    formTargetIds, setFormTargetIds,
    formDeadline, setFormDeadline,
    formValidFrom, setFormValidFrom,
    formExpiresAt, setFormExpiresAt,
    formPriority, setFormPriority,
    formInstructions, setFormInstructions,
    requiresAcknowledgement, setRequiresAcknowledgement,
    sendNotifications, setSendNotifications,
    notifyOnDue, setNotifyOnDue,
    reminderDaysBefore, setReminderDaysBefore,
    propertyFilters, setPropertyFilters,
    targetSearch, setTargetSearch,
    validationErrors,
    moduleSelectValue,
    selectedModuleName,
    selectedTargetsLabel,
    assignableModules,
    currentListItems,
    departmentGroups,
    departmentProperties,
    togglePropertyFilter,
    toggleGroupSelection,
    resetForm,

    // Manage assignees
    manageModuleId, manageModuleTitle,
    openManageAssignees, closeManageAssignees,

    // Roster pagination
    moduleRoster, isLoadingModuleRoster,
    paginatedActiveRoster, paginatedExemptedRoster,
    activeRosterPagination, exemptedRosterPagination,

    // Reassign
    removeReason, setRemoveReason,
    reassignEntry, reassignUserId, setReassignUserId,
    reassignReason, setReassignReason,
    resetReassignDialog, openReassignDialog,

    // Override
    overrideEntry, overrideDueDate, setOverrideDueDate,
    overridePriority, setOverridePriority,
    overrideInstructions, setOverrideInstructions,
    openOverrideDialog, closeOverrideDialog,

    // Data
    users, modules, departments, properties,

    // Derived data
    groupedAssignments, assignmentStats, exemptionCountByModule,
    progressMetrics, employeeTrackingSummary, employeeProgressGroups,
    followUpQueue, moduleLoadLeaders,

    // Loading states
    isLoadingAssignments, isLoadingProgress,

    // Helpers
    getTargetDetails, formatDate, formatDuration,
    getProgressStatusMeta, describeFollowUp,

    // Submit callbacks
    submitCreateAssignment, submitReassign,
    submitSaveOverride, submitClearOverride,
    submitResetProgress, submitExemptUser,
    submitRestoreUser, submitResendNotification,
    handleDelete, handleExport,

    // Mutation pending states
    createAssignmentMutationPending: createAssignmentMutation.isPending,
    reassignUserMutationPending: reassignUserMutation.isPending,
    restoreUserMutationPending: restoreUserMutation.isPending,
    resetProgressMutationPending: resetProgressMutation.isPending,
    exemptUserMutationPending: exemptUserMutation.isPending,
    saveOverrideMutationPending: saveOverrideMutation.isPending,
    clearOverrideMutationPending: clearOverrideMutation.isPending,
    resendNotificationMutationPending: resendNotificationMutation.isPending,

    // Toast
    toast,
  }

  return (
    <TrainingAssignmentsContext.Provider value={value}>
      {children}
    </TrainingAssignmentsContext.Provider>
  )
}
