import { PageHeader } from '@/components/layout/PageHeader'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'
import { ModuleAnalyticsCard } from '@/components/training/hub/ModuleAnalyticsCard'
import { ModuleQuickActions } from '@/components/training/hub/ModuleQuickActions'
import { ModuleQuickPreviewSheet } from '@/components/training/hub/ModuleQuickPreviewSheet'
import { ModuleTemplateSelector } from '@/components/training/hub/ModuleTemplateSelector'
import { SmartAICourseCreatorModal } from '@/components/training/hub/SmartAICourseCreatorModal'
import { TrainingCategoryBadge, getCategoryTheme } from '@/components/training/hub/TrainingCategoryBadge'
import { TrainingTrackCommandCenter } from '@/components/training/hub/TrainingTrackCommandCenter'
import { AssignTrainingWizardModal } from '@/components/training/AssignTrainingWizardModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { useDebounce } from '@/hooks/useDebounce'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    AlertCircle,
    Archive,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Award,
    BarChart3,
    BookOpen,
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Crown,
    ExternalLink,
    Eye,
    FileCheck,
    FileQuestion,
    FileText,
    Film,
    FilterX,
    Grid3X3,
    HeartHandshake,
    Layers,
    List,
    Loader2,
    Plus,
    Search,
    Send,
    Settings,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Tag,
    Trash2,
    TrendingUp,
    Users,
    Utensils,
    Wand2,
    X
} from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { TrainingAssignmentsPanel } from './TrainingAssignments'
import { TrainingBuilder } from './TrainingBuilder'
import { MasterVersionSyncModal } from '@/components/platform/MasterVersionSyncModal'
import { platformService } from '@/services/platformService'

// Lazy load heavy chart component
const TrainingProgressVisualization = lazy(() => import('@/components/training/TrainingProgressVisualization').then(m => ({ default: m.TrainingProgressVisualization })))

type ModuleStatus = 'draft' | 'pending_review' | 'published' | 'archived'
type ViewMode = 'list' | 'builder' | 'assignments' | 'insights'
type StatusFilterType = 'all' | 'published' | 'draft' | 'pending_review' | 'archived' | 'assigned'
type LayoutMode = 'grid' | 'table'

interface TrainingModule {
  id: string
  title: string
  description?: string | null
  category?: string | null
  estimated_duration_minutes?: number | null
  status?: ModuleStatus
  organization_id?: string | null
  brand_id?: string | null
  hotel_id?: string | null
  scope_type?: string | null
  is_master_template?: boolean | null
  master_source_id?: string | null
  created_by?: string | null
  updated_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export default function TrainingHub() {
  const { primaryRole } = useAuth()
  const { currentOrganization, currentHotel, currentBrand } = useTenant()
  const navigate = useNavigate()
  const { id: moduleId } = useParams()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const { toast } = useToast()

  const canManageModules = ['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'author', 'regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '')
  const canAssignTraining = ['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'].includes(primaryRole || '')
  const canReviewModules = ['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'regional_admin', 'regional_hr'].includes(primaryRole || '')

  const rawViewParam = searchParams.get('view')
  const viewParam = (rawViewParam === 'analytics' ? 'insights' : rawViewParam) as ViewMode | null
  const validViews: ViewMode[] = ['list', 'builder', 'assignments', 'insights']
  const viewMode: ViewMode = validViews.includes(viewParam as ViewMode)
    ? (viewParam as ViewMode)
    : (moduleId ? 'builder' : 'list')

  const setViewMode = (
    mode: ViewMode,
    options?: { moduleId?: string; assignModuleId?: string; openAssign?: boolean }
  ) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('view', mode)

    if (options?.assignModuleId) {
      nextParams.set('assignModuleId', options.assignModuleId)
    } else {
      nextParams.delete('assignModuleId')
    }

    if (options?.openAssign) {
      nextParams.set('openAssign', '1')
    } else {
      nextParams.delete('openAssign')
    }

    if (mode !== 'builder') {
      nextParams.delete('template')
    }

    const builderId = options?.moduleId || moduleId || 'new'
    const targetPath = mode === 'builder' ? `/training/hub/${builderId}` : '/training/hub'
    const query = nextParams.toString()
    navigate(query ? `${targetPath}?${query}` : targetPath)
  }

  // Filter & Search state
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 250)
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all')
  const [durationFilter, setDurationFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at_desc')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid')

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(12)

  // Multi-selection state
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set())
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)

  // Quick Preview Sheet state
  const [previewModuleId, setPreviewModuleId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const assignModuleId = searchParams.get('assignModuleId') || undefined
  const shouldOpenAssign = searchParams.get('openAssign') === '1'

  // Dialog states
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showSmartAIModal, setShowSmartAIModal] = useState(false)
  const [assignWizardOpen, setAssignWizardOpen] = useState(false)

  // Delete states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [moduleToDelete, setModuleToDelete] = useState<TrainingModule | null>(null)

  // Review states
  const [moduleToReject, setModuleToReject] = useState<TrainingModule | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Data fetching: fetch all non-deleted modules scoped to tenant
  const { data: rawModules, isLoading } = useQuery({
    queryKey: ['training-modules', currentOrganization?.id, currentHotel?.id, currentBrand?.id],
    queryFn: async () => {
      let query = supabase
        .from('training_modules')
        .select('*')
        .not('is_deleted', 'is', true)
        .order('created_at', { ascending: false })

      if (currentOrganization?.id) {
        query = query.or(`organization_id.eq.${currentOrganization.id},organization_id.is.null,is_master_template.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as TrainingModule[]
    },
    enabled: canManageModules
  })

  const { data: assignmentLinks } = useQuery({
    queryKey: ['learning-assignments-module-links', currentOrganization?.id],
    queryFn: async () => {
      let query = supabase
        .from('training_assignment_rules')
        .select('content_id')
        .eq('content_type', 'module')
        .or('is_deleted.is.null,is_deleted.eq.false')

      if (currentOrganization?.id) {
        query = query.or(`organization_id.eq.${currentOrganization.id},organization_id.is.null`)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: canManageModules
  })

  // Master Content Deployments & Version Sync query
  const { data: masterDeployments, refetch: refetchMasterDeployments } = useQuery({
    queryKey: ['master-content-deployments', currentOrganization?.id],
    queryFn: () => platformService.getDeploymentsForTenant(currentOrganization?.id || ''),
    enabled: !!currentOrganization?.id && canManageModules
  })

  const deploymentsByTargetId = useMemo(() => {
    const map = new Map<string, any>()
    masterDeployments?.forEach((dep) => {
      map.set(dep.target_content_id, dep)
    })
    return map
  }, [masterDeployments])

  // Sync with Master Modal State
  const [syncModalState, setSyncModalState] = useState<{
    open: boolean
    module: TrainingModule | null
  }>({ open: false, module: null })

  const assignedModuleIds = useMemo(() => {
    return new Set((assignmentLinks || []).map((a) => a.content_id))
  }, [assignmentLinks])

  // Extract categories dynamically
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    rawModules?.forEach((m) => {
      if (m.category && m.category.trim()) {
        cats.add(m.category.trim())
      }
    })
    return Array.from(cats).sort()
  }, [rawModules])

  // Compute status counts & KPIs
  const statusCounts = useMemo(() => {
    if (!rawModules) return { all: 0, published: 0, draft: 0, pending_review: 0, archived: 0, assigned: 0 }
    return {
      all: rawModules.length,
      published: rawModules.filter((m) => m.status === 'published').length,
      draft: rawModules.filter((m) => !m.status || m.status === 'draft').length,
      pending_review: rawModules.filter((m) => m.status === 'pending_review').length,
      archived: rawModules.filter((m) => m.status === 'archived').length,
      assigned: rawModules.filter((m) => assignedModuleIds.has(m.id)).length
    }
  }, [rawModules, assignedModuleIds])

  const totalCatalogMinutes = useMemo(() => {
    if (!rawModules) return 0
    return rawModules.reduce((acc, m) => acc + (m.estimated_duration_minutes || 0), 0)
  }, [rawModules])

  const totalCatalogHoursFormatted = useMemo(() => {
    const hours = Math.floor(totalCatalogMinutes / 60)
    const mins = totalCatalogMinutes % 60
    if (hours === 0) return `${mins}m`
    return `${hours}h ${mins}m`
  }, [totalCatalogMinutes])

  // Multi-criteria filtering & sorting
  const filteredModules = useMemo(() => {
    if (!rawModules) return []
    let list = [...rawModules]

    if (statusFilter === 'published') {
      list = list.filter((m) => m.status === 'published')
    } else if (statusFilter === 'draft') {
      list = list.filter((m) => !m.status || m.status === 'draft')
    } else if (statusFilter === 'pending_review') {
      list = list.filter((m) => m.status === 'pending_review')
    } else if (statusFilter === 'archived') {
      list = list.filter((m) => m.status === 'archived')
    } else if (statusFilter === 'assigned') {
      list = list.filter((m) => assignedModuleIds.has(m.id))
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter((m) =>
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q))
      )
    }

    if (categoryFilter !== 'all') {
      list = list.filter((m) => m.category === categoryFilter)
    }

    if (assignmentFilter === 'assigned') {
      list = list.filter((m) => assignedModuleIds.has(m.id))
    } else if (assignmentFilter === 'unassigned') {
      list = list.filter((m) => !assignedModuleIds.has(m.id))
    }

    if (durationFilter === 'under_15') {
      list = list.filter((m) => (m.estimated_duration_minutes || 0) < 15)
    } else if (durationFilter === '15_to_45') {
      list = list.filter((m) => {
        const d = m.estimated_duration_minutes || 0
        return d >= 15 && d <= 45
      })
    } else if (durationFilter === '45_to_90') {
      list = list.filter((m) => {
        const d = m.estimated_duration_minutes || 0
        return d > 45 && d <= 90
      })
    } else if (durationFilter === 'over_90') {
      list = list.filter((m) => (m.estimated_duration_minutes || 0) > 90)
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'created_at_desc':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        case 'created_at_asc':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        case 'updated_at_desc':
          return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '')
        case 'title_desc':
          return (b.title || '').localeCompare(a.title || '')
        case 'duration_asc':
          return (a.estimated_duration_minutes || 0) - (b.estimated_duration_minutes || 0)
        case 'duration_desc':
          return (b.estimated_duration_minutes || 0) - (a.estimated_duration_minutes || 0)
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      }
    })

    return list
  }, [rawModules, statusFilter, debouncedSearch, categoryFilter, assignmentFilter, durationFilter, sortBy, assignedModuleIds])

  // Pagination calculations
  const totalItems = filteredModules.length
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedModules = useMemo(() => {
    if (pageSize === -1) return filteredModules
    const start = (safeCurrentPage - 1) * pageSize
    return filteredModules.slice(start, start + pageSize)
  }, [filteredModules, safeCurrentPage, pageSize])

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all' || assignmentFilter !== 'all' || durationFilter !== 'all'

  const handleClearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setCategoryFilter('all')
    setAssignmentFilter('all')
    setDurationFilter('all')
    setCurrentPage(1)
  }

  const handleToggleSelect = (id: string) => {
    setSelectedModuleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllOnPage = () => {
    const allPageIds = paginatedModules.map((m) => m.id)
    const isAllSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedModuleIds.has(id))
    setSelectedModuleIds((prev) => {
      const next = new Set(prev)
      if (isAllSelected) {
        allPageIds.forEach((id) => next.delete(id))
      } else {
        allPageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleDeselectAll = () => {
    setSelectedModuleIds(new Set())
  }

  const handleOpenPreview = (id: string) => {
    setPreviewModuleId(id)
    setPreviewOpen(true)
  }

  // Column sort toggler
  const handleSortColumn = (columnKey: 'title' | 'category' | 'status' | 'duration' | 'updated') => {
    if (columnKey === 'title') {
      setSortBy((prev) => (prev === 'title_asc' ? 'title_desc' : 'title_asc'))
    } else if (columnKey === 'duration') {
      setSortBy((prev) => (prev === 'duration_asc' ? 'duration_desc' : 'duration_asc'))
    } else if (columnKey === 'updated') {
      setSortBy((prev) => (prev === 'updated_at_desc' ? 'created_at_desc' : 'updated_at_desc'))
    }
  }

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ModuleStatus }) => {
      const { error } = await supabase
        .from('training_modules')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      toast({
        title: t('statusUpdated', { defaultValue: 'Status Updated' }),
        description: t('moduleSavedDescription')
      })
    },
    onError: () => {
      toast({ title: t('error'), description: t('statusUpdateError'), variant: 'destructive' })
    }
  })

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_modules')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      toast({
        title: t('moduleDeleted'),
        description: t('moduleDeletedDesc')
      })
    },
    onError: () => {
      toast({ title: t('error'), description: t('moduleDeleteError'), variant: 'destructive' })
    }
  })

  const bulkPublishMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('training_modules')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .in('id', ids)

      if (error) throw error
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      setSelectedModuleIds(new Set())
      toast({
        title: t('modulePublished'),
        description: t('bulkPublishSuccess', { count: ids.length })
      })
    },
    onError: () => {
      toast({ title: t('error'), description: t('bulkPublishError'), variant: 'destructive' })
    }
  })

  const bulkArchiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('training_modules')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .in('id', ids)

      if (error) throw error
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      setSelectedModuleIds(new Set())
      toast({
        title: t('archived'),
        description: t('bulkArchiveSuccess', { count: ids.length })
      })
    },
    onError: () => {
      toast({ title: t('error'), description: t('bulkArchiveError'), variant: 'destructive' })
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('training_modules')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .in('id', ids)

      if (error) throw error
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      setSelectedModuleIds(new Set())
      setBulkDeleteConfirmOpen(false)
      toast({
        title: t('moduleDeleted'),
        description: t('bulkDeleteSuccess', { count: ids.length })
      })
    },
    onError: () => {
      toast({ title: t('error'), description: t('bulkDeleteError'), variant: 'destructive' })
    }
  })

  const submitForReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('submit_training_module_for_review', { p_module_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      toast({ title: t('review.submitted'), description: t('review.submittedDesc') })
    },
    onError: () => {
      toast({ title: t('error'), description: t('review.submitError'), variant: 'destructive' })
    }
  })

  const approveModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('approve_training_module', { p_module_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      toast({ title: t('review.approved'), description: t('review.approvedDesc') })
    },
    onError: () => {
      toast({ title: t('error'), description: t('review.approveError'), variant: 'destructive' })
    }
  })

  const rejectModuleMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.rpc('reject_training_module', {
        p_module_id: id,
        p_reason: reason
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      setModuleToReject(null)
      setRejectReason('')
      toast({ title: t('review.rejected'), description: t('review.rejectedDesc') })
    },
    onError: () => {
      toast({ title: t('error'), description: t('review.rejectError'), variant: 'destructive' })
    }
  })

  const handleStartFromScratch = () => {
    setViewMode('builder', { moduleId: 'new' })
  }

  const handleCreateFromTemplate = () => {
    setShowTemplateDialog(true)
  }

  const handleCreateWithAI = () => {
    setShowSmartAIModal(true)
  }

  const handleEdit = (module: TrainingModule) => {
    setViewMode('builder', { moduleId: module.id })
  }

  const handleView = (module: TrainingModule) => {
    navigate(`/learning/training/${module.id}`)
  }

  const handleDelete = (module: TrainingModule) => {
    setModuleToDelete(module)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (moduleToDelete) {
      await deleteModuleMutation.mutateAsync(moduleToDelete.id)
      setModuleToDelete(null)
    }
  }

  const handleAssign = (id: string) => {
    setViewMode('assignments', { assignModuleId: id, openAssign: true })
  }

  const handleClone = async (module: TrainingModule) => {
    try {
      const { error } = await supabase.rpc('duplicate_training_module', { p_module_id: module.id })
      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      toast({
        title: t('moduleCloned'),
        description: t('moduleClonedDesc')
      })
    } catch (error) {
      console.error('Error cloning module:', error)
      toast({
        title: t('error'),
        description: t('cloneError'),
        variant: 'destructive'
      })
    }
  }

  const handleSubmitForReview = (module: TrainingModule) => {
    submitForReviewMutation.mutate(module.id)
  }

  const handleApprove = (module: TrainingModule) => {
    approveModuleMutation.mutate(module.id)
  }

  const handleRequestReject = (module: TrainingModule) => {
    setModuleToReject(module)
    setRejectReason('')
  }

  const confirmReject = () => {
    if (moduleToReject) {
      rejectModuleMutation.mutate({ id: moduleToReject.id, reason: rejectReason })
    }
  }

  const workflowSteps: Array<{
    key: ViewMode
    label: string
    description: string
    icon: typeof FileText
    visible: boolean
  }> = [
    {
      key: 'list' as ViewMode,
      label: t('workflow.design'),
      description: t('workflow.designDesc'),
      icon: FileText,
      visible: canManageModules
    },
    {
      key: 'builder' as ViewMode,
      label: t('workflow.build'),
      description: t('workflow.buildDesc'),
      icon: Wand2,
      visible: canManageModules
    },
    {
      key: 'assignments' as ViewMode,
      label: t('workflow.assign'),
      description: t('workflow.assignDesc'),
      icon: Users,
      visible: canAssignTraining
    },
    {
      key: 'insights' as ViewMode,
      label: t('workflow.track'),
      description: t('workflow.trackDesc'),
      icon: TrendingUp,
      visible: canAssignTraining || canManageModules
    }
  ].filter((step) => step.visible)

  const headerActions = (() => {
    if (viewMode === 'list') {
      if (!canManageModules) return null
      return (
        <div className={cn("flex w-full flex-wrap items-center gap-2 sm:w-auto", isRTL ? "flex-row-reverse" : "")}>
          <Button
            onClick={() => setShowSmartAIModal(true)}
            className={cn("w-full sm:w-auto bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black shadow-md border-none", isRTL ? "flex-row-reverse" : "")}
          >
            <Sparkles className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('createWithAI', 'Create with AI')}
          </Button>
          <Button
            variant="outline"
            onClick={handleCreateFromTemplate}
            className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}
          >
            <Layers className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('createFromTemplate', 'From Template')}
          </Button>
          <Button
            variant="outline"
            onClick={handleStartFromScratch}
            className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}
          >
            <Plus className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('startFromScratch', 'Start Blank')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setAssignWizardOpen(true)}
            className={cn("w-full sm:w-auto border-amber-300 text-amber-900 dark:text-amber-300 hover:bg-amber-50/50", isRTL ? "flex-row-reverse" : "")}
          >
            <Users className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('assign_wizard', 'Assign to Team')}
          </Button>
        </div>
      )
    }
    if (viewMode === 'assignments') {
      if (!canAssignTraining) return null
      return (
        <div className={cn("flex w-full flex-wrap items-center gap-2 sm:w-auto", isRTL ? "flex-row-reverse" : "")}>
          <Button
            variant="outline"
            onClick={() => navigate('/training/assignments/rules')}
            className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}
          >
            <Settings className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('autoAssignRules')}
          </Button>
          <Button
            onClick={() => setViewMode('assignments', { openAssign: true, assignModuleId })}
            className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}
          >
            <Plus className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('createAssignment')}
          </Button>
        </div>
      )
    }
    if (viewMode === 'builder') {
      if (!canManageModules) return null
      return (
        <div className={cn("flex w-full flex-wrap items-center gap-2 sm:w-auto", isRTL ? "flex-row-reverse" : "")}>
          <Button
            variant="outline"
            onClick={() => setViewMode('list')}
            className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}
          >
            <BookOpen className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('library')}
          </Button>
          {moduleId && moduleId !== 'new' && (
            <Button
              onClick={() => handleAssign(moduleId)}
              className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}
            >
              <Users className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
              {t('assign')}
            </Button>
          )}
        </div>
      )
    }
    if (viewMode === 'insights') {
      if (!canAssignTraining && !canManageModules) return null
      return (
        <div className={cn("flex w-full flex-wrap items-center gap-2 sm:w-auto", isRTL ? "flex-row-reverse" : "")}>
          <Button
            variant="outline"
            onClick={() => setViewMode('assignments')}
            className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}
          >
            <Users className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('manageAssignments')}
          </Button>
        </div>
      )
    }
    return null
  })()

  const renderAccessNotice = (actionLabel?: string, onAction?: () => void) => (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('accessRestrictedTitle')}</h3>
        <p className="text-gray-500 mb-6 max-w-md">{t('accessRestrictedDesc')}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} variant="outline">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )

  if (viewMode === 'builder' && moduleId && canManageModules) {
    return <TrainingBuilder />
  }

  const statusPills: Array<{
    id: StatusFilterType
    label: string
    count: number
    dotColor: string
    activeClass: string
  }> = [
    {
      id: 'all',
      label: t('allModules'),
      count: statusCounts.all,
      dotColor: 'bg-hotel-navy',
      activeClass: 'bg-hotel-navy text-white shadow-sm'
    },
    {
      id: 'published',
      label: t('published', 'Published'),
      count: statusCounts.published,
      dotColor: 'bg-emerald-500',
      activeClass: 'bg-emerald-600 text-white shadow-sm'
    },
    {
      id: 'draft',
      label: t('draft', 'Draft'),
      count: statusCounts.draft,
      dotColor: 'bg-slate-400',
      activeClass: 'bg-slate-700 text-white shadow-sm'
    },
    {
      id: 'pending_review',
      label: t('pending_review', 'Pending Review'),
      count: statusCounts.pending_review,
      dotColor: 'bg-amber-500',
      activeClass: 'bg-amber-600 text-white shadow-sm'
    },
    {
      id: 'assigned',
      label: t('assigned', 'Assigned'),
      count: statusCounts.assigned,
      dotColor: 'bg-blue-500',
      activeClass: 'bg-blue-600 text-white shadow-sm'
    },
    {
      id: 'archived',
      label: t('archived', 'Archived'),
      count: statusCounts.archived,
      dotColor: 'bg-rose-500',
      activeClass: 'bg-rose-600 text-white shadow-sm'
    }
  ]

  const isAllOnPageSelected = paginatedModules.length > 0 && paginatedModules.every((m) => selectedModuleIds.has(m.id))
  const isSomeOnPageSelected = paginatedModules.some((m) => selectedModuleIds.has(m.id)) && !isAllOnPageSelected

  // Saudi Hospitality 1-Click AI Starter suggestions
  const hospitalityAiStarters = [
    {
      title: t('starterHafawa', 'VIP Arrival & Saudi Hafawa Etiquette'),
      category: 'Front Office & Hafawa',
      icon: Crown
    },
    {
      title: t('starterHaccp', 'HACCP Food Safety & Kitchen Hygiene'),
      category: 'Food & Beverage',
      icon: Utensils
    },
    {
      title: t('starterCheckIn', 'Luxury Front Desk Check-in Standards'),
      category: 'Front Office',
      icon: HeartHandshake
    },
    {
      title: t('starterHousekeeping', 'Housekeeping Turndown & Inspection SOP'),
      category: 'Housekeeping',
      icon: Sparkles
    }
  ]

  return (
    <div className={`container mx-auto overflow-x-hidden px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <PageHeader
        title={t('lmsAdmin')}
        description={t('lmsAdminDesc')}
        actions={headerActions}
      />

      <div className="mb-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
          {workflowSteps.map((step) => {
            const Icon = step.icon
            const isActive = viewMode === step.key
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setViewMode(step.key, step.key === 'builder' ? { moduleId: moduleId || 'new' } : undefined)}
                className={cn(
                  "flex min-h-[4.5rem] items-start gap-3 rounded-xl border p-4 text-left transition-all",
                  isRTL && "text-right",
                  isActive ? "border-hotel-gold bg-hotel-gold/10 shadow-sm" : "border-gray-200 hover:border-hotel-gold/50 hover:bg-white"
                )}
              >
                <div className={cn(
                  "mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg",
                  isActive ? "bg-hotel-gold text-hotel-navy" : "bg-gray-100 text-gray-600"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-hotel-navy">{step.label}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
        <TabsContent value="list" className="space-y-4">
          {!canManageModules ? (
            renderAccessNotice(t('goToAssignments'), () => setViewMode('assignments'))
          ) : (
            <>
              {/* Executive KPI Summary Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card
                  onClick={() => { setStatusFilter('all'); setCurrentPage(1) }}
                  className="cursor-pointer hover:shadow-md hover:border-hotel-gold/40 transition-all border-slate-200/80 bg-white/70 backdrop-blur-xs"
                >
                  <CardContent className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('allModules', 'Total Modules')}</p>
                      <h4 className="text-2xl font-bold text-hotel-navy mt-0.5">{statusCounts.all}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {statusCounts.draft} {t('draft', 'drafts')} · {statusCounts.published} {t('published', 'published')}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-hotel-navy shrink-0">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  onClick={() => { setStatusFilter('published'); setCurrentPage(1) }}
                  className="cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all border-slate-200/80 bg-white/70 backdrop-blur-xs"
                >
                  <CardContent className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('readyRate', 'Published')}</p>
                      <h4 className="text-2xl font-bold text-emerald-700 mt-0.5">{statusCounts.published}</h4>
                      <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                        {statusCounts.all > 0 ? Math.round((statusCounts.published / statusCounts.all) * 100) : 0}% {t('readyRate', 'readiness')}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  onClick={() => { setStatusFilter('assigned'); setCurrentPage(1) }}
                  className="cursor-pointer hover:shadow-md hover:border-blue-300 transition-all border-slate-200/80 bg-white/70 backdrop-blur-xs"
                >
                  <CardContent className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('coverageRate', 'Assigned')}</p>
                      <h4 className="text-2xl font-bold text-blue-700 mt-0.5">{statusCounts.assigned}</h4>
                      <p className="text-[10px] text-blue-600 font-medium mt-0.5">
                        {statusCounts.all > 0 ? Math.round((statusCounts.assigned / statusCounts.all) * 100) : 0}% {t('coverageRate', 'coverage')}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/80 bg-white/70 backdrop-blur-xs">
                  <CardContent className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('totalTrainingHours', 'Content Duration')}</p>
                      <h4 className="text-2xl font-bold text-hotel-gold mt-0.5">{totalCatalogHoursFormatted}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t('allModules', 'across catalog')}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Filter Pills Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {statusPills.map((pill) => {
                  const isSelected = statusFilter === pill.id
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => {
                        setStatusFilter(pill.id)
                        setCurrentPage(1)
                      }}
                      className={cn(
                        "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                        isSelected
                          ? pill.activeClass
                          : "bg-white border-slate-200 text-slate-700 hover:border-hotel-gold/60 hover:bg-slate-50"
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", isSelected ? "bg-white" : pill.dotColor)} />
                      <span>{pill.label}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        {pill.count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Multi-Filters & Search Toolbar */}
              <div className="p-3 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 font-bold", isRTL ? "end-3" : "start-3")} />
                    <Input
                      type="text"
                      placeholder={t('searchEmployeeOrModule', { defaultValue: 'Search modules by title, category, description...' })}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setCurrentPage(1)
                      }}
                      className={cn(
                        isRTL ? "pe-9 ps-8 text-right" : "ps-9 pe-8",
                        "h-9 text-sm border-slate-200 bg-slate-50/50 focus:border-hotel-gold focus:ring-hotel-gold transition-all"
                      )}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('')
                          setCurrentPage(1)
                        }}
                        className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1", isRTL ? "start-2" : "end-2")}
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end">
                    {/* Category Filter */}
                    <Select
                      value={categoryFilter}
                      onValueChange={(val) => {
                        setCategoryFilter(val)
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-9 w-[130px] sm:w-[150px] text-xs border-slate-200 bg-slate-50/50">
                        <Tag className="h-3.5 w-3.5 me-1.5 text-slate-400" />
                        <SelectValue placeholder={t('allCategories', 'Category')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allCategories', 'All Categories')}</SelectItem>
                        {availableCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Assignment Filter */}
                    <Select
                      value={assignmentFilter}
                      onValueChange={(val) => {
                        setAssignmentFilter(val)
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-9 w-[130px] sm:w-[150px] text-xs border-slate-200 bg-slate-50/50">
                        <Users className="h-3.5 w-3.5 me-1.5 text-slate-400" />
                        <SelectValue placeholder={t('assignedFilter', 'Assignment')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allAssignments', 'All Modules')}</SelectItem>
                        <SelectItem value="assigned">{t('assignedOnly', 'Assigned Only')}</SelectItem>
                        <SelectItem value="unassigned">{t('unassignedOnly', 'Unassigned Only')}</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Duration Filter */}
                    <Select
                      value={durationFilter}
                      onValueChange={(val) => {
                        setDurationFilter(val)
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-9 w-[120px] sm:w-[140px] text-xs border-slate-200 bg-slate-50/50">
                        <Clock className="h-3.5 w-3.5 me-1.5 text-slate-400" />
                        <SelectValue placeholder={t('durationFilter', 'Duration')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allDurations', 'All Durations')}</SelectItem>
                        <SelectItem value="under_15">{t('durationUnder15', '< 15 min')}</SelectItem>
                        <SelectItem value="15_to_45">{t('duration15to45', '15–45 min')}</SelectItem>
                        <SelectItem value="45_to_90">{t('duration45to90', '45–90 min')}</SelectItem>
                        <SelectItem value="over_90">{t('durationOver90', '> 90 min')}</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sort Dropdown */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-9 w-[140px] sm:w-[160px] text-xs border-slate-200 bg-slate-50/50">
                        <ArrowUpDown className="h-3.5 w-3.5 me-1.5 text-slate-400" />
                        <SelectValue placeholder={t('sortBy')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at_desc">{t('sortByNewest', 'Newest Created')}</SelectItem>
                        <SelectItem value="created_at_asc">{t('sortByOldest', 'Oldest Created')}</SelectItem>
                        <SelectItem value="updated_at_desc">{t('sortByUpdated', 'Recently Modified')}</SelectItem>
                        <SelectItem value="title_asc">{t('sortByTitleAZ', 'Title (A-Z)')}</SelectItem>
                        <SelectItem value="title_desc">{t('sortByTitleZA', 'Title (Z-A)')}</SelectItem>
                        <SelectItem value="duration_asc">{t('sortByDurationAsc', 'Shortest Duration')}</SelectItem>
                        <SelectItem value="duration_desc">{t('sortByDurationDesc', 'Longest Duration')}</SelectItem>
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-9 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                        title={t('clearFilters', 'Clear Filters')}
                      >
                        <FilterX className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('clearFilters', 'Clear')}</span>
                      </Button>
                    )}

                    {/* View Switcher: Grid vs Table */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                      <Button
                        variant={layoutMode === 'grid' ? 'default' : 'ghost'}
                        size="icon"
                        className={cn(
                          "h-7 w-7 rounded-md",
                          layoutMode === 'grid' ? "bg-hotel-navy text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                        )}
                        onClick={() => setLayoutMode('grid')}
                        aria-label={t('viewAsGrid', 'Grid view')}
                        title={t('viewAsGrid', 'Grid view')}
                      >
                        <Grid3X3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={layoutMode === 'table' ? 'default' : 'ghost'}
                        size="icon"
                        className={cn(
                          "h-7 w-7 rounded-md",
                          layoutMode === 'table' ? "bg-hotel-navy text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                        )}
                        onClick={() => setLayoutMode('table')}
                        aria-label={t('viewAsTable', 'Table view')}
                        title={t('viewAsTable', 'Table view')}
                      >
                        <List className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-900">
                      <Checkbox
                        checked={isAllOnPageSelected ? true : isSomeOnPageSelected ? 'indeterminate' : false}
                        onCheckedChange={handleSelectAllOnPage}
                        aria-label={t('selectAll', 'Select all on page')}
                      />
                      <span>{t('selectAll', 'Select All on Page')}</span>
                    </label>
                    <span className="text-slate-300">|</span>
                    <span>
                      {t('showingModules', {
                        from: totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1,
                        to: Math.min(safeCurrentPage * pageSize, totalItems),
                        total: totalItems,
                        defaultValue: `Showing ${totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}–${Math.min(safeCurrentPage * pageSize, totalItems)} of ${totalItems} modules`
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>{t('itemsPerPage', 'Per page:')}</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(val) => {
                        setPageSize(Number(val))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-7 w-[70px] text-xs border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                        <SelectItem value="48">48</SelectItem>
                        <SelectItem value="-1">{t('all', 'All')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Bulk Action Sticky Toolbar */}
              {selectedModuleIds.size > 0 && (
                <div className="sticky top-4 z-30 p-3 bg-slate-900 text-white rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-hotel-gold text-slate-950 font-bold px-2.5 py-0.5">
                      {t('selectedCount_other', { count: selectedModuleIds.size, defaultValue: `${selectedModuleIds.size} modules selected` })}
                    </Badge>
                    <span className="text-xs text-slate-300 hidden md:inline">
                      {t('chooseBulkAction', { defaultValue: 'Perform batch actions on selected modules' })}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-0"
                      onClick={() => setAssignWizardOpen(true)}
                    >
                      <Users className="h-3.5 w-3.5 me-1.5" />
                      {t('bulkAssign', 'Assign to Team')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                      onClick={() => bulkPublishMutation.mutate(Array.from(selectedModuleIds))}
                      disabled={bulkPublishMutation.isPending}
                    >
                      {bulkPublishMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 me-1.5" />
                      )}
                      {t('bulkPublish', 'Publish')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white border-0"
                      onClick={() => bulkArchiveMutation.mutate(Array.from(selectedModuleIds))}
                      disabled={bulkArchiveMutation.isPending}
                    >
                      {bulkArchiveMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" />
                      ) : (
                        <Archive className="h-3.5 w-3.5 me-1.5" />
                      )}
                      {t('bulkArchive', 'Archive')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white border-0"
                      onClick={() => setBulkDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5 me-1.5" />
                      {t('bulkDelete', 'Delete')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-slate-400 hover:text-white hover:bg-white/10"
                      onClick={handleDeselectAll}
                    >
                      <X className="h-3.5 w-3.5 me-1" />
                      {t('deselectAll', 'Deselect')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Main Results View */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-slate-100">
                  <Loader2 className="h-10 w-10 animate-spin text-hotel-gold mb-3" />
                  <p className="text-sm font-medium text-slate-500">{t('loading', 'Loading training modules...')}</p>
                </div>
              ) : paginatedModules.length === 0 ? (
                <Card className="border-dashed border-2 bg-slate-50/50">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                      {hasActiveFilters ? <FilterX className="h-7 w-7" /> : <Sparkles className="h-7 w-7 text-hotel-gold" />}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                      {hasActiveFilters ? t('noMatchingModules', 'No matching modules found') : t('noModules', 'Build Hotel Training Catalog')}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-md">
                      {hasActiveFilters
                        ? t('noMatchingModulesDesc', 'No training modules match your current filters or search terms.')
                        : t('noModulesDesc', 'Create rich interactive modules or start with AI-generated Saudi hospitality courses.')}
                    </p>

                    {hasActiveFilters ? (
                      <Button variant="outline" onClick={handleClearFilters} className="gap-2">
                        <FilterX className="h-4 w-4" />
                        {t('clearFilters', 'Clear Filters')}
                      </Button>
                    ) : (
                      <div className="w-full max-w-xl space-y-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          {t('popularAiStarters', 'Recommended Hotel Courses (1-Click AI Generation):')}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {hospitalityAiStarters.map((starter) => {
                            const StarterIcon = starter.icon
                            return (
                              <button
                                key={starter.title}
                                type="button"
                                onClick={() => setShowSmartAIModal(true)}
                                className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-white hover:border-hotel-gold hover:bg-amber-50/30 text-left transition-all group"
                              >
                                <div className="h-7 w-7 rounded-md bg-amber-50 text-hotel-gold flex items-center justify-center shrink-0 group-hover:bg-hotel-gold group-hover:text-slate-950 transition-colors">
                                  <StarterIcon className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-xs font-semibold text-slate-800 group-hover:text-hotel-gold transition-colors line-clamp-1">
                                  {starter.title}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : layoutMode === 'grid' ? (
                /* GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {paginatedModules.map((module) => {
                    const isSelected = selectedModuleIds.has(module.id)
                    const isAssigned = assignedModuleIds.has(module.id)
                    const isMaster = Boolean(module.is_master_template || module.master_source_id)
                    const deployment = deploymentsByTargetId.get(module.id)
                    const hasUpdate = Boolean(
                      deployment?.has_update_available ||
                      (deployment && deployment.current_master_version > deployment.deployed_version)
                    )
                    return (
                      <Card
                        key={module.id}
                        className={cn(
                          "group relative hover:shadow-lg transition-all duration-200 border-slate-200 overflow-hidden bg-white flex flex-col justify-between",
                          isSelected && "ring-2 ring-hotel-gold border-hotel-gold bg-amber-50/20"
                        )}
                      >
                        {/* Status bar header accent */}
                        <div
                          className={cn(
                            "h-1.5 w-full",
                            module.status === 'published'
                              ? 'bg-emerald-500'
                              : module.status === 'archived'
                              ? 'bg-rose-500'
                              : module.status === 'pending_review'
                              ? 'bg-amber-500'
                              : 'bg-slate-300'
                          )}
                        />

                        {/* Top action row: Checkbox, Category Theme & Badges */}
                        <div className="p-4 pb-0 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSelect(module.id)}
                              aria-label={`Select ${module.title}`}
                              className="data-[state=checked]:bg-hotel-navy shrink-0"
                            />
                            <TrainingCategoryBadge category={module.category} size="sm" />
                            {isMaster && (
                              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 h-5 font-semibold flex items-center gap-1">
                                <Crown className="h-2.5 w-2.5 text-indigo-600" />
                                <span>Platform Master</span>
                              </Badge>
                            )}
                            {hasUpdate && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSyncModalState({ open: true, module })
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-bold shadow-sm transition-transform hover:scale-105 animate-pulse cursor-pointer"
                                title="Click to view upstream master changes and synchronize"
                              >
                                <span>🔔</span>
                                <span>Update Available</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Inline status switcher dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    "text-[10px] font-bold rounded-sm px-2 py-0.5 inline-flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80",
                                    module.status === 'published'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : module.status === 'archived'
                                      ? 'bg-rose-100 text-rose-800'
                                      : module.status === 'pending_review'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                                  )}
                                >
                                  <span>{t(module.status || 'draft')}</span>
                                  <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuLabel>{t('filterByStatus', 'Set Status')}</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: module.id, status: 'published' })}>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 me-2" />
                                  {t('published', 'Published')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: module.id, status: 'draft' })}>
                                  <Clock className="h-3.5 w-3.5 text-slate-500 me-2" />
                                  {t('draft', 'Draft')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: module.id, status: 'archived' })}>
                                  <Archive className="h-3.5 w-3.5 text-rose-500 me-2" />
                                  {t('archived', 'Archived')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {isAssigned && (
                              <Badge variant="outline" className="text-[10px] font-semibold bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0.5">
                                {t('assigned')}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Card Body with quick preview trigger */}
                        <CardHeader className="p-4 pt-3 pb-2 flex-1">
                          <CardTitle
                            onClick={() => handleOpenPreview(module.id)}
                            className="text-base font-semibold text-slate-900 line-clamp-1 group-hover:text-hotel-gold cursor-pointer transition-colors"
                            title={module.title}
                          >
                            {module.title || t('untitledModule', 'Untitled Module')}
                          </CardTitle>
                          <p className={cn("text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px]", isRTL ? "text-right" : "text-left")}>
                            {module.description || t('noDescription', 'No description provided')}
                          </p>
                        </CardHeader>

                        {/* Card Footer: Metadata & Quick Actions */}
                        <CardContent className="p-4 pt-0 space-y-3">
                          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1" title={t('estimatedDuration')}>
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>{module.estimated_duration_minutes ? `${module.estimated_duration_minutes} ${t('min')}` : `0 ${t('min')}`}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenPreview(module.id)}
                              className="text-[11px] font-medium text-slate-400 hover:text-hotel-gold flex items-center gap-1 transition-colors"
                            >
                              <Eye className="h-3 w-3" />
                              <span>{t('quickPreview', 'Preview')}</span>
                            </button>
                          </div>

                          <ModuleQuickActions
                            module={module}
                            onEdit={() => handleEdit(module)}
                            onView={() => handleView(module)}
                            onAssign={() => handleAssign(module.id)}
                            onClone={() => handleClone(module)}
                            onDelete={() => handleDelete(module)}
                            onSyncWithMaster={isMaster ? () => setSyncModalState({ open: true, module }) : undefined}
                            isMaster={isMaster}
                            hasUpdate={hasUpdate}
                            onSubmitForReview={module.status === 'draft' ? () => handleSubmitForReview(module) : undefined}
                            onApprove={module.status === 'pending_review' && canReviewModules ? () => handleApprove(module) : undefined}
                            onReject={module.status === 'pending_review' && canReviewModules ? () => handleRequestReject(module) : undefined}
                          />
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                /* COMPACT TABLE VIEW */
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-200 text-xs text-slate-500">
                        <TableHead className="w-10 px-3">
                          <Checkbox
                            checked={isAllOnPageSelected ? true : isSomeOnPageSelected ? 'indeterminate' : false}
                            onCheckedChange={handleSelectAllOnPage}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead
                          onClick={() => handleSortColumn('title')}
                          className="min-w-[240px] cursor-pointer hover:text-slate-900 transition-colors select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{t('title', 'Module')}</span>
                            {sortBy === 'title_asc' ? <ArrowUp className="h-3 w-3 text-hotel-gold" /> : sortBy === 'title_desc' ? <ArrowDown className="h-3 w-3 text-hotel-gold" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                          </div>
                        </TableHead>
                        <TableHead className="hidden md:table-cell">{t('category', 'Category')}</TableHead>
                        <TableHead>{t('filterByStatus', 'Status')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('assignedFilter', 'Assigned')}</TableHead>
                        <TableHead
                          onClick={() => handleSortColumn('duration')}
                          className="hidden lg:table-cell cursor-pointer hover:text-slate-900 transition-colors select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{t('duration', 'Duration')}</span>
                            {sortBy === 'duration_asc' ? <ArrowUp className="h-3 w-3 text-hotel-gold" /> : sortBy === 'duration_desc' ? <ArrowDown className="h-3 w-3 text-hotel-gold" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                          </div>
                        </TableHead>
                        <TableHead
                          onClick={() => handleSortColumn('updated')}
                          className="hidden xl:table-cell cursor-pointer hover:text-slate-900 transition-colors select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{t('updated', 'Modified')}</span>
                            {sortBy === 'updated_at_desc' ? <ArrowDown className="h-3 w-3 text-hotel-gold" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                          </div>
                        </TableHead>
                        <TableHead className="text-end px-4">{t('action', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedModules.map((module) => {
                        const isSelected = selectedModuleIds.has(module.id)
                        const isAssigned = assignedModuleIds.has(module.id)
                        const isMaster = Boolean(module.is_master_template || module.master_source_id)
                        const deployment = deploymentsByTargetId.get(module.id)
                        const hasUpdate = Boolean(
                          deployment?.has_update_available ||
                          (deployment && deployment.current_master_version > deployment.deployed_version)
                        )
                        return (
                          <TableRow
                            key={module.id}
                            className={cn(
                              "border-b border-slate-100 hover:bg-slate-50/80 transition-colors group",
                              isSelected && "bg-amber-50/40"
                            )}
                          >
                            <TableCell className="px-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleSelect(module.id)}
                                aria-label={`Select ${module.title}`}
                              />
                            </TableCell>

                            <TableCell className="py-3">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    onClick={() => handleOpenPreview(module.id)}
                                    className="font-semibold text-sm text-slate-900 group-hover:text-hotel-gold cursor-pointer transition-colors line-clamp-1"
                                  >
                                    {module.title || t('untitledModule', 'Untitled Module')}
                                  </span>
                                  {isMaster && (
                                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 h-4 font-semibold flex items-center gap-0.5">
                                      <Crown className="h-2.5 w-2.5 text-indigo-600" />
                                      <span>Platform Master</span>
                                    </Badge>
                                  )}
                                  {hasUpdate && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSyncModalState({ open: true, module })
                                      }}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-[9px] font-bold shadow-sm animate-pulse cursor-pointer"
                                      title="Click to view upstream master changes and synchronize"
                                    >
                                      <span>🔔</span>
                                      <span>Update Available</span>
                                    </button>
                                  )}
                                </div>
                                {module.description && (
                                  <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                    {module.description}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="hidden md:table-cell">
                              <TrainingCategoryBadge category={module.category} size="sm" />
                            </TableCell>

                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className={cn(
                                      "text-[10px] font-bold px-2 py-0.5 rounded-sm whitespace-nowrap inline-flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80",
                                      module.status === 'published'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : module.status === 'archived'
                                        ? 'bg-rose-100 text-rose-800'
                                        : module.status === 'pending_review'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-700'
                                    )}
                                  >
                                    <span>{t(module.status || 'draft')}</span>
                                    <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="text-xs">
                                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: module.id, status: 'published' })}>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 me-2" />
                                    {t('published', 'Published')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: module.id, status: 'draft' })}>
                                    <Clock className="h-3.5 w-3.5 text-slate-500 me-2" />
                                    {t('draft', 'Draft')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: module.id, status: 'archived' })}>
                                    <Archive className="h-3.5 w-3.5 text-rose-500 me-2" />
                                    {t('archived', 'Archived')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>

                            <TableCell className="hidden sm:table-cell">
                              {isAssigned ? (
                                <Badge variant="outline" className="text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200">
                                  <Check className="h-3 w-3 me-1" />
                                  {t('assigned')}
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-400">{t('unassigned', 'No')}</span>
                              )}
                            </TableCell>

                            <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>{module.estimated_duration_minutes ? `${module.estimated_duration_minutes} ${t('min')}` : `0 ${t('min')}`}</span>
                              </div>
                            </TableCell>

                            <TableCell className="hidden xl:table-cell text-xs text-slate-400">
                              {module.updated_at ? new Date(module.updated_at).toLocaleDateString() : module.created_at ? new Date(module.created_at).toLocaleDateString() : '—'}
                            </TableCell>

                            <TableCell className="text-end px-4">
                              <div className={cn("inline-flex items-center gap-1.5", isRTL ? "flex-row-reverse" : "")}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenPreview(module.id)}
                                  className="h-8 px-2 text-slate-500 hover:text-hotel-navy"
                                  title={t('quickPreview', 'Preview')}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(module)}
                                  className="h-8 px-2 text-slate-600 hover:text-hotel-gold font-medium"
                                  title={t('common:action.edit')}
                                >
                                  <Wand2 className="h-3.5 w-3.5" />
                                </Button>
                                <div className="w-[80px]">
                                  <ModuleQuickActions
                                    module={module}
                                    onEdit={() => handleEdit(module)}
                                    onView={() => handleView(module)}
                                    onAssign={() => handleAssign(module.id)}
                                    onClone={() => handleClone(module)}
                                    onDelete={() => handleDelete(module)}
                                    onSyncWithMaster={isMaster ? () => setSyncModalState({ open: true, module }) : undefined}
                                    isMaster={isMaster}
                                    hasUpdate={hasUpdate}
                                    onSubmitForReview={module.status === 'draft' ? () => handleSubmitForReview(module) : undefined}
                                    onApprove={module.status === 'pending_review' && canReviewModules ? () => handleApprove(module) : undefined}
                                    onReject={module.status === 'pending_review' && canReviewModules ? () => handleRequestReject(module) : undefined}
                                  />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-500">
                    {t('page')} <span className="font-semibold text-slate-800">{safeCurrentPage}</span> {t('of')} <span className="font-semibold text-slate-800">{totalPages}</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="h-8 px-2.5 text-xs gap-1 border-slate-200"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>{t('previous', 'Previous')}</span>
                    </Button>

                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                        .map((p, idx, arr) => {
                          const prev = arr[idx - 1]
                          const showEllipsis = prev && p - prev > 1
                          return (
                            <div key={p} className="flex items-center gap-1">
                              {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                              <Button
                                variant={p === safeCurrentPage ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setCurrentPage(p)}
                                className={cn(
                                  "h-8 w-8 p-0 text-xs",
                                  p === safeCurrentPage ? "bg-hotel-navy text-white" : "text-slate-600 hover:bg-slate-100"
                                )}
                              >
                                {p}
                              </Button>
                            </div>
                          )
                        })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="h-8 px-2.5 text-xs gap-1 border-slate-200"
                    >
                      <span>{t('next', 'Next')}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>


        <TabsContent value="builder" className="space-y-6">
          {!canManageModules ? (
            renderAccessNotice(t('goToAssignments'), () => setViewMode('assignments'))
          ) : moduleId ? (
            <TrainingBuilder />
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Sparkles className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('builderReady')}</h3>
                <p className="text-gray-500 mb-6 text-center max-w-md">{t('builderReadyDesc')}</p>
                <div className={cn("flex w-full flex-wrap gap-2 justify-center", isRTL ? "flex-row-reverse" : "")}>
                  <Button variant="outline" onClick={() => setViewMode('list')} className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}>
                    <BookOpen className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
                    {t('library')}
                  </Button>
                  <Button onClick={handleCreateWithAI} className={cn("w-full sm:w-auto bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black shadow-md border-none", isRTL ? "flex-row-reverse" : "")}>
                    <Sparkles className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
                    {t('createWithAI', 'Create with AI')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          {!canAssignTraining ? (
            renderAccessNotice(t('goToLibrary'), () => setViewMode('list'))
          ) : (
            <TrainingAssignmentsPanel
              embedded
              initialTab="assignments"
              defaultModuleId={assignModuleId}
              autoOpen={shouldOpenAssign}
              hideHeaderActions
            />
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {!canAssignTraining && !canManageModules ? (
            renderAccessNotice(t('goToLibrary'), () => setViewMode('list'))
          ) : (
            <TrainingTrackCommandCenter
              canManageModules={canManageModules}
              canAssignTraining={canAssignTraining}
              onNavigateToBuilder={(id) => setViewMode('builder', { moduleId: id })}
              onOpenAssignWizard={() => setAssignWizardOpen(true)}
            />
          )}
        </TabsContent>
      </Tabs>

      <ModuleTemplateSelector
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onTemplateSelected={(template) => {
          navigate(`/training/hub/new?template=${template.id}`)
          setShowTemplateDialog(false)
        }}
      />

      <SmartAICourseCreatorModal
        open={showSmartAIModal}
        onOpenChange={setShowSmartAIModal}
        onCourseCreated={(newModuleId) => {
          navigate(`/training/hub/${newModuleId}?view=builder`)
          setShowSmartAIModal(false)
        }}
      />

      <DeleteConfirmation
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title={t('deleteModule')}
        description={t('deleteModuleDesc')}
        itemName={moduleToDelete?.title}
      />

      <Dialog open={!!moduleToReject} onOpenChange={(open) => !open && setModuleToReject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('review.rejectDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('review.rejectDialogDesc', { title: moduleToReject?.title })}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('review.rejectReasonPlaceholder')}
            rows={4}
            className={isRTL ? 'text-right' : 'text-left'}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleToReject(null)}>
              {t('common:action.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectModuleMutation.isPending}
            >
              {rejectModuleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('review.rejectDialogConfirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignTrainingWizardModal
        open={assignWizardOpen}
        onOpenChange={setAssignWizardOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })}
      />

      <ModuleQuickPreviewSheet
        moduleId={previewModuleId}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onEdit={(id) => setViewMode('builder', { moduleId: id })}
        onView={(id) => navigate(`/learning/training/${id}`)}
        onAssign={(id) => handleAssign(id)}
      />

      {/* Upstream Master Version Sync Modal */}
      <MasterVersionSyncModal
        open={syncModalState.open}
        onOpenChange={(open) => setSyncModalState((prev) => ({ ...prev, open }))}
        targetContentId={syncModalState.module?.id || ''}
        targetTitle={syncModalState.module?.title || ''}
        contentType="course"
        onSyncComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['training-modules'] })
          refetchMasterDeployments()
        }}
      />
    </div>
  )
}

