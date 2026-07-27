import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import {
  useCapexExpenditures,
  useCapexMilestones,
  useCapexProjects,
  useCapexProjectTemplates,
  useCreateCapexExpenditure,
  useCreateCapexMilestone,
  useCreateCapexProject,
  useCreatePreOpeningChecklistItem,
  usePreOpeningChecklistItems,
  useSeedChecklistFromTemplate,
  useUpdateCapexMilestoneStatus,
  useUpdateCapexProjectStatus,
  useUpdatePreOpeningChecklistItemStatus,
} from '@/hooks/useCapexProjects'
import { isConsolidatedPropertyId, isRealPropertyId } from '@/lib/propertyScope'
import { cn } from '@/lib/utils'
import type {
  CapexCategory,
  CapexPriority,
  CapexProject,
  PreOpeningPhase,
} from '@/types/capex'
import { format as formatDate } from 'date-fns'
import {
  Building2,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  DollarSign,
  HardHat,
  Layers,
  Plus,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const categoryOptions: { value: CapexCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'pre_opening', label: 'Pre-Opening' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'it_infrastructure', label: 'IT Infrastructure' },
  { value: 'facility_expansion', label: 'Facility Expansion' },
  { value: 'sustainability', label: 'Sustainability' },
]

const phaseOptions: { value: PreOpeningPhase; label: string }[] = [
  { value: 'brand_standards', label: 'Brand Standards' },
  { value: 'legal', label: 'Legal & Permits' },
  { value: 'hr_staffing', label: 'HR & Staffing' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'it_pms', label: 'IT / PMS' },
  { value: 'rooms', label: 'Rooms' },
  { value: 'fnb', label: 'F&B' },
  { value: 'sales_marketing', label: 'Sales & Marketing' },
  { value: 'finance', label: 'Finance' },
  { value: 'handover', label: 'Handover' },
]

const projectStatusFlow: Partial<Record<CapexProject['status'], CapexProject['status']>> = {
  planning: 'approved',
  approved: 'in_progress',
  in_progress: 'completed',
  on_hold: 'in_progress',
}

const formatCurrency = (value: number) =>
  `SAR ${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

const formatDateOrDash = (value: string | null | undefined) =>
  value ? formatDate(new Date(value), 'MMM dd, yyyy') : '-'

const labelFor = <T extends string>(items: { value: T; label: string }[], value: T) =>
  items.find((item) => item.value === value)?.label || value.replace(/_/g, ' ')

function ProjectStatusBadge({ status }: { status: CapexProject['status'] }) {
  const styles: Record<CapexProject['status'], string> = {
    planning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    in_progress: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
    on_hold: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  }

  return <Badge className={styles[status]}>{status.replace(/_/g, ' ')}</Badge>
}

function PriorityBadge({ priority }: { priority: CapexPriority }) {
  const styles: Record<CapexPriority, string> = {
    low: 'border-blue-200 text-blue-700',
    medium: 'border-gray-200 text-gray-700',
    high: 'border-orange-200 text-orange-700',
    urgent: 'border-red-200 text-red-700',
  }

  return <Badge variant="outline" className={styles[priority]}>{priority}</Badge>
}

export default function CapexProjectsDashboard() {
  const { t } = useTranslation('capex')
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentProperty } = useProperty()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false)

  const { data: projects = [], isLoading } = useCapexProjects(selectedCategory)
  const { data: templates = [] } = useCapexProjectTemplates()
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId]
  )
  const { data: milestones = [] } = useCapexMilestones(selectedProject?.id ?? null)
  const { data: expenditures = [] } = useCapexExpenditures(selectedProject?.id ?? null)
  const { data: checklistItems = [] } = usePreOpeningChecklistItems(selectedProject?.id ?? null)

  const createProject = useCreateCapexProject()
  const updateProjectStatus = useUpdateCapexProjectStatus()
  const createMilestone = useCreateCapexMilestone()
  const updateMilestoneStatus = useUpdateCapexMilestoneStatus()
  const createExpenditure = useCreateCapexExpenditure()
  const createChecklistItem = useCreatePreOpeningChecklistItem()
  const updateChecklistStatus = useUpdatePreOpeningChecklistItemStatus()
  const seedChecklist = useSeedChecklistFromTemplate()

  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    category: 'pre_opening' as CapexCategory,
    priority: 'medium' as CapexPriority,
    allocated_budget: '',
    target_completion_date: '',
    template_id: '',
  })
  const [milestoneForm, setMilestoneForm] = useState({ title: '', due_date: '' })
  const [expenseForm, setExpenseForm] = useState({ amount: '', vendor_name: '', invoice_number: '', expense_date: '', notes: '' })
  const [checklistForm, setChecklistForm] = useState({
    phase: 'handover' as PreOpeningPhase,
    title: '',
    due_date: '',
    priority: 'medium' as CapexPriority,
  })

  const metrics = useMemo(() => {
    const totalAllocated = projects.reduce((acc, project) => acc + Number(project.allocated_budget || 0), 0)
    const totalSpent = projects.reduce((acc, project) => acc + Number(project.spent_amount || 0), 0)
    const preOpeningCount = projects.filter((project) => project.category === 'pre_opening').length
    const activeCount = projects.filter((project) => ['approved', 'in_progress'].includes(project.status)).length

    return {
      totalAllocated,
      totalSpent,
      remaining: totalAllocated - totalSpent,
      preOpeningCount,
      activeCount,
    }
  }, [projects])

  const checklistCompletion = useMemo(() => {
    if (checklistItems.length === 0) return 0
    const complete = checklistItems.filter((item) => item.status === 'done' || item.status === 'waived').length
    return Math.round((complete / checklistItems.length) * 100)
  }, [checklistItems])

  const resetProjectForm = () => setProjectForm({
    title: '',
    description: '',
    category: 'pre_opening',
    priority: 'medium',
    allocated_budget: '',
    target_completion_date: '',
    template_id: '',
  })

  const resetChildForms = () => {
    setMilestoneForm({ title: '', due_date: '' })
    setExpenseForm({ amount: '', vendor_name: '', invoice_number: '', expense_date: '', notes: '' })
    setChecklistForm({ phase: 'handover', title: '', due_date: '', priority: 'medium' })
  }

  const handleCreateProject = async () => {
    if (!user || !projectForm.title || !projectForm.allocated_budget) return

    try {
      const scopedPropertyId = isRealPropertyId(currentProperty?.id) ? currentProperty.id : null
      const createdProject = await createProject.mutateAsync({
        property_id: isConsolidatedPropertyId(currentProperty?.id) ? null : scopedPropertyId,
        title: projectForm.title,
        description: projectForm.description || undefined,
        category: projectForm.category,
        priority: projectForm.priority,
        allocated_budget: Number(projectForm.allocated_budget),
        target_completion_date: projectForm.target_completion_date || undefined,
        created_by: user.id,
      })

      const selectedTemplate = templates.find((template) => template.id === projectForm.template_id)
      if (selectedTemplate) {
        await seedChecklist.mutateAsync({ projectId: createdProject.id, template: selectedTemplate, createdBy: user.id })
      }

      setSelectedProjectId(createdProject.id)
      setIsNewProjectDialogOpen(false)
      resetProjectForm()
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      })
    }
  }

  const handleAddMilestone = async () => {
    if (!selectedProject || !milestoneForm.title) return
    await createMilestone.mutateAsync({
      project_id: selectedProject.id,
      title: milestoneForm.title,
      due_date: milestoneForm.due_date || undefined,
      created_by: user?.id,
    })
    setMilestoneForm({ title: '', due_date: '' })
  }

  const handleAddExpense = async () => {
    if (!selectedProject || !expenseForm.amount) return
    await createExpenditure.mutateAsync({
      project_id: selectedProject.id,
      amount: Number(expenseForm.amount),
      vendor_name: expenseForm.vendor_name || undefined,
      invoice_number: expenseForm.invoice_number || undefined,
      expense_date: expenseForm.expense_date || undefined,
      notes: expenseForm.notes || undefined,
      created_by: user?.id,
    })
    setExpenseForm({ amount: '', vendor_name: '', invoice_number: '', expense_date: '', notes: '' })
  }

  const handleAddChecklistItem = async () => {
    if (!selectedProject || !checklistForm.title) return
    await createChecklistItem.mutateAsync({
      project_id: selectedProject.id,
      phase: checklistForm.phase,
      title: checklistForm.title,
      due_date: checklistForm.due_date || undefined,
      priority: checklistForm.priority,
      created_by: user?.id,
    })
    setChecklistForm({ phase: 'handover', title: '', due_date: '', priority: 'medium' })
  }

  const nextStatus = selectedProject ? projectStatusFlow[selectedProject.status] : null
  const selectedProjectSpentPercent = selectedProject?.allocated_budget
    ? Math.min(100, Math.round((Number(selectedProject.spent_amount) / Number(selectedProject.allocated_budget)) * 100))
    : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title', 'Projects, Pre-Opening & CAPEX')}
        description={t('subtitle', 'Capital expenditure tracking, hotel pre-opening checklists, and renovation milestones')}
        actions={
          <Button onClick={() => setIsNewProjectDialogOpen(true)} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
            <Plus className="h-4 w-4 me-2" />
            {t('new_project', 'New CAPEX Project')}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">{t('total_allocated', 'Total Allocated CAPEX')}</CardTitle>
            <DollarSign className="h-4 w-4 text-hotel-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalAllocated)}</div>
            <p className="text-xs text-muted-foreground">{projects.length} active records in scope</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">{t('total_spent', 'Spent Amount')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalSpent)}</div>
            <Progress value={metrics.totalAllocated ? (metrics.totalSpent / metrics.totalAllocated) * 100 : 0} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">{t('remaining_budget', 'Remaining Funds')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.remaining)}</div>
            <p className="text-xs text-muted-foreground">{currentProperty?.name || 'Group context'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">{t('pre_opening_count', 'Pre-Opening / Active')}</CardTitle>
            <HardHat className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.preOpeningCount} / {metrics.activeCount}</div>
            <p className="text-xs text-muted-foreground">Pre-opening projects and active work</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categoryOptions.map((category) => (
          <Button
            key={category.value}
            variant={selectedCategory === category.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.value)}
          >
            {category.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading CAPEX projects...</CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title="No CAPEX projects yet"
            description="Create a project to track budget, milestones, and pre-opening readiness."
            action={{ label: 'New CAPEX Project', onClick: () => setIsNewProjectDialogOpen(true), icon: Plus }}
          />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
          <div className="space-y-3">
            {projects.map((project) => {
              const spentPercent = project.allocated_budget
                ? Math.min(100, Math.round((Number(project.spent_amount) / Number(project.allocated_budget)) * 100))
                : 0

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(project.id)
                    resetChildForms()
                  }}
                  className={cn(
                    'w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/40',
                    selectedProject?.id === project.id && 'border-hotel-gold ring-1 ring-hotel-gold/40'
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold leading-snug">{project.title}</p>
                      <p className="text-xs text-muted-foreground">{project.property_name || 'Group / cluster'} - {labelFor(categoryOptions, project.category)}</p>
                    </div>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span>{formatCurrency(project.spent_amount)} spent</span>
                      <span className="text-muted-foreground">{formatCurrency(project.allocated_budget)}</span>
                    </div>
                    <Progress value={spentPercent} className="h-2" />
                  </div>
                </button>
              )
            })}
          </div>

          {selectedProject && (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <ProjectStatusBadge status={selectedProject.status} />
                      <PriorityBadge priority={selectedProject.priority} />
                      <Badge variant="outline">{labelFor(categoryOptions, selectedProject.category)}</Badge>
                    </div>
                    <CardTitle className="text-xl">{selectedProject.title}</CardTitle>
                    <CardDescription>{selectedProject.description || 'No description provided.'}</CardDescription>
                  </div>
                  {nextStatus && (
                    <Button
                      variant="outline"
                      onClick={() => updateProjectStatus.mutate({ id: selectedProject.id, status: nextStatus })}
                      disabled={updateProjectStatus.isPending}
                    >
                      Move to {nextStatus.replace(/_/g, ' ')}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="font-semibold">{formatCurrency(selectedProject.allocated_budget)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Spent</p>
                    <p className="font-semibold">{formatCurrency(selectedProject.spent_amount)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Target date</p>
                    <p className="font-semibold">{formatDateOrDash(selectedProject.target_completion_date)}</p>
                  </div>
                </div>
                <Progress value={selectedProjectSpentPercent} className="h-2" />

                <Tabs defaultValue="checklist">
                  <TabsList>
                    <TabsTrigger value="checklist">
                      <ClipboardCheck className="me-2 h-4 w-4" />
                      Checklist
                    </TabsTrigger>
                    <TabsTrigger value="milestones">
                      <Calendar className="me-2 h-4 w-4" />
                      Milestones
                    </TabsTrigger>
                    <TabsTrigger value="spend">
                      <CircleDollarSign className="me-2 h-4 w-4" />
                      Spend
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="checklist" className="space-y-4 pt-4">
                    <div className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-end">
                      <div className="space-y-2 lg:w-44">
                        <Label>Phase</Label>
                        <Select value={checklistForm.phase} onValueChange={(value) => setChecklistForm((prev) => ({ ...prev, phase: value as PreOpeningPhase }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {phaseOptions.map((phase) => <SelectItem key={phase.value} value={phase.value}>{phase.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <Label>Checklist item</Label>
                        <Input value={checklistForm.title} onChange={(event) => setChecklistForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="e.g. Civil Defense sign-off received" />
                      </div>
                      <div className="space-y-2 lg:w-40">
                        <Label>Due date</Label>
                        <Input type="date" value={checklistForm.due_date} onChange={(event) => setChecklistForm((prev) => ({ ...prev, due_date: event.target.value }))} />
                      </div>
                      <div className="space-y-2 lg:w-36">
                        <Label>Priority</Label>
                        <Select value={checklistForm.priority} onValueChange={(value) => setChecklistForm((prev) => ({ ...prev, priority: value as CapexPriority }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(['low', 'medium', 'high', 'urgent'] as CapexPriority[]).map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddChecklistItem} disabled={createChecklistItem.isPending || !checklistForm.title}>
                        <Plus className="me-2 h-4 w-4" />
                        Add
                      </Button>
                    </div>

                    <div className="rounded-lg border">
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <p className="font-medium">Opening readiness</p>
                        <Badge variant="outline">{checklistCompletion}% complete</Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Phase</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Due</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {checklistItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">No checklist items yet.</TableCell>
                            </TableRow>
                          ) : checklistItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{labelFor(phaseOptions, item.phase)}</TableCell>
                              <TableCell className="font-medium">{item.title}</TableCell>
                              <TableCell>{formatDateOrDash(item.due_date)}</TableCell>
                              <TableCell><Badge variant="outline">{item.status.replace(/_/g, ' ')}</Badge></TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateChecklistStatus.mutate({ id: item.id, project_id: item.project_id, status: item.status === 'done' ? 'in_progress' : 'done' })}
                                  disabled={updateChecklistStatus.isPending}
                                >
                                  {item.status === 'done' ? 'Reopen' : 'Done'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="milestones" className="space-y-4 pt-4">
                    <div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-end">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Label>Milestone</Label>
                        <Input value={milestoneForm.title} onChange={(event) => setMilestoneForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="e.g. Mockup room approval" />
                      </div>
                      <div className="space-y-2 md:w-44">
                        <Label>Due date</Label>
                        <Input type="date" value={milestoneForm.due_date} onChange={(event) => setMilestoneForm((prev) => ({ ...prev, due_date: event.target.value }))} />
                      </div>
                      <Button onClick={handleAddMilestone} disabled={createMilestone.isPending || !milestoneForm.title}>
                        <Plus className="me-2 h-4 w-4" />
                        Add
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Milestone</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {milestones.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">No milestones yet.</TableCell>
                          </TableRow>
                        ) : milestones.map((milestone) => (
                          <TableRow key={milestone.id}>
                            <TableCell className="font-medium">{milestone.title}</TableCell>
                            <TableCell>{formatDateOrDash(milestone.due_date)}</TableCell>
                            <TableCell><Badge variant="outline">{milestone.status.replace(/_/g, ' ')}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateMilestoneStatus.mutate({ id: milestone.id, project_id: milestone.project_id, status: milestone.status === 'completed' ? 'in_progress' : 'completed' })}
                                disabled={updateMilestoneStatus.isPending}
                              >
                                {milestone.status === 'completed' ? 'Reopen' : 'Complete'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="spend" className="space-y-4 pt-4">
                    <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-5">
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input type="number" value={expenseForm.amount} onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="25000" />
                      </div>
                      <div className="space-y-2">
                        <Label>Vendor</Label>
                        <Input value={expenseForm.vendor_name} onChange={(event) => setExpenseForm((prev) => ({ ...prev, vendor_name: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Invoice</Label>
                        <Input value={expenseForm.invoice_number} onChange={(event) => setExpenseForm((prev) => ({ ...prev, invoice_number: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" value={expenseForm.expense_date} onChange={(event) => setExpenseForm((prev) => ({ ...prev, expense_date: event.target.value }))} />
                      </div>
                      <div className="flex items-end">
                        <Button className="w-full" onClick={handleAddExpense} disabled={createExpenditure.isPending || !expenseForm.amount}>
                          <Plus className="me-2 h-4 w-4" />
                          Add Spend
                        </Button>
                      </div>
                      <div className="space-y-2 md:col-span-5">
                        <Label>Notes</Label>
                        <Textarea value={expenseForm.notes} onChange={(event) => setExpenseForm((prev) => ({ ...prev, notes: event.target.value }))} rows={2} />
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenditures.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">No spend captured yet.</TableCell>
                          </TableRow>
                        ) : expenditures.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{formatDateOrDash(expense.expense_date)}</TableCell>
                            <TableCell>{expense.vendor_name || '-'}</TableCell>
                            <TableCell>{expense.invoice_number || '-'}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={isNewProjectDialogOpen} onOpenChange={(open) => { if (!open) resetProjectForm(); setIsNewProjectDialogOpen(open) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-hotel-gold" />
              New CAPEX / Pre-Opening Project
            </DialogTitle>
            <DialogDescription>
              Initialize a project for {currentProperty?.name || 'the current group context'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Project title *</Label>
              <Input value={projectForm.title} onChange={(event) => setProjectForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="e.g. Executive Lounge Renovation" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={projectForm.description} onChange={(event) => setProjectForm((prev) => ({ ...prev, description: event.target.value }))} rows={2} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={projectForm.category} onValueChange={(value) => setProjectForm((prev) => ({ ...prev, category: value as CapexCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.filter((category) => category.value !== 'all').map((category) => (
                      <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={projectForm.priority} onValueChange={(value) => setProjectForm((prev) => ({ ...prev, priority: value as CapexPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['low', 'medium', 'high', 'urgent'] as CapexPriority[]).map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Allocated budget (SAR) *</Label>
                <Input type="number" value={projectForm.allocated_budget} onChange={(event) => setProjectForm((prev) => ({ ...prev, allocated_budget: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Target completion</Label>
                <Input type="date" value={projectForm.target_completion_date} onChange={(event) => setProjectForm((prev) => ({ ...prev, target_completion_date: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Starter template</Label>
              <Select value={projectForm.template_id || 'none'} onValueChange={(value) => setProjectForm((prev) => ({ ...prev, template_id: value === 'none' ? '' : value }))}>
                <SelectTrigger><SelectValue placeholder="Optional checklist template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.template_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewProjectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={createProject.isPending || !projectForm.title || !projectForm.allocated_budget} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
              Save Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
