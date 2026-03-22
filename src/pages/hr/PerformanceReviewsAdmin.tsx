import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments } from '@/hooks/useDepartments'
import { useProfiles } from '@/hooks/useUsers'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const STATUS_OPTIONS = ['draft', 'in_review', 'completed', 'archived']

const defaultForm = {
  employee_id: '',
  reviewer_id: '',
  review_period: '',
  review_date: '',
  overall_rating: 3,
  strengths: '',
  areas_for_improvement: '',
  comments: '',
  goals: '',
  status: 'draft'
}

export default function PerformanceReviewsAdmin() {
  const { t } = useTranslation('hr')
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentProperty } = useProperty()
  const propertyId = isRealPropertyId(currentProperty?.id) ? currentProperty.id : undefined

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

  const reviewsQuery = useQuery({
    queryKey: ['performance-reviews-admin', propertyId, departmentId, staff.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select('*, employee:profiles(id, full_name, email, job_title), reviewer:profiles!performance_reviews_reviewer_id_fkey(id, full_name)')
        .order('review_date', { ascending: false })

      if (error) throw error
      return data || []
    }
  })

  const filteredReviews = useMemo(() => {
    const reviews = reviewsQuery.data || []
    if (employeeFilter !== 'all') {
      return reviews.filter((review) => review.employee_id === employeeFilter)
    }
    if (departmentId !== 'all' && staffIds.size > 0) {
      return reviews.filter((review) => staffIds.has(review.employee_id))
    }
    if (propertyId && staffIds.size > 0) {
      return reviews.filter((review) => staffIds.has(review.employee_id))
    }
    return reviews
  }, [reviewsQuery.data, employeeFilter, departmentId, staffIds, propertyId])

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_id: form.employee_id,
        reviewer_id: form.reviewer_id || user?.id || null,
        review_period: form.review_period || t('hr_admin.defaults.review_period', 'Current Period'),
        review_date: form.review_date || new Date().toISOString().slice(0, 10),
        overall_rating: Number(form.overall_rating) || 0,
        rating: Number(form.overall_rating) || 0,
        strengths: form.strengths || null,
        areas_for_improvement: form.areas_for_improvement || null,
        comments: form.comments || null,
        goals: form.goals || null,
        status: form.status || null
      }
      const { error } = await supabase.from('performance_reviews').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(t('hr_admin.messages.review_created', 'Performance review created.'))
      queryClient.invalidateQueries({ queryKey: ['performance-reviews-admin'] })
      setForm(defaultForm)
    },
    onError: () => toast.error(t('hr_admin.messages.review_create_failed', 'Failed to create review.'))
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return
      const payload = {
        employee_id: form.employee_id,
        reviewer_id: form.reviewer_id || null,
        review_period: form.review_period || t('hr_admin.defaults.review_period', 'Current Period'),
        review_date: form.review_date || new Date().toISOString().slice(0, 10),
        overall_rating: Number(form.overall_rating) || 0,
        rating: Number(form.overall_rating) || 0,
        strengths: form.strengths || null,
        areas_for_improvement: form.areas_for_improvement || null,
        comments: form.comments || null,
        goals: form.goals || null,
        status: form.status || null
      }
      const { error } = await supabase
        .from('performance_reviews')
        .update(payload)
        .eq('id', editingId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(t('hr_admin.messages.review_updated', 'Performance review updated.'))
      queryClient.invalidateQueries({ queryKey: ['performance-reviews-admin'] })
      setEditingId(null)
      setForm(defaultForm)
    },
    onError: () => toast.error(t('hr_admin.messages.review_update_failed', 'Failed to update review.'))
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('performance_reviews').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(t('hr_admin.messages.review_deleted', 'Performance review deleted.'))
      queryClient.invalidateQueries({ queryKey: ['performance-reviews-admin'] })
    },
    onError: () => toast.error(t('hr_admin.messages.review_delete_failed', 'Failed to delete review.'))
  })

  const handleSave = () => {
    if (!form.employee_id) {
      toast.error(t('hr_admin.messages.select_employee', 'Select an employee.'))
      return
    }
    if (editingId) {
      updateMutation.mutate()
      return
    }
    createMutation.mutate()
  }

  const handleEdit = (review) => {
    setEditingId(review.id)
    setForm({
      employee_id: review.employee_id,
      reviewer_id: review.reviewer_id || '',
      review_period: review.review_period || '',
      review_date: review.review_date || '',
      overall_rating: review.overall_rating || 0,
      strengths: review.strengths || '',
      areas_for_improvement: review.areas_for_improvement || '',
      comments: review.comments || '',
      goals: review.goals || '',
      status: review.status || 'draft'
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('hr_admin.performance.title', 'Performance Review Management')}
        </h1>
        <p className="text-muted-foreground">
          {t('hr_admin.performance.description', 'Create, review, and track performance reviews.')}
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
          <CardTitle>{t('hr_admin.performance.form_title', 'Create or Update Review')}</CardTitle>
          <CardDescription>{t('hr_admin.performance.form_description', 'Capture review details and ratings.')}</CardDescription>
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
              <Label>{t('hr_admin.fields.reviewer', 'Reviewer')}</Label>
              <Select value={form.reviewer_id || 'unassigned'} onValueChange={(value) => setForm(prev => ({ ...prev, reviewer_id: value === 'unassigned' ? '' : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('hr_admin.fields.reviewer', 'Reviewer')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">{t('hr_admin.defaults.no_reviewer', 'Not assigned')}</SelectItem>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.review_period', 'Review Period')}</Label>
              <Input
                value={form.review_period}
                onChange={(event) => setForm(prev => ({ ...prev, review_period: event.target.value }))}
                placeholder={t('hr_admin.defaults.review_period', 'Current Period')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.review_date', 'Review Date')}</Label>
              <Input
                type="date"
                value={form.review_date}
                onChange={(event) => setForm(prev => ({ ...prev, review_date: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.rating', 'Overall Rating')}</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={form.overall_rating}
                onChange={(event) => setForm(prev => ({ ...prev, overall_rating: Number(event.target.value) }))}
              />
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('hr_admin.fields.strengths', 'Strengths')}</Label>
              <Textarea
                value={form.strengths}
                onChange={(event) => setForm(prev => ({ ...prev, strengths: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('hr_admin.fields.improvements', 'Areas for Improvement')}</Label>
              <Textarea
                value={form.areas_for_improvement}
                onChange={(event) => setForm(prev => ({ ...prev, areas_for_improvement: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('hr_admin.fields.comments', 'Comments')}</Label>
            <Textarea
              value={form.comments}
              onChange={(event) => setForm(prev => ({ ...prev, comments: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('hr_admin.fields.goals', 'Goals')}</Label>
            <Textarea
              value={form.goals}
              onChange={(event) => setForm(prev => ({ ...prev, goals: event.target.value }))}
            />
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
          <CardTitle>{t('hr_admin.performance.list_title', 'Review History')}</CardTitle>
          <CardDescription>{t('hr_admin.performance.list_description', 'Recent reviews for your teams.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {reviewsQuery.isLoading ? (
            <div className="py-6 text-center text-muted-foreground">{t('hr_admin.loading', 'Loading reviews...')}</div>
          ) : filteredReviews.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">{t('hr_admin.empty', 'No reviews found.')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('hr_admin.columns.employee', 'Employee')}</TableHead>
                  <TableHead>{t('hr_admin.columns.period', 'Period')}</TableHead>
                  <TableHead>{t('hr_admin.columns.rating', 'Rating')}</TableHead>
                  <TableHead>{t('hr_admin.columns.status', 'Status')}</TableHead>
                  <TableHead>{t('hr_admin.columns.date', 'Date')}</TableHead>
                  <TableHead className="text-right">{t('hr_admin.columns.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="font-medium">{review.employee?.full_name || review.employee?.email || 'Employee'}</div>
                      <div className="text-xs text-muted-foreground">{review.employee?.job_title || ''}</div>
                    </TableCell>
                    <TableCell>{review.review_period || '-'}</TableCell>
                    <TableCell>{review.overall_rating ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {review.status || 'draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>{review.review_date ? format(new Date(review.review_date), 'MMM d, yyyy') : '-'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(review)}>
                        {t('hr_admin.actions.edit', 'Edit')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(review.id)}>
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
