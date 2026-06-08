import { PageHeader } from '@/components/layout/PageHeader'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'
import { ModuleAnalyticsCard } from '@/components/training/hub/ModuleAnalyticsCard'
import { ModuleCreationWizard } from '@/components/training/hub/ModuleCreationWizard'
import { ModuleQuickActions } from '@/components/training/hub/ModuleQuickActions'
import { ModuleTemplateSelector } from '@/components/training/hub/ModuleTemplateSelector'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    AlertCircle,
    BarChart3,
    BookOpen,
    Clock,
    Eye,
    FileText,
    Layers,
    Loader2,
    Plus,
    Search,
    Settings,
    Sparkles,
    TrendingUp,
    Users,
    Wand2
} from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { TrainingAssignmentsPanel } from './TrainingAssignments'
import { TrainingBuilder } from './TrainingBuilder'

// Lazy load heavy chart component
const TrainingProgressVisualization = lazy(() => import('@/components/training/TrainingProgressVisualization').then(m => ({ default: m.TrainingProgressVisualization })))

type ModuleStatus = 'draft' | 'published' | 'archived'
type ViewMode = 'list' | 'builder' | 'assignments' | 'insights'

interface TrainingModule {
  id: string
  title: string
  description?: string
  estimated_duration?: string
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  category?: string
  status: ModuleStatus
  view_count?: number
  created_by?: string
  updated_by?: string
  created_at?: string
  updated_at?: string
  completion_count?: number
  average_score?: number
  certificate_enabled?: boolean
}

export default function TrainingHub() {
  const { profile, primaryRole } = useAuth()
  const navigate = useNavigate()
  const { id: moduleId } = useParams()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const { toast } = useToast()

  const canManageModules = ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '')
  const canAssignTraining = ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'].includes(primaryRole || '')

  // View mode: 'list' | 'builder' | 'assignments' | 'insights'
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

  // State management
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [statusFilter, setStatusFilter] = useState<ModuleStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder] = useState<'asc' | 'desc'>('desc')

  const assignModuleId = searchParams.get('assignModuleId') || undefined
  const shouldOpenAssign = searchParams.get('openAssign') === '1'

  // Dialog states
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showWizardDialog, setShowWizardDialog] = useState(false)

  // Delete states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [moduleToDelete, setModuleToDelete] = useState<TrainingModule | null>(null)


  // Data fetching
  const { data: modules, isLoading } = useQuery({
    queryKey: ['training-modules', statusFilter, categoryFilter, debouncedSearch, sortBy, sortOrder],
    queryFn: async () => {
      let query = supabase
        .from('training_modules')
        .select('*')
        .not('is_deleted', 'is', true)
        .order(sortBy, { ascending: sortOrder === 'asc' })

      // Status and category filters removed as those columns do not exist in the current schema

      if (debouncedSearch) {
        query = query.ilike('title', `%${debouncedSearch}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as TrainingModule[]
    },
    enabled: canManageModules
  })

  const { data: assignmentLinks } = useQuery({
    queryKey: ['learning-assignments-module-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_assignments')
        .select('content_id')
        .eq('content_type', 'module')
        .or('is_deleted.is.null,is_deleted.eq.false')
      if (error) throw error
      return data || []
    },
    enabled: canManageModules
  })

  const assignedModuleIds = useMemo(() => {
    return new Set((assignmentLinks || []).map((a) => a.content_id))
  }, [assignmentLinks])

  // Analytics data
  const { data: analytics } = useQuery({
    queryKey: ['training-analytics'],
    queryFn: async () => {
      const { data: modules, error: modulesError } = await supabase
        .from('training_modules')
        .select('id')
        .eq('is_deleted', false)

      if (modulesError) {
        console.error('Error fetching training modules:', modulesError)
      }

      const { data: progress, error: progressError } = await supabase
        .from('training_progress')
        .select('status, quiz_score')

      if (progressError) {
        console.error('Error fetching training progress:', progressError)
      }

      const total = modules?.length || 0
      const published = modules?.length || 0
      const draft = 0
      const completed = progress?.filter(p => p.status === 'completed').length || 0
      const inProgress = progress?.filter(p => p.status === 'in_progress').length || 0
      const scoresWithValues = progress?.filter(p => p.quiz_score != null) || []
      const avgScore = scoresWithValues.length > 0
        ? scoresWithValues.reduce((acc, p) => acc + (p.quiz_score || 0), 0) / scoresWithValues.length
        : 0

      return {
        total,
        published,
        draft,
        completed,
        inProgress,
        avgScore: Math.round(avgScore)
      }
    },
    enabled: canAssignTraining || canManageModules
  })

  // Categories
  const { data: categories } = useQuery({
    queryKey: ['training-categories'],
    queryFn: async () => {
      return []
    },
    enabled: canManageModules
  })

  // Mutations
  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_modules')
        .update({ is_deleted: true })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      toast({
        title: t('moduleDeleted'),
        description: t('moduleDeletedDesc')
      })
    }
  })

  // Event handlers
  const handleStartFromScratch = () => {
    setViewMode('builder', { moduleId: 'new' })
  }

  const handleCreateFromTemplate = () => {
    setShowTemplateDialog(true)
  }

  const handleCreateWithWizard = () => {
    setShowWizardDialog(true)
  }

  const handleEdit = (module: TrainingModule) => {
    navigate(`/training/hub/${module.id}?view=builder`)
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
      const { data: cloned, error } = await supabase
        .from('training_modules')
        .insert({
          title: `${module.title} (Copy)`,
          description: module.description,
          estimated_duration_minutes: module.estimated_duration ? parseInt(module.estimated_duration) : null,
          created_by: profile?.id
        })
        .select()
        .single()

      if (error) throw error

      // Clone content blocks if they exist
      const { data: contentBlocks } = await supabase
        .from('training_content_blocks')
        .select('*')
        .eq('training_module_id', module.id)

      if (contentBlocks && contentBlocks.length > 0) {
        await supabase
          .from('training_content_blocks')
          .insert(
            contentBlocks.map(block => ({
              ...block,
              id: undefined,
              training_module_id: cloned.id,
              created_at: undefined,
              updated_at: undefined
            }))
          )
      }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-blue-100 text-blue-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
  ].filter(step => step.visible)

  const headerActions = (() => {
    if (viewMode === 'list') {
      if (!canManageModules) return null
      return (
        <div className={cn("flex w-full flex-wrap items-center gap-2 sm:w-auto", isRTL ? "flex-row-reverse" : "")}>
          <Button
            variant="outline"
            onClick={() => setViewMode('insights')}
            className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}
          >
            <BarChart3 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('track')}
          </Button>
          <Button
            variant="outline"
            onClick={handleCreateWithWizard}
            className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}
          >
            <Wand2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('createWithWizard')}
          </Button>
          <Button
            variant="outline"
            onClick={handleCreateFromTemplate}
            className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}
          >
            <Layers className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('createFromTemplate')}
          </Button>
          <Button onClick={handleStartFromScratch} className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}>
            <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('startFromScratch', 'Start from Scratch')}
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
            <Settings className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('autoAssignRules')}
          </Button>
          <Button
            onClick={() => setViewMode('assignments', { openAssign: true, assignModuleId })}
            className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}
          >
            <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
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
            <BookOpen className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('library')}
          </Button>
          {moduleId && moduleId !== 'new' && (
            <Button
              onClick={() => handleAssign(moduleId)}
              className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}
            >
              <Users className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
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
            <Users className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
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

      {/* Main Content */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">

        <TabsContent value="list" className="space-y-6">
          {!canManageModules ? (
            renderAccessNotice(t('goToAssignments'), () => setViewMode('assignments'))
          ) : (
            <>
              {/* Filters Bar */}
              <div className="p-3 sm:p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
                <div className="flex flex-wrap gap-3 sm:gap-4 w-full md:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <Search className={cn("absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-hotel-muted", isRTL ? "right-3" : "left-3")} />
                    <Input
                      type="text"
                      placeholder={t('search')}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={cn(isRTL ? "pr-10 text-right" : "pl-10", "w-full md:w-64 border-gray-200 bg-gray-50/50 focus:border-hotel-gold focus:ring-hotel-gold transition-all")}
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className={cn("w-full sm:w-[160px] border-gray-200 bg-gray-50/50", isRTL ? "flex-row-reverse" : "")}>
                      <SelectValue placeholder={t('category')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className={isRTL ? "flex-row-reverse" : ""}>{t('allCategories')}</SelectItem>
                      {categories?.map(cat => (
                        <SelectItem key={cat} value={cat} className={isRTL ? "flex-row-reverse" : ""}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(value: ModuleStatus | 'all') => setStatusFilter(value)}>
                    <SelectTrigger className={cn("w-full sm:w-[140px] border-gray-200 bg-gray-50/50", isRTL ? "flex-row-reverse" : "")}>
                      <SelectValue placeholder={t('status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className={isRTL ? "flex-row-reverse" : ""}>{t('allModules')}</SelectItem>
                      <SelectItem value="published" className={isRTL ? "flex-row-reverse" : ""}>{t('published')}</SelectItem>
                      <SelectItem value="draft" className={isRTL ? "flex-row-reverse" : ""}>{t('draft')}</SelectItem>
                      <SelectItem value="archived" className={isRTL ? "flex-row-reverse" : ""}>{t('archived')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={cn("flex items-center gap-2 w-full md:w-auto justify-between md:justify-end", isRTL ? "flex-row-reverse" : "")}>
                  <span className={cn("text-sm text-muted-foreground hidden md:inline-block", isRTL ? "ml-2" : "mr-2")}>{t('sortBy')}</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className={cn("w-full sm:w-[160px] border-gray-200 bg-gray-50/50", isRTL ? "flex-row-reverse" : "")}>
                      <SelectValue placeholder={t('sortBy')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at" className={isRTL ? "flex-row-reverse" : ""}>{t('created')}</SelectItem>
                      <SelectItem value="updated_at" className={isRTL ? "flex-row-reverse" : ""}>{t('updated')}</SelectItem>
                      <SelectItem value="title" className={isRTL ? "flex-row-reverse" : ""}>{t('title')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Modules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {isLoading ? (
                  <div className="col-span-full flex justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-hotel-gold" />
                  </div>
                ) : modules && modules.length > 0 ? (
                  modules.map((module) => (
                    <Card key={module.id} className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-gray-100 overflow-hidden bg-white/50 backdrop-blur-sm">
                      <div className={`h-2 w-full ${module.status === 'published' ? 'bg-hotel-navy' : module.status === 'draft' ? 'bg-gray-300' : 'bg-red-400'}`} />
                      <CardHeader className="pb-3 pt-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <CardTitle className="text-xl font-medium font-serif text-hotel-navy line-clamp-1 group-hover:text-hotel-gold transition-colors">
                              {module.title}
                            </CardTitle>
                            <p className={cn("text-sm text-gray-500 line-clamp-2 min-h-[40px]", isRTL ? "text-right" : "text-left")}>
                              {module.description || t('noDescription')}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="secondary" className={cn("rounded-sm font-normal", getStatusColor(module.status || 'draft'))}>
                            {t(module.status)}
                          </Badge>
                          {assignedModuleIds.has(module.id) && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-normal">
                              {t('assigned')}
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn("rounded-sm font-normal", getDifficultyColor(module.difficulty_level || 'beginner'))}>
                            {t(module.difficulty_level || 'beginner')}
                          </Badge>
                          {module.category && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-normal">
                              {module.category}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-6 px-1">
                          <div className="flex items-center gap-4">
                            <div className={cn("flex items-center gap-1.5", isRTL ? "flex-row-reverse" : "")} title={t('estimatedDuration')}>
                              <Clock className="h-3.5 w-3.5" />
                              <span>{module.estimated_duration || `0 ${t('min')}`}</span>
                            </div>
                            <div className={cn("flex items-center gap-1.5", isRTL ? "flex-row-reverse" : "")} title={t('totalViews')}>
                              <Eye className="h-3.5 w-3.5" />
                              <span>{module.view_count || 0}</span>
                            </div>
                          </div>
                        </div>

                        <ModuleQuickActions
                          module={module}
                          onEdit={() => handleEdit(module)}
                          onView={() => handleView(module)}
                          onAssign={() => handleAssign(module.id)}
                          onClone={() => handleClone(module)}
                          onDelete={() => handleDelete(module)}
                        />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full">
                    <Card className="border-dashed border-2">
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileText className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('noModules')}</h3>
                        <p className="text-gray-500 mb-6 text-center max-w-md">{t('noModulesDesc')}</p>
                        <div className={cn("flex w-full flex-wrap gap-2 justify-center", isRTL ? "flex-row-reverse" : "")}>
                          <Button variant="outline" onClick={handleCreateWithWizard} className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}>
                            <Wand2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                            {t('createWithWizard')}
                          </Button>
                          <Button onClick={handleStartFromScratch} className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}>
                            <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                            {t('startFromScratch', 'Start from Scratch')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
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
                    <BookOpen className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                    {t('library')}
                  </Button>
                  <Button onClick={handleCreateWithWizard} className={cn("w-full sm:w-auto", isRTL ? "flex-row-reverse" : "")}>
                    <Wand2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                    {t('createWithWizard')}
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
            <>
              {analytics && <ModuleAnalyticsCard analytics={analytics} />}

              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-hotel-navy">{t('visualization.title')}</h3>
                </div>
                <Suspense fallback={<div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-muted-foreground">{t('loadingCharts')}</div>}>
                  <TrainingProgressVisualization />
                </Suspense>
              </div>

              <TrainingAssignmentsPanel
                embedded
                initialTab="overview"
                hideCreateButton
                hideHeaderActions
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ModuleTemplateSelector
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onTemplateSelected={(template) => {
          // Navigate to builder with template
          navigate(`/training/hub/new?template=${template.id}`)
          setShowTemplateDialog(false)
        }}
      />

      <ModuleCreationWizard
        open={showWizardDialog}
        onOpenChange={setShowWizardDialog}
        onComplete={(moduleId) => {
          navigate(`/training/hub/${moduleId}?view=builder`)
          setShowWizardDialog(false)
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
    </div>
  )
}

