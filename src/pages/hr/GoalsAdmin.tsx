import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProperty } from '@/contexts/PropertyContext'
import { useDepartments } from '@/hooks/useDepartments'
import { useProfiles } from '@/hooks/useUsers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

const STATUS_OPTIONS = ['pending', 'in_progress', 'completed', 'cancelled']

const defaultForm = {
  employee_id: '',
  title: '',
  description: '',
  target_date: '',
  status: 'pending',
  category: '',
  progress: 0
}

export default function GoalsAdmin() {
  const { t } = useTranslation('hr')
  const queryClient = useQueryClient()
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id && currentProperty.id !== 'all' ? currentProperty.id : undefined

  const [departmentId, setDepartmentId] = useState('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)

  const { departments } = useDepartments(propertyId)
  const { data: staff = [] } = useProfiles({
    property_id: propertyId,
    department_id: departmentId !== 'all' ? departmentId : undefined,
    limit: 500
  })

  const staffIds = useMemo(() => new Set(staff.map(member => member.id)), [staff])

  const goalsQuery = useQuery({
    queryKey: ['goals-admin', propertyId, departmentId, staff.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*, employee:profiles(id, full_name, email, job_title)')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data || []
    }
  })

  const filteredGoals = useMemo(() => {
    const goals = goalsQuery.data || []
    if (employeeFilter !== 'all') {
      return goals.filter((goal: any) => goal.employee_id === employeeFilter)
    }
    if (departmentId !== 'all' && staffIds.size > 0) {
      return goals.filter((goal: any) => staffIds.has(goal.employee_id))
    }
    if (propertyId && staffIds.size > 0) {
      return goals.filter((goal: any) => staffIds.has(goal.employee_id))
    }
    return goals
  }, [goalsQuery.data, employeeFilter, departmentId, staffIds, propertyId])

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_id: form.employee_id,
        title: form.title,
        description: form.description || null,
        target_date: form.target_date || null,
        status: form.status,
        category: form.category || null,
        progress: Number(form.progress) || 0
      }
      const { error } = await supabase.from('goals').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(t('hr_admin.messages.goal_created', 'Goal created.'))
      queryClient.invalidateQueries({ queryKey: ['goals-admin'] })
      setForm(defaultForm)
    },
    onError: () => toast.error(t('hr_admin.messages.goal_create_failed', 'Failed to create goal.'))
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return
      const payload = {
        employee_id: form.employee_id,
        title: form.title,
        description: form.description || null,
        target_date: form.target_date || null,
        status: form.status,
        category: form.category || null,
        progress: Number(form.progress) || 0
      }
      const { error } = await supabase
        .from('goals')
        .update(payload)
        .eq('id', editingId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(t('hr_admin.messages.goal_updated', 'Goal updated.'))
      queryClient.invalidateQueries({ queryKey: ['goals-admin'] })
      setEditingId(null)
      setForm(defaultForm)
    },
    onError: () => toast.error(t('hr_admin.messages.goal_update_failed', 'Failed to update goal.'))
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(t('hr_admin.messages.goal_deleted', 'Goal deleted.'))
      queryClient.invalidateQueries({ queryKey: ['goals-admin'] })
    },
    onError: () => toast.error(t('hr_admin.messages.goal_delete_failed', 'Failed to delete goal.'))
  })

  const handleSave = () => {
    if (!form.employee_id || !form.title) {
      toast.error(t('hr_admin.messages.select_employee', 'Select an employee.'))
      return
    }
    if (editingId) {
      updateMutation.mutate()
      return
    }
    createMutation.mutate()
  }

  const handleEdit = (goal: any) => {
    setEditingId(goal.id)
    setForm({
      employee_id: goal.employee_id,
      title: goal.title || '',
      description: goal.description || '',
      target_date: goal.target_date || '',
      status: goal.status || 'pending',
      category: goal.category || '',
      progress: goal.progress || 0
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('hr_admin.goals.title', 'Goals Management')}
        </h1>
        <p className="text-muted-foreground">
          {t('hr_admin.goals.description', 'Assign and track career goals for your teams.')}
        </p>
      </div>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>{t('hr_admin.filters.title', 'Filters')}</CardTitle>
          <CardDescription>{t('hr_admin.filters.description', 'Narrow results by department or employee.')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t('hr_admin.filters.department', 'Department')}</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder={t('hr_admin.filters.all_departments', 'All departments')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('hr_admin.filters.all_departments', 'All departments')}</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('hr_admin.filters.employee', 'Employee')}</Label>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('hr_admin.filters.all_employees', 'All employees')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('hr_admin.filters.all_employees', 'All employees')}</SelectItem>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>{t('hr_admin.goals.form_title', 'Create or Update Goal')}</CardTitle>
          <CardDescription>{t('hr_admin.goals.form_description', 'Set milestones and progress targets.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('hr_admin.fields.employee', 'Employee')}</Label>
              <Select value={form.employee_id} onValueChange={(value) => setForm(prev => ({ ...prev, employee_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('hr_admin.fields.employee', 'Employee')} />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.goal_title', 'Goal Title')}</Label>
              <Input value={form.title} onChange={(event) => setForm(prev => ({ ...prev, title: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.target_date', 'Target Date')}</Label>
              <Input type="date" value={form.target_date} onChange={(event) => setForm(prev => ({ ...prev, target_date: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.status', 'Status')}</Label>
              <Select value={form.status} onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('hr_admin.fields.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.category', 'Category')}</Label>
              <Input value={form.category} onChange={(event) => setForm(prev => ({ ...prev, category: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.progress', 'Progress')}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.progress}
                onChange={(event) => setForm(prev => ({ ...prev, progress: Number(event.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('hr_admin.fields.description', 'Description')}</Label>
            <Textarea value={form.description} onChange={(event) => setForm(prev => ({ ...prev, description: event.target.value }))} />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSave}>
              {editingId ? t('hr_admin.actions.save', 'Save') : t('hr_admin.actions.create', 'Create')}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={() => {
                setEditingId(null)
                setForm(defaultForm)
              }}>
                {t('hr_admin.actions.cancel', 'Cancel')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>{t('hr_admin.goals.list_title', 'Goal Tracker')}</CardTitle>
          <CardDescription>{t('hr_admin.goals.list_description', 'Monitor progress across teams.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {goalsQuery.isLoading ? (
            <div className="py-6 text-center text-muted-foreground">{t('hr_admin.loading', 'Loading goals...')}</div>
          ) : filteredGoals.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">{t('hr_admin.empty', 'No goals found.')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('hr_admin.columns.employee', 'Employee')}</TableHead>
                  <TableHead>{t('hr_admin.columns.goal', 'Goal')}</TableHead>
                  <TableHead>{t('hr_admin.columns.status', 'Status')}</TableHead>
                  <TableHead>{t('hr_admin.columns.progress', 'Progress')}</TableHead>
                  <TableHead>{t('hr_admin.columns.due', 'Due')}</TableHead>
                  <TableHead className="text-right">{t('hr_admin.columns.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGoals.map((goal: any) => (
                  <TableRow key={goal.id}>
                    <TableCell>
                      <div className="font-medium">{goal.employee?.full_name || goal.employee?.email || 'Employee'}</div>
                      <div className="text-xs text-muted-foreground">{goal.employee?.job_title || ''}</div>
                    </TableCell>
                    <TableCell>{goal.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{goal.status || 'pending'}</Badge>
                    </TableCell>
                    <TableCell>{goal.progress ?? 0}%</TableCell>
                    <TableCell>{goal.target_date ? format(new Date(goal.target_date), 'MMM d, yyyy') : '-'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(goal)}>
                        {t('hr_admin.actions.edit', 'Edit')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(goal.id)}>
                        {t('hr_admin.actions.delete', 'Delete')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
