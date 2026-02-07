import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProperty } from '@/contexts/PropertyContext'
import { useDepartments } from '@/hooks/useDepartments'
import { useProfiles } from '@/hooks/useUsers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

const STATUS_OPTIONS = ['draft', 'processing', 'published', 'archived']

const now = new Date()
const defaultForm = {
  employee_id: '',
  month: String(now.getMonth() + 1),
  year: String(now.getFullYear()),
  period_start: '',
  period_end: '',
  payment_date: '',
  currency: 'SAR',
  basic_salary: '',
  gross_salary: '',
  deductions: '',
  net_salary: '',
  status: 'draft',
  is_published: false
}

const toNumberOrNull = (value: string) => {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_')

export default function PayslipsAdmin() {
  const { t } = useTranslation('hr')
  const queryClient = useQueryClient()
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id && currentProperty.id !== 'all' ? currentProperty.id : undefined

  const [departmentId, setDepartmentId] = useState('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [file, setFile] = useState<File | null>(null)
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { departments } = useDepartments(propertyId)
  const { data: staff = [] } = useProfiles({
    property_id: propertyId,
    department_id: departmentId !== 'all' ? departmentId : undefined,
    limit: 500
  })

  const staffIds = useMemo(() => new Set(staff.map(member => member.id)), [staff])

  const payslipsQuery = useQuery({
    queryKey: ['payslips-admin', propertyId, departmentId, staff.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select('*, employee:profiles(id, full_name, email, job_title)')
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (error) throw error
      return data || []
    }
  })

  const filteredPayslips = useMemo(() => {
    const payslips = payslipsQuery.data || []

    return payslips.filter((payslip: any) => {
      if (employeeFilter !== 'all' && payslip.employee_id !== employeeFilter) return false
      if (departmentId !== 'all' && staffIds.size > 0 && !staffIds.has(payslip.employee_id)) return false
      if (propertyId && staffIds.size > 0 && !staffIds.has(payslip.employee_id)) return false
      if (statusFilter !== 'all' && (payslip.status || 'draft') !== statusFilter) return false
      if (monthFilter && String(payslip.month) !== monthFilter) return false
      if (yearFilter && String(payslip.year) !== yearFilter) return false
      return true
    })
  }, [payslipsQuery.data, employeeFilter, departmentId, staffIds, propertyId, statusFilter, monthFilter, yearFilter])

  const handleSave = async () => {
    if (!form.employee_id || !form.month || !form.year) {
      toast.error(t('hr_admin.messages.select_employee', 'Select an employee.'))
      return
    }

    setSaving(true)
    try {
      let storagePath = existingStoragePath
      if (file) {
        const sanitized = sanitizeFileName(file.name)
        const paddedMonth = String(form.month).padStart(2, '0')
        storagePath = `${form.employee_id}/${form.year}-${paddedMonth}-${Date.now()}-${sanitized}`

        const { error: uploadError } = await supabase.storage
          .from('payslips')
          .upload(storagePath, file, { upsert: false })

        if (uploadError) {
          throw uploadError
        }
      }

      const payload = {
        employee_id: form.employee_id,
        month: Number(form.month),
        year: Number(form.year),
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        payment_date: form.payment_date || null,
        currency: form.currency || null,
        basic_salary: toNumberOrNull(form.basic_salary),
        gross_salary: toNumberOrNull(form.gross_salary),
        deductions: toNumberOrNull(form.deductions),
        net_salary: toNumberOrNull(form.net_salary),
        status: form.status || null,
        is_published: form.is_published,
        storage_path: storagePath || null
      }

      if (editingId) {
        const { error } = await supabase
          .from('payslips')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
        toast.success(t('hr_admin.messages.payslip_updated', 'Payslip updated.'))
      } else {
        const { error } = await supabase
          .from('payslips')
          .insert(payload)

        if (error) throw error
        toast.success(t('hr_admin.messages.payslip_created', 'Payslip created.'))
      }

      queryClient.invalidateQueries({ queryKey: ['payslips-admin'] })
      setEditingId(null)
      setForm(defaultForm)
      setFile(null)
      setExistingStoragePath(null)
    } catch (error: any) {
      console.error('Payslip save error', error)
      toast.error(t('hr_admin.messages.payslip_save_failed', 'Failed to save payslip.'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (payslip: any) => {
    setEditingId(payslip.id)
    setForm({
      employee_id: payslip.employee_id,
      month: String(payslip.month || ''),
      year: String(payslip.year || ''),
      period_start: payslip.period_start || '',
      period_end: payslip.period_end || '',
      payment_date: payslip.payment_date || '',
      currency: payslip.currency || '',
      basic_salary: payslip.basic_salary?.toString() || '',
      gross_salary: payslip.gross_salary?.toString() || '',
      deductions: payslip.deductions?.toString() || '',
      net_salary: payslip.net_salary?.toString() || '',
      status: payslip.status || 'draft',
      is_published: payslip.is_published ?? false
    })
    setExistingStoragePath(payslip.storage_path || null)
    setFile(null)
  }

  const handleDelete = async (payslip: any) => {
    try {
      const { error } = await supabase
        .from('payslips')
        .delete()
        .eq('id', payslip.id)

      if (error) throw error

      if (payslip.storage_path) {
        await supabase.storage.from('payslips').remove([payslip.storage_path])
      }

      toast.success(t('hr_admin.messages.payslip_deleted', 'Payslip deleted.'))
      queryClient.invalidateQueries({ queryKey: ['payslips-admin'] })
    } catch (error) {
      toast.error(t('hr_admin.messages.payslip_delete_failed', 'Failed to delete payslip.'))
    }
  }

  const handleDownload = async (payslipId: string) => {
    const { data, error } = await supabase.rpc('get_secure_payslip_url', { p_payslip_id: payslipId })
    if (error || !data) {
      toast.error(t('hr_admin.messages.payslip_download_failed', 'Unable to generate download link.'))
      return
    }

    window.open(data, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('hr_admin.payslips.title', 'Payslip Management')}
        </h1>
        <p className="text-muted-foreground">
          {t('hr_admin.payslips.description', 'Create, publish, and distribute staff payslips.')}
        </p>
      </div>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>{t('hr_admin.filters.title', 'Filters')}</CardTitle>
          <CardDescription>{t('hr_admin.filters.description', 'Narrow results by department or employee.')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

          <div className="space-y-2">
            <Label>{t('hr_admin.filters.status', 'Status')}</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('hr_admin.filters.all_statuses', 'All statuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('hr_admin.filters.all_statuses', 'All statuses')}</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('hr_admin.filters.month', 'Month')}</Label>
            <Input value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} placeholder="MM" />
          </div>

          <div className="space-y-2">
            <Label>{t('hr_admin.filters.year', 'Year')}</Label>
            <Input value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} placeholder="YYYY" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>{t('hr_admin.payslips.form_title', 'Create or Update Payslip')}</CardTitle>
          <CardDescription>{t('hr_admin.payslips.form_description', 'Upload payslip PDFs and manage payroll metadata.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label>{t('hr_admin.fields.month', 'Month')}</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={form.month}
                onChange={(event) => setForm(prev => ({ ...prev, month: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.year', 'Year')}</Label>
              <Input
                type="number"
                min={1900}
                value={form.year}
                onChange={(event) => setForm(prev => ({ ...prev, year: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.period_start', 'Period Start')}</Label>
              <Input
                type="date"
                value={form.period_start}
                onChange={(event) => setForm(prev => ({ ...prev, period_start: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.period_end', 'Period End')}</Label>
              <Input
                type="date"
                value={form.period_end}
                onChange={(event) => setForm(prev => ({ ...prev, period_end: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.payment_date', 'Payment Date')}</Label>
              <Input
                type="date"
                value={form.payment_date}
                onChange={(event) => setForm(prev => ({ ...prev, payment_date: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.currency', 'Currency')}</Label>
              <Input
                value={form.currency}
                onChange={(event) => setForm(prev => ({ ...prev, currency: event.target.value }))}
                placeholder={t('hr_admin.fields.currency_placeholder', { defaultValue: 'SAR' })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.basic_salary', 'Basic Salary')}</Label>
              <Input
                type="number"
                value={form.basic_salary}
                onChange={(event) => setForm(prev => ({ ...prev, basic_salary: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.gross_salary', 'Gross Salary')}</Label>
              <Input
                type="number"
                value={form.gross_salary}
                onChange={(event) => setForm(prev => ({ ...prev, gross_salary: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.deductions', 'Deductions')}</Label>
              <Input
                type="number"
                value={form.deductions}
                onChange={(event) => setForm(prev => ({ ...prev, deductions: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.net_salary', 'Net Salary')}</Label>
              <Input
                type="number"
                value={form.net_salary}
                onChange={(event) => setForm(prev => ({ ...prev, net_salary: event.target.value }))}
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

            <div className="space-y-2">
              <Label>{t('hr_admin.fields.file', 'Payslip PDF')}</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              {existingStoragePath && (
                <p className="text-xs text-muted-foreground">
                  {t('hr_admin.payslips.current_file', 'Current file')}: {existingStoragePath}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                checked={form.is_published}
                onCheckedChange={(value) => setForm(prev => ({ ...prev, is_published: Boolean(value) }))}
              />
              <span className="text-sm text-muted-foreground">{t('hr_admin.fields.published', 'Published')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {editingId ? t('hr_admin.actions.save', 'Save') : t('hr_admin.actions.create', 'Create')}
            </Button>
            {editingId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null)
                  setForm(defaultForm)
                  setFile(null)
                  setExistingStoragePath(null)
                }}
              >
                {t('hr_admin.actions.cancel', 'Cancel')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>{t('hr_admin.payslips.list_title', 'Payslip Records')}</CardTitle>
          <CardDescription>{t('hr_admin.payslips.list_description', 'Track published and draft payslips across teams.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {payslipsQuery.isLoading ? (
            <div className="py-6 text-center text-muted-foreground">{t('hr_admin.loading', 'Loading payslips...')}</div>
          ) : filteredPayslips.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">{t('hr_admin.empty', 'No payslips found.')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('hr_admin.columns.employee', 'Employee')}</TableHead>
                  <TableHead>{t('hr_admin.columns.period', 'Period')}</TableHead>
                  <TableHead>{t('hr_admin.columns.net', 'Net Pay')}</TableHead>
                  <TableHead>{t('hr_admin.columns.status', 'Status')}</TableHead>
                  <TableHead>{t('hr_admin.columns.published', 'Published')}</TableHead>
                  <TableHead>{t('hr_admin.columns.payment_date', 'Payment Date')}</TableHead>
                  <TableHead>{t('hr_admin.columns.file', 'File')}</TableHead>
                  <TableHead className="text-right">{t('hr_admin.columns.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayslips.map((payslip: any) => {
                  const periodDate = payslip.year && payslip.month
                    ? format(new Date(payslip.year, payslip.month - 1, 1), 'MMM yyyy')
                    : '-'

                  return (
                    <TableRow key={payslip.id}>
                      <TableCell>
                        <div className="font-medium">{payslip.employee?.full_name || payslip.employee?.email || 'Employee'}</div>
                        <div className="text-xs text-muted-foreground">{payslip.employee?.job_title || ''}</div>
                      </TableCell>
                      <TableCell>{periodDate}</TableCell>
                      <TableCell>{payslip.net_salary ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{payslip.status || 'draft'}</Badge>
                      </TableCell>
                      <TableCell>
                        {payslip.is_published ? (
                          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 border-green-500/20">
                            {t('hr_admin.labels.published', 'Published')}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t('hr_admin.labels.draft', 'Draft')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{payslip.payment_date ? format(new Date(payslip.payment_date), 'MMM d, yyyy') : '-'}</TableCell>
                      <TableCell>{payslip.storage_path ? t('hr_admin.labels.file_ready', 'Ready') : t('hr_admin.labels.file_missing', 'Missing')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(payslip)}>
                          {t('hr_admin.actions.edit', 'Edit')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(payslip)}>
                          {t('hr_admin.actions.delete', 'Delete')}
                        </Button>
                        {payslip.storage_path && (
                          <Button size="sm" variant="secondary" onClick={() => handleDownload(payslip.id)}>
                            {t('hr_admin.actions.download', 'Download')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
