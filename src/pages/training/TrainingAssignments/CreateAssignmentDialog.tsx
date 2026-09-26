import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/hooks/useAuth'
import {
  trainingAssignmentEngineService,
  type AssignmentScopeType
} from '@/services/trainingAssignmentEngineService'
import type { TrainingModule } from '@/lib/types'
import {
  Building2,
  Briefcase,
  Users,
  UserCheck,
  ShieldAlert,
  Calendar,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  GraduationCap,
  Loader2,
  Lock,
  ArrowRight,
} from 'lucide-react'
import { addDays, format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface AssignmentCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modules?: TrainingModule[]
  preselectedModuleId?: string | null
  onSuccess?: () => void
}

export function AssignmentCreateDialog({
  open,
  onOpenChange,
  modules = [],
  preselectedModuleId,
  onSuccess,
}: AssignmentCreateDialogProps) {
  const { t, i18n } = useTranslation(['training', 'admin', 'common'])
  const isRTL = i18n.dir() === 'rtl'
  const { toast } = useToast()
  const { currentOrganization, availableBrands } = useTenant()
  const { user } = useAuth()

  // Form State
  const [selectedModuleId, setSelectedModuleId] = useState<string>(preselectedModuleId || '')
  const [scopeType, setScopeType] = useState<AssignmentScopeType>('department')
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  
  // Individual Learners state
  const [learnerSearch, setLearnerSearch] = useState<string>('')
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>([])
  
  // Assignment details
  const [dueDatePreset, setDueDatePreset] = useState<'7d' | '14d' | '30d' | 'custom'>('14d')
  const [customDueDate, setCustomDueDate] = useState<string>(
    format(addDays(new Date(), 14), 'yyyy-MM-dd')
  )
  const [priority, setPriority] = useState<'normal' | 'high' | 'compliance'>('normal')
  const [instructions, setInstructions] = useState<string>('')
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState<boolean>(true)
  const [notifyOnDue, setNotifyOnDue] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)

  // 1. Fetch Caller Authority & Allowed Scopes
  const { data: callerScopes, isLoading: isLoadingScopes } = useQuery({
    queryKey: ['caller-assignment-scopes', currentOrganization?.id],
    queryFn: () => trainingAssignmentEngineService.getCallerAssignmentScopes(currentOrganization?.id),
    enabled: open && !!currentOrganization?.id,
    staleTime: 1000 * 60 * 5,
  })

  // 2. Departments of the organization
  const { data: departments = [] } = useQuery({
    queryKey: ['scoped-departments', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return []
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name')
      if (error) return []
      return data || []
    },
    enabled: open && !!currentOrganization?.id,
  })

  // Auto-align default scope based on caller authority
  useEffect(() => {
    if (callerScopes) {
      if (callerScopes.is_platform_admin || callerScopes.can_assign_org) {
        setScopeType('organization')
      } else if (callerScopes.can_assign_brand) {
        setScopeType('brand')
        if (callerScopes.authorized_brand_ids && callerScopes.authorized_brand_ids.length > 0) {
          setSelectedBrandId(callerScopes.authorized_brand_ids[0])
        }
      } else if (callerScopes.can_assign_dept) {
        setScopeType('department')
        if (callerScopes.primary_department_id) {
          setSelectedDepartmentId(callerScopes.primary_department_id)
        }
      }
    }
  }, [callerScopes])

  useEffect(() => {
    if (preselectedModuleId) {
      setSelectedModuleId(preselectedModuleId)
    } else if (modules.length > 0 && !selectedModuleId) {
      setSelectedModuleId(modules[0].id)
    }
  }, [preselectedModuleId, modules])

  // Compute effective due date
  const effectiveDueDate = useMemo(() => {
    if (dueDatePreset === '7d') return addDays(new Date(), 7).toISOString()
    if (dueDatePreset === '14d') return addDays(new Date(), 14).toISOString()
    if (dueDatePreset === '30d') return addDays(new Date(), 30).toISOString()
    return customDueDate ? new Date(customDueDate).toISOString() : addDays(new Date(), 14).toISOString()
  }, [dueDatePreset, customDueDate])

  // 3. Live Server-Side Recipient Count Calculation
  const { data: recipientSummary, isFetching: isFetchingCount } = useQuery({
    queryKey: [
      'assignable-recipients-count',
      currentOrganization?.id,
      scopeType,
      selectedBrandId,
      selectedDepartmentId,
      selectedRole,
      selectedLearnerIds,
    ],
    queryFn: () =>
      trainingAssignmentEngineService.getAssignableRecipientsCount({
        organizationId: currentOrganization?.id || '',
        scopeType,
        brandId: selectedBrandId !== 'all' ? selectedBrandId : null,
        departmentId: selectedDepartmentId !== 'all' ? selectedDepartmentId : null,
        role: selectedRole !== 'all' ? selectedRole : null,
        individualUserIds: scopeType === 'individual' ? selectedLearnerIds : null,
      }),
    enabled: open && !!currentOrganization?.id,
  })

  // 4. Fetch Individual Learners (when scope is 'individual')
  const { data: assignableLearners = [], isFetching: isFetchingLearners } = useQuery({
    queryKey: [
      'assignable-learners',
      currentOrganization?.id,
      selectedBrandId,
      selectedDepartmentId,
      selectedRole,
      learnerSearch,
    ],
    queryFn: () =>
      trainingAssignmentEngineService.getAssignableLearners({
        organizationId: currentOrganization?.id || '',
        brandId: selectedBrandId !== 'all' ? selectedBrandId : null,
        departmentId: selectedDepartmentId !== 'all' ? selectedDepartmentId : null,
        role: selectedRole !== 'all' ? selectedRole : null,
        search: learnerSearch,
        limit: 100,
      }),
    enabled: open && !!currentOrganization?.id && scopeType === 'individual',
  })

  const selectedModule = modules.find((m) => m.id === selectedModuleId)
  const recipientCount = recipientSummary?.recipient_count || 0
  const isHighRiskBroadAssignment = (scopeType === 'organization' || recipientCount > 30)

  // Toggle individual learner selection
  const toggleLearnerSelection = (learnerId: string) => {
    setSelectedLearnerIds((prev) =>
      prev.includes(learnerId) ? prev.filter((id) => id !== learnerId) : [...prev, learnerId]
    )
  }

  const selectAllVisibleLearners = () => {
    const allIds = assignableLearners.map((l) => l.id)
    setSelectedLearnerIds((prev) => Array.from(new Set([...prev, ...allIds])))
  }

  const deselectAllLearners = () => {
    setSelectedLearnerIds([])
  }

  // Handle final submission
  const handleExecuteAssignment = async () => {
    if (!currentOrganization?.id) {
      toast({ title: 'Error', description: 'No active organization selected', variant: 'destructive' })
      return
    }
    if (!selectedModuleId) {
      toast({ title: 'Error', description: 'Please select a training course', variant: 'destructive' })
      return
    }
    if (recipientCount === 0) {
      toast({ title: 'No Recipients', description: 'Selected scope contains 0 eligible active learners.', variant: 'destructive' })
      return
    }
    if (scopeType === 'individual' && selectedLearnerIds.length === 0) {
      toast({ title: 'Select Learners', description: 'Please choose at least one learner for individual assignment.', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await trainingAssignmentEngineService.createScopedAssignment({
        courseId: selectedModuleId,
        scopeType,
        organizationId: currentOrganization.id,
        brandId: selectedBrandId !== 'all' ? selectedBrandId : null,
        departmentId: selectedDepartmentId !== 'all' ? selectedDepartmentId : null,
        targetRole: selectedRole !== 'all' ? selectedRole : null,
        targetUserIds: scopeType === 'individual' ? selectedLearnerIds : null,
        dueDate: effectiveDueDate,
        priority,
        instructions: instructions.trim() || null,
        requiresAcknowledgement,
        notifyOnDue,
      })

      toast({
        title: '🎯 Training Assigned Successfully',
        description: `Enrolled ${result.recipient_count} learners in "${selectedModule?.title || 'Course'}" with due date ${format(new Date(effectiveDueDate), 'dd MMM yyyy')}.`,
      })

      setShowConfirmModal(false)
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      console.error('Assignment execution error:', err)
      toast({
        title: 'Assignment Failed',
        description: err?.message || 'Unauthorized or failed to create assignment rule.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border shadow-2xl bg-card">
          {/* Header Banner */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-ds-warning" />
                  <span>{t('training:assignTraining', 'Assign Training Course')}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {t(
                    'training:scopedAssignmentDesc',
                    'Assign a course to the whole organization, a brand, a department, a role or chosen people.'
                  )}
                </DialogDescription>
              </div>

              {/* Caller Scope Badge */}
              <div className="hidden sm:flex flex-col items-end">
                <Badge variant="outline" className="bg-ds-warning-soft text-ds-warning border-ds-warning/30 text-[11px] font-semibold">
                  <ShieldAlert className="h-3 w-3 me-1" />
                  {callerScopes?.is_platform_admin
                    ? 'Platform Global Operator'
                    : callerScopes?.can_assign_org
                    ? `Org Admin: ${currentOrganization?.name}`
                    : 'Department Manager'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Step 1: Course Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-ds-ink flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-ds-warning" />
                <span>{t('training:selectCourse', 'Select Training Course')}</span>
                <span className="text-ds-warning font-bold">*</span>
              </Label>

              <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                <SelectTrigger className="w-full text-sm font-medium bg-background border-ds-border">
                  <SelectValue placeholder="Choose a published training module..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {modules.map((mod) => (
                    <SelectItem key={mod.id} value={mod.id} className="text-xs py-2">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span className="font-semibold text-ds-ink dark:text-white truncate">{mod.title}</span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {mod.estimated_duration_minutes || 30} mins • Pass: {mod.passing_score_percentage || 80}%
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Step 2: Organizational Scope Level */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-ds-ink flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-ds-warning" />
                  <span>{t('training:assignmentScope', 'Assignment Scope Level')}</span>
                  <span className="text-ds-warning font-bold">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Determines how recipient population is evaluated
                </span>
              </div>

              {/* Scope Options Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {/* Organization-wide */}
                <button
                  type="button"
                  disabled={!callerScopes?.is_platform_admin && !callerScopes?.can_assign_org}
                  onClick={() => setScopeType('organization')}
                  className={`p-3 rounded-xl border text-start transition-all flex flex-col gap-1 ${
 scopeType === 'organization'
 ? 'border-ds-warning/30 bg-ds-warning-soft ring-1 ring-ds-warning/30'
 : 'border-ds-border hover:border-ds-border bg-card'
 } ${!callerScopes?.is_platform_admin && !callerScopes?.can_assign_org ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <Building2 className={`h-4 w-4 ${scopeType === 'organization' ? 'text-ds-warning' : 'text-ds-muted'}`} />
                    {(!callerScopes?.is_platform_admin && !callerScopes?.can_assign_org) && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-bold mt-1">Entire Organization</span>
                  <span className="text-[10px] text-muted-foreground">Everyone in the organization</span>
                </button>

                {/* Brand-wide */}
                <button
                  type="button"
                  disabled={!callerScopes?.is_platform_admin && !callerScopes?.can_assign_org && !callerScopes?.can_assign_brand}
                  onClick={() => setScopeType('brand')}
                  className={`p-3 rounded-xl border text-start transition-all flex flex-col gap-1 ${
 scopeType === 'brand'
 ? 'border-ds-warning/30 bg-ds-warning-soft ring-1 ring-ds-warning/30'
 : 'border-ds-border hover:border-ds-border bg-card'
 } ${!callerScopes?.is_platform_admin && !callerScopes?.can_assign_org && !callerScopes?.can_assign_brand ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <Sparkles className={`h-4 w-4 ${scopeType === 'brand' ? 'text-ds-warning' : 'text-ds-muted'}`} />
                    {(!callerScopes?.is_platform_admin && !callerScopes?.can_assign_org && !callerScopes?.can_assign_brand) && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-bold mt-1">Brand Portfolio</span>
                  <span className="text-[10px] text-muted-foreground">Everyone in one brand</span>
                </button>

                {/* Department */}
                <button
                  type="button"
                  onClick={() => setScopeType('department')}
                  className={`p-3 rounded-xl border text-start transition-all flex flex-col gap-1 ${
 scopeType === 'department'
 ? 'border-ds-warning/30 bg-ds-warning-soft ring-1 ring-ds-warning/30'
 : 'border-ds-border hover:border-ds-border bg-card'
 } cursor-pointer`}
                >
                  <div className="flex items-center justify-between">
                    <Briefcase className={`h-4 w-4 ${scopeType === 'department' ? 'text-ds-warning' : 'text-ds-muted'}`} />
                  </div>
                  <span className="text-xs font-bold mt-1">Department</span>
                  <span className="text-[10px] text-muted-foreground">Front Office, F&B, etc.</span>
                </button>

                {/* Role / Job Title */}
                <button
                  type="button"
                  onClick={() => setScopeType('role')}
                  className={`p-3 rounded-xl border text-start transition-all flex flex-col gap-1 ${
 scopeType === 'role'
 ? 'border-ds-warning/30 bg-ds-warning-soft ring-1 ring-ds-warning/30'
 : 'border-ds-border hover:border-ds-border bg-card'
 } cursor-pointer`}
                >
                  <div className="flex items-center justify-between">
                    <Users className={`h-4 w-4 ${scopeType === 'role' ? 'text-ds-warning' : 'text-ds-muted'}`} />
                  </div>
                  <span className="text-xs font-bold mt-1">Target Role</span>
                  <span className="text-[10px] text-muted-foreground">By job rank & role</span>
                </button>

                {/* Individual Learners */}
                <button
                  type="button"
                  onClick={() => setScopeType('individual')}
                  className={`p-3 rounded-xl border text-start transition-all flex flex-col gap-1 ${
 scopeType === 'individual'
 ? 'border-ds-warning/30 bg-ds-warning-soft ring-1 ring-ds-warning/30'
 : 'border-ds-border hover:border-ds-border bg-card'
 } cursor-pointer`}
                >
                  <div className="flex items-center justify-between">
                    <UserCheck className={`h-4 w-4 ${scopeType === 'individual' ? 'text-ds-warning' : 'text-ds-muted'}`} />
                  </div>
                  <span className="text-xs font-bold mt-1">Individual Learners</span>
                  <span className="text-[10px] text-muted-foreground">Pick specific people</span>
                </button>
              </div>
            </div>

            {/* Step 3: Hierarchical Cascading Filter Controls */}
            <div className="p-4 rounded-2xl bg-ds-surface-subtle border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ds-ink">
                  Target Hierarchy & Filter Parameters
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Hierarchically scoped to your permissions
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Brand Filter */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-ds-muted">Brand</Label>
                  <Select
                    value={selectedBrandId}
                    onValueChange={setSelectedBrandId}
                    disabled={!callerScopes?.is_platform_admin && !callerScopes?.can_assign_org}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands ({availableBrands.length})</SelectItem>
                      {availableBrands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Filter */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-ds-muted">Department</Label>
                  <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Filter */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-ds-muted">Role / Job Title</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff & Roles</SelectItem>
                      <SelectItem value="learner">Frontline Associates</SelectItem>
                      <SelectItem value="department_manager">Department Supervisors & Managers</SelectItem>
                      <SelectItem value="instructor">Trainers & Instructors</SelectItem>
                      <SelectItem value="organization_admin">Organization Administrators</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Individual Learner Picker (if scope is 'individual') */}
              {scopeType === 'individual' && (
                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search authorized learners by name, email, or job title..."
                        value={learnerSearch}
                        onChange={(e) => setLearnerSearch(e.target.value)}
                        className="h-8 text-xs w-64 bg-background"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={selectAllVisibleLearners} className="h-7 text-[11px]">
                        Select All Visible
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deselectAllLearners} className="h-7 text-[11px]">
                        Clear
                      </Button>
                      <Badge variant="secondary" className="text-[11px] font-bold">
                        {selectedLearnerIds.length} Selected
                      </Badge>
                    </div>
                  </div>

                  <ScrollArea className="h-44 rounded-xl border bg-background p-2">
                    {isFetchingLearners ? (
                      <div className="flex items-center justify-center h-32 gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Searching scoped learners...</span>
                      </div>
                    ) : assignableLearners.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-xs text-muted-foreground">
                        <Users className="h-6 w-6 mb-1 opacity-40" />
                        <span>No eligible learners found matching scope and search.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {assignableLearners.map((learner) => {
                          const isSelected = selectedLearnerIds.includes(learner.id)
                          return (
                            <div
                              key={learner.id}
                              onClick={() => toggleLearnerSelection(learner.id)}
                              className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
 isSelected
 ? 'bg-ds-warning-soft border-ds-warning/30 text-ds-warning '
 : 'hover:bg-accent/40 border-ds-border '
 }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Checkbox checked={isSelected} onCheckedChange={() => toggleLearnerSelection(learner.id)} />
                                <div className="truncate">
                                  <div className="font-semibold truncate">{learner.full_name}</div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {learner.department_name || 'No department'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Recipient Footprint Summary Pill */}
            <div className="p-3.5 rounded-2xl bg-ds-warning-soft border border-ds-warning/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-ds-warning-soft flex items-center justify-center text-ds-warning shrink-0">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-ds-ink dark:text-white flex items-center gap-2">
                    <span>
                      {isFetchingCount ? 'Calculating population...' : `${recipientCount} Eligible Learners`}
                    </span>
                    {recipientCount > 0 && (
                      <Badge variant="outline" className="bg-ds-success-soft text-ds-success border-ds-success/30 text-[10px]">
                        <CheckCircle2 className="h-2.5 w-2.5 me-1" /> Ready
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Across {recipientSummary?.dept_count || 1} department(s)
                  </div>
                </div>
              </div>

              {isHighRiskBroadAssignment && (
                <Badge variant="outline" className="bg-ds-warning-soft text-ds-warning border-ds-warning/30 text-[10px] self-start sm:self-center">
                  <AlertTriangle className="h-3 w-3 me-1 text-ds-warning" />
                  Broad High-Volume Scope
                </Badge>
              )}
            </div>

            {/* Step 4: Assignment Rules & Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Due Date Presets */}
              <div className="space-y-2">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-ds-warning" />
                  <span>Completion Deadline</span>
                </Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['7d', '14d', '30d', 'custom'] as const).map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={dueDatePreset === preset ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDueDatePreset(preset)}
                      className={`h-8 text-xs font-semibold ${dueDatePreset === preset ? 'bg-ds-warning hover:bg-ds-warning text-white' : ''}`}
                    >
                      {preset === '7d' ? '7 Days' : preset === '14d' ? '14 Days' : preset === '30d' ? '30 Days' : 'Custom'}
                    </Button>
                  ))}
                </div>
                {dueDatePreset === 'custom' && (
                  <Input
                    type="date"
                    value={customDueDate}
                    onChange={(e) => setCustomDueDate(e.target.value)}
                    className="h-8 text-xs mt-2"
                  />
                )}
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-ds-warning" />
                  <span>Priority & Compliance Level</span>
                </Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Standard Training</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="compliance">Mandatory Regulatory Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Instructions for Learners (Optional)</Label>
              <Textarea
                placeholder="e.g., Please complete this Front Office SOP module prior to the upcoming audit..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl border">
                <div>
                  <div className="font-semibold">Requires Learner Acknowledgment</div>
                  <div className="text-[10px] text-muted-foreground">Learner must accept SOP terms</div>
                </div>
                <Switch checked={requiresAcknowledgement} onCheckedChange={setRequiresAcknowledgement} />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl border">
                <div>
                  <div className="font-semibold">Automated Due Reminders</div>
                  <div className="text-[10px] text-muted-foreground">Notify 7d, 3d, 1d before due date</div>
                </div>
                <Switch checked={notifyOnDue} onCheckedChange={setNotifyOnDue} />
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/30 border-t flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common:cancel', 'Cancel')}
            </Button>

            <Button
              size="sm"
              onClick={() => {
                if (isHighRiskBroadAssignment) {
                  setShowConfirmModal(true)
                } else {
                  handleExecuteAssignment()
                }
              }}
              disabled={isSubmitting || !selectedModuleId || recipientCount === 0}
              className="bg-ds-warning hover:bg-ds-warning text-white font-bold px-5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <span>Assign to {recipientCount} Learners</span>
                  <ArrowRight className="h-4 w-4 ms-1.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Broad / High-Risk Assignments */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ds-warning">
              <AlertTriangle className="h-5 w-5" />
              <span>Confirm Broad Training Assignment</span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-2">
              You are about to assign <strong>{selectedModule?.title}</strong> to{' '}
              <strong>{recipientCount} learners</strong> in{' '}
              <strong>{currentOrganization?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-ds-surface-subtle border text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Course:</span>
              <span className="font-semibold truncate max-w-[200px]">{selectedModule?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scope:</span>
              <span className="font-semibold capitalize">{scopeType} level</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipients:</span>
              <span className="font-bold text-ds-warning">{recipientCount} Active Staff</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date:</span>
              <span className="font-semibold">{format(new Date(effectiveDueDate), 'dd MMM yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Priority:</span>
              <span className="font-semibold capitalize">{priority}</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfirmModal(false)} disabled={isSubmitting}>
              Back to Edit
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteAssignment}
              disabled={isSubmitting}
              className="bg-ds-warning hover:bg-ds-warning text-white font-bold"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              Confirm & Dispatch Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
